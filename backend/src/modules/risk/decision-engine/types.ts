export type DecisionType = 'APPROVE' | 'REVIEW' | 'BLOCK';

export interface DecisionContext {
  transactionId: string;
  amount: number;
  currency: string;
  fraudProbability: number;
  riskScore: number;
  previousFraudCount: number;
  isNewDevice: boolean;
  isNewIp: boolean;
  accountAge: number;
  failedAttempts: number;
  // Network Intelligence Signals (Phase 9)
  sharedDeviceCount?: number;
  sharedIpCount?: number;
  flaggedAccountConnections?: number;
  networkRiskScore?: number;
  isHighRiskRing?: boolean;
}


export interface EngineDecision {
  decision: DecisionType;
  reason: string;
  expectedLoss: number;
  ruleTriggered?: string;
}

export interface IDecisionRule {
  id: string;
  name: string;
  priority: number;
  evaluate(context: DecisionContext, expectedLoss: number): {
    matches: boolean;
    decision?: DecisionType;
    reason?: string;
  };
}
