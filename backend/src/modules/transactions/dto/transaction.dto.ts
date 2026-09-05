import { z } from 'zod';

export const updateTransactionStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REVIEW', 'BLOCKED']),
});

export const createTransactionSchema = z.object({
  transactionId: z
    .string({ required_error: 'transactionId is required' })
    .trim()
    .min(1, 'transactionId cannot be empty')
    .max(64, 'transactionId cannot exceed 64 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'transactionId must be alphanumeric and may contain hyphens or underscores'),

  customerId: z
    .string({ required_error: 'customerId is required' })
    .trim()
    .min(1, 'customerId cannot be empty')
    .max(64, 'customerId cannot exceed 64 characters'),
  amount: z
    .number({ required_error: 'amount is required' })
    .positive('amount must be strictly positive and greater than zero'),
  currency: z
    .string({ required_error: 'currency is required' })
    .trim()
    .length(3, 'currency must be a 3-letter ISO code')
    .regex(/^[A-Z]{3}$/, 'currency must consist of 3 uppercase letters'),
  deviceId: z.string().trim().max(128).optional(),
  ipAddress: z.string().trim().ip({ message: 'ipAddress must be a valid IP address' }).optional(),
  location: z.string().trim().max(100).optional(),
  paymentMethod: z
    .string({ required_error: 'paymentMethod is required' })
    .trim()
    .min(1, 'paymentMethod cannot be empty')
    .max(50),
});

export const getTransactionByIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'id parameter is required'),
});

export const queryTransactionsSchema = z.object({
  customerId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REVIEW', 'BLOCKED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const transactionHeadersSchema = z
  .object({
    'idempotency-key': z.string().trim().min(1).max(255).optional(),
  })
  .passthrough();

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionStatusDto = z.infer<typeof updateTransactionStatusSchema>;
export type GetTransactionByIdParams = z.infer<typeof getTransactionByIdParamsSchema>;
export type QueryTransactionsDto = z.infer<typeof queryTransactionsSchema>;
