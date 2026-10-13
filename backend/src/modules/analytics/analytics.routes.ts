import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AnalyticsController } from './analytics.controller';
import { validateRequest } from '../../infrastructure/middleware/validator';
import { analyticsQuerySchema, recordMetricSchema } from './analytics.schemas';

export const analyticsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new AnalyticsController();

  fastify.get('/summary', controller.getSummary);

  fastify.post(
    '/metrics',
    {
      preHandler: validateRequest({ body: recordMetricSchema }),
    },
    controller.recordMetric
  );

  fastify.get(
    '/metrics/:metricName',
    {
      preHandler: validateRequest({ query: analyticsQuerySchema }),
    },
    controller.getMetrics
  );
};
