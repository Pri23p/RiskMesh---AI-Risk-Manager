import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { transactionsRoutes } from './modules/transactions/transactions.routes.js';
import { riskRoutes } from './modules/risk/risk.routes.js';
import { fraudRoutes } from './modules/fraud/fraud.routes.js';
import { verificationRoutes } from './modules/verification/verification.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { sagaRoutes } from './modules/saga/saga.routes.js';

export const apiRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Health check under /api/health
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      service: 'riskmesh-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Domain modules registration
  await fastify.register(transactionsRoutes, { prefix: '/transactions' });
  await fastify.register(riskRoutes, { prefix: '/risk' });
  await fastify.register(fraudRoutes, { prefix: '/fraud' });
  await fastify.register(verificationRoutes, { prefix: '/verification' });
  await fastify.register(analyticsRoutes, { prefix: '/analytics' });
  await fastify.register(auditRoutes, { prefix: '/audit' });
  await fastify.register(sagaRoutes, { prefix: '/saga' });
};

