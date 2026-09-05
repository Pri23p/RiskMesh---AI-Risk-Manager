import { AuditEvent, Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma.js';
import { CreateAuditEventDto, QueryAuditEventsDto } from './dto/audit.dto.js';

export class AuditRepository {
  async recordEvent(data: CreateAuditEventDto): Promise<AuditEvent> {
    return prisma.auditEvent.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        eventType: data.eventType,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  }

  async findEvents(query: QueryAuditEventsDto): Promise<{ items: AuditEvent[]; total: number }> {
    const { entityType, entityId, eventType, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditEventWhereInput = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (eventType) where.eventType = eventType;

    const [items, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditEvent.count({ where }),
    ]);

    return { items, total };
  }
}
