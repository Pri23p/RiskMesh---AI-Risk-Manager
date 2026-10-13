import { FastifyReply, FastifyRequest } from 'fastify';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryInput, RecordMetricInput } from './analytics.schemas';
import { successResponse } from '../../utils/response';

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService = new AnalyticsService()) {}

  recordMetric = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = request.body as RecordMetricInput;
    const result = await this.service.recordMetric(body);
    reply.status(201).send(successResponse(result));
  };

  getMetrics = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = request.params as { metricName: string };
    const query = request.query as AnalyticsQueryInput;
    const result = await this.service.getMetrics(params.metricName, query.from, query.to);
    reply.status(200).send(successResponse(result));
  };

  getSummary = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = await this.service.getSummary();
    reply.status(200).send(successResponse(result));
  };
}
