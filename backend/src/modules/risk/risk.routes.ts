import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { RiskRepository } from './risk.repository.js';
import { RiskService } from './risk.service.js';
import { RiskController } from './risk.controller.js';
import { FeatureGeneratorService } from './feature-generator.service.js';
import { TransactionsRepository } from '../transactions/transactions.repository.js';
import { MLClient } from '../../infrastructure/ml/ml.client.js';
import { AuditRepository } from '../audit/audit.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { RiskDecisionRepository } from './risk-decision.repository.js';
import { RiskDecisionService } from './risk-decision.service.js';
import { RiskDecisionEngine } from './decision-engine/decision-engine.js';
import { scoreTransactionParamsSchema, getRiskScoreParamsSchema } from './dto/risk.dto.js';

export const riskRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const riskRepository = new RiskRepository();
  const riskDecisionRepository = new RiskDecisionRepository();
  const transactionsRepository = new TransactionsRepository();
  const featureGeneratorService = new FeatureGeneratorService();
  const mlClient = new MLClient();
  const auditRepository = new AuditRepository();
  const auditService = new AuditService(auditRepository);
  const decisionEngine = new RiskDecisionEngine();

  const riskService = new RiskService(
    riskRepository,
    transactionsRepository,
    featureGeneratorService,
    mlClient,
    auditService
  );

  const riskDecisionService = new RiskDecisionService(
    riskDecisionRepository,
    transactionsRepository,
    featureGeneratorService,
    decisionEngine,
    auditService
  );

  const controller = new RiskController(riskService, riskDecisionService);

  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /api/risk/score/:transactionId
  typedFastify.post(
    '/score/:transactionId',
    {
      schema: {
        params: scoreTransactionParamsSchema,
      },
    },
    controller.scoreTransaction.bind(controller)
  );

  // GET /api/risk/:transactionId
  typedFastify.get(
    '/:transactionId',
    {
      schema: {
        params: getRiskScoreParamsSchema,
      },
    },
    controller.getRiskScore.bind(controller)
  );

  // POST /api/risk/decision/:transactionId
  typedFastify.post(
    '/decision/:transactionId',
    {
      schema: {
        params: scoreTransactionParamsSchema,
      },
    },
    controller.makeDecision.bind(controller)
  );

  // GET /api/risk/decision/:transactionId
  typedFastify.get(
    '/decision/:transactionId',
    {
      schema: {
        params: getRiskScoreParamsSchema,
      },
    },
    controller.getDecision.bind(controller)
  );
};
