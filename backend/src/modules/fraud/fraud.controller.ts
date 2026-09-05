import { FastifyReply, FastifyRequest } from 'fastify';
import { FraudService } from './fraud.service.js';
import {
  CreateFraudRuleDto,
  GetFraudRuleParams,
  UpdateFraudRuleDto,
  GetCustomerNetworkParams,
} from './dto/fraud.dto.js';
import { createSuccessResponse } from '../../utils/response.js';

export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  async createRule(
    request: FastifyRequest<{ Body: CreateFraudRuleDto }>,
    reply: FastifyReply
  ): Promise<void> {
    const rule = await this.fraudService.createRule(request.body);
    reply.status(201).send(createSuccessResponse(rule, 'Fraud rule created successfully'));
  }

  async getActiveRules(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const rules = await this.fraudService.getActiveRules();
    reply.send(createSuccessResponse(rules));
  }

  async getRuleById(
    request: FastifyRequest<{ Params: GetFraudRuleParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const rule = await this.fraudService.getRuleById(request.params.id);
    reply.send(createSuccessResponse(rule));
  }

  async updateRule(
    request: FastifyRequest<{ Params: GetFraudRuleParams; Body: UpdateFraudRuleDto }>,
    reply: FastifyReply
  ): Promise<void> {
    const rule = await this.fraudService.updateRule(request.params.id, request.body);
    reply.send(createSuccessResponse(rule, 'Fraud rule updated successfully'));
  }

  async deleteRule(
    request: FastifyRequest<{ Params: GetFraudRuleParams }>,
    reply: FastifyReply
  ): Promise<void> {
    await this.fraudService.deleteRule(request.params.id);
    reply.status(200).send(createSuccessResponse(null, 'Fraud rule deleted successfully'));
  }

  async getNetworkGraph(
    request: FastifyRequest<{ Params: GetCustomerNetworkParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const networkGraph = await this.fraudService.getCustomerNetwork(request.params.customerId);
    reply.send(createSuccessResponse(networkGraph));
  }
}

