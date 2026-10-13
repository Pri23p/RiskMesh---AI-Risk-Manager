import { FastifyReply, FastifyRequest } from 'fastify';
import { VerificationService } from './verification.service';
import {
  InitiateVerificationInput,
  VerificationParamsInput,
  VerifyCodeInput,
} from './verification.schemas';
import { successResponse } from '../../utils/response';

export class VerificationController {
  constructor(private readonly service: VerificationService = new VerificationService()) {}

  initiate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = request.body as InitiateVerificationInput;
    const result = await this.service.initiate(body);
    reply.status(201).send(successResponse(result));
  };

  verify = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = request.body as VerifyCodeInput;
    const result = await this.service.verify(body);
    reply.status(200).send(successResponse(result));
  };

  getStatus = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = request.params as VerificationParamsInput;
    const result = await this.service.getStatus(params.id);
    reply.status(200).send(successResponse(result));
  };
}
