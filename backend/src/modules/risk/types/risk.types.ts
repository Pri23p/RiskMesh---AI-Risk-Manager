export interface IRiskFactor {
  id?: string;
  feature: string;
  impact: string; // 'high' | 'medium' | 'low'
  explanation?: string | null;
}

export interface IRiskScoreResult {
  transactionId: string;
  riskScore: number;
  fraudProbability: number;
  modelVersion: string;
  status?: string;
  riskFactors: IRiskFactor[];
  createdAt?: Date;
}
