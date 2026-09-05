import { FastifyReply, FastifyRequest } from 'fastify';
import { VerificationService } from './verification.service.js';
import {
  CreateVerificationCaseDto,
  GetVerificationCaseParams,
  QueryVerificationCasesDto,
  UpdateVerificationDecisionDto,
} from './dto/verification.dto.js';
import { createSuccessResponse } from '../../utils/response.js';

export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  async createCase(
    request: FastifyRequest<{ Body: CreateVerificationCaseDto }>,
    reply: FastifyReply
  ): Promise<void> {
    const vCase = await this.verificationService.createCase(request.body);
    reply.status(201).send(createSuccessResponse(vCase, 'Verification case created successfully'));
  }

  async listCases(
    request: FastifyRequest<{ Querystring: QueryVerificationCasesDto }>,
    reply: FastifyReply
  ): Promise<void> {
    const result = await this.verificationService.listCases(request.query);
    reply.send(
      createSuccessResponse(result.items, undefined, {
        total: result.total,
        page: result.page,
        limit: result.limit,
      })
    );
  }

  async getCaseById(
    request: FastifyRequest<{ Params: GetVerificationCaseParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const vCase = await this.verificationService.getCaseById(request.params.id);
    reply.send(createSuccessResponse(vCase));
  }

  async updateDecision(
    request: FastifyRequest<{
      Params: GetVerificationCaseParams;
      Body: UpdateVerificationDecisionDto;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const updated = await this.verificationService.updateDecision(
      request.params.id,
      request.body
    );
    reply.send(createSuccessResponse(updated, 'Verification case updated successfully'));
  }
}
