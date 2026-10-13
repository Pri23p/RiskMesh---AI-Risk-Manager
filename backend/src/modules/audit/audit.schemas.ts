import { z } from 'zod';

export const createAuditLogSchema = z.object({
  entityType: z.string().min(1, 'entityType is required'),
  entityId: z.string().min(1, 'entityId is required'),
  action: z.string().min(1, 'action is required'),
  actorId: z.string().min(1, 'actorId is required'),
  details: z.record(z.unknown()).optional(),
  ipAddress: z.string().ip().optional(),
});

export const auditLogFilterSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actorId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const auditLogParamsSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
export type AuditLogFilterInput = z.infer<typeof auditLogFilterSchema>;
export type AuditLogParamsInput = z.infer<typeof auditLogParamsSchema>;
