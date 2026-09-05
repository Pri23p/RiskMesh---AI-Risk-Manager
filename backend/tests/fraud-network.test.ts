import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NetworkGraphService } from '../src/modules/fraud/network-graph.service.js';
import { FraudService } from '../src/modules/fraud/fraud.service.js';
import { FraudRepository } from '../src/modules/fraud/fraud.repository.js';
import { RiskDecisionEngine } from '../src/modules/risk/decision-engine/decision-engine.js';
import { prisma } from '../src/infrastructure/database/prisma.js';
import { buildApp } from '../src/app.js';
import { NotFoundError } from '../src/utils/errors.js';
import { Prisma } from '@prisma/client';

describe('Phase 9: Fraud Network Intelligence', () => {
  let networkGraphService: NetworkGraphService;
  let fraudRepository: FraudRepository;
  let fraudService: FraudService;
  let decisionEngine: RiskDecisionEngine;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(prisma));
    networkGraphService = new NetworkGraphService();
    fraudRepository = new FraudRepository();
    fraudService = new FraudService(fraudRepository, networkGraphService);
    decisionEngine = new RiskDecisionEngine(30, 75);
  });

  describe('NetworkGraphService Unit Tests', () => {
    it('should throw NotFoundError if target customer does not exist', async () => {
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(null);

      await expect(
        networkGraphService.buildCustomerNetworkGraph('NON_EXISTENT_CUST')
      ).rejects.toThrow(NotFoundError);
    });

    it('should build clean network graph for single customer without shared entities', async () => {
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue({
        id: 'c1-uuid',
        externalCustomerId: 'CUST_CLEAN',
        accountAge: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(prisma.transaction, 'findMany')
        .mockResolvedValueOnce([
          {
            id: 'tx1-uuid',
            transactionId: 'TXN_CLEAN_1',
            customerId: 'CUST_CLEAN',
            amount: new Prisma.Decimal(1500),
            currency: 'INR',
            deviceId: 'DEV_SOLO_1',
            ipAddress: '10.0.0.1',
            location: 'Mumbai, IN',
            paymentMethod: 'UPI',
            status: 'APPROVED',
            createdAt: new Date(),
            updatedAt: new Date(),
            riskScore: { riskScore: 10, fraudProbability: 0.1, id: 'rs1', transactionId: 'TXN_CLEAN_1', modelVersion: 'v1', status: 'COMPLETED', createdAt: new Date() },
            riskDecision: { id: 'rd1', transactionId: 'TXN_CLEAN_1', riskScoreId: 'rs1', decision: 'APPROVE', reason: 'clean', expectedLoss: new Prisma.Decimal(150), status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() },
          },
        ] as any)
        .mockResolvedValueOnce([]); // No connected transactions

      const result = await networkGraphService.buildCustomerNetworkGraph('CUST_CLEAN');

      expect(result.customerId).toBe('CUST_CLEAN');
      expect(result.signals.sharedDeviceCount).toBe(0);
      expect(result.signals.sharedIpCount).toBe(0);
      expect(result.signals.flaggedAccountConnections).toBe(0);
      expect(result.signals.networkRiskScore).toBe(0);
      expect(result.signals.isHighRiskRing).toBe(false);
      expect(result.nodes.length).toBeGreaterThanOrEqual(4); // Customer, Txn, Device, IP, Payment
      expect(result.links.length).toBeGreaterThanOrEqual(3);
    });

    it('should identify multi-account fraud ring with shared devices and flagged connections', async () => {
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue({
        id: 'c-origin-uuid',
        externalCustomerId: 'CUST_RING_LEADER',
        accountAge: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 1. Origin customer has 1 transaction on DEV_SHARED_99 and IP_SHARED_1
      vi.spyOn(prisma.transaction, 'findMany')
        .mockResolvedValueOnce([
          {
            id: 'tx1',
            transactionId: 'TXN_RING_1',
            customerId: 'CUST_RING_LEADER',
            amount: new Prisma.Decimal(95000),
            currency: 'INR',
            deviceId: 'DEV_SHARED_99',
            ipAddress: '103.11.22.33',
            location: 'Delhi, IN',
            paymentMethod: 'CARD',
            status: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
            riskScore: { riskScore: 85, fraudProbability: 0.85, id: 'rs1', transactionId: 'TXN_RING_1', modelVersion: 'v1', status: 'COMPLETED', createdAt: new Date() },
            riskDecision: null,
          },
        ] as any)
        // 2. Connected transactions from CUST_SYNDICATE_B and CUST_SYNDICATE_C (both BLOCKED)
        .mockResolvedValueOnce([
          {
            id: 'tx2',
            transactionId: 'TXN_RING_2',
            customerId: 'CUST_SYNDICATE_B',
            amount: new Prisma.Decimal(75000),
            currency: 'INR',
            deviceId: 'DEV_SHARED_99',
            ipAddress: '103.11.22.33',
            location: 'Delhi, IN',
            paymentMethod: 'CARD',
            status: 'BLOCKED',
            createdAt: new Date(),
            updatedAt: new Date(),
            riskScore: { riskScore: 95, fraudProbability: 0.95, id: 'rs2', transactionId: 'TXN_RING_2', modelVersion: 'v1', status: 'COMPLETED', createdAt: new Date() },
            riskDecision: { id: 'rd2', transactionId: 'TXN_RING_2', riskScoreId: 'rs2', decision: 'BLOCK', reason: 'Prior fraud', expectedLoss: new Prisma.Decimal(71250), status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() },
          },
          {
            id: 'tx3',
            transactionId: 'TXN_RING_3',
            customerId: 'CUST_SYNDICATE_C',
            amount: new Prisma.Decimal(62000),
            currency: 'INR',
            deviceId: 'DEV_SHARED_99',
            ipAddress: '103.11.22.33',
            location: 'Delhi, IN',
            paymentMethod: 'CARD',
            status: 'BLOCKED',
            createdAt: new Date(),
            updatedAt: new Date(),
            riskScore: { riskScore: 92, fraudProbability: 0.92, id: 'rs3', transactionId: 'TXN_RING_3', modelVersion: 'v1', status: 'COMPLETED', createdAt: new Date() },
            riskDecision: { id: 'rd3', transactionId: 'TXN_RING_3', riskScoreId: 'rs3', decision: 'BLOCK', reason: 'Fraud pattern', expectedLoss: new Prisma.Decimal(57040), status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() },
          },
        ] as any);

      vi.spyOn(prisma.customer, 'findMany').mockResolvedValue([
        { id: 'c2', externalCustomerId: 'CUST_SYNDICATE_B', accountAge: 2, createdAt: new Date(), updatedAt: new Date() },
        { id: 'c3', externalCustomerId: 'CUST_SYNDICATE_C', accountAge: 1, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const result = await networkGraphService.buildCustomerNetworkGraph('CUST_RING_LEADER');

      expect(result.signals.sharedDeviceCount).toBe(1);
      expect(result.signals.sharedIpCount).toBe(1);
      expect(result.signals.connectedCustomersCount).toBe(2);
      expect(result.signals.flaggedAccountConnections).toBe(2);
      expect(result.signals.isHighRiskRing).toBe(true);
      expect(result.signals.networkRiskScore).toBeGreaterThanOrEqual(65);
      expect(result.signals.summary).toContain('High-risk fraud ring detected');

      // Verify node generation
      const customerNodes = result.nodes.filter((n) => n.type === 'CUSTOMER');
      expect(customerNodes.length).toBe(3); // Origin + 2 syndicates
      const originNode = customerNodes.find((n) => n.isOrigin);
      expect(originNode).toBeDefined();
      expect(originNode?.id).toBe('CUST_RING_LEADER');
    });
  });

  describe('Decision Engine Network Rules Evaluation', () => {
    it('should trigger RULE_FRAUD_RING_SUSPECTED to BLOCK when flaggedAccountConnections >= 2 and fraudProbability >= 0.50', () => {
      const decision = decisionEngine.evaluate({
        transactionId: 'TXN_TEST_RING',
        amount: 80000,
        currency: 'INR',
        fraudProbability: 0.65,
        riskScore: 68,
        previousFraudCount: 0,
        isNewDevice: false,
        isNewIp: false,
        accountAge: 15,
        failedAttempts: 0,
        sharedDeviceCount: 2,
        sharedIpCount: 1,
        flaggedAccountConnections: 2,
        networkRiskScore: 80,
        isHighRiskRing: true,
      });

      expect(decision.decision).toBe('BLOCK');
      expect(decision.ruleTriggered).toBe('RULE_FRAUD_RING_SUSPECTED');
      expect(decision.reason).toContain('confirmed high-risk/blocked accounts');
    });

    it('should trigger RULE_SHARED_DEVICE_CLUSTER to REVIEW when device is shared across multiple accounts with moderate risk', () => {
      const decision = decisionEngine.evaluate({
        transactionId: 'TXN_TEST_DEVICE_CLUSTER',
        amount: 25000,
        currency: 'INR',
        fraudProbability: 0.45,
        riskScore: 28, // Would normally be APPROVE without network signal
        previousFraudCount: 0,
        isNewDevice: false,
        isNewIp: false,
        accountAge: 40,
        failedAttempts: 0,
        sharedDeviceCount: 3,
        sharedIpCount: 1,
        flaggedAccountConnections: 0,
        networkRiskScore: 35,
        isHighRiskRing: false,
      });

      expect(decision.decision).toBe('REVIEW');
      expect(decision.ruleTriggered).toBe('RULE_SHARED_DEVICE_CLUSTER');
      expect(decision.reason).toContain('actively shared across 3 distinct customer accounts');
    });

    it('should not blindly block clean users on shared IP if fraud probability is low', () => {
      const decision = decisionEngine.evaluate({
        transactionId: 'TXN_TEST_CLEAN_SHARED_IP',
        amount: 1500,
        currency: 'INR',
        fraudProbability: 0.12,
        riskScore: 15,
        previousFraudCount: 0,
        isNewDevice: false,
        isNewIp: false,
        accountAge: 120,
        failedAttempts: 0,
        sharedDeviceCount: 0,
        sharedIpCount: 2,
        flaggedAccountConnections: 0,
        networkRiskScore: 12,
        isHighRiskRing: false,
      });

      expect(decision.decision).toBe('APPROVE');
      expect(decision.reason).toContain('Clean account profile');
    });
  });

  describe('Fastify Network API Endpoint Tests', () => {
    it('GET /api/fraud/network/:customerId should return graph nodes, links, and signals', async () => {
      const app = await buildApp();

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue({
        id: 'c-api-uuid',
        externalCustomerId: 'CUST_API_NETWORK',
        accountAge: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(prisma.transaction, 'findMany')
        .mockResolvedValueOnce([
          {
            id: 'tx-api-1',
            transactionId: 'TXN_API_NET_1',
            customerId: 'CUST_API_NETWORK',
            amount: new Prisma.Decimal(5000),
            currency: 'INR',
            deviceId: 'DEV_API_1',
            ipAddress: '192.168.1.1',
            location: 'Bangalore, IN',
            paymentMethod: 'UPI',
            status: 'APPROVED',
            createdAt: new Date(),
            updatedAt: new Date(),
            riskScore: null,
            riskDecision: null,
          },
        ] as any)
        .mockResolvedValueOnce([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/fraud/network/CUST_API_NETWORK',
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data.customerId).toBe('CUST_API_NETWORK');
      expect(Array.isArray(json.data.nodes)).toBe(true);
      expect(Array.isArray(json.data.links)).toBe(true);
      expect(json.data.signals).toBeDefined();
      expect(json.data.signals.customerId).toBe('CUST_API_NETWORK');
    });

    it('GET /api/fraud/network/:customerId should return 404 when customer not found', async () => {
      const app = await buildApp();

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/fraud/network/CUST_NOT_FOUND',
      });

      expect(response.statusCode).toBe(404);
      const json = response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('NOT_FOUND');
    });
  });
});
