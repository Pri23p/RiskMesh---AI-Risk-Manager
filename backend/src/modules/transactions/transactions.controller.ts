import { FastifyReply, FastifyRequest } from 'fastify';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionInput,
  TransactionFilterInput,
  TransactionParamsInput,
  UpdateTransactionStatusInput,
} from './transactions.schemas';
import { successResponse } from '../../utils/response';

export class TransactionsController {
  constructor(private readonly service: TransactionsService = new TransactionsService()) {}

  create = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = request.body as CreateTransactionInput;
    const result = await this.service.processTransaction(body);
    reply.status(201).send(successResponse(result));
  };

  getById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = request.params as TransactionParamsInput;
    const result = await this.service.getTransactionById(params.id);
    reply.status(200).send(successResponse(result));
  };

  list = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const query = request.query as TransactionFilterInput;
    const { items, total } = await this.service.listTransactions(query);
    reply.status(200).send(
      successResponse(items, {
        page: query.page,
        limit: query.limit,
        total,
      })
    );
  };

  updateStatus = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = request.params as TransactionParamsInput;
    const body = request.body as UpdateTransactionStatusInput;
    const result = await this.service.updateStatus(params.id, body.status);
    reply.status(200).send(successResponse(result));
  };
}
