import { Verification, VerificationStatus } from '@prisma/client';

export type IVerification = Verification;
export { VerificationStatus };

export interface InitiateVerificationDTO {
  transactionId: string;
  method: string;
}

export interface VerifyCodeDTO {
  transactionId: string;
  code: string;
}

export interface VerificationFilterDTO {
  transactionId?: string;
  status?: VerificationStatus;
  page?: number;
  limit?: number;
}
