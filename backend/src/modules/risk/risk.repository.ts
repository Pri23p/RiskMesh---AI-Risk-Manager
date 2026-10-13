import { Prisma, PrismaClient, RiskLevel, RiskRecommendation } from '@prisma/client';
import { prisma as defaultPrisma } from '../../infrastructure/database/prisma';
import { IRiskAssessment, RiskAssessmentFilterDTO, RiskFactor } from './risk.types';

export class RiskRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async create(data: {
    transactionId: string;
    riskScore: number;
    riskLevel: RiskLevel;
    recommendation: RiskRecommendation;
    factors: RiskFactor[];
  }): Promise<IRiskAssessment> {
    return this.db.riskAssessment.create({
      data: {
        transactionId: data.transactionId,
        riskScore: data.riskScore,
        riskLevel: data.riskLevel,
        recommendation: data.recommendation,
        factors: data.factors as unknown as Prisma.InputJsonValue,
      },
      include: {
        transaction: true,
      },
    });
  }

  async findById(id: string): Promise<IRiskAssessment | null> {
    return this.db.riskAssessment.findUnique({
      where: { id },
      include: {
        transaction: true,
      },
    });
  }

  async findByTransactionId(transactionId: string): Promise<IRiskAssessment | null> {
    return this.db.riskAssessment.findUnique({
      where: { transactionId },
      include: {
        transaction: true,
      },
    });
  }

  async findMany(filters: RiskAssessmentFilterDTO): Promise<{ items: IRiskAssessment[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.RiskAssessmentWhereInput = {};
    if (filters.riskLevel) where.riskLevel = filters.riskLevel;
    if (filters.recommendation) where.recommendation = filters.recommendation;

    const [items, total] = await Promise.all([
      this.db.riskAssessment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { evaluatedAt: 'desc' },
        include: {
          transaction: true,
        },
      }),
      this.db.riskAssessment.count({ where }),
    ]);

    return { items, total };
  }
}
