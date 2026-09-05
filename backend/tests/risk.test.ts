import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskService } from '../src/modules/risk/risk.service.js';
import { RiskRepository } from '../src/modules/risk/risk.repository.js';
import { TransactionsRepository } from '../src/modules/transactions/transactions.repository.js';
import { FeatureGeneratorService } from '../src/modules/risk/feature-generator.service.js';
import { MLClient, MLTimeoutError } from '../src/infrastructure/ml/ml.client.js';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { AuditRepository } from '../src/modules/audit/audit.repository.js';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/infrastructure/database/prisma.js';
import { AppError, NotFoundError } from '../src/utils/errors.js';
import { Prisma } from '@prisma/client';

describe('Risk Management & ML Service Integration', () => {
  let riskRepository: RiskRepository;
  let transactionsRepository: TransactionsRepository;
  let featureGeneratorService: FeatureGeneratorService;
  let mlClient: MLClient;
  let auditRepository: AuditRepository;
  let auditService: AuditService;
  let riskService: RiskService;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(prisma));
    vi.spyOn(prisma.outboxEvent, 'create').mockResolvedValue({
      id: 'mock-outbox-risk',
      eventType: 'risk.scored',
      aggregateType: 'TRANSACTION',
      aggregateId: 'TXN123',
      payload: {},
      status: 'PENDING',
      retryCount: 0,
      lastError: null,
      createdAt: new Date(),
      publishedAt: null,
    } as any);

    riskRepository = new RiskRepository();
    transactionsRepository = new TransactionsRepository();
    featureGeneratorService = new FeatureGeneratorService();
    mlClient = new MLClient();
    auditRepository = new AuditRepository();
    auditService = new AuditService(auditRepository);

    riskService = new RiskService(
      riskRepository,
      transactionsRepository,
      featureGeneratorService,
      mlClient,
      auditService
    );
  });

  describe('RiskService Unit Tests', () => {
    it('should successfully calculate risk score and persist factors when ML service succeeds', async () => {
      const mockTxn = {
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

      const mockMLExplainResponse = {
        fraudProbability: 0.93,
        riskScore: 93,
        modelVersion: 'v1',
        riskFactors: [
          { feature: 'amountRatio', impact: 'high', contribution: 2.1, value: 8.5 },
          { feature: 'isNewDevice', impact: 'high', contribution: 1.5, value: 1 },
        ],
      };

      vi.spyOn(transactionsRepository, 'findByIdOrTransactionId').mockResolvedValue(mockTxn);
      vi.spyOn(featureGeneratorService, 'generateFeatures').mockResolvedValue(mockFeatures);
      vi.spyOn(mlClient, 'explain').mockResolvedValue(mockMLExplainResponse);

      const saveSpy = vi.spyOn(riskRepository, 'saveRiskScore').mockResolvedValue({
        transactionId: 'TXN123',
        riskScore: 93,
        fraudProbability: 0.93,
        modelVersion: 'v1',
        status: 'COMPLETED',
        riskFactors: [
          { feature: 'amountRatio', impact: 'high', explanation: 'contribution: 2.1' },
          { feature: 'isNewDevice', impact: 'high', explanation: 'contribution: 1.5' },
        ],
      });

      const auditSpy = vi.spyOn(auditService, 'logEvent').mockResolvedValue({
        id: 'aud-risk-1',
        entityType: 'TRANSACTION',
        entityId: 'TXN123',
        eventType: 'risk.evaluated',
        metadata: {},
        createdAt: new Date(),
      });

      const result = await riskService.calculateRisk('TXN123');

      expect(result.transactionId).toBe('TXN123');
      expect(result.riskScore).toBe(93);
      expect(result.fraudProbability).toBe(0.93);
      expect(result.riskFactors).toHaveLength(2);
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'TRANSACTION',
          entityId: 'TXN123',
          eventType: 'risk.evaluated',
        })
      );
    });

    it('should handle ML timeout gracefully: record failure audit event and save failure status', async () => {
      const mockTxn = {
        id: 'txn-uuid-2',
        transactionId: 'TXN_TIMEOUT',
        customerId: 'CUS456',
        amount: new Prisma.Decimal(5000),
        currency: 'USD',
        deviceId: 'DEV1',
        ipAddress: '127.0.0.1',
        location: 'NY',
        paymentMethod: 'CARD',
        status: 'PENDING' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(transactionsRepository, 'findByIdOrTransactionId').mockResolvedValue(mockTxn);
      vi.spyOn(featureGeneratorService, 'generateFeatures').mockResolvedValue({
        amount: 5000,
        currency: 'USD',
        paymentMethod: 'CARD',
        customerAvgAmount: 5000,
        transactionsLast10Min: 1,
        transactionsLast24Hours: 1,
        failedAttempts: 0,
        accountAge: 30,
        isNewDevice: 0,
        isNewIp: 0,
        previousFraudCount: 0,
      });

      vi.spyOn(mlClient, 'explain').mockRejectedValue(new MLTimeoutError(3000));
      const auditSpy = vi.spyOn(auditService, 'logEvent').mockResolvedValue({
        id: 'aud-fail-1',
        entityType: 'TRANSACTION',
        entityId: 'TXN_TIMEOUT',
        eventType: 'risk.evaluation_failed',
        metadata: {},
        createdAt: new Date(),
      });

      const saveSpy = vi.spyOn(riskRepository, 'saveRiskScore').mockResolvedValue({
        transactionId: 'TXN_TIMEOUT',
        riskScore: 50,
        fraudProbability: 0.5,
        modelVersion: 'fallback-v0',
        status: 'FAILED',
        riskFactors: [],
      });

      await expect(riskService.calculateRisk('TXN_TIMEOUT')).rejects.toThrow(AppError);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'TRANSACTION',
          entityId: 'TXN_TIMEOUT',
          eventType: 'risk.evaluation_failed',
        })
      );
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FAILED',
        })
      );
    });

    it('should throw NotFoundError when transaction does not exist', async () => {
      vi.spyOn(transactionsRepository, 'findByIdOrTransactionId').mockResolvedValue(null);

      await expect(riskService.calculateRisk('NON_EXISTENT')).rejects.toThrow(NotFoundError);
    });

    it('should retrieve existing risk score', async () => {
      vi.spyOn(riskRepository, 'findByTransactionId').mockResolvedValue({
        transactionId: 'TXN123',
        riskScore: 88,
        fraudProbability: 0.88,
        modelVersion: 'v1',
        status: 'COMPLETED',
        riskFactors: [{ feature: 'amountRatio', impact: 'high', explanation: 'High spike' }],
      });

      const result = await riskService.getRiskScore('TXN123');
      expect(result.transactionId).toBe('TXN123');
      expect(result.riskScore).toBe(88);
    });
  });

  describe('Fastify Risk Endpoints Integration Tests', () => {
    const app = buildApp();

    it('POST /api/risk/score/:transactionId should calculate and return risk payload', async () => {
      vi.spyOn(prisma.transaction, 'findUnique').mockResolvedValue({
        id: 'txn-uuid-99',
        transactionId: 'TXN_API_TEST',
        customerId: 'CUS123',
        amount: new Prisma.Decimal(50000),
        currency: 'INR',
        deviceId: 'DEV99',
        ipAddress: '192.168.1.1',
        location: 'Delhi',
        paymentMethod: 'CARD',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue({
        id: 'c1',
        externalCustomerId: 'CUS123',
        accountAge: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(prisma.transaction, 'aggregate').mockResolvedValue({
        _avg: { amount: new Prisma.Decimal(10000) },
        _count: {},
        _sum: {},
        _min: {},
        _max: {},
      });

      vi.spyOn(prisma.transaction, 'count').mockResolvedValue(2);
      vi.spyOn(prisma.transaction, 'findFirst').mockResolvedValue(null);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(prisma);
      });

      vi.spyOn(MLClient.prototype, 'explain').mockResolvedValue({
        fraudProbability: 0.91,
        riskScore: 91,
        modelVersion: 'v1',
        riskFactors: [{ feature: 'amountRatio', impact: 'high', contribution: 2.0, value: 5.0 }],
      });

      vi.spyOn(prisma.riskScore, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.riskScore, 'create').mockResolvedValue({
        id: 'risk-1',
        transactionId: 'TXN_API_TEST',
        fraudProbability: 0.91,
        riskScore: 91,
        modelVersion: 'v1',
        status: 'COMPLETED',
        createdAt: new Date(),
        factors: [
          {
            id: 'rf-1',
            riskScoreId: 'risk-1',
            feature: 'amountRatio',
            impact: 'high',
            explanation: 'contribution: 2.0',
            createdAt: new Date(),
          },
        ],
      } as any);


      vi.spyOn(prisma.auditEvent, 'create').mockResolvedValue({
        id: 'aud-1',
        entityType: 'TRANSACTION',
        entityId: 'TXN_API_TEST',
        eventType: 'risk.evaluated',
        metadata: {},
        createdAt: new Date(),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/risk/score/TXN_API_TEST',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.transactionId).toBe('TXN_API_TEST');
      expect(body.data.riskScore).toBe(91);
      expect(body.data.fraudProbability).toBe(0.91);
      expect(body.data.modelVersion).toBe('v1');
      expect(body.data.riskFactors).toHaveLength(1);
    });

    it('GET /api/risk/:transactionId should return 404 when risk score not found', async () => {
      vi.spyOn(prisma.riskScore, 'findUnique').mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/risk/TXN_NON_EXISTENT',
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
