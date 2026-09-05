import { AuditEvent } from '@prisma/client';
import { AuditRepository } from './audit.repository.js';
import { CreateAuditEventDto, QueryAuditEventsDto } from './dto/audit.dto.js';
import { logger } from '../../utils/logger.js';

export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async logEvent(dto: CreateAuditEventDto): Promise<AuditEvent> {
    logger.info(
      { entityType: dto.entityType, entityId: dto.entityId, eventType: dto.eventType },
      'Audit event recorded'
    );
    return this.auditRepository.recordEvent(dto);
  }

  async listEvents(
    query: QueryAuditEventsDto
  ): Promise<{ items: AuditEvent[]; total: number; page: number; limit: number }> {
    const { items, total } = await this.auditRepository.findEvents(query);
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
