export interface IAnalyticsSummary {
  totalTransactions: number;
  approvedCount: number;
  reviewCount: number;
  blockedCount: number;
  fraudRatePercentage: number;
  totalVolume: string;
}

export interface IAnalyticsMetricRecord {
  id: string;
  metricName: string;
  merchantId?: string | null;
  dimensions?: Record<string, unknown> | null;
  value: number;
  recordedAt: Date;
}
