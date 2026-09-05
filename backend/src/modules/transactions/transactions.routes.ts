import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { TransactionsRepository } from './transactions.repository.js';
import { CustomersRepository } from './customers.repository.js';
import { AuditRepository } from '../audit/audit.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { TransactionsService } from './transactions.service.js';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service.js';
import { TransactionsController } from './transactions.controller.js';
import {
  createTransactionSchema,
  getTransactionByIdParamsSchema,
  queryTransactionsSchema,
  transactionHeadersSchema,
  updateTransactionStatusSchema,
} from './dto/transaction.dto.js';

export const transactionsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const transactionsRepository = new TransactionsRepository();
  const customersRepository = new CustomersRepository();
  const auditRepository = new AuditRepository();
  const auditService = new AuditService(auditRepository);
  const idempotencyService = new IdempotencyService();

  const transactionsService = new TransactionsService(
    transactionsRepository,
    customersRepository,
    auditService
  );

  const controller = new TransactionsController(transactionsService, idempotencyService);

  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /api/transactions
  typedFastify.post(
    '/',
    {
      schema: {
        body: createTransactionSchema,
        headers: transactionHeadersSchema,
      },
    },
    controller.createTransaction.bind(controller)
  );

  // GET /api/transactions
  typedFastify.get(
    '/',
    {
      schema: {
        querystring: queryTransactionsSchema,
      },
    },
    controller.listTransactions.bind(controller)
  );

  // GET /api/transactions/:id
  typedFastify.get(
    '/:id',
    {
      schema: {
        params: getTransactionByIdParamsSchema,
      },
    },
    controller.getTransactionById.bind(controller)
  );

  typedFastify.patch(
    '/:id/status',
    { schema: { params: getTransactionByIdParamsSchema, body: updateTransactionStatusSchema } },
    controller.updateStatus.bind(controller)
  );
};
