import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AnalyticsRepository } from './analytics.repository.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { queryAnalyticsSummarySchema, recordMetricSchema } from './dto/analytics.dto.js';

export const analyticsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const repository = new AnalyticsRepository();
  const service = new AnalyticsService(repository);
  const controller = new AnalyticsController(service);

  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/analytics/dashboard-summary
  typedFastify.get('/dashboard-summary', controller.getDashboardSummary.bind(controller));

  // GET /api/analytics/model-performance
  typedFastify.get('/model-performance', controller.getModelPerformance.bind(controller));

  // GET /api/analytics/summary
  typedFastify.get(
    '/summary',
    {
      schema: {
        querystring: queryAnalyticsSummarySchema,
      },
    },
    controller.getSummary.bind(controller)
  );

  // POST /api/analytics/metrics
  typedFastify.post(
    '/metrics',
    {
      schema: {
        body: recordMetricSchema,
      },
    },
    controller.recordMetric.bind(controller)
  );
};
