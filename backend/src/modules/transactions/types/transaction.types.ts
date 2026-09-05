export type TransactionStatusType = 'PENDING' | 'APPROVED' | 'REVIEW' | 'BLOCKED';

export interface ITransaction {
  id: string;
  transactionId: string;
  customerId: string;
  amount: string;
  currency: string;
  deviceId?: string | null;
  ipAddress?: string | null;
  location?: string | null;
  paymentMethod: string;
  status: TransactionStatusType;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransactionQueryFilters {
  customerId?: string;
  status?: TransactionStatusType;
  page?: number;
  limit?: number;
}
