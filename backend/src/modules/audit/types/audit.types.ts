export interface IAuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: Date;
}
