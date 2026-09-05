import { z } from 'zod';

export const queryAnalyticsSummarySchema = z.object({
  customerId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});


export const recordMetricSchema = z.object({
  metricName: z.string().min(1).max(100),
  merchantId: z.string().optional(),
  dimensions: z.record(z.unknown()).optional(),
  value: z.number(),
});

export type QueryAnalyticsSummaryDto = z.infer<typeof queryAnalyticsSummarySchema>;
export type RecordMetricDto = z.infer<typeof recordMetricSchema>;
