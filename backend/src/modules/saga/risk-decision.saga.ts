import { SagaState } from '@prisma/client';
import { SagaRepository } from './saga.repository.js';
import { TransactionsRepository } from '../transactions/transactions.repository.js';
import { RiskService } from '../risk/risk.service.js';
import { RiskDecisionService } from '../risk/risk-decision.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  SagaContext,
  SagaExecutionResult,
  SagaStepName,
  SAGA_STEP_SEQUENCE,
  DEFAULT_SAGA_RETRY_CONFIG,
  SagaRetryConfig,
} from './saga.types.js';
import { NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class RiskDecisionSagaOrchestrator {
  constructor(
    private readonly sagaRepository: SagaRepository = new SagaRepository(),
    private readonly transactionsRepository: TransactionsRepository = new TransactionsRepository(),
    private readonly riskService?: RiskService,
    private readonly riskDecisionService?: RiskDecisionService,
    private readonly auditService?: AuditService,
    private readonly retryConfig: SagaRetryConfig = DEFAULT_SAGA_RETRY_CONFIG
  ) {}

  /**
   * Start or execute a Risk Decision Saga for a given transaction.
   */
  async executeSaga(transactionId: string): Promise<SagaExecutionResult> {
    // 1. Check existing saga
    let saga = await this.sagaRepository.findByTransactionId(transactionId);

    // Idempotency Check
    if (saga && saga.state === SagaState.COMPLETED) {
      logger.info({ transactionId, sagaId: saga.id }, 'Saga already completed. Returning idempotent result.');
      return {
        sagaId: saga.id,
        transactionId,
        status: 'ALREADY_COMPLETED',
        currentStep: 'COMPLETED',
        context: saga.context as unknown as SagaContext,
        message: 'Saga has already executed and completed for this transaction.',
      };
    }

    const transaction = await this.transactionsRepository.findByIdOrTransactionId(transactionId);
    if (!transaction) {
      throw new NotFoundError(`Transaction '${transactionId}' not found`);
    }

    let context: SagaContext = {
      transactionId: transaction.transactionId,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      customerId: transaction.customerId,
      stepExecutionHistory: [],
    };

    if (!saga) {
      saga = await this.sagaRepository.createSaga(transaction.transactionId, context);
      await this.recordAudit(transaction.transactionId, 'SAGA_STARTED', { sagaId: saga.id });
    } else {
      context = { ...(saga.context as unknown as SagaContext) };
    }

    return await this.runWorkflow(saga.id, transaction.transactionId, saga.currentStep as SagaStepName, context);
  }

  /**
   * Resume an existing Saga from its persisted checkpoint.
   */
  async resumeSaga(sagaId: string): Promise<SagaExecutionResult> {
    const saga = await this.sagaRepository.findById(sagaId);
    if (!saga) {
      throw new NotFoundError(`Saga with ID '${sagaId}' not found`);
    }

    if (saga.state === SagaState.COMPLETED) {
      return {
        sagaId: saga.id,
        transactionId: saga.transactionId,
        status: 'ALREADY_COMPLETED',
        currentStep: 'COMPLETED',
        context: saga.context as unknown as SagaContext,
      };
    }

    logger.info({ sagaId, step: saga.currentStep }, 'Resuming Saga from persisted state');
    await this.recordAudit(saga.transactionId, 'SAGA_RESUMED', { sagaId, resumedStep: saga.currentStep });

    const context = saga.context as unknown as SagaContext;
    return await this.runWorkflow(saga.id, saga.transactionId, saga.currentStep as SagaStepName, context, true);
  }

  /**
   * Core step execution loop with resume awareness and exponential backoff retries.
   */
  private async runWorkflow(
    sagaId: string,
    transactionId: string,
    fromStep: SagaStepName,
    context: SagaContext,
    isResumed = false
  ): Promise<SagaExecutionResult> {
    const startIndex = Math.max(1, SAGA_STEP_SEQUENCE.indexOf(fromStep));

    await this.sagaRepository.updateStep(sagaId, fromStep, SagaState.RUNNING, context);

    for (let i = startIndex; i < SAGA_STEP_SEQUENCE.length - 1; i++) {
      const step = SAGA_STEP_SEQUENCE[i] as SagaStepName;
      if (!step) continue;
      logger.info({ sagaId, transactionId, step }, `Executing Saga Step: ${step}`);

      // Execute Step with Exponential Backoff Retry Loop
      const stepSuccess = await this.executeStepWithRetry(sagaId, transactionId, step, context);

      if (!stepSuccess) {
        // Retry Exhaustion Fallback: Transition to Manual Review
        logger.warn({ sagaId, transactionId, step }, 'Step failed after retries. Applying fallback to manual review.');
        context.fallbackToReview = true;
        context.decision = 'REVIEW';
        context.decisionReason = 'SAGA_RETRY_EXHAUSTED_FALLBACK: Step failure exceeded max retries';

        await this.sagaRepository.updateStep(sagaId, step, SagaState.FAILED, context, 'Step execution failed after retries');
        await this.recordAudit(transactionId, 'SAGA_FALLBACK_REVIEW', { step, error: 'Retry exhausted' });

        return {
          sagaId,
          transactionId,
          status: 'FAILED',
          currentStep: step,
          context,
          isResumed,
          message: 'Saga halted due to step failure. Fallback to manual review applied.',
        };
      }

      // Checkpoint Step Completion in PostgreSQL
      await this.sagaRepository.updateStep(sagaId, step, SagaState.RUNNING, context);
    }


    // Finalize Saga as COMPLETED
    await this.sagaRepository.updateStep(sagaId, 'COMPLETED', SagaState.COMPLETED, context);
    await this.recordAudit(transactionId, 'SAGA_COMPLETED', {
      sagaId,
      finalDecision: context.decision,
      riskScore: context.riskScore,
    });

    return {
      sagaId,
      transactionId,
      status: 'COMPLETED',
      currentStep: 'COMPLETED',
      context,
      isResumed,
      message: 'Saga completed successfully.',
    };
  }

  /**
   * Execute single step with exponential backoff retries.
   */
  private async executeStepWithRetry(
    sagaId: string,
    transactionId: string,
    step: SagaStepName,
    context: SagaContext
  ): Promise<boolean> {
    let attempt = 0;
    const { maxRetries, initialBackoffMs, backoffMultiplier } = this.retryConfig;

    await this.recordAudit(transactionId, `${step}_STARTED`, { sagaId, attempt: 1 });
    await this.sagaRepository.logStep(sagaId, step, 'STARTED');

    while (attempt < maxRetries) {
      attempt++;
      try {
        await this.runStepLogic(step, context);

        await this.recordAudit(transactionId, `${step}_COMPLETED`, { sagaId, attempt });
        await this.sagaRepository.logStep(sagaId, step, 'COMPLETED', { attempt });

        context.stepExecutionHistory = context.stepExecutionHistory || [];
        context.stepExecutionHistory.push({
          step,
          executedAt: new Date().toISOString(),
          status: 'COMPLETED',
          retries: attempt - 1,
        });

        return true;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn({ sagaId, step, attempt, error: errorMsg }, `Saga Step ${step} attempt ${attempt} failed.`);

        await this.sagaRepository.logStep(sagaId, step, 'FAILED', { attempt }, errorMsg);
        await this.sagaRepository.updateRetryCount(sagaId, attempt, errorMsg);

        if (attempt < maxRetries) {
          const backoff = initialBackoffMs * Math.pow(backoffMultiplier, attempt - 1);
          await this.recordAudit(transactionId, `${step}_RETRY`, { sagaId, attempt, nextRetryInMs: backoff });
          await new Promise((resolve) => setTimeout(resolve, backoff));
        } else {
          await this.recordAudit(transactionId, `${step}_FAILED`, { sagaId, error: errorMsg });
        }
      }
    }

    return false;
  }

  /**
   * Step handler dispatcher.
   */
  private async runStepLogic(step: SagaStepName, context: SagaContext): Promise<void> {
    switch (step) {
      case 'RISK_SCORING': {
        if (this.riskService) {
          const scoreResult = await this.riskService.calculateRisk(context.transactionId);
          context.riskScore = scoreResult.riskScore;
          context.fraudProbability = scoreResult.fraudProbability;
          context.modelVersion = scoreResult.modelVersion;
          context.riskFactors = scoreResult.riskFactors;
        } else {
          context.riskScore = context.riskScore ?? 85;
          context.fraudProbability = context.fraudProbability ?? 0.85;
          context.modelVersion = 'v1';
        }
        break;
      }

      case 'RULE_EVALUATION': {
        const score = context.riskScore ?? 50;
        if (score >= 75) {
          context.decision = 'BLOCK';
          context.decisionReason = `High risk score: ${score} >= 75`;
        } else if (score >= 30) {
          context.decision = 'REVIEW';
          context.decisionReason = `Review band risk score: ${score}`;
        } else {
          context.decision = 'APPROVE';
          context.decisionReason = `Low risk score: ${score} < 30`;
        }
        context.expectedLoss = Number(context.amount ?? 0) * Number(context.fraudProbability ?? 0.5);
        break;
      }

      case 'DECISION_CREATED': {
        if (this.riskDecisionService) {
          const decisionResult = await this.riskDecisionService.makeDecision(context.transactionId);
          context.decision = decisionResult.decision as 'APPROVE' | 'REVIEW' | 'BLOCK';
          context.decisionReason = decisionResult.reason;
          context.expectedLoss = Number(decisionResult.expectedLoss);
        }
        break;
      }

      case 'VERIFICATION_REQUESTED': {
        if (context.decision === 'REVIEW') {
          context.verificationCaseId = `verif-case-${context.transactionId}`;
          context.verificationStatus = 'OPEN';
        } else {
          context.verificationStatus = 'SKIPPED_NOT_REQUIRED';
        }
        break;
      }

      case 'VERIFICATION_COMPLETED': {
        if (context.verificationStatus === 'OPEN') {
          context.verificationStatus = 'COMPLETED';
        }
        break;
      }

      case 'MERCHANT_NOTIFIED': {
        context.merchantNotificationId = `notif-${context.transactionId}-${Date.now()}`;
        context.merchantNotifiedAt = new Date().toISOString();
        break;
      }

      default:
        break;
    }
  }

  private async recordAudit(
    transactionId: string,
    eventType: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    if (this.auditService) {
      try {
        await this.auditService.logEvent({
          entityType: 'TRANSACTION',
          entityId: transactionId,
          eventType,
          metadata,
        });
      } catch (err) {
        logger.debug({ err }, 'Audit recording failure');
      }
    }
  }
}

export const riskDecisionSaga = new RiskDecisionSagaOrchestrator();
