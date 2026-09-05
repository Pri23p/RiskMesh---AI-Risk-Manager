import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { VerificationRepository } from './verification.repository.js';
import { VerificationService } from './verification.service.js';
import { VerificationController } from './verification.controller.js';
import { TransactionsRepository } from '../transactions/transactions.repository.js';
import {
  createVerificationCaseSchema,
  getVerificationCaseParamsSchema,
  queryVerificationCasesSchema,
  updateVerificationDecisionSchema,
} from './dto/verification.dto.js';

export const verificationRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const verificationRepository = new VerificationRepository();
  const transactionsRepository = new TransactionsRepository();
  const service = new VerificationService(verificationRepository, transactionsRepository);
  const controller = new VerificationController(service);

  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /api/verification/cases
  typedFastify.post(
    '/cases',
    {
      schema: {
        body: createVerificationCaseSchema,
      },
    },
    controller.createCase.bind(controller)
  );

  // GET /api/verification/cases
  typedFastify.get(
    '/cases',
    {
      schema: {
        querystring: queryVerificationCasesSchema,
      },
    },
    controller.listCases.bind(controller)
  );

  // GET /api/verification/cases/:id
  typedFastify.get(
    '/cases/:id',
    {
      schema: {
        params: getVerificationCaseParamsSchema,
      },
    },
    controller.getCaseById.bind(controller)
  );

  // PATCH /api/verification/cases/:id/decision
  typedFastify.patch(
    '/cases/:id/decision',
    {
      schema: {
        params: getVerificationCaseParamsSchema,
        body: updateVerificationDecisionSchema,
      },
    },
    controller.updateDecision.bind(controller)
  );
};
