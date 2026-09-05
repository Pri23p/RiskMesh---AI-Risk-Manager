export type DomainEventType =
  | 'transaction.created'
  | 'risk.scored'
  | 'risk.decision.created'
  | 'transaction.approved'
  | 'transaction.review_required'
  | 'transaction.blocked'
  | 'verification.requested'
  | 'verification.completed'
  | 'fraud.confirmed'
  | 'fraud.rejected';

export interface BaseDomainEvent<T = Record<string, unknown>> {
  eventId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  timestamp: string;
  version: string;
  payload: T;
}

export interface TransactionCreatedPayload {
  id: string;
  transactionId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  deviceId?: string;
  ipAddress?: string;
  location?: string;
  status: string;
  createdAt: string;
}

export interface RiskScoredPayload {
  transactionId: string;
  riskScore: number;
  fraudProbability: number;
  modelVersion: string;
  riskFactors: Array<{
    feature: string;
    impact: string;
    explanation?: string | null;
  }>;
}

export interface RiskDecisionCreatedPayload {
  id: string;
  transactionId: string;
  riskScoreId: string;
  decision: 'APPROVE' | 'REVIEW' | 'BLOCK';
  reason: string;
  expectedLoss: number;
  status: string;
}

export interface TransactionStateChangedPayload {
  transactionId: string;
  previousStatus?: string;
  newStatus: 'APPROVED' | 'REVIEW' | 'BLOCKED';
  reason: string;
  timestamp: string;
}

export interface VerificationRequestedPayload {
  caseId: string;
  transactionId: string;
  customerId: string;
  riskScore: number;
  reason: string;
}

export interface VerificationCompletedPayload {
  caseId: string;
  transactionId: string;
  resolution: 'APPROVED' | 'REJECTED';
  analystId?: string;
  decisionNotes?: string;
}

export interface FraudConfirmedPayload {
  transactionId: string;
  customerId: string;
  fraudType: string;
  amount: number;
  confirmedBy: string;
  timestamp: string;
}

export interface FraudRejectedPayload {
  transactionId: string;
  customerId: string;
  reason: string;
  clearedBy: string;
  timestamp: string;
}

export const KAFKA_TOPICS = {
  TRANSACTIONS: 'riskmesh.transactions',
  RISK_EVENTS: 'riskmesh.risk-events',
  VERIFICATIONS: 'riskmesh.verifications',
  AUDIT_STREAM: 'riskmesh.audit-stream',
} as const;

export function mapEventToTopic(eventType: DomainEventType): string {
  switch (eventType) {
    case 'transaction.created':
    case 'transaction.approved':
    case 'transaction.review_required':
    case 'transaction.blocked':
      return KAFKA_TOPICS.TRANSACTIONS;
    case 'risk.scored':
    case 'risk.decision.created':
    case 'fraud.confirmed':
    case 'fraud.rejected':
      return KAFKA_TOPICS.RISK_EVENTS;
    case 'verification.requested':
    case 'verification.completed':
      return KAFKA_TOPICS.VERIFICATIONS;
    default:
      return KAFKA_TOPICS.AUDIT_STREAM;
  }
}
