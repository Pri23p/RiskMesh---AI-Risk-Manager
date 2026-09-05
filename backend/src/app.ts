import Fastify from 'fastify';
import cors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { apiRoutes } from './routes.js';

export function buildApp() {
  const app = Fastify({
    logger,
    disableRequestLogging: false,
  });

  // Configure Zod Validation & Serialization compilers
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Configure CORS
  const corsOrigins =
    env.CORS_ORIGIN === '*'
      ? '*'
      : env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

  typedApp.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Centralized Error Handling & 404 Routing
  typedApp.setErrorHandler(errorHandler);
  typedApp.setNotFoundHandler(notFoundHandler);

  // Requirement 9: GET /health -> { "status": "ok" }
  typedApp.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
    });
  });

  // Requirement 10: Register API prefix /api
  typedApp.register(apiRoutes, { prefix: env.API_PREFIX });

  return typedApp;
}

