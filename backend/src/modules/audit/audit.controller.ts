import { FastifyReply, FastifyRequest } from 'fastify';
import { AuditService } from './audit.service.js';
import { CreateAuditEventDto, QueryAuditEventsDto } from './dto/audit.dto.js';
import { createSuccessResponse } from '../../utils/response.js';

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  async createAuditEvent(
    request: FastifyRequest<{ Body: CreateAuditEventDto }>,
    reply: FastifyReply
  ): Promise<void> {
    const log = await this.auditService.logEvent(request.body);
    reply.status(201).send(createSuccessResponse(log, 'Audit event recorded'));
  }

  async listAuditEvents(
    request: FastifyRequest<{ Querystring: QueryAuditEventsDto }>,
    reply: FastifyReply
  ): Promise<void> {
    const result = await this.auditService.listEvents(request.query);
    reply.send(
      createSuccessResponse(result.items, undefined, {
        total: result.total,
        page: result.page,
        limit: result.limit,
      })
    );
  }
}
