import crypto from 'crypto';
import { VerificationRepository } from './verification.repository';
import { InitiateVerificationDTO, IVerification, VerificationStatus, VerifyCodeDTO } from './verification.types';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { logger } from '../../config/logger';

export class VerificationService {
  constructor(
    private readonly repository: VerificationRepository = new VerificationRepository(),
    private readonly transactionsRepo: TransactionsRepository = new TransactionsRepository()
  ) {}

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async initiate(dto: InitiateVerificationDTO): Promise<{ id: string; method: string; expiresAt: Date; mockOtp?: string }> {
    const transaction = await this.transactionsRepo.findById(dto.transactionId);
    if (!transaction) {
      throw new NotFoundError(`Transaction ${dto.transactionId} not found`);
    }

    // Generate 6-digit mock OTP
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = this.hashCode(mockOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    logger.info({ transactionId: dto.transactionId, method: dto.method }, 'Initiating 2FA verification challenge');

    const verification = await this.repository.create({
      transactionId: dto.transactionId,
      method: dto.method,
      codeHash,
      expiresAt,
    });

    return {
      id: verification.id,
      method: verification.method,
      expiresAt: verification.expiresAt,
      // In dev environment or mock testing, expose mockOtp for frictionless verification
      mockOtp: process.env.NODE_ENV !== 'production' ? mockOtp : undefined,
    };
  }

  async verify(dto: VerifyCodeDTO): Promise<IVerification> {
    const latest = await this.repository.findLatestByTransactionId(dto.transactionId);
    if (!latest) {
      throw new NotFoundError(`No pending verification found for transaction ${dto.transactionId}`);
    }

    if (latest.status === VerificationStatus.VERIFIED) {
      return latest;
    }

    if (new Date() > latest.expiresAt) {
      await this.repository.update(latest.id, { status: VerificationStatus.EXPIRED });
      throw new BadRequestError('Verification challenge has expired');
    }

    const hashedInput = this.hashCode(dto.code);
    if (latest.codeHash !== hashedInput) {
      const updatedAttempts = latest.attempts + 1;
      const nextStatus = updatedAttempts >= 3 ? VerificationStatus.FAILED : VerificationStatus.PENDING;
      await this.repository.update(latest.id, { attempts: updatedAttempts, status: nextStatus });
      throw new BadRequestError('Invalid verification code');
    }

    logger.info({ transactionId: dto.transactionId, verificationId: latest.id }, 'Verification successful');

    return this.repository.update(latest.id, {
      status: VerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    });
  }

  async getStatus(id: string): Promise<IVerification> {
    const verification = await this.repository.findById(id);
    if (!verification) {
      throw new NotFoundError(`Verification ${id} not found`);
    }
    return verification;
  }
}
