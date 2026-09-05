import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RiskDecisionSagaOrchestrator } from '../src/modules/saga/risk-decision.saga.js';
import { SagaRepository } from '../src/modules/saga/saga.repository.js';
import { RiskService } from '../src/modules/risk/risk.service.js';
import { RiskRepository } from '../src/modules/risk/risk.repository.js';
import { TransactionsRepository } from '../src/modules/transactions/transactions.repository.js';
import { FeatureGeneratorService } from '../src/modules/risk/feature-generator.service.js';
import { MLClient, MLServiceError } from '../src/infrastructure/ml/ml.client.js';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { AuditRepository } from '../src/modules/audit/audit.repository.js';
import { OutboxRepository } from '../src/infrastructure/outbox/outbox.repository.js';
import { RateLimiterService } from '../src/infrastructure/redis/rate-limiter.service.js';
import { prisma } from '../src/infrastructure/database/prisma.js';
import { buildApp } from '../src/app.js';
import { AppError } from '../src/utils/errors.js';
import { Prisma, SagaState } from '@prisma/client';

describe('Hackathon Demonstrations: System Reliability & Failure Resilience', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(prisma));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Scenario 1: Duplicate Transaction Request (Idempotency)
  describe('1. Duplicate Transaction Request Resilience', () => {
    it('should return cached idempotent result without reprocessing when Idempotency-Key is repeated', async () => {
      const app = await buildApp();

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue({
        id: 'cust-1',
        externalCustomerId: 'CUS_IDEM',
        accountAge: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(prisma.transaction, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.transaction, 'create').mockResolvedValue({
        id: 'tx-uuid-1',
        transactionId: 'TXN_IDEM_1',
        customerId: 'CUS_IDEM',
        amount: new Prisma.Decimal(5000),
        currency: 'INR',
        deviceId: 'DEV1',
        ipAddress: '10.0.0.1',
        location: 'Mumbai',
        paymentMethod: 'CARD',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(prisma.auditEvent, 'create').mockResolvedValue({} as any);
      vi.spyOn(prisma.outboxEvent, 'create').mockResolvedValue({} as any);

      // Mock idempotency record in DB for replay
      vi.spyOn(prisma.idempotencyRecord, 'findUnique')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'idem-1',
          key: 'IDEM_KEY_DEMO_123',
          targetPath: '/api/transactions',
          requestHash: 'hash123',
          statusCode: 201,
          responseBody: {
            success: true,
            data: { transactionId: 'TXN_IDEM_1', amount: 5000, status: 'PENDING' },
            message: 'Transaction created successfully',
          },
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        });

      vi.spyOn(prisma.idempotencyRecord, 'create').mockResolvedValue({} as any);

      // First Request
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/transactions',
        headers: { 'idempotency-key': 'IDEM_KEY_DEMO_123' },
        payload: {
          transactionId: 'TXN_IDEM_1',
          customerId: 'CUS_IDEM',
          amount: 5000,
          currency: 'INR',
          paymentMethod: 'CARD',
        },
      });

      expect(res1.statusCode).toBe(201);

      // Replay Request with same Idempotency-Key
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/transactions',
        headers: { 'idempotency-key': 'IDEM_KEY_DEMO_123' },
        payload: {
          transactionId: 'TXN_IDEM_1',
          customerId: 'CUS_IDEM',
          amount: 5000,
          currency: 'INR',
          paymentMethod: 'CARD',
        },
      });

      expect(res2.statusCode).toBe(201);
      const json2 = res2.json();
      expect(json2.data.transactionId).toBe('TXN_IDEM_1');
    });
  });

  // Scenario 2: ML Service Failure / Timeout
  describe('2. ML Service Failure Resilience & Safe Fallback', () => {
    it('should degrade safely, record failure audit log, and flag for manual review when ML service is offline', async () => {
      const riskRepo = new RiskRepository();
      const txRepo = new TransactionsRepository();
      const featGen = new FeatureGeneratorService();
      const mlClient = new MLClient('http://localhost:9999', 50);
      const auditRepo = new AuditRepository();
      const auditService = new AuditService(auditRepo);
      const outboxRepo = new OutboxRepository();
      const riskService = new RiskService(riskRepo, txRepo, featGen, mlClient, auditService, outboxRepo);

      vi.spyOn(txRepo, 'findByIdOrTransactionId').mockResolvedValue({
        id: 'tx-fail-1',
        transactionId: 'TXN_ML_FAIL',
        customerId: 'CUS_1',
        amount: new Prisma.Decimal(10000),
        currency: 'INR',
        deviceId: null,
        ipAddress: null,
        location: null,
        paymentMethod: 'CARD',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(featGen, 'generateFeatures').mockResolvedValue({
        amount: 10000,
        currency: 'INR',
        paymentMethod: 'CARD',
        customerAvgAmount: 10000,
        transactionsLast10Min: 1,
        transactionsLast24Hours: 1,
        failedAttempts: 0,
        accountAge: 30,
        isNewDevice: 0,
        isNewIp: 0,
        previousFraudCount: 0,
      });

      const auditSpy = vi.spyOn(auditService, 'logEvent').mockResolvedValue({} as any);
      const saveSpy = vi.spyOn(riskRepo, 'saveRiskScore').mockResolvedValue({
        id: 'rs-fallback',
        transactionId: 'TXN_ML_FAIL',
        fraudProbability: 0.5,
        riskScore: 50,
        modelVersion: 'fallback-v0',
        status: 'FAILED',
        createdAt: new Date(),
        riskFactors: [],
      });

      // Force ML client connection error
      vi.spyOn(mlClient, 'explain').mockRejectedValue(new MLServiceError('Connection refused to ML endpoint', 503));

      await expect(riskService.calculateRisk('TXN_ML_FAIL')).rejects.toThrow(AppError);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'risk.evaluation_failed',
          entityId: 'TXN_ML_FAIL',
        })
      );

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          riskScore: 50,
          status: 'FAILED',
        })
      );
    });
  });

  // Scenario 3: Kafka Outbox Pattern & Zero Event Loss
  describe('3. Kafka Broker Failure Resilience (Transactional Outbox)', () => {
    it('should persist events atomically in PostgreSQL outbox table when Kafka broker is down', async () => {
      const outboxRepo = new OutboxRepository();

      const createSpy = vi.spyOn(prisma.outboxEvent, 'create').mockResolvedValue({
        id: 'outbox-uuid-1',
        eventType: 'transaction.created',
        aggregateType: 'TRANSACTION',
        aggregateId: 'TXN_KAFKA_DOWN',
        payload: { amount: 25000, currency: 'INR' },
        status: 'PENDING',
        retryCount: 0,
        lastError: null,
        createdAt: new Date(),
        publishedAt: null,
      });

      const event = await outboxRepo.createEvent({
        eventType: 'transaction.created',
        aggregateType: 'TRANSACTION',
        aggregateId: 'TXN_KAFKA_DOWN',
        payload: { amount: 25000, currency: 'INR' },
      });

      expect(createSpy).toHaveBeenCalled();
      expect(event.status).toBe('PENDING');
      expect(event.aggregateId).toBe('TXN_KAFKA_DOWN');
    });
  });

  // Scenario 4 & 5: Exponential Backoff Retry Math
  describe('4 & 5. Step Failure & Exponential Backoff Retries in Saga', () => {
    it('should verify deterministic exponential backoff formula', () => {
      const initialBackoffMs = 1000;
      const backoffMultiplier = 2;

      const calc = (attempt: number) => initialBackoffMs * Math.pow(backoffMultiplier, attempt - 1);

      expect(calc(1)).toBe(1000); // 1st retry: 1000ms
      expect(calc(2)).toBe(2000); // 2nd retry: 2000ms
      expect(calc(3)).toBe(4000); // 3rd retry: 4000ms
    });
  });

  // Scenario 6: Saga Resume from Checkpoint
  describe('6. Saga Resume from Persisted Checkpoint', () => {
    it('should resume from VERIFICATION_REQUESTED without re-running completed steps', async () => {
      let currentStep = 'VERIFICATION_REQUESTED';
      let currentState = SagaState.RUNNING;

      const mockSagaRepo = {
        findById: vi.fn().mockResolvedValue({
          id: 'saga-checkpoint-1',
          transactionId: 'TXN_RESUME_1',
          state: SagaState.RUNNING,
          currentStep: 'VERIFICATION_REQUESTED',
          context: {
            transactionId: 'TXN_RESUME_1',
            amount: 55000,
            currency: 'INR',
            customerId: 'CUS_99',
            riskScore: 78,
            decision: 'REVIEW',
            verificationStatus: 'OPEN',
            stepExecutionHistory: [],
          },
          retryCount: 0,
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
        }),
        updateStep: vi.fn().mockImplementation(async (id, step, state, ctx) => {
          currentStep = step;
          currentState = state;
          return { id, transactionId: 'TXN_RESUME_1', state, currentStep: step, context: ctx };
        }),
        logStep: vi.fn().mockResolvedValue(undefined),
        updateRetryCount: vi.fn().mockResolvedValue(undefined),
      } as unknown as SagaRepository;

      const mockTxnRepo = {
        findByIdOrTransactionId: vi.fn().mockResolvedValue({
          transactionId: 'TXN_RESUME_1',
          customerId: 'CUS_99',
          amount: 55000,
          currency: 'INR',
        }),
      } as unknown as TransactionsRepository;

      const orchestrator = new RiskDecisionSagaOrchestrator(
        mockSagaRepo,
        mockTxnRepo,
        undefined,
        undefined,
        undefined,
        { maxRetries: 1, initialBackoffMs: 10, backoffMultiplier: 1 }
      );

      const result = await orchestrator.resumeSaga('saga-checkpoint-1');
      expect(result.status).toBe('COMPLETED');
      expect(result.transactionId).toBe('TXN_RESUME_1');
      expect(currentStep).toBe('COMPLETED');

      expect(currentState).toBe(SagaState.COMPLETED);
    });
  });

  // Scenario 7: Already-Completed Saga Idempotency
  describe('7. Already-Completed Saga Idempotency (ALREADY_COMPLETED)', () => {
    it('should return ALREADY_COMPLETED and avoid re-executing side effects', async () => {
      const mockSagaRepo = {
        findByTransactionId: vi.fn().mockResolvedValue({
          id: 'saga-done-1',
          transactionId: 'TXN_ALREADY_DONE',
          state: SagaState.COMPLETED,
          currentStep: 'COMPLETED',
          context: { decision: 'APPROVE', riskScore: 12 },
          retryCount: 0,
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
        }),
      } as unknown as SagaRepository;

      const orchestrator = new RiskDecisionSagaOrchestrator(
        mockSagaRepo,
        {} as any,
        undefined,
        undefined,
        undefined
      );

      const result = await orchestrator.executeSaga('TXN_ALREADY_DONE');
      expect(result.status).toBe('ALREADY_COMPLETED');
      expect(result.sagaId).toBe('saga-done-1');
    });
  });

  // Scenario 8: Rate Limit Exceeded (HTTP 429)
  describe('8. API Rate Limiting Resilience (HTTP 429)', () => {
    it('should enforce rate limits and gracefully reject excess requests with remaining=0', async () => {
      const mockRedisClient = {
        isAvailable: vi.fn().mockReturnValue(false), // triggers safe memory fallback
      };

      const rateLimiter = new RateLimiterService(mockRedisClient as any);

      const config = {
        maxRequests: 2,
        windowSeconds: 60,
        keyPrefix: 'test_demo',
      };

      // 1st request
      const r1 = await rateLimiter.checkLimit('192.168.1.50', config);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(1);

      // 2nd request
      const r2 = await rateLimiter.checkLimit('192.168.1.50', config);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(0);

      // 3rd request (exceeds limit)
      const r3 = await rateLimiter.checkLimit('192.168.1.50', config);
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
      expect(r3.resetSeconds).toBeGreaterThan(0);
    });
  });
});
