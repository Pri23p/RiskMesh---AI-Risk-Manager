import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { SagaController } from './saga.controller.js';
import { RiskDecisionSagaOrchestrator } from './risk-decision.saga.js';
import { SagaRepository } from './saga.repository.js';
import { TransactionsRepository } from '../transactions/transactions.repository.js';
import { RiskService } from '../risk/risk.service.js';
import { RiskDecisionService } from '../risk/risk-decision.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RiskRepository } from '../risk/risk.repository.js';
import { FeatureGeneratorService } from '../risk/feature-generator.service.js';
import { MLClient } from '../../infrastructure/ml/ml.client.js';
import { RiskDecisionRepository } from '../risk/risk-decision.repository.js';
import { RiskDecisionEngine } from '../risk/decision-engine/decision-engine.js';
import { AuditRepository } from '../audit/audit.repository.js';

const transactionIdParamSchema = z.object({
  transactionId: z.string().min(1),
});

const sagaIdParamSchema = z.object({
  sagaId: z.string().uuid(),
});

export const sagaRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const sagaRepository = new SagaRepository();
  const transactionsRepository = new TransactionsRepository();
  const riskRepository = new RiskRepository();
  const featureGeneratorService = new FeatureGeneratorService();
  const mlClient = new MLClient();
  const auditRepository = new AuditRepository();
  const auditService = new AuditService(auditRepository);
  const decisionRepository = new RiskDecisionRepository();
  const decisionEngine = new RiskDecisionEngine();

  const riskService = new RiskService(
    riskRepository,
    transactionsRepository,
    featureGeneratorService,
    mlClient,
    auditService
  );

  const riskDecisionService = new RiskDecisionService(
    decisionRepository,
    transactionsRepository,
    featureGeneratorService,
    decisionEngine,
    auditService
  );

  const orchestrator = new RiskDecisionSagaOrchestrator(
    sagaRepository,
    transactionsRepository,
    riskService,
    riskDecisionService,
    auditService
  );

  const controller = new SagaController(orchestrator, sagaRepository);

  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /api/saga/start/:transactionId
  typedFastify.post(
    '/start/:transactionId',
    {
      schema: {
        params: transactionIdParamSchema,
      },
    },
    controller.startSaga.bind(controller)
  );

  // POST /api/saga/resume/:sagaId
  typedFastify.post(
    '/resume/:sagaId',
    {
      schema: {
        params: sagaIdParamSchema,
      },
    },
    controller.resumeSaga.bind(controller)
  );

  // GET /api/saga/:transactionId
  typedFastify.get(
    '/:transactionId',
    {
      schema: {
        params: transactionIdParamSchema,
      },
    },
    controller.getSaga.bind(controller)
  );
};
