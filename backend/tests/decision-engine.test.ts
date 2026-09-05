import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskDecisionEngine } from '../src/modules/risk/decision-engine/decision-engine.js';
import { RiskDecisionService } from '../src/modules/risk/risk-decision.service.js';
import { RiskDecisionRepository } from '../src/modules/risk/risk-decision.repository.js';
import { TransactionsRepository } from '../src/modules/transactions/transactions.repository.js';
import { FeatureGeneratorService } from '../src/modules/risk/feature-generator.service.js';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { AuditRepository } from '../src/modules/audit/audit.repository.js';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/infrastructure/database/prisma.js';
import { NotFoundError } from '../src/utils/errors.js';
import { Prisma } from '@prisma/client';

describe('Phase 4: Risk Decision Engine', () => {
  let decisionEngine: RiskDecisionEngine;
  let riskDecisionRepository: RiskDecisionRepository;
  let transactionsRepository: TransactionsRepository;
  let featureGeneratorService: FeatureGeneratorService;
  let auditRepository: AuditRepository;
  let auditService: AuditService;
  let riskDecisionService: RiskDecisionService;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(prisma));
    vi.spyOn(prisma.outboxEvent, 'create').mockResolvedValue({
      id: 'mock-outbox-dec',
      eventType: 'risk.decision.created',
      aggregateType: 'TRANSACTION',
      aggregateId: 'TXN123',
      payload: {},
      status: 'PENDING',
      retryCount: 0,
      lastError: null,
      createdAt: new Date(),
      publishedAt: null,
    } as any);
    vi.spyOn(prisma.transaction, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue({
      id: 'c1',
      externalCustomerId: 'CUS123',
      accountAge: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    decisionEngine = new RiskDecisionEngine(30, 75);
    riskDecisionRepository = new RiskDecisionRepository();
    transactionsRepository = new TransactionsRepository();
    featureGeneratorService = new FeatureGeneratorService();
    auditRepository = new AuditRepository();
    auditService = new AuditService(auditRepository);

    riskDecisionService = new RiskDecisionService(
      riskDecisionRepository,
      transactionsRepository,
      featureGeneratorService,
      decisionEngine,
      auditService
    );
  });

  describe('Deterministic Decision Engine Unit Tests', () => {
    it('should correctly calculate expected loss = amount * fraudProbability', () => {
      const loss1 = decisionEngine.calculateExpectedLoss(10000, 0.25);
      expect(loss1).toBe(2500.0);

      const loss2 = decisionEngine.calculateExpectedLoss(85000, 0.93);
      expect(loss2).toBe(79050.0);

      const loss3 = decisionEngine.calculateExpectedLoss(500, 0.0);
      expect(loss3).toBe(0.0);
    });

    it('should decide APPROVE for low-risk transaction (riskScore < 30)', () => {
      const context = {
        transactionId: 'TXN_LOW',
        amount: 2500,
        currency: 'INR',
        fraudProbability: 0.12,
        riskScore: 12,
        previousFraudCount: 0,
        isNewDevice: false,
        isNewIp: false,
        accountAge: 120,
        failedAttempts: 0,
      };

      const result = decisionEngine.evaluate(context);
      expect(result.decision).toBe('APPROVE');
      expect(result.expectedLoss).toBe(300.0);
    });

    it('should decide REVIEW for medium-risk transaction (30 <= riskScore <= 74)', () => {
      const context = {
        transactionId: 'TXN_MED',
        amount: 15000,
        currency: 'INR',
        fraudProbability: 0.55,
        riskScore: 55,
        previousFraudCount: 0,
        isNewDevice: false,
        isNewIp: false,
        accountAge: 45,
        failedAttempts: 1,
      };

      const result = decisionEngine.evaluate(context);
      expect(result.decision).toBe('REVIEW');
      expect(result.expectedLoss).toBe(8250.0);
    });

    it('should decide BLOCK for high-risk transaction (riskScore >= 75)', () => {
      const context = {
        transactionId: 'TXN_HIGH',
        amount: 50000,
        currency: 'INR',
        fraudProbability: 0.88,
        riskScore: 88,
        previousFraudCount: 0,
        isNewDevice: false,
        isNewIp: false,
        accountAge: 10,
        failedAttempts: 2,
      };

      const result = decisionEngine.evaluate(context);
      expect(result.decision).toBe('BLOCK');
      expect(result.expectedLoss).toBe(44000.0);
    });

    it('should trigger RULE_CRITICAL_FRAUD_HISTORY override to BLOCK when fraudProbability > 0.95 and previousFraudCount > 0', () => {
      const context = {
        transactionId: 'TXN_OVERRIDE_1',
        amount: 5000,
        currency: 'USD',
        fraudProbability: 0.98,
        riskScore: 70, // Even if score is below 75, rule override should BLOCK
        previousFraudCount: 2,
        isNewDevice: false,
        isNewIp: false,
        accountAge: 5,
        failedAttempts: 1,
      };

      const result = decisionEngine.evaluate(context);
      expect(result.decision).toBe('BLOCK');
      expect(result.ruleTriggered).toBe('RULE_CRITICAL_FRAUD_HISTORY');
    });

    it('should trigger RULE_HIGH_PROBABILITY_NEW_DEVICE override to REVIEW when fraudProbability > 0.70 and isNewDevice is true', () => {
      const context = {
        transactionId: 'TXN_OVERRIDE_2',
        amount: 8000,
        currency: 'INR',
        fraudProbability: 0.72,
        riskScore: 72,
        previousFraudCount: 0,
        isNewDevice: true,
        isNewIp: false,
        accountAge: 20,
        failedAttempts: 0,
      };

      const result = decisionEngine.evaluate(context);
      expect(result.decision).toBe('REVIEW');
      expect(result.ruleTriggered).toBe('RULE_HIGH_PROBABILITY_NEW_DEVICE');
    });

    it('should trigger RULE_EXCESSIVE_EXPECTED_LOSS override when financial exposure is high', () => {
      const context = {
        transactionId: 'TXN_OVERRIDE_3',
        amount: 100000,
        currency: 'INR',
        fraudProbability: 0.60,
        riskScore: 60, // Normal review band, but high exposure triggers BLOCK
        previousFraudCount: 0,
        isNewDevice: false,
        isNewIp: false,
        accountAge: 100,
        failedAttempts: 0,
      };

      const result = decisionEngine.evaluate(context);
      expect(result.decision).toBe('BLOCK');
      expect(result.ruleTriggered).toBe('RULE_EXCESSIVE_EXPECTED_LOSS');
      expect(result.expectedLoss).toBe(60000.0);
    });
  });

  describe('RiskDecisionService End-to-End Orchestration', () => {
    it('should orchestrate decision, save to database, and emit audit events', async () => {
      const mockTxn = {
        id: 'txn-uuid-dec-1',
        transactionId: 'TXN_DEC_123',
        customerId: 'CUS123',
        amount: new Prisma.Decimal(85000),
        currency: 'INR',
        deviceId: 'DEV1',
        ipAddress: '10.0.0.1',
        location: 'Mumbai',
        paymentMethod: 'CARD',
        status: 'PENDING' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRiskScore = {
        id: 'risk-score-uuid-1',
        transactionId: 'TXN_DEC_123',
        fraudProbability: 0.93,
        riskScore: 93,
        modelVersion: 'v1',
        status: 'COMPLETED',
        createdAt: new Date(),
      };

      const mockFeatures = {
        amount: 85000,
        currency: 'INR',
        paymentMethod: 'CARD',
        customerAvgAmount: 10000,
        transactionsLast10Min: 4,
        transactionsLast24Hours: 8,
        failedAttempts: 2,
        accountAge: 15,
        isNewDevice: 1,
        isNewIp: 1,
        previousFraudCount: 1,
      };

      vi.spyOn(transactionsRepository, 'findByIdOrTransactionId').mockResolvedValue(mockTxn);
      vi.spyOn(prisma.riskScore, 'findUnique').mockResolvedValue(mockRiskScore);
      vi.spyOn(featureGeneratorService, 'generateFeatures').mockResolvedValue(mockFeatures);

      const saveSpy = vi.spyOn(riskDecisionRepository, 'saveDecision').mockResolvedValue({
        id: 'dec-uuid-1',
        transactionId: 'TXN_DEC_123',
        riskScoreId: 'risk-score-uuid-1',
        decision: 'BLOCK',
        reason: 'RULE_CRITICAL_FRAUD_HISTORY: override',
        expectedLoss: new Prisma.Decimal(79050.0),
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const auditSpy = vi.spyOn(auditService, 'logEvent').mockResolvedValue({
        id: 'aud-dec-1',
        entityType: 'TRANSACTION',
        entityId: 'TXN_DEC_123',
        eventType: 'risk.decision.created',
        metadata: {},
        createdAt: new Date(),
      });

      const decision = await riskDecisionService.makeDecision('TXN_DEC_123');

      expect(decision.decision).toBe('BLOCK');
      expect(Number(decision.expectedLoss)).toBe(79050.0);
      expect(saveSpy).toHaveBeenCalledTimes(1);

      // Verify audit events emitted
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'TRANSACTION',
          entityId: 'TXN_DEC_123',
          eventType: 'risk.decision.created',
        })
      );
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'TRANSACTION',
          entityId: 'TXN_DEC_123',
          eventType: 'transaction.blocked',
        })
      );
    });

    it('should throw NotFoundError if risk score has not been calculated yet', async () => {
      const mockTxn = {
        id: 'txn-uuid-no-score',
        transactionId: 'TXN_NO_SCORE',
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

      vi.spyOn(transactionsRepository, 'findByIdOrTransactionId').mockResolvedValue(mockTxn);
      vi.spyOn(prisma.riskScore, 'findUnique').mockResolvedValue(null);

      await expect(riskDecisionService.makeDecision('TXN_NO_SCORE')).rejects.toThrow(NotFoundError);
    });
  });

  describe('Fastify Decision Endpoints Integration Tests', () => {
    const app = buildApp();

    it('POST /api/risk/decision/:transactionId should compute and return risk decision payload', async () => {
      vi.spyOn(prisma.transaction, 'findUnique').mockResolvedValue({
        id: 'txn-uuid-api',
        transactionId: 'TXN_API_DEC',
        customerId: 'CUS123',
        amount: new Prisma.Decimal(10000),
        currency: 'INR',
        deviceId: 'DEV1',
        ipAddress: '127.0.0.1',
        location: 'Delhi',
        paymentMethod: 'UPI',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(prisma.riskScore, 'findUnique').mockResolvedValue({
        id: 'rs-uuid-api',
        transactionId: 'TXN_API_DEC',
        fraudProbability: 0.15,
        riskScore: 15,
        modelVersion: 'v1',
        status: 'COMPLETED',
        createdAt: new Date(),
      });

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue({
        id: 'c1',
        externalCustomerId: 'CUS123',
        accountAge: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(prisma.transaction, 'aggregate').mockResolvedValue({
        _avg: { amount: new Prisma.Decimal(9000) },
        _count: {},
        _sum: {},
        _min: {},
        _max: {},
      });

      vi.spyOn(prisma.transaction, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.transaction, 'findFirst').mockResolvedValue(null);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(prisma);
      });

      vi.spyOn(prisma.riskDecision, 'upsert').mockResolvedValue({
        id: 'dec-1',
        transactionId: 'TXN_API_DEC',
        riskScoreId: 'rs-uuid-api',
        decision: 'APPROVE',
        reason: 'THRESHOLD_APPROVE: Risk score 15 below 30',
        expectedLoss: new Prisma.Decimal(1500.0),
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(prisma.transaction, 'update').mockResolvedValue({} as any);
      vi.spyOn(prisma.auditEvent, 'create').mockResolvedValue({} as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/risk/decision/TXN_API_DEC',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.decision).toBe('APPROVE');
      expect(body.data.expectedLoss).toBe(1500.0);
    });

    it('GET /api/risk/decision/:transactionId should return decision payload', async () => {
      vi.spyOn(prisma.riskDecision, 'findUnique').mockResolvedValue({
        id: 'dec-123',
        transactionId: 'TXN_GET_DEC',
        riskScoreId: 'rs-123',
        decision: 'BLOCK',
        reason: 'THRESHOLD_BLOCK: score 90 >= 75',
        expectedLoss: new Prisma.Decimal(45000.0),
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/risk/decision/TXN_GET_DEC',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.decision).toBe('BLOCK');
      expect(body.data.expectedLoss).toBe(45000.0);
    });
  });
});
