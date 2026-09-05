import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransactionsService } from '../src/modules/transactions/transactions.service.js';
import { TransactionsRepository } from '../src/modules/transactions/transactions.repository.js';
import { CustomersRepository } from '../src/modules/transactions/customers.repository.js';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { AuditRepository } from '../src/modules/audit/audit.repository.js';
import { IdempotencyService } from '../src/infrastructure/idempotency/idempotency.service.js';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/infrastructure/database/prisma.js';
import { ConflictError, NotFoundError } from '../src/utils/errors.js';
import { Prisma } from '@prisma/client';

describe('Transaction Management Domain & API', () => {
  let transactionsRepository: TransactionsRepository;
  let customersRepository: CustomersRepository;
  let auditRepository: AuditRepository;
  let auditService: AuditService;
  let transactionsService: TransactionsService;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(prisma));
    vi.spyOn(prisma.outboxEvent, 'create').mockResolvedValue({
      id: 'mock-outbox-id',
      eventType: 'transaction.created',
      aggregateType: 'TRANSACTION',
      aggregateId: 'TXN123',
      payload: {},
      status: 'PENDING',
      retryCount: 0,
      lastError: null,
      createdAt: new Date(),
      publishedAt: null,
    } as any);

    transactionsRepository = new TransactionsRepository();
    customersRepository = new CustomersRepository();
    auditRepository = new AuditRepository();
    auditService = new AuditService(auditRepository);
    transactionsService = new TransactionsService(
      transactionsRepository,
      customersRepository,
      auditService
    );
  });

  describe('TransactionsService Unit Tests', () => {
    it('should successfully create a transaction and record audit event when customer exists', async () => {
      const mockCustomer = {
        id: 'cust-uuid-1',
        externalCustomerId: 'CUS123',
        accountAge: 45,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTransaction = {
        id: 'txn-uuid-1',
        transactionId: 'TXN123',
        customerId: 'CUS123',
        amount: new Prisma.Decimal(85000),
        currency: 'INR',
        deviceId: 'DEV123',
        ipAddress: '10.0.0.1',
        location: 'Mumbai',
        paymentMethod: 'CARD',
        status: 'PENDING' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: mockCustomer,
      };

      vi.spyOn(customersRepository, 'findByExternalCustomerId').mockResolvedValue(mockCustomer);
      vi.spyOn(transactionsRepository, 'findByTransactionId').mockResolvedValue(null);
      vi.spyOn(transactionsRepository, 'create').mockResolvedValue(mockTransaction);
      const auditSpy = vi.spyOn(auditService, 'logEvent').mockResolvedValue({
        id: 'audit-1',
        entityType: 'TRANSACTION',
        entityId: 'TXN123',
        eventType: 'transaction.created',
        metadata: {},
        createdAt: new Date(),
      });

      const payload = {
        transactionId: 'TXN123',
        customerId: 'CUS123',
        amount: 85000,
        currency: 'INR',
        deviceId: 'DEV123',
        ipAddress: '10.0.0.1',
        location: 'Mumbai',
        paymentMethod: 'CARD',
      };

      const result = await transactionsService.createTransaction(payload);

      expect(result.transactionId).toBe('TXN123');
      expect(result.customerId).toBe('CUS123');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'TRANSACTION',
          entityId: 'TXN123',
          eventType: 'transaction.created',
        })
      );
    });

    it('should reject transaction when customer does not exist', async () => {
      vi.spyOn(customersRepository, 'findByExternalCustomerId').mockResolvedValue(null);

      const payload = {
        transactionId: 'TXN_MISSING_CUST',
        customerId: 'NON_EXISTENT_CUST',
        amount: 5000,
        currency: 'USD',
        paymentMethod: 'CARD',
      };

      await expect(transactionsService.createTransaction(payload)).rejects.toThrow(NotFoundError);
    });

    it('should reject duplicate transaction when transactionId already exists', async () => {
      const mockCustomer = {
        id: 'cust-uuid-1',
        externalCustomerId: 'CUS123',
        accountAge: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingTxn = {
        id: 'txn-uuid-existing',
        transactionId: 'TXN_DUP',
        customerId: 'CUS123',
        amount: new Prisma.Decimal(100),
        currency: 'USD',
        deviceId: null,
        ipAddress: null,
        location: null,
        paymentMethod: 'CARD',
        status: 'PENDING' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(customersRepository, 'findByExternalCustomerId').mockResolvedValue(mockCustomer);
      vi.spyOn(transactionsRepository, 'findByTransactionId').mockResolvedValue(existingTxn);

      const payload = {
        transactionId: 'TXN_DUP',
        customerId: 'CUS123',
        amount: 100,
        currency: 'USD',
        paymentMethod: 'CARD',
      };

      await expect(transactionsService.createTransaction(payload)).rejects.toThrow(ConflictError);
    });

    it('should retrieve transaction by ID', async () => {
      const mockTxn = {
        id: 'txn-uuid-123',
        transactionId: 'TXN123',
        customerId: 'CUS123',
        amount: new Prisma.Decimal(500),
        currency: 'EUR',
        deviceId: null,
        ipAddress: null,
        location: null,
        paymentMethod: 'CARD',
        status: 'PENDING' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(transactionsRepository, 'findByIdOrTransactionId').mockResolvedValue(mockTxn);

      const result = await transactionsService.getTransactionById('TXN123');
      expect(result.transactionId).toBe('TXN123');
    });

    it('should throw NotFoundError when retrieving non-existent transaction', async () => {
      vi.spyOn(transactionsRepository, 'findByIdOrTransactionId').mockResolvedValue(null);

      await expect(transactionsService.getTransactionById('TXN_NOT_FOUND')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('Fastify HTTP API Integration Tests', () => {
    const app = buildApp();

    it('POST /api/transactions should validate input and reject negative / zero amount', async () => {
      const responseZero = await app.inject({
        method: 'POST',
        url: '/api/transactions',
        payload: {
          transactionId: 'TXN_INVALID',
          customerId: 'CUS123',
          amount: 0,
          currency: 'USD',
          paymentMethod: 'CARD',
        },
      });

      expect(responseZero.statusCode).toBe(422);
      const bodyZero = JSON.parse(responseZero.body);
      expect(bodyZero.success).toBe(false);
      expect(bodyZero.error.code).toBe('VALIDATION_ERROR');

      const responseNegative = await app.inject({
        method: 'POST',
        url: '/api/transactions',
        payload: {
          transactionId: 'TXN_INVALID',
          customerId: 'CUS123',
          amount: -500,
          currency: 'USD',
          paymentMethod: 'CARD',
        },
      });

      expect(responseNegative.statusCode).toBe(422);
    });

    it('POST /api/transactions should validate currency is valid 3-letter uppercase code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/transactions',
        payload: {
          transactionId: 'TXN_INVALID_CURR',
          customerId: 'CUS123',
          amount: 100,
          currency: 'us dollars',
          paymentMethod: 'CARD',
        },
      });

      expect(response.statusCode).toBe(422);
    });

    it('POST /api/transactions should support Idempotency-Key header deduplication', async () => {
      const idempotencySpy = vi
        .spyOn(IdempotencyService.prototype, 'getRecord')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          statusCode: 201,
          body: {
            success: true,
            data: { transactionId: 'TXN_IDEMPOTENT', status: 'PENDING' },
            message: 'Transaction created successfully',
          },
        });

      const mockCustomer = {
        id: 'cust-1',
        externalCustomerId: 'CUS123',
        accountAge: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTransaction = {
        id: 'txn-uuid-idemp',
        transactionId: 'TXN_IDEMPOTENT',
        customerId: 'CUS123',
        amount: new Prisma.Decimal(2500),
        currency: 'USD',
        deviceId: 'DEV1',
        ipAddress: '127.0.0.1',
        location: 'NY',
        paymentMethod: 'CARD',
        status: 'PENDING' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(mockCustomer);
      vi.spyOn(prisma.transaction, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.transaction, 'create').mockResolvedValue(mockTransaction);
      vi.spyOn(prisma.auditEvent, 'create').mockResolvedValue({
        id: 'aud-1',
        entityType: 'TRANSACTION',
        entityId: 'TXN_IDEMPOTENT',
        eventType: 'transaction.created',
        metadata: {},
        createdAt: new Date(),
      });
      vi.spyOn(IdempotencyService.prototype, 'saveRecord').mockResolvedValue();

      // First call (creates record)
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/transactions',
        headers: {
          'idempotency-key': 'idem-key-999',
        },
        payload: {
          transactionId: 'TXN_IDEMPOTENT',
          customerId: 'CUS123',
          amount: 2500,
          currency: 'USD',
          paymentMethod: 'CARD',
        },
      });

      expect(res1.statusCode).toBe(201);

      // Second call with same idempotency key (returns cached)
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/transactions',
        headers: {
          'idempotency-key': 'idem-key-999',
        },
        payload: {
          transactionId: 'TXN_IDEMPOTENT',
          customerId: 'CUS123',
          amount: 2500,
          currency: 'USD',
          paymentMethod: 'CARD',
        },
      });

      expect(res2.statusCode).toBe(201);
      const body2 = JSON.parse(res2.body);
      expect(body2.data.transactionId).toBe('TXN_IDEMPOTENT');
      expect(idempotencySpy).toHaveBeenCalledTimes(2);
    });

    it('GET /health returns { status: "ok" }', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
    });
  });
});
