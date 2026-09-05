export type SagaStepName =
  | 'START'
  | 'RISK_SCORING'
  | 'RULE_EVALUATION'
  | 'DECISION_CREATED'
  | 'VERIFICATION_REQUESTED'
  | 'VERIFICATION_COMPLETED'
  | 'MERCHANT_NOTIFIED'
  | 'COMPLETED';

export const SAGA_STEP_SEQUENCE: SagaStepName[] = [
  'START',
  'RISK_SCORING',
  'RULE_EVALUATION',
  'DECISION_CREATED',
  'VERIFICATION_REQUESTED',
  'VERIFICATION_COMPLETED',
  'MERCHANT_NOTIFIED',
  'COMPLETED',
];

export interface SagaContext {
  transactionId: string;
  amount?: number;
  currency?: string;
  customerId?: string;
  riskScore?: number;
  fraudProbability?: number;
  modelVersion?: string;
  riskFactors?: Array<{
    feature: string;
    impact: string;
    explanation?: string | null;
  }>;
  decision?: 'APPROVE' | 'REVIEW' | 'BLOCK';
  decisionReason?: string;
  expectedLoss?: number;
  ruleTriggered?: string | null;
  verificationCaseId?: string;
  verificationStatus?: string;
  merchantNotificationId?: string;
  merchantNotifiedAt?: string;
  fallbackToReview?: boolean;
  stepExecutionHistory?: Array<{
    step: SagaStepName;
    executedAt: string;
    status: 'COMPLETED' | 'FAILED' | 'RETRY' | 'SKIPPED';
    retries?: number;
    error?: string;
  }>;
}

export type SagaExecutionStatus =
  | 'COMPLETED'
  | 'ALREADY_COMPLETED'
  | 'FAILED'
  | 'RUNNING'
  | 'CANCELLED'
  | 'PENDING';

export interface SagaExecutionResult {
  sagaId: string;
  transactionId: string;
  status: SagaExecutionStatus;
  currentStep: SagaStepName;
  context: SagaContext;
  isResumed?: boolean;
  message?: string;
}

export interface SagaRetryConfig {
  maxRetries: number;
  initialBackoffMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_SAGA_RETRY_CONFIG: SagaRetryConfig = {
  maxRetries: 3,
  initialBackoffMs: 100,
  backoffMultiplier: 2,
};
