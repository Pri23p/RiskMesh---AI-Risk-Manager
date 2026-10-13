import { AnalyticsMetric } from '@prisma/client';

export type IAnalyticsMetric = AnalyticsMetric;

export interface RecordMetricDTO {
  metricName: string;
  metricValue: number;
  dimensions?: Record<string, unknown>;
}

export interface SummaryStatsDTO {
  totalTransactions: number;
  totalVolume: number;
  blockedCount: number;
  reviewCount: number;
  approvedCount: number;
  averageRiskScore: number;
  highRiskPercentage: number;
}
