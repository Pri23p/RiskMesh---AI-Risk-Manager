import { FraudSignal, SignalSeverity } from '@prisma/client';

export type IFraudSignal = FraudSignal;
export { SignalSeverity };

export interface CreateFraudSignalDTO {
  transactionId: string;
  signalType: string;
  severity: SignalSeverity;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface FraudSignalFilterDTO {
  transactionId?: string;
  signalType?: string;
  severity?: SignalSeverity;
  page?: number;
  limit?: number;
}
