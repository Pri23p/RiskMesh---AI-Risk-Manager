import { z } from 'zod';

export const scoreTransactionParamsSchema = z.object({
  transactionId: z.string().trim().min(1, 'transactionId parameter is required'),
});

export const getRiskScoreParamsSchema = z.object({
  transactionId: z.string().trim().min(1, 'transactionId parameter is required'),
});

export type ScoreTransactionParams = z.infer<typeof scoreTransactionParamsSchema>;
export type GetRiskScoreParams = z.infer<typeof getRiskScoreParamsSchema>;
