import { prisma } from '../../infrastructure/database/prisma.js';
import { IRiskScoreResult } from './types/risk.types.js';

export interface SaveRiskScoreData {
  transactionId: string;
  fraudProbability: number;
  riskScore: number;
  modelVersion: string;
  status?: string;
  riskFactors?: Array<{
    feature: string;
    impact: string;
    explanation?: string;
  }>;
}

export class RiskRepository {
  private inMemoryScores: Map<string, IRiskScoreResult> = new Map();

  async saveRiskScore(data: SaveRiskScoreData): Promise<IRiskScoreResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Find existing risk score to replace factors if already evaluated
        const existing = await tx.riskScore.findUnique({
          where: { transactionId: data.transactionId },
        });

        if (existing) {
          await tx.riskFactor.deleteMany({
            where: { riskScoreId: existing.id },
          });

          const updated = await tx.riskScore.update({
            where: { transactionId: data.transactionId },
            data: {
              fraudProbability: data.fraudProbability,
              riskScore: data.riskScore,
              modelVersion: data.modelVersion,
              status: data.status ?? 'COMPLETED',
              factors: {
                create: (data.riskFactors ?? []).map((f) => ({
                  feature: f.feature,
                  impact: f.impact,
                  explanation: f.explanation,
                })),
              },
            },
            include: {
              factors: true,
            },
          });

          return {
            transactionId: updated.transactionId,
            riskScore: updated.riskScore,
            fraudProbability: updated.fraudProbability,
            modelVersion: updated.modelVersion,
            status: updated.status,
            riskFactors: updated.factors.map((f) => ({
              id: f.id,
              feature: f.feature,
              impact: f.impact,
              explanation: f.explanation,
            })),
            createdAt: updated.createdAt,
          };
        }

        const created = await tx.riskScore.create({
          data: {
            transactionId: data.transactionId,
            fraudProbability: data.fraudProbability,
            riskScore: data.riskScore,
            modelVersion: data.modelVersion,
            status: data.status ?? 'COMPLETED',
            factors: {
              create: (data.riskFactors ?? []).map((f) => ({
                feature: f.feature,
                impact: f.impact,
                explanation: f.explanation,
              })),
            },
          },
          include: {
            factors: true,
          },
        });

        return {
          transactionId: created.transactionId,
          riskScore: created.riskScore,
          fraudProbability: created.fraudProbability,
          modelVersion: created.modelVersion,
          status: created.status,
          riskFactors: created.factors.map((f) => ({
            id: f.id,
            feature: f.feature,
            impact: f.impact,
            explanation: f.explanation,
          })),
          createdAt: created.createdAt,
        };
      });
    } catch (err) {
      const fallbackResult: IRiskScoreResult = {
        transactionId: data.transactionId,
        riskScore: data.riskScore,
        fraudProbability: data.fraudProbability,
        modelVersion: data.modelVersion,
        status: data.status ?? 'COMPLETED',
        riskFactors: (data.riskFactors ?? []).map((f, idx) => ({
          id: `rf-${idx}`,
          feature: f.feature,
          impact: f.impact,
          explanation: f.explanation,
        })),
        createdAt: new Date(),
      };
      this.inMemoryScores.set(data.transactionId, fallbackResult);
      return fallbackResult;
    }
  }

  async findByTransactionId(transactionId: string): Promise<IRiskScoreResult | null> {
    try {
      const record = await prisma.riskScore.findUnique({
        where: { transactionId },
        include: {
          factors: true,
        },
      });

      if (record) {
        return {
          transactionId: record.transactionId,
          riskScore: record.riskScore,
          fraudProbability: record.fraudProbability,
          modelVersion: record.modelVersion,
          status: record.status,
          riskFactors: record.factors.map((f) => ({
            id: f.id,
            feature: f.feature,
            impact: f.impact,
            explanation: f.explanation,
          })),
          createdAt: record.createdAt,
        };
      }
    } catch {
      // Fall through to memory
    }

    return this.inMemoryScores.get(transactionId) || null;
  }
}
