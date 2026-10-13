import { TransactionsRepository } from './transactions.repository';
import { CreateTransactionDTO, TransactionFilterDTO, ITransaction, TransactionStatus } from './transactions.types';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { logger } from '../../config/logger';

export class TransactionsService {
  constructor(private readonly repository: TransactionsRepository = new TransactionsRepository()) {}

  async processTransaction(data: CreateTransactionDTO): Promise<ITransaction> {
    const existing = await this.repository.findByOrderId(data.orderId);
    if (existing) {
      throw new ConflictError(`Transaction with orderId ${data.orderId} already exists`);
    }

    logger.info({ orderId: data.orderId, merchantId: data.merchantId, amount: data.amount }, 'Processing new transaction');
    const transaction = await this.repository.create(data);
    return transaction;
  }

  async getTransactionById(id: string): Promise<ITransaction> {
    const transaction = await this.repository.findById(id);
    if (!transaction) {
      throw new NotFoundError(`Transaction with ID ${id} not found`);
    }
    return transaction;
  }

  async listTransactions(filters: TransactionFilterDTO): Promise<{ items: ITransaction[]; total: number }> {
    return this.repository.findMany(filters);
  }

  async updateStatus(id: string, status: TransactionStatus): Promise<ITransaction> {
    await this.getTransactionById(id);
    logger.info({ transactionId: id, status }, 'Updating transaction status');
    return this.repository.updateStatus(id, status);
  }
}
