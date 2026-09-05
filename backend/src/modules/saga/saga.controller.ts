import { FastifyReply, FastifyRequest } from 'fastify';
import { RiskDecisionSagaOrchestrator } from './risk-decision.saga.js';
import { SagaRepository } from './saga.repository.js';
import { createSuccessResponse } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';

export class SagaController {
  constructor(
    private readonly sagaOrchestrator: RiskDecisionSagaOrchestrator,
    private readonly sagaRepository: SagaRepository = new SagaRepository()
  ) {}

  async startSaga(
    request: FastifyRequest<{ Params: { transactionId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const result = await this.sagaOrchestrator.executeSaga(request.params.transactionId);
    reply.status(200).send(createSuccessResponse(result, result.message || 'Saga executed'));
  }

  async resumeSaga(
    request: FastifyRequest<{ Params: { sagaId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const result = await this.sagaOrchestrator.resumeSaga(request.params.sagaId);
    reply.status(200).send(createSuccessResponse(result, 'Saga resumed successfully'));
  }

  async getSaga(
    request: FastifyRequest<{ Params: { transactionId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const saga = await this.sagaRepository.findByTransactionId(request.params.transactionId);
    if (!saga) {
      throw new NotFoundError(`Saga for transaction '${request.params.transactionId}' not found`);
    }
    reply.status(200).send(createSuccessResponse(saga));
  }
}
