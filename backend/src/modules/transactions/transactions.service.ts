import { Transaction } from '@prisma/client';
import { TransactionsRepository } from './transactions.repository.js';
import { CustomersRepository } from './customers.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { OutboxRepository } from '../../infrastructure/outbox/outbox.repository.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { CreateTransactionDto, QueryTransactionsDto, UpdateTransactionStatusDto } from './dto/transaction.dto.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly customersRepository: CustomersRepository,
    private readonly auditService: AuditService,
    private readonly outboxRepository: OutboxRepository = new OutboxRepository()
  ) {}

  async createTransaction(data: CreateTransactionDto): Promise<Transaction> {
    // 1. Business Rule: Missing customer check
    const customer = await this.customersRepository.findByExternalCustomerId(data.customerId);
    if (!customer) {
      logger.warn({ customerId: data.customerId }, 'Transaction rejected: Customer not found');
      throw new NotFoundError(`Customer '${data.customerId}' does not exist`, {
        customerId: data.customerId,
      });
    }

    // 2. Business Rule: Duplicate transaction check
    const existingTransaction = await this.transactionsRepository.findByTransactionId(
      data.transactionId
    );
    if (existingTransaction) {
      logger.warn(
        { transactionId: data.transactionId },
        'Transaction rejected: Duplicate transaction ID'
      );
      throw new ConflictError(`Transaction with ID '${data.transactionId}' already exists`, {
        transactionId: data.transactionId,
      });
    }

    // 3. Atomic Database Transaction: Save transaction + Save outbox event
    logger.info(
      { transactionId: data.transactionId, customerId: data.customerId, amount: data.amount },
      'Ingesting transaction atomically with Transactional Outbox event'
    );

    const transaction = await prisma.$transaction(async (tx) => {
      // Step 1: Save transaction
      const createdTx = await this.transactionsRepository.create(data, tx);

      // Step 2: Save outbox event
      await this.outboxRepository.createEvent(
        {
          eventType: 'transaction.created',
          aggregateType: 'TRANSACTION',
          aggregateId: createdTx.transactionId,
          payload: {
            id: createdTx.id,
            transactionId: createdTx.transactionId,
            customerId: createdTx.customerId,
            amount: Number(createdTx.amount),
            currency: createdTx.currency,
            paymentMethod: createdTx.paymentMethod,
            deviceId: createdTx.deviceId,
            ipAddress: createdTx.ipAddress,
            location: createdTx.location,
            status: createdTx.status,
            createdAt: createdTx.createdAt.toISOString(),
          },
        },
        tx
      );

      return createdTx;
    });

    // 4. Invalidate Customer Risk Cache
    try {
      const { customerRiskCacheService } = await import('../../infrastructure/redis/customer-cache.service.js');
      await customerRiskCacheService.invalidateCustomer(data.customerId);
    } catch (cacheErr) {
      logger.debug({ err: cacheErr }, 'Non-blocking customer cache invalidation failure');
    }

    // 5. Record transaction.created Audit Event
    try {
      await this.auditService.logEvent({
        entityType: 'TRANSACTION',
        entityId: transaction.transactionId,
        eventType: 'transaction.created',
        metadata: {
          id: transaction.id,
          transactionId: transaction.transactionId,
          customerId: transaction.customerId,
          amount: Number(transaction.amount),
          currency: transaction.currency,
          paymentMethod: transaction.paymentMethod,
          status: transaction.status,
        },
      });
    } catch (auditError) {
      logger.error({ err: auditError }, 'Failed to record audit event for transaction creation');
    }

    return transaction;
  }

  async getTransactionById(idOrTransactionId: string): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findByIdOrTransactionId(idOrTransactionId);
    if (!transaction) {
      throw new NotFoundError(`Transaction '${idOrTransactionId}' not found`);
    }
    return transaction;
  }

  async listTransactions(
    query: QueryTransactionsDto
  ): Promise<{ items: Transaction[]; total: number; page: number; limit: number }> {
    const { items, total } = await this.transactionsRepository.findMany(query);
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async updateStatus(idOrTransactionId: string, data: UpdateTransactionStatusDto): Promise<Transaction> {
    const updated = await this.transactionsRepository.updateStatus(idOrTransactionId, data.status);
    if (!updated) throw new NotFoundError(`Transaction '${idOrTransactionId}' not found`);
    await this.auditService.logEvent({
      entityType: 'TRANSACTION',
      entityId: updated.transactionId,
      eventType: `transaction.${data.status.toLowerCase()}`,
      metadata: { status: data.status, source: 'manual_review' },
    }).catch(() => undefined);
    return updated;
  }
}
