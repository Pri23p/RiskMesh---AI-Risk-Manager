import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../infrastructure/database/prisma';
import { CreateFraudSignalDTO, FraudSignalFilterDTO, IFraudSignal } from './fraud.types';

export class FraudRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async create(data: CreateFraudSignalDTO): Promise<IFraudSignal> {
    return this.db.fraudSignal.create({
      data: {
        transactionId: data.transactionId,
        signalType: data.signalType,
        severity: data.severity,
        description: data.description,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  async findById(id: string): Promise<IFraudSignal | null> {
    return this.db.fraudSignal.findUnique({
      where: { id },
      include: {
        transaction: true,
      },
    });
  }

  async findByTransactionId(transactionId: string): Promise<IFraudSignal[]> {
    return this.db.fraudSignal.findMany({
      where: { transactionId },
      orderBy: { detectedAt: 'desc' },
    });
  }

  async findMany(filters: FraudSignalFilterDTO): Promise<{ items: IFraudSignal[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FraudSignalWhereInput = {};
    if (filters.transactionId) where.transactionId = filters.transactionId;
    if (filters.signalType) where.signalType = filters.signalType;
    if (filters.severity) where.severity = filters.severity;

    const [items, total] = await Promise.all([
      this.db.fraudSignal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { detectedAt: 'desc' },
      }),
      this.db.fraudSignal.count({ where }),
    ]);

    return { items, total };
  }
}
