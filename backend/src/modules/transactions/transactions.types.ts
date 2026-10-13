import { Transaction, TransactionStatus } from '@prisma/client';

export type ITransaction = Transaction;
export { TransactionStatus };

export interface CreateTransactionDTO {
  orderId: string;
  merchantId: string;
  customerId: string;
  amount: number;
  currency?: string;
  paymentMethod: string;
  ipAddress?: string;
  deviceId?: string;
  shippingCity?: string;
  shippingState?: string;
  itemsCount?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateTransactionStatusDTO {
  status: TransactionStatus;
}

export interface TransactionFilterDTO {
  merchantId?: string;
  customerId?: string;
  status?: TransactionStatus;
  page?: number;
  limit?: number;
}
