import { z } from 'zod';

export const recordMetricSchema = z.object({
  metricName: z.string().min(1, 'metricName is required'),
  metricValue: z.number(),
  dimensions: z.record(z.unknown()).optional(),
});

export const analyticsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type RecordMetricInput = z.infer<typeof recordMetricSchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
