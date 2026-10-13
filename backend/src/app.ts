import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './infrastructure/middleware/errorHandler';
import { transactionRoutes } from './modules/transactions/transactions.routes';
import { riskRoutes } from './modules/risk/risk.routes';
import { fraudRoutes } from './modules/fraud/fraud.routes';
import { verificationRoutes } from './modules/verification/verification.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { auditRoutes } from './modules/audit/audit.routes';

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = fastify({
    logger: false, // We use our structured custom Pino logger
    disableRequestLogging: true,
  });

  // 1. Register Plugins
  await app.register(cors, {
    origin: config.CORS_ORIGIN === '*' ? true : [config.CORS_ORIGIN, 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // 2. Request & Response Logging Hooks
  app.addHook('onRequest', async (request) => {
    logger.info(
      {
        reqId: request.id,
        method: request.method,
        url: request.url,
        ip: request.ip,
      },
      'Incoming HTTP Request'
    );
  });

  app.addHook('onResponse', async (request, reply) => {
    logger.info(
      {
        reqId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: `${reply.elapsedTime.toFixed(2)}ms`,
      },
      'Completed HTTP Request'
    );
  });

  // 3. Health Endpoint (GET /health)
  app.get('/health', async (_request, reply) => {
    reply.status(200).send({
      status: 'ok',
    });
  });

  // 4. Register Modular API Routes under /api prefix
  await app.register(
    async (api) => {
      api.register(transactionRoutes, { prefix: '/transactions' });
      api.register(riskRoutes, { prefix: '/risk' });
      api.register(fraudRoutes, { prefix: '/fraud' });
      api.register(verificationRoutes, { prefix: '/verification' });
      api.register(analyticsRoutes, { prefix: '/analytics' });
      api.register(auditRoutes, { prefix: '/audit' });
    },
    { prefix: config.API_PREFIX }
  );

  // 5. Centralized Error Handler
  app.setErrorHandler(errorHandler);

  // 6. 404 Not Found Handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  });

  return app;
};
