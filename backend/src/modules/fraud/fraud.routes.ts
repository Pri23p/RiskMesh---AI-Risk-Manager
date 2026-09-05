import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { FraudRepository } from './fraud.repository.js';
import { FraudService } from './fraud.service.js';
import { FraudController } from './fraud.controller.js';
import {
  createFraudRuleSchema,
  getFraudRuleParamsSchema,
  updateFraudRuleSchema,
  getCustomerNetworkParamsSchema,
} from './dto/fraud.dto.js';


export const fraudRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const repository = new FraudRepository();
  const service = new FraudService(repository);
  const controller = new FraudController(service);

  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /api/fraud/rules
  typedFastify.post(
    '/rules',
    {
      schema: {
        body: createFraudRuleSchema,
      },
    },
    controller.createRule.bind(controller)
  );

  // GET /api/fraud/rules
  typedFastify.get('/rules', controller.getActiveRules.bind(controller));

  // GET /api/fraud/rules/:id
  typedFastify.get(
    '/rules/:id',
    {
      schema: {
        params: getFraudRuleParamsSchema,
      },
    },
    controller.getRuleById.bind(controller)
  );

  // PATCH /api/fraud/rules/:id
  typedFastify.patch(
    '/rules/:id',
    {
      schema: {
        params: getFraudRuleParamsSchema,
        body: updateFraudRuleSchema,
      },
    },
    controller.updateRule.bind(controller)
  );

  // DELETE /api/fraud/rules/:id
  typedFastify.delete(
    '/rules/:id',
    {
      schema: {
        params: getFraudRuleParamsSchema,
      },
    },
    controller.deleteRule.bind(controller)
  );

  // GET /api/fraud/network/:customerId
  typedFastify.get(
    '/network/:customerId',
    {
      schema: {
        params: getCustomerNetworkParamsSchema,
      },
    },
    controller.getNetworkGraph.bind(controller)
  );
};

