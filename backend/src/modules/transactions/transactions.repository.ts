import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../infrastructure/database/prisma';
import { CreateTransactionDTO, TransactionFilterDTO, ITransaction, TransactionStatus } from './transactions.types';

export class TransactionsRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async create(data: CreateTransactionDTO): Promise<ITransaction> {
    return this.db.transaction.create({
      data: {
        orderId: data.orderId,
        merchantId: data.merchantId,
        customerId: data.customerId,
        amount: data.amount,
        currency: data.currency || 'INR',
        paymentMethod: data.paymentMethod,
        ipAddress: data.ipAddress,
        deviceId: data.deviceId,
        shippingCity: data.shippingCity,
        shippingState: data.shippingState,
        itemsCount: data.itemsCount || 1,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  async findById(id: string): Promise<ITransaction | null> {
    return this.db.transaction.findUnique({
      where: { id },
      include: {
        riskAssessment: true,
        fraudSignals: true,
        verifications: true,
      },
    });
  }

  async findByOrderId(orderId: string): Promise<ITransaction | null> {
    return this.db.transaction.findUnique({
      where: { orderId },
      include: {
        riskAssessment: true,
        fraudSignals: true,
      },
    });
  }

  async findMany(filters: TransactionFilterDTO): Promise<{ items: ITransaction[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};
    if (filters.merchantId) where.merchantId = filters.merchantId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.status) where.status = filters.status;

    const [items, total] = await Promise.all([
      this.db.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          riskAssessment: true,
        },
      }),
      this.db.transaction.count({ where }),
    ]);

    return { items, total };
  }

  async updateStatus(id: string, status: TransactionStatus): Promise<ITransaction> {
    return this.db.transaction.update({
      where: { id },
      data: { status },
    });
  }
}
