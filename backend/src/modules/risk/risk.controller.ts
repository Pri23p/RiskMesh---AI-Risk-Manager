import { FastifyReply, FastifyRequest } from 'fastify';
import { RiskService } from './risk.service';
import {
  EvaluateRiskInput,
  RiskByTransactionParamsInput,
  RiskFilterInput,
  RiskParamsInput,
} from './risk.schemas';
import { successResponse } from '../../utils/response';

export class RiskController {
  constructor(private readonly service: RiskService = new RiskService()) {}

  evaluate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = request.body as EvaluateRiskInput;
    const result = await this.service.evaluateRisk(body);
    reply.status(201).send(successResponse(result));
  };

  getById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = request.params as RiskParamsInput;
    const result = await this.service.getById(params.id);
    reply.status(200).send(successResponse(result));
  };

  getByTransactionId = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = request.params as RiskByTransactionParamsInput;
    const result = await this.service.getByTransactionId(params.transactionId);
    reply.status(200).send(successResponse(result));
  };

  list = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const query = request.query as RiskFilterInput;
    const { items, total } = await this.service.listAssessments(query);
    reply.status(200).send(
      successResponse(items, {
        page: query.page,
        limit: query.limit,
        total,
      })
    );
  };
}
