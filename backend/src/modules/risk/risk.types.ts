import { RiskAssessment, RiskLevel, RiskRecommendation } from '@prisma/client';

export type IRiskAssessment = RiskAssessment;
export { RiskLevel, RiskRecommendation };

export interface RiskFactor {
  name: string;
  weight: number;
  description: string;
  scoreImpact: number;
}

export interface EvaluateRiskDTO {
  transactionId: string;
  features?: Record<string, unknown>;
}

export interface RiskAssessmentFilterDTO {
  riskLevel?: RiskLevel;
  recommendation?: RiskRecommendation;
  page?: number;
  limit?: number;
}
