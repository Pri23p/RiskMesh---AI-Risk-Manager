import { Prisma, Transaction } from '@prisma/client';
import { isDbConnected, prisma, setDbConnected } from '../../infrastructure/database/prisma.js';
import { CreateTransactionDto, QueryTransactionsDto } from './dto/transaction.dto.js';

// Realistic in-memory seeded transactions for offline/standalone demo resilience
const SEED_TRANSACTIONS: any[] = [
  {
    id: 'tx-uuid-1',
    transactionId: 'TXN123',
    customerId: 'CUS123',
    amount: new Prisma.Decimal(85000),
    currency: 'INR',
    deviceId: 'DEV123',
    ipAddress: '10.0.0.1',
    location: 'Mumbai, IN',
    paymentMethod: 'CARD',
    status: 'BLOCKED',
    createdAt: new Date(Date.now() - 5 * 60000),
    updatedAt: new Date(),
    customer: { externalCustomerId: 'CUS123', accountAge: 14 },
    riskScore: {
      id: 'rs-1',
      transactionId: 'TXN123',
      riskScore: 93,
      fraudProbability: 0.93,
      modelVersion: 'v1',
      status: 'COMPLETED',
      factors: [
        { id: '1', feature: 'amountRatio', impact: 'high', explanation: '8.5x customer average' },
        { id: '2', feature: 'isNewDevice', impact: 'high', explanation: 'Novel hardware fingerprint' },
        { id: '3', feature: 'transactionsLast10Min', impact: 'high', explanation: '4 txns in 10 mins' },
      ],
    },
    riskDecision: {
      id: 'dec-1',
      transactionId: 'TXN123',
      decision: 'BLOCK',
      reason: 'THRESHOLD_BLOCK: Risk score 93 exceeds 75 block threshold',
      expectedLoss: new Prisma.Decimal(79050.0),
      status: 'ACTIVE',
      createdAt: new Date(),
    },
  },
  {
    id: 'tx-uuid-2',
    transactionId: 'TXN124',
    customerId: 'CUS456',
    amount: new Prisma.Decimal(15400),
    currency: 'INR',
    deviceId: 'DEV456',
    ipAddress: '192.168.1.10',
    location: 'Delhi, IN',
    paymentMethod: 'UPI',
    status: 'REVIEW',
    createdAt: new Date(Date.now() - 15 * 60000),
    updatedAt: new Date(),
    customer: { externalCustomerId: 'CUS456', accountAge: 45 },
    riskScore: {
      id: 'rs-2',
      transactionId: 'TXN124',
      riskScore: 55,
      fraudProbability: 0.55,
      modelVersion: 'v1',
      status: 'COMPLETED',
      factors: [
        { id: '4', feature: 'isNewIp', impact: 'medium', explanation: 'New IP subnet' },
      ],
    },
    riskDecision: {
      id: 'dec-2',
      transactionId: 'TXN124',
      decision: 'REVIEW',
      reason: 'THRESHOLD_REVIEW: Risk score 55 in manual review band',
      expectedLoss: new Prisma.Decimal(8470.0),
      status: 'ACTIVE',
      createdAt: new Date(),
    },
  },
  {
    id: 'tx-uuid-3',
    transactionId: 'TXN125',
    customerId: 'CUS789',
    amount: new Prisma.Decimal(1250),
    currency: 'INR',
    deviceId: 'DEV789',
    ipAddress: '103.22.45.1',
    location: 'Bangalore, IN',
    paymentMethod: 'UPI',
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 25 * 60000),
    updatedAt: new Date(),
    customer: { externalCustomerId: 'CUS789', accountAge: 180 },
    riskScore: {
      id: 'rs-3',
      transactionId: 'TXN125',
      riskScore: 12,
      fraudProbability: 0.12,
      modelVersion: 'v1',
      status: 'COMPLETED',
      factors: [],
    },
    riskDecision: {
      id: 'dec-3',
      transactionId: 'TXN125',
      decision: 'APPROVE',
      reason: 'THRESHOLD_APPROVE: Clean history and low risk score',
      expectedLoss: new Prisma.Decimal(150.0),
      status: 'ACTIVE',
      createdAt: new Date(),
    },
  },
  {
    id: 'tx-uuid-4',
    transactionId: 'TXN_9421_1',
    customerId: 'CUS_9421',
    amount: new Prisma.Decimal(95000),
    currency: 'INR',
    deviceId: 'DEV_CHROME_WIN11_98',
    ipAddress: '103.21.244.12',
    location: 'Mumbai, IN',
    paymentMethod: 'CARD',
    status: 'BLOCKED',
    createdAt: new Date(Date.now() - 35 * 60000),
    updatedAt: new Date(),
    customer: { externalCustomerId: 'CUS_9421', accountAge: 14 },
    riskScore: {
      id: 'rs-4',
      transactionId: 'TXN_9421_1',
      riskScore: 95,
      fraudProbability: 0.95,
      modelVersion: 'v1',
      status: 'COMPLETED',
      factors: [
        { id: '5', feature: 'anomalyScore', impact: 'high', explanation: 'High anomaly clustering' },
      ],
    },
    riskDecision: {
      id: 'dec-4',
      transactionId: 'TXN_9421_1',
      decision: 'BLOCK',
      reason: 'RULE_FRAUD_RING_SUSPECTED: Shared hardware fingerprint with flagged syndicate accounts',
      expectedLoss: new Prisma.Decimal(90250.0),
      status: 'ACTIVE',
      createdAt: new Date(),
    },
  },
];

export class TransactionsRepository {
  private inMemoryStore: any[] = [...SEED_TRANSACTIONS];

  async create(data: CreateTransactionDto, txClient?: Prisma.TransactionClient): Promise<Transaction> {
    if (isDbConnected() || txClient) {
      try {
        const client = txClient || prisma;
        const created = await client.transaction.create({
          data: {
            transactionId: data.transactionId,
            customerId: data.customerId,
            amount: new Prisma.Decimal(data.amount),
            currency: data.currency,
            deviceId: data.deviceId,
            ipAddress: data.ipAddress,
            location: data.location,
            paymentMethod: data.paymentMethod,
            status: 'PENDING',
          },
          include: {
            customer: true,
          },
        });
        this.inMemoryStore.unshift(created);
        return created;
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') setDbConnected(false);
      }
    }

    const fallback: any = {
      id: `tx-mem-${Date.now()}`,
      transactionId: data.transactionId,
      customerId: data.customerId,
      amount: new Prisma.Decimal(data.amount),
      currency: data.currency,
      deviceId: data.deviceId,
      ipAddress: data.ipAddress,
      location: data.location,
      paymentMethod: data.paymentMethod,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: { externalCustomerId: data.customerId, accountAge: 30 },
    };
    this.inMemoryStore.unshift(fallback);
    return fallback;
  }

  async findByTransactionId(transactionId: string): Promise<Transaction | null> {
    if (isDbConnected()) {
      try {
        const found = await prisma.transaction.findUnique({
          where: { transactionId },
          include: {
            customer: true,
            riskScore: {
              include: {
                factors: true,
              },
            },
            riskDecision: true,
          },
        });
        if (found) return found;
      } catch {
        if (process.env.NODE_ENV !== 'test') setDbConnected(false);
      }
    }
    const found = this.inMemoryStore.find((t) => t.transactionId === transactionId);
    return found || null;
  }

  async findById(id: string): Promise<Transaction | null> {
    if (isDbConnected()) {
      try {
        const found = await prisma.transaction.findUnique({
          where: { id },
          include: {
            customer: true,
            riskScore: {
              include: {
                factors: true,
              },
            },
            riskDecision: true,
          },
        });
        if (found) return found;
      } catch {
        if (process.env.NODE_ENV !== 'test') setDbConnected(false);
      }
    }
    const found = this.inMemoryStore.find((t) => t.id === id);
    return found || null;
  }

  async findByIdOrTransactionId(identifier: string): Promise<Transaction | null> {
    // Check by unique merchant transactionId first, then by UUID id
    const byTxnId = await this.findByTransactionId(identifier);
    if (byTxnId) return byTxnId;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    if (isUuid) {
      return this.findById(identifier);
    }
    return null;
  }

  async updateStatus(identifier: string, status: 'APPROVED' | 'REVIEW' | 'BLOCKED'): Promise<any> {
    const existing = await this.findByIdOrTransactionId(identifier);
    if (!existing) return null;
    if (isDbConnected()) {
      try {
        return await prisma.transaction.update({
          where: { id: existing.id },
          data: { status, updatedAt: new Date() },
          include: { customer: true, riskScore: { include: { factors: true } }, riskDecision: true },
        });
      } catch {
        if (process.env.NODE_ENV !== 'test') setDbConnected(false);
      }
    }
    existing.status = status;
    existing.updatedAt = new Date();
    return existing;
  }

  async findMany(query: QueryTransactionsDto): Promise<{ items: Transaction[]; total: number }> {
    const { customerId, status, page, limit } = query;
    const skip = (page - 1) * limit;

    if (isDbConnected()) {
      try {
        const where: Prisma.TransactionWhereInput = {};
        if (customerId) where.customerId = customerId;
        if (status) where.status = status;

        const [items, total] = await Promise.all([
          prisma.transaction.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              customer: true,
              riskScore: {
                include: {
                  factors: true,
                },
              },
              riskDecision: true,
            },
          }),
          prisma.transaction.count({ where }),
        ]);

        return { items, total };
      } catch {
        if (process.env.NODE_ENV !== 'test') setDbConnected(false);
      }
    }

    let filtered = [...this.inMemoryStore];
    if (customerId) {
      filtered = filtered.filter((t) => t.customerId === customerId);
    }
    if (status) {
      filtered = filtered.filter((t) => t.status === status);
    }
    const items = filtered.slice(skip, skip + limit);
    return { items, total: filtered.length };
  }
}
