import { z } from 'zod';

export const createAuditEventSchema = z.object({
  entityType: z.string().min(1).max(50),
  entityId: z.string().min(1),
  eventType: z.string().min(1).max(50),
  metadata: z.record(z.unknown()).optional(),
});

export const queryAuditEventsSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  eventType: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateAuditEventDto = z.infer<typeof createAuditEventSchema>;
export type QueryAuditEventsDto = z.infer<typeof queryAuditEventsSchema>;
