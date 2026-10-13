import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { FraudController } from './fraud.controller';
import { validateRequest } from '../../infrastructure/middleware/validator';
import {
  createFraudSignalSchema,
  fraudSignalByTxParamsSchema,
  fraudSignalFilterSchema,
  fraudSignalParamsSchema,
} from './fraud.schemas';

export const fraudRoutes: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new FraudController();

  fastify.post(
    '/',
    {
      preHandler: validateRequest({ body: createFraudSignalSchema }),
    },
    controller.create
  );

  fastify.get(
    '/',
    {
      preHandler: validateRequest({ query: fraudSignalFilterSchema }),
    },
    controller.list
  );

  fastify.get(
    '/:id',
    {
      preHandler: validateRequest({ params: fraudSignalParamsSchema }),
    },
    controller.getById
  );

  fastify.get(
    '/transaction/:transactionId',
    {
      preHandler: validateRequest({ params: fraudSignalByTxParamsSchema }),
    },
    controller.getByTransactionId
  );
};
