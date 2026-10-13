import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { TransactionsController } from './transactions.controller';
import { validateRequest } from '../../infrastructure/middleware/validator';
import {
  createTransactionSchema,
  transactionFilterSchema,
  transactionParamsSchema,
  updateTransactionStatusSchema,
} from './transactions.schemas';

export const transactionRoutes: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new TransactionsController();

  fastify.post(
    '/',
    {
      preHandler: validateRequest({ body: createTransactionSchema }),
    },
    controller.create
  );

  fastify.get(
    '/',
    {
      preHandler: validateRequest({ query: transactionFilterSchema }),
    },
    controller.list
  );

  fastify.get(
    '/:id',
    {
      preHandler: validateRequest({ params: transactionParamsSchema }),
    },
    controller.getById
  );

  fastify.patch(
    '/:id/status',
    {
      preHandler: validateRequest({
        params: transactionParamsSchema,
        body: updateTransactionStatusSchema,
      }),
    },
    controller.updateStatus
  );
};
