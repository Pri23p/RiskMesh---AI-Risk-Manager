import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../infrastructure/database/prisma';
import { AuditLogFilterDTO, CreateAuditLogDTO, IAuditLog } from './audit.types';

export class AuditRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async create(data: CreateAuditLogDTO): Promise<IAuditLog> {
    return this.db.auditLog.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        actorId: data.actorId,
        details: data.details ? (data.details as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: data.ipAddress,
      },
    });
  }

  async findById(id: string): Promise<IAuditLog | null> {
    return this.db.auditLog.findUnique({
      where: { id },
    });
  }

  async findMany(filters: AuditLogFilterDTO): Promise<{ items: IAuditLog[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.actorId) where.actorId = filters.actorId;

    const [items, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.auditLog.count({ where }),
    ]);

    return { items, total };
  }
}
