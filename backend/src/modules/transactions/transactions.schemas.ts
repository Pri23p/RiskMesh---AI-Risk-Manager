import { z } from 'zod';

export const createTransactionSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
  merchantId: z.string().min(1, 'merchantId is required'),
  customerId: z.string().min(1, 'customerId is required'),
  amount: z.number().positive('amount must be greater than 0'),
  currency: z.string().default('INR'),
  paymentMethod: z.string().min(1, 'paymentMethod is required'),
  ipAddress: z.string().ip().optional(),
  deviceId: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  itemsCount: z.number().int().positive().default(1),
  metadata: z.record(z.unknown()).optional(),
});

export const updateTransactionStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'MANUAL_REVIEW', 'BLOCKED', 'REFUNDED']),
});

export const transactionFilterSchema = z.object({
  merchantId: z.string().optional(),
  customerId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'MANUAL_REVIEW', 'BLOCKED', 'REFUNDED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const transactionParamsSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionStatusInput = z.infer<typeof updateTransactionStatusSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
export type TransactionParamsInput = z.infer<typeof transactionParamsSchema>;
