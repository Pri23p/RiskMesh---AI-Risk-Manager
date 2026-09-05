import { VerificationCase } from '@prisma/client';
import { VerificationRepository } from './verification.repository.js';
import { TransactionsRepository } from '../transactions/transactions.repository.js';
import {
  CreateVerificationCaseDto,
  QueryVerificationCasesDto,
  UpdateVerificationDecisionDto,
} from './dto/verification.dto.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class VerificationService {
  constructor(
    private readonly verificationRepository: VerificationRepository,
    private readonly transactionsRepository: TransactionsRepository
  ) {}

  async createCase(dto: CreateVerificationCaseDto): Promise<VerificationCase> {
    const transaction = await this.transactionsRepository.findById(dto.transactionId);
    if (!transaction) {
      throw new NotFoundError(`Transaction with ID '${dto.transactionId}' not found`);
    }

    const existingCase = await this.verificationRepository.findByTransactionId(dto.transactionId);
    if (existingCase) {
      throw new ConflictError(
        `Verification case already exists for transaction '${dto.transactionId}'`
      );
    }

    logger.info({ transactionId: dto.transactionId }, 'Opening manual verification case');
    return this.verificationRepository.create(dto);
  }

  async getCaseById(id: string): Promise<VerificationCase> {
    const vCase = await this.verificationRepository.findById(id);
    if (!vCase) {
      throw new NotFoundError(`Verification case with ID '${id}' not found`);
    }
    return vCase;
  }

  async listCases(
    query: QueryVerificationCasesDto
  ): Promise<{ items: VerificationCase[]; total: number; page: number; limit: number }> {
    const { items, total } = await this.verificationRepository.findMany(query);
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async updateDecision(id: string, dto: UpdateVerificationDecisionDto): Promise<VerificationCase> {
    await this.getCaseById(id);
    logger.info({ caseId: id, status: dto.status }, 'Updating verification case decision');
    return this.verificationRepository.updateDecision(id, dto);
  }
}
