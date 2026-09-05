import { FastifyReply, FastifyRequest } from 'fastify';
import { AnalyticsService } from './analytics.service.js';
import { QueryAnalyticsSummaryDto, RecordMetricDto } from './dto/analytics.dto.js';
import { createSuccessResponse } from '../../utils/response.js';

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  async getSummary(
    request: FastifyRequest<{ Querystring: QueryAnalyticsSummaryDto }>,
    reply: FastifyReply
  ): Promise<void> {
    const summary = await this.analyticsService.getSummary(request.query);
    reply.send(createSuccessResponse(summary));
  }

  async getDashboardSummary(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = await this.analyticsService.getDashboardSummary();
    reply.send(createSuccessResponse(data));
  }

  async getModelPerformance(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = this.analyticsService.getModelPerformance();
    reply.send(createSuccessResponse(data));
  }

  async recordMetric(
    request: FastifyRequest<{ Body: RecordMetricDto }>,
    reply: FastifyReply
  ): Promise<void> {
    const metric = await this.analyticsService.recordMetric(request.body);
    reply.status(201).send(createSuccessResponse(metric, 'Metric recorded successfully'));
  }
}
