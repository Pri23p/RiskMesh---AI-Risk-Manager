import { Prisma, RiskDecisionSaga, SagaState } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma.js';
import { SagaContext, SagaStepName } from './saga.types.js';

export class SagaRepository {
  async findByTransactionId(transactionId: string): Promise<RiskDecisionSaga | null> {
    return prisma.riskDecisionSaga.findUnique({
      where: { transactionId },
      include: {
        stepLogs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findById(id: string): Promise<RiskDecisionSaga | null> {
    return prisma.riskDecisionSaga.findUnique({
      where: { id },
      include: {
        stepLogs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async createSaga(
    transactionId: string,
    initialContext: SagaContext
  ): Promise<RiskDecisionSaga> {
    return prisma.riskDecisionSaga.create({
      data: {
        transactionId,
        state: SagaState.PENDING,
        currentStep: 'START',
        context: initialContext as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async updateStep(
    id: string,
    stepName: SagaStepName,
    state: SagaState,
    context: SagaContext,
    lastError?: string | null
  ): Promise<RiskDecisionSaga> {
    return prisma.riskDecisionSaga.update({
      where: { id },
      data: {
        currentStep: stepName,
        state,
        context: context as unknown as Prisma.InputJsonValue,
        lastError: lastError ?? null,
        ...(state === SagaState.COMPLETED ? { completedAt: new Date() } : {}),
      },
    });
  }

  async logStep(
    sagaId: string,
    stepName: string,
    state: 'STARTED' | 'COMPLETED' | 'FAILED' | 'RETRY' | 'SKIPPED',
    payload?: Record<string, unknown>,
    error?: string
  ): Promise<void> {
    await prisma.sagaStepLog.create({
      data: {
        sagaId,
        stepName,
        state,
        payload: payload ? (payload as Prisma.InputJsonValue) : undefined,
        error,
      },
    });
  }

  async updateRetryCount(id: string, count: number, error: string): Promise<void> {
    await prisma.riskDecisionSaga.update({
      where: { id },
      data: {
        retryCount: count,
        lastError: error.slice(0, 500),
      },
    });
  }
}
