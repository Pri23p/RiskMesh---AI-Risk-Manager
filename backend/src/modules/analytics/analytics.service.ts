import { AnalyticsRepository } from './analytics.repository';
import { IAnalyticsMetric, RecordMetricDTO, SummaryStatsDTO } from './analytics.types';
import { logger } from '../../config/logger';

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository = new AnalyticsRepository()) {}

  async recordMetric(dto: RecordMetricDTO): Promise<IAnalyticsMetric> {
    logger.debug({ metricName: dto.metricName, value: dto.metricValue }, 'Recording analytics metric');
    return this.repository.createMetric(dto);
  }

  async getMetrics(metricName: string, from?: string, to?: string): Promise<IAnalyticsMetric[]> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.repository.getMetrics(metricName, fromDate, toDate);
  }

  async getSummary(): Promise<SummaryStatsDTO> {
    return this.repository.getSummaryStats();
  }
}
