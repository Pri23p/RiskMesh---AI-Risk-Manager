import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AuditController } from './audit.controller';
import { validateRequest } from '../../infrastructure/middleware/validator';
import {
  auditLogFilterSchema,
  auditLogParamsSchema,
  createAuditLogSchema,
} from './audit.schemas';

export const auditRoutes: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new AuditController();

  fastify.post(
    '/',
    {
      preHandler: validateRequest({ body: createAuditLogSchema }),
    },
    controller.create
  );

  fastify.get(
    '/',
    {
      preHandler: validateRequest({ query: auditLogFilterSchema }),
    },
    controller.list
  );

  fastify.get(
    '/:id',
    {
      preHandler: validateRequest({ params: auditLogParamsSchema }),
    },
    controller.getById
  );
};
