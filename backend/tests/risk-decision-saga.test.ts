import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RiskDecisionSagaOrchestrator } from '../src/modules/saga/risk-decision.saga.js';
import { SagaRepository } from '../src/modules/saga/saga.repository.js';
import { TransactionsRepository } from '../src/modules/transactions/transactions.repository.js';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { SagaState } from '@prisma/client';

describe('Phase 8: Risk Decision Saga Workflow Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockTxn = {
    id: 'txn-saga-uuid-1',
    transactionId: 'TXN_SAGA_100',
    customerId: 'CUS_99',
    amount: 55000,
    currency: 'INR',
    deviceId: 'DEV_SAGA',
    ipAddress: '192.168.1.5',
    location: 'Mumbai',
    paymentMethod: 'CARD',
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ==========================================
  // 1. SUCCESSFUL SAGA EXECUTION
  // ==========================================
  describe('Successful End-to-End Saga', () => {
    it('should transition through START -> RISK_SCORING -> RULE_EVALUATION -> DECISION_CREATED -> VERIFICATION -> MERCHANT_NOTIFIED -> COMPLETED', async () => {
      let currentState: SagaState = SagaState.PENDING;
      let currentStep = 'START';
      let currentContext: any = {};

      const mockSagaRepo = {
        findByTransactionId: vi.fn().mockResolvedValue(null),
        createSaga: vi.fn().mockImplementation(async (txId, ctx) => {
          currentContext = ctx;
          return { id: 'saga-uuid-1', transactionId: txId, state: SagaState.PENDING, currentStep: 'START', context: ctx };
        }),
        updateStep: vi.fn().mockImplementation(async (id, step, state, ctx) => {
          currentStep = step;
          currentState = state;
          currentContext = ctx;
          return { id, transactionId: 'TXN_SAGA_100', state, currentStep: step, context: ctx };
        }),
        logStep: vi.fn().mockResolvedValue(undefined),
        updateRetryCount: vi.fn().mockResolvedValue(undefined),
      } as unknown as SagaRepository;

      const mockTxnRepo = {
        findByIdOrTransactionId: vi.fn().mockResolvedValue(mockTxn),
      } as unknown as TransactionsRepository;

      const mockAuditService = {
        logEvent: vi.fn().mockResolvedValue({ id: 'aud-1' }),
      } as unknown as AuditService;

      const orchestrator = new RiskDecisionSagaOrchestrator(
        mockSagaRepo,
        mockTxnRepo,
        undefined,
        undefined,
        mockAuditService,
        { maxRetries: 2, initialBackoffMs: 1, backoffMultiplier: 1 }
      );

      const result = await orchestrator.executeSaga('TXN_SAGA_100');

      expect(result.status).toBe('COMPLETED');
      expect(result.currentStep).toBe('COMPLETED');
      expect(result.context.riskScore).toBe(85);
      expect(result.context.decision).toBe('BLOCK');
      expect(result.context.merchantNotificationId).toBeDefined();

      // Check step logging called
      expect(mockSagaRepo.logStep).toHaveBeenCalledWith('saga-uuid-1', 'RISK_SCORING', 'STARTED');
      expect(mockSagaRepo.logStep).toHaveBeenCalledWith('saga-uuid-1', 'RISK_SCORING', 'COMPLETED', expect.anything());
      expect(mockSagaRepo.logStep).toHaveBeenCalledWith('saga-uuid-1', 'MERCHANT_NOTIFIED', 'COMPLETED', expect.anything());

      // Check audit events
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SAGA_COMPLETED',
        })
      );
    });
  });

  // ==========================================
  // 2. RETRY & RETRY EXHAUSTION FALLBACK
  // ==========================================
  describe('Saga Retry & Exponential Backoff Fallback', () => {
    it('should retry a failing step with backoff and fall back to Manual Review when retries are exhausted', async () => {
      const mockSagaRepo = {
        findByTransactionId: vi.fn().mockResolvedValue(null),
        createSaga: vi.fn().mockResolvedValue({
          id: 'saga-fail-1',
          transactionId: 'TXN_FAIL',
          state: SagaState.PENDING,
          currentStep: 'START',
          context: {},
        }),
        updateStep: vi.fn().mockResolvedValue({}),
        logStep: vi.fn().mockResolvedValue(undefined),
        updateRetryCount: vi.fn().mockResolvedValue(undefined),
      } as unknown as SagaRepository;

      const mockTxnRepo = {
        findByIdOrTransactionId: vi.fn().mockResolvedValue(mockTxn),
      } as unknown as TransactionsRepository;

      const mockRiskService = {
        calculateRisk: vi.fn().mockRejectedValue(new Error('ML Engine Timeout')),
      };

      const mockAuditService = {
        logEvent: vi.fn().mockResolvedValue({ id: 'aud-fail' }),
      } as unknown as AuditService;

      const orchestrator = new RiskDecisionSagaOrchestrator(
        mockSagaRepo,
        mockTxnRepo,
        mockRiskService as any,
        undefined,
        mockAuditService,
        { maxRetries: 3, initialBackoffMs: 2, backoffMultiplier: 2 }
      );

      const result = await orchestrator.executeSaga('TXN_FAIL');

      expect(result.status).toBe('FAILED');
      expect(result.currentStep).toBe('RISK_SCORING');
      expect(result.context.fallbackToReview).toBe(true);
      expect(result.context.decision).toBe('REVIEW');
      expect(result.context.decisionReason).toContain('SAGA_RETRY_EXHAUSTED_FALLBACK');

      // 3 retry attempts logged
      expect(mockRiskService.calculateRisk).toHaveBeenCalledTimes(3);
      expect(mockSagaRepo.updateRetryCount).toHaveBeenCalledWith('saga-fail-1', 3, expect.stringContaining('ML Engine Timeout'));
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SAGA_FALLBACK_REVIEW',
        })
      );
    });
  });

  // ==========================================
  // 3. APPLICATION CRASH RESUME
  // ==========================================
  describe('Crash Recovery & Resume', () => {
    it('should resume an interrupted Saga from VERIFICATION_REQUESTED without re-running earlier steps', async () => {
      const persistedSaga = {
        id: 'saga-crashed-1',
        transactionId: 'TXN_CRASH_RESUME',
        state: SagaState.RUNNING,
        currentStep: 'VERIFICATION_REQUESTED',
        context: {
          transactionId: 'TXN_CRASH_RESUME',
          amount: 25000,
          riskScore: 60,
          fraudProbability: 0.6,
          decision: 'REVIEW' as const,
          decisionReason: 'Review band risk score',
          stepExecutionHistory: [
            { step: 'RISK_SCORING', status: 'COMPLETED' },
            { step: 'RULE_EVALUATION', status: 'COMPLETED' },
            { step: 'DECISION_CREATED', status: 'COMPLETED' },
          ],
        },
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      };

      const mockSagaRepo = {
        findById: vi.fn().mockResolvedValue(persistedSaga),
        updateStep: vi.fn().mockImplementation(async (id, step, state, ctx) => ({
          ...persistedSaga,
          currentStep: step,
          state,
          context: ctx,
        })),
        logStep: vi.fn().mockResolvedValue(undefined),
        updateRetryCount: vi.fn().mockResolvedValue(undefined),
      } as unknown as SagaRepository;

      const mockTxnRepo = {
        findByIdOrTransactionId: vi.fn().mockResolvedValue(mockTxn),
      } as unknown as TransactionsRepository;

      const mockAuditService = {
        logEvent: vi.fn().mockResolvedValue({ id: 'aud-resume' }),
      } as unknown as AuditService;

      const orchestrator = new RiskDecisionSagaOrchestrator(
        mockSagaRepo,
        mockTxnRepo,
        undefined,
        undefined,
        mockAuditService,
        { maxRetries: 2, initialBackoffMs: 1, backoffMultiplier: 1 }
      );

      const result = await orchestrator.resumeSaga('saga-crashed-1');

      expect(result.status).toBe('COMPLETED');
      expect(result.isResumed).toBe(true);
      expect(result.context.verificationCaseId).toBe('verif-case-TXN_CRASH_RESUME');
      expect(result.context.verificationStatus).toBe('COMPLETED');
      expect(result.context.merchantNotificationId).toBeDefined();

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SAGA_RESUMED',
          metadata: expect.objectContaining({ resumedStep: 'VERIFICATION_REQUESTED' }),
        })
      );
    });
  });

  // ==========================================
  // 4. IDEMPOTENCY
  // ==========================================
  describe('Saga Idempotency', () => {
    it('should return ALREADY_COMPLETED on completed saga with zero duplicate side effects', async () => {
      const completedSaga = {
        id: 'saga-done-1',
        transactionId: 'TXN_DONE',
        state: SagaState.COMPLETED,
        currentStep: 'COMPLETED',
        context: {
          transactionId: 'TXN_DONE',
          riskScore: 20,
          decision: 'APPROVE',
        },
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      };

      const mockSagaRepo = {
        findByTransactionId: vi.fn().mockResolvedValue(completedSaga),
        createSaga: vi.fn(),
        updateStep: vi.fn(),
        logStep: vi.fn(),
      } as unknown as SagaRepository;

      const mockTxnRepo = {
        findByIdOrTransactionId: vi.fn(),
      } as unknown as TransactionsRepository;

      const mockAuditService = {
        logEvent: vi.fn(),
      } as unknown as AuditService;

      const orchestrator = new RiskDecisionSagaOrchestrator(
        mockSagaRepo,
        mockTxnRepo,
        undefined,
        undefined,
        mockAuditService
      );

      const result = await orchestrator.executeSaga('TXN_DONE');

      expect(result.status).toBe('ALREADY_COMPLETED');
      expect(result.currentStep).toBe('COMPLETED');
      expect(result.context.decision).toBe('APPROVE');

      // Zero side effects executed
      expect(mockSagaRepo.createSaga).not.toHaveBeenCalled();
      expect(mockSagaRepo.updateStep).not.toHaveBeenCalled();
      expect(mockAuditService.logEvent).not.toHaveBeenCalled();
    });
  });
});
