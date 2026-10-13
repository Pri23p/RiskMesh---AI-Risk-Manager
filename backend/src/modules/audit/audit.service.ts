import { AuditRepository } from './audit.repository';
import { AuditLogFilterDTO, CreateAuditLogDTO, IAuditLog } from './audit.types';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../config/logger';

export class AuditService {
  constructor(private readonly repository: AuditRepository = new AuditRepository()) {}

  async logAction(dto: CreateAuditLogDTO): Promise<IAuditLog> {
    logger.info({ entityType: dto.entityType, entityId: dto.entityId, action: dto.action, actorId: dto.actorId }, 'Audit log recorded');
    return this.repository.create(dto);
  }

  async getLogById(id: string): Promise<IAuditLog> {
    const log = await this.repository.findById(id);
    if (!log) {
      throw new NotFoundError(`Audit log ${id} not found`);
    }
    return log;
  }

  async listLogs(filters: AuditLogFilterDTO): Promise<{ items: IAuditLog[]; total: number }> {
    return this.repository.findMany(filters);
  }
}
