import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { RiskController } from './risk.controller';
import { validateRequest } from '../../infrastructure/middleware/validator';
import {
  evaluateRiskSchema,
  riskByTransactionParamsSchema,
  riskFilterSchema,
  riskParamsSchema,
} from './risk.schemas';

export const riskRoutes: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new RiskController();

  fastify.post(
    '/evaluate',
    {
      preHandler: validateRequest({ body: evaluateRiskSchema }),
    },
    controller.evaluate
  );

  fastify.get(
    '/',
    {
      preHandler: validateRequest({ query: riskFilterSchema }),
    },
    controller.list
  );

  fastify.get(
    '/:id',
    {
      preHandler: validateRequest({ params: riskParamsSchema }),
    },
    controller.getById
  );

  fastify.get(
    '/transaction/:transactionId',
    {
      preHandler: validateRequest({ params: riskByTransactionParamsSchema }),
    },
    controller.getByTransactionId
  );
};
