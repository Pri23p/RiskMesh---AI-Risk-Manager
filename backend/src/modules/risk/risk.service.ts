import { RiskRepository } from './risk.repository.js';
import { TransactionsRepository } from '../transactions/transactions.repository.js';
import { FeatureGeneratorService } from './feature-generator.service.js';
import { MLClient, MLServiceError } from '../../infrastructure/ml/ml.client.js';
import { AuditService } from '../audit/audit.service.js';
import { OutboxRepository } from '../../infrastructure/outbox/outbox.repository.js';
import { IRiskScoreResult } from './types/risk.types.js';
import { NotFoundError, AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class RiskService {
  constructor(
    private readonly riskRepository: RiskRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly featureGeneratorService: FeatureGeneratorService,
    private readonly mlClient: MLClient,
    private readonly auditService: AuditService,
    private readonly outboxRepository: OutboxRepository = new OutboxRepository()
  ) {}

  async calculateRisk(transactionId: string): Promise<IRiskScoreResult> {
    // 1. Fetch transaction
    const transaction = await this.transactionsRepository.findByIdOrTransactionId(transactionId);
    if (!transaction) {
      throw new NotFoundError(`Transaction '${transactionId}' not found`, { transactionId });
    }

    // 2. Generate features from database state & historical activity
    logger.info({ transactionId: transaction.transactionId }, 'Generating fraud features');
    const features = await this.featureGeneratorService.generateFeatures(transaction);

    // 3. Call ML Service with robust failure handling
    try {
      logger.info({ transactionId: transaction.transactionId }, 'Calling Python ML service for risk prediction');
      const mlResponse = await this.mlClient.explain(features);

      // 4. Transform and persist prediction
      const savedResult = await this.riskRepository.saveRiskScore({
        transactionId: transaction.transactionId,
        fraudProbability: mlResponse.fraudProbability,
        riskScore: mlResponse.riskScore,
        modelVersion: mlResponse.modelVersion,
        status: 'COMPLETED',
        riskFactors: mlResponse.riskFactors.map((rf) => ({
          feature: rf.feature,
          impact: rf.impact,
          explanation: `Feature contribution score: ${rf.contribution ?? 'N/A'}, value: ${rf.value ?? 'N/A'}`,
        })),
      });

      // 5. Stage Outbox Event for risk.scored
      try {
        await this.outboxRepository.createEvent({
          eventType: 'risk.scored',
          aggregateType: 'TRANSACTION',
          aggregateId: transaction.transactionId,
          payload: {
            transactionId: savedResult.transactionId,
            riskScore: savedResult.riskScore,
            fraudProbability: savedResult.fraudProbability,
            modelVersion: savedResult.modelVersion,
            riskFactors: savedResult.riskFactors,
          },
        });
      } catch (outboxErr) {
        logger.warn({ err: outboxErr }, 'Failed to write risk.scored outbox event');
      }

      // 6. Record Audit Event
      await this.auditService.logEvent({
        entityType: 'TRANSACTION',
        entityId: transaction.transactionId,
        eventType: 'risk.evaluated',
        metadata: {
          riskScore: savedResult.riskScore,
          fraudProbability: savedResult.fraudProbability,
          modelVersion: savedResult.modelVersion,
          factorCount: savedResult.riskFactors.length,
        },
      });

      logger.info(
        {
          transactionId: transaction.transactionId,
          riskScore: savedResult.riskScore,
          probability: savedResult.fraudProbability,
        },
        'Risk calculation completed successfully'
      );

      return savedResult;
    } catch (err: unknown) {
      // Failure Handling: Do not crash, do not silently pass as safe
      logger.error(
        { transactionId: transaction.transactionId, err },
        'ML service evaluation failed or timed out'
      );

      // Record high-priority audit event for failure
      await this.auditService.logEvent({
        entityType: 'TRANSACTION',
        entityId: transaction.transactionId,
        eventType: 'risk.evaluation_failed',
        metadata: {
          reason: err instanceof Error ? err.message : 'Unknown ML failure',
          errorType: err instanceof MLServiceError ? err.name : 'UnexpectedError',
        },
      });

      // Persist failed status record to prevent unmonitored bypass
      await this.riskRepository.saveRiskScore({
        transactionId: transaction.transactionId,
        fraudProbability: 0.5,
        riskScore: 50,
        modelVersion: 'fallback-v0',
        status: 'FAILED',
        riskFactors: [
          {
            feature: 'ML_SERVICE_UNAVAILABLE',
            impact: 'high',
            explanation: 'ML service failed to evaluate risk in real-time. Manual review required.',
          },
        ],
      });

      throw new AppError(
        `Risk evaluation failed: ${err instanceof Error ? err.message : 'ML service unavailable'}. Flagged for manual review.`,
        503,
        'ML_SERVICE_UNAVAILABLE',
        { transactionId: transaction.transactionId }
      );
    }
  }

  async getRiskScore(transactionId: string): Promise<IRiskScoreResult> {
    const result = await this.riskRepository.findByTransactionId(transactionId);
    if (!result) {
      throw new NotFoundError(`Risk score for transaction '${transactionId}' not found`, {
        transactionId,
      });
    }
    return result;
  }
}
