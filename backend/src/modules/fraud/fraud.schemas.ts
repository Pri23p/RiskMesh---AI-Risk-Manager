import { z } from 'zod';

export const createFraudSignalSchema = z.object({
  transactionId: z.string().min(1, 'transactionId is required'),
  signalType: z.string().min(1, 'signalType is required'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(1, 'description is required'),
  metadata: z.record(z.unknown()).optional(),
});

export const fraudSignalFilterSchema = z.object({
  transactionId: z.string().optional(),
  signalType: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const fraudSignalParamsSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export const fraudSignalByTxParamsSchema = z.object({
  transactionId: z.string().min(1, 'transactionId is required'),
});

export type CreateFraudSignalInput = z.infer<typeof createFraudSignalSchema>;
export type FraudSignalFilterInput = z.infer<typeof fraudSignalFilterSchema>;
export type FraudSignalParamsInput = z.infer<typeof fraudSignalParamsSchema>;
export type FraudSignalByTxParamsInput = z.infer<typeof fraudSignalByTxParamsSchema>;
