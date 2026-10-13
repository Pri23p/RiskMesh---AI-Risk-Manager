import { FastifyReply, FastifyRequest } from 'fastify';
import { AuditService } from './audit.service';
import {
  AuditLogFilterInput,
  AuditLogParamsInput,
  CreateAuditLogInput,
} from './audit.schemas';
import { successResponse } from '../../utils/response';

export class AuditController {
  constructor(private readonly service: AuditService = new AuditService()) {}

  create = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = request.body as CreateAuditLogInput;
    const result = await this.service.logAction(body);
    reply.status(201).send(successResponse(result));
  };

  getById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = request.params as AuditLogParamsInput;
    const result = await this.service.getLogById(params.id);
    reply.status(200).send(successResponse(result));
  };

  list = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const query = request.query as AuditLogFilterInput;
    const { items, total } = await this.service.listLogs(query);
    reply.status(200).send(
      successResponse(items, {
        page: query.page,
        limit: query.limit,
        total,
      })
    );
  };
}
