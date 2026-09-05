import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AuditRepository } from './audit.repository.js';
import { AuditService } from './audit.service.js';
import { AuditController } from './audit.controller.js';
import { createAuditEventSchema, queryAuditEventsSchema } from './dto/audit.dto.js';

export const auditRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const repository = new AuditRepository();
  const service = new AuditService(repository);
  const controller = new AuditController(service);

  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /api/audit/events
  typedFastify.post(
    '/events',
    {
      schema: {
        body: createAuditEventSchema,
      },
    },
    controller.createAuditEvent.bind(controller)
  );

  // GET /api/audit/events
  typedFastify.get(
    '/events',
    {
      schema: {
        querystring: queryAuditEventsSchema,
      },
    },
    controller.listAuditEvents.bind(controller)
  );
};
