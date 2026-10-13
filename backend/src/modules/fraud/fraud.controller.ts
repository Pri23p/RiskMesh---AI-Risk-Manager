import { FastifyReply, FastifyRequest } from 'fastify';
import { FraudService } from './fraud.service';
import {
  CreateFraudSignalInput,
  FraudSignalByTxParamsInput,
  FraudSignalFilterInput,
  FraudSignalParamsInput,
} from './fraud.schemas';
import { successResponse } from '../../utils/response';

export class FraudController {
  constructor(private readonly service: FraudService = new FraudService()) {}

  create = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = request.body as CreateFraudSignalInput;
    const result = await this.service.reportFraudSignal(body);
    reply.status(201).send(successResponse(result));
  };

  getById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = request.params as FraudSignalParamsInput;
    const result = await this.service.getSignalById(params.id);
    reply.status(200).send(successResponse(result));
  };

  getByTransactionId = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = request.params as FraudSignalByTxParamsInput;
    const result = await this.service.getSignalsByTransaction(params.transactionId);
    reply.status(200).send(successResponse(result));
  };

  list = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const query = request.query as FraudSignalFilterInput;
    const { items, total } = await this.service.listSignals(query);
    reply.status(200).send(
      successResponse(items, {
        page: query.page,
        limit: query.limit,
        total,
      })
    );
  };
}
