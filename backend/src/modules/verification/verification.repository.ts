import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../infrastructure/database/prisma';
import { IVerification, VerificationFilterDTO } from './verification.types';

export class VerificationRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async create(data: {
    transactionId: string;
    method: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<IVerification> {
    return this.db.verification.create({
      data: {
        transactionId: data.transactionId,
        method: data.method,
        codeHash: data.codeHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findById(id: string): Promise<IVerification | null> {
    return this.db.verification.findUnique({
      where: { id },
    });
  }

  async findLatestByTransactionId(transactionId: string): Promise<IVerification | null> {
    return this.db.verification.findFirst({
      where: { transactionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMany(filters: VerificationFilterDTO): Promise<{ items: IVerification[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.VerificationWhereInput = {};
    if (filters.transactionId) where.transactionId = filters.transactionId;
    if (filters.status) where.status = filters.status;

    const [items, total] = await Promise.all([
      this.db.verification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.verification.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.VerificationUpdateInput): Promise<IVerification> {
    return this.db.verification.update({
      where: { id },
      data,
    });
  }
}
