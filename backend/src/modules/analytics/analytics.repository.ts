import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../infrastructure/database/prisma';
import { IAnalyticsMetric, RecordMetricDTO, SummaryStatsDTO } from './analytics.types';

export class AnalyticsRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async createMetric(data: RecordMetricDTO): Promise<IAnalyticsMetric> {
    return this.db.analyticsMetric.create({
      data: {
        metricName: data.metricName,
        metricValue: data.metricValue,
        dimensions: data.dimensions ? (data.dimensions as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  async getMetrics(metricName: string, from?: Date, to?: Date): Promise<IAnalyticsMetric[]> {
    const where: Prisma.AnalyticsMetricWhereInput = { metricName };
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = from;
      if (to) where.timestamp.lte = to;
    }

    return this.db.analyticsMetric.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }

  async getSummaryStats(): Promise<SummaryStatsDTO> {
    const [totalTx, approvedTx, reviewTx, blockedTx, volumeAgg, riskAgg, highRiskCount] = await Promise.all([
      this.db.transaction.count(),
      this.db.transaction.count({ where: { status: 'APPROVED' } }),
      this.db.transaction.count({ where: { status: 'MANUAL_REVIEW' } }),
      this.db.transaction.count({ where: { status: 'BLOCKED' } }),
      this.db.transaction.aggregate({ _sum: { amount: true } }),
      this.db.riskAssessment.aggregate({ _avg: { riskScore: true } }),
      this.db.riskAssessment.count({ where: { riskLevel: { in: ['HIGH', 'CRITICAL'] } } }),
    ]);

    const totalVolume = volumeAgg._sum.amount || 0;
    const averageRiskScore = riskAgg._avg.riskScore || 0;
    const highRiskPercentage = totalTx > 0 ? (highRiskCount / totalTx) * 100 : 0;

    return {
      totalTransactions: totalTx,
      totalVolume,
      approvedCount: approvedTx,
      reviewCount: reviewTx,
      blockedCount: blockedTx,
      averageRiskScore: Number(averageRiskScore.toFixed(2)),
      highRiskPercentage: Number(highRiskPercentage.toFixed(2)),
    };
  }
}
