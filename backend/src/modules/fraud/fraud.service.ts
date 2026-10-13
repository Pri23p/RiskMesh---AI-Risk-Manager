import { FraudRepository } from './fraud.repository';
import { CreateFraudSignalDTO, FraudSignalFilterDTO, IFraudSignal } from './fraud.types';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../config/logger';

export class FraudService {
  constructor(
    private readonly repository: FraudRepository = new FraudRepository(),
    private readonly transactionsRepo: TransactionsRepository = new TransactionsRepository()
  ) {}

  async reportFraudSignal(dto: CreateFraudSignalDTO): Promise<IFraudSignal> {
    const transaction = await this.transactionsRepo.findById(dto.transactionId);
    if (!transaction) {
      throw new NotFoundError(`Transaction ${dto.transactionId} not found`);
    }

    logger.warn(
      { transactionId: dto.transactionId, signalType: dto.signalType, severity: dto.severity },
      'Fraud signal recorded'
    );

    return this.repository.create(dto);
  }

  async getSignalById(id: string): Promise<IFraudSignal> {
    const signal = await this.repository.findById(id);
    if (!signal) {
      throw new NotFoundError(`Fraud signal ${id} not found`);
    }
    return signal;
  }

  async getSignalsByTransaction(transactionId: string): Promise<IFraudSignal[]> {
    return this.repository.findByTransactionId(transactionId);
  }

  async listSignals(filters: FraudSignalFilterDTO): Promise<{ items: IFraudSignal[]; total: number }> {
    return this.repository.findMany(filters);
  }
}
