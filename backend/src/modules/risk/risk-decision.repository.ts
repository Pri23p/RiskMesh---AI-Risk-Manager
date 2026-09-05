import { DecisionAction, Prisma, RiskDecision, TransactionStatus } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma.js';

export interface SaveRiskDecisionData {
  transactionId: string;
  riskScoreId: string;
  decision: DecisionAction;
  reason: string;
  expectedLoss: number;
}

export class RiskDecisionRepository {
  private inMemoryDecisions: Map<string, RiskDecision> = new Map();

  async saveDecision(data: SaveRiskDecisionData): Promise<RiskDecision> {
    const txStatusMap: Record<DecisionAction, TransactionStatus> = {
      APPROVE: TransactionStatus.APPROVED,
      REVIEW: TransactionStatus.REVIEW,
      BLOCK: TransactionStatus.BLOCKED,
    };

    const targetTxStatus = txStatusMap[data.decision];

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Upsert RiskDecision
        const decisionRecord = await tx.riskDecision.upsert({
          where: { transactionId: data.transactionId },
          create: {
            transactionId: data.transactionId,
            riskScoreId: data.riskScoreId,
            decision: data.decision,
            reason: data.reason,
            expectedLoss: new Prisma.Decimal(data.expectedLoss),
            status: 'ACTIVE',
          },
          update: {
            riskScoreId: data.riskScoreId,
            decision: data.decision,
            reason: data.reason,
            expectedLoss: new Prisma.Decimal(data.expectedLoss),
            status: 'ACTIVE',
          },
        });

        // 2. Synchronize Transaction Status
        await tx.transaction.update({
          where: { transactionId: data.transactionId },
          data: { status: targetTxStatus },
        });

        return decisionRecord;
      });
    } catch (err) {
      const fallbackRecord: RiskDecision = {
        id: `dec-${data.transactionId}`,
        transactionId: data.transactionId,
        riskScoreId: data.riskScoreId,
        decision: data.decision,
        reason: data.reason,
        expectedLoss: new Prisma.Decimal(data.expectedLoss),
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.inMemoryDecisions.set(data.transactionId, fallbackRecord);
      return fallbackRecord;
    }
  }

  async findByTransactionId(transactionId: string): Promise<RiskDecision | null> {
    try {
      const record = await prisma.riskDecision.findUnique({
        where: { transactionId },
      });
      if (record) return record;
    } catch {
      // Fall through to memory
    }
    return this.inMemoryDecisions.get(transactionId) || null;
  }
}
