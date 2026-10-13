import { z } from 'zod';

export const evaluateRiskSchema = z.object({
  transactionId: z.string().min(1, 'transactionId is required'),
  features: z.record(z.unknown()).optional(),
});

export const riskFilterSchema = z.object({
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  recommendation: z.enum(['ALLOW', 'REQUIRE_2FA', 'MANUAL_REVIEW', 'REJECT']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const riskParamsSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export const riskByTransactionParamsSchema = z.object({
  transactionId: z.string().min(1, 'transactionId is required'),
});

export type EvaluateRiskInput = z.infer<typeof evaluateRiskSchema>;
export type RiskFilterInput = z.infer<typeof riskFilterSchema>;
export type RiskParamsInput = z.infer<typeof riskParamsSchema>;
export type RiskByTransactionParamsInput = z.infer<typeof riskByTransactionParamsSchema>;
