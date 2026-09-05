export type VerificationStatusType =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED';

export interface IVerificationCase {
  id: string;
  transactionId: string;
  status: VerificationStatusType;
  assignedTo?: string | null;
  decisionNotes?: string | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
