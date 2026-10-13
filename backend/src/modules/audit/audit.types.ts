import { AuditLog } from '@prisma/client';

export type IAuditLog = AuditLog;

export interface CreateAuditLogDTO {
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditLogFilterDTO {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  page?: number;
  limit?: number;
}
