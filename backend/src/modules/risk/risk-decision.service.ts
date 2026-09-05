import { DecisionAction, RiskDecision } from '@prisma/client';
import { RiskDecisionRepository } from './risk-decision.repository.js';
import { TransactionsRepository } from '../transactions/transactions.repository.js';
import { FeatureGeneratorService } from './feature-generator.service.js';
import { RiskDecisionEngine } from './decision-engine/decision-engine.js';
import { NetworkGraphService } from '../fraud/network-graph.service.js';
import { AuditService } from '../audit/audit.service.js';
import { OutboxRepository } from '../../infrastructure/outbox/outbox.repository.js';
import { DomainEventType } from '../../infrastructure/events/event.types.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { DecisionContext } from './decision-engine/types.js';

export class RiskDecisionService {
  constructor(
    private readonly riskDecisionRepository: RiskDecisionRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly featureGeneratorService: FeatureGeneratorService,
    private readonly decisionEngine: RiskDecisionEngine,
    private readonly auditService: AuditService,
    private readonly outboxRepository: OutboxRepository = new OutboxRepository(),
    private readonly networkGraphService: NetworkGraphService = new NetworkGraphService()
  ) {}

  async makeDecision(transactionId: string): Promise<RiskDecision> {
    // 1. Fetch transaction
    const transaction = await this.transactionsRepository.findByIdOrTransactionId(transactionId);
    if (!transaction) {
      throw new NotFoundError(`Transaction '${transactionId}' not found`, { transactionId });
    }

    // 2. Fetch associated RiskScore
    let riskScore: any = null;
    try {
      riskScore = await prisma.riskScore.findUnique({
        where: { transactionId: transaction.transactionId },
      });
    } catch {
      // Ignore DB errors
    }

    if (!riskScore && (transaction as any).riskScore) {
      riskScore = (transaction as any).riskScore;
    }

    if (!riskScore) {
      // Fallback default score evaluation if not previously recorded
      const fallbackScore = transaction.status === 'BLOCKED' ? 93 : transaction.status === 'REVIEW' ? 55 : 15;
      riskScore = {
        id: `rs-${transaction.transactionId}`,
        transactionId: transaction.transactionId,
        riskScore: fallbackScore,
        fraudProbability: fallbackScore / 100,
        modelVersion: 'v1',
        status: 'COMPLETED',
      };
    }

    // 3. Generate feature context for decision rules
    const features = await this.featureGeneratorService.generateFeatures(transaction);

    // 3b. Fraud Network Intelligence: Graph relationship signals
    let networkSignals = null;
    try {
      networkSignals = await this.networkGraphService.getCustomerNetworkSignals(transaction.customerId);

      // Record Audit Trail for Network Risk Analysis
      await this.auditService.logEvent({
        entityType: 'CUSTOMER',
        entityId: transaction.customerId,
        eventType: 'network.analysis.completed',
        metadata: {
          transactionId: transaction.transactionId,
          sharedDeviceCount: networkSignals.sharedDeviceCount,
          sharedIpCount: networkSignals.sharedIpCount,
          flaggedAccountConnections: networkSignals.flaggedAccountConnections,
          networkRiskScore: networkSignals.networkRiskScore,
          isHighRiskRing: networkSignals.isHighRiskRing,
        },
      });
    } catch (netErr) {
      logger.warn({ err: netErr, customerId: transaction.customerId }, 'Network graph analysis skipped or failed');
    }

    const context: DecisionContext = {
      transactionId: transaction.transactionId,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      fraudProbability: riskScore.fraudProbability,
      riskScore: riskScore.riskScore,
      previousFraudCount: features.previousFraudCount,
      isNewDevice: features.isNewDevice === 1,
      isNewIp: features.isNewIp === 1,
      accountAge: features.accountAge,
      failedAttempts: features.failedAttempts,
      // Network Intelligence Signals
      sharedDeviceCount: networkSignals?.sharedDeviceCount ?? 0,
      sharedIpCount: networkSignals?.sharedIpCount ?? 0,
      flaggedAccountConnections: networkSignals?.flaggedAccountConnections ?? 0,
      networkRiskScore: networkSignals?.networkRiskScore ?? 0,
      isHighRiskRing: networkSignals?.isHighRiskRing ?? false,
    };


    // 4. Evaluate Deterministic Decision Engine
    const engineResult = this.decisionEngine.evaluate(context);
    const decisionAction = engineResult.decision as DecisionAction;

    // 5. Persist Decision and Update Transaction Status in PostgreSQL
    const savedDecision = await this.riskDecisionRepository.saveDecision({
      transactionId: transaction.transactionId,
      riskScoreId: riskScore.id,
      decision: decisionAction,
      reason: engineResult.reason,
      expectedLoss: engineResult.expectedLoss,
    });

    const statusEventMap: Record<DecisionAction, DomainEventType> = {
      APPROVE: 'transaction.approved',
      REVIEW: 'transaction.review_required',
      BLOCK: 'transaction.blocked',
    };

    // 6. Stage Transactional Outbox Events
    try {
      // Event 1: risk.decision.created
      await this.outboxRepository.createEvent({
        eventType: 'risk.decision.created',
        aggregateType: 'TRANSACTION',
        aggregateId: transaction.transactionId,
        payload: {
          id: savedDecision.id,
          transactionId: transaction.transactionId,
          riskScoreId: riskScore.id,
          decision: savedDecision.decision,
          reason: savedDecision.reason,
          expectedLoss: Number(savedDecision.expectedLoss),
          status: savedDecision.status,
        },
      });

      // Event 2: State transition event
      await this.outboxRepository.createEvent({
        eventType: statusEventMap[decisionAction],
        aggregateType: 'TRANSACTION',
        aggregateId: transaction.transactionId,
        payload: {
          transactionId: transaction.transactionId,
          newStatus: decisionAction,
          reason: savedDecision.reason,
          amount: Number(transaction.amount),
          currency: transaction.currency,
        },
      });
    } catch (outboxErr) {
      logger.warn({ err: outboxErr }, 'Failed to stage decision outbox events');
    }

    // 7. Record Audit Trail
    await this.auditService.logEvent({
      entityType: 'TRANSACTION',
      entityId: transaction.transactionId,
      eventType: 'risk.decision.created',
      metadata: {
        decision: savedDecision.decision,
        reason: savedDecision.reason,
        expectedLoss: Number(savedDecision.expectedLoss),
        riskScore: riskScore.riskScore,
        fraudProbability: riskScore.fraudProbability,
        ruleTriggered: engineResult.ruleTriggered,
      },
    });

    await this.auditService.logEvent({
      entityType: 'TRANSACTION',
      entityId: transaction.transactionId,
      eventType: statusEventMap[decisionAction],
      metadata: {
        decision: savedDecision.decision,
        reason: savedDecision.reason,
        amount: Number(transaction.amount),
        currency: transaction.currency,
      },
    });

    logger.info(
      {
        transactionId: transaction.transactionId,
        decision: savedDecision.decision,
        reason: savedDecision.reason,
        expectedLoss: Number(savedDecision.expectedLoss),
      },
      'Risk decision determined and applied'
    );

    return savedDecision;
  }

  async getDecision(transactionId: string): Promise<RiskDecision> {
    const decision = await this.riskDecisionRepository.findByTransactionId(transactionId);
    if (!decision) {
      throw new NotFoundError(`Risk decision for transaction '${transactionId}' not found`, {
        transactionId,
      });
    }
    return decision;
  }
}
