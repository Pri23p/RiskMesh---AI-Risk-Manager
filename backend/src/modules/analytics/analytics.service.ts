import { AnalyticsMetric } from '@prisma/client';
import { AnalyticsRepository } from './analytics.repository.js';
import { QueryAnalyticsSummaryDto, RecordMetricDto } from './dto/analytics.dto.js';
import { IAnalyticsSummary } from './types/analytics.types.js';
import { logger } from '../../utils/logger.js';

export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async getSummary(query: QueryAnalyticsSummaryDto): Promise<IAnalyticsSummary> {
    return this.analyticsRepository.getSummary(query);
  }

  async getDashboardSummary() {
    const kpis = await this.analyticsRepository.getDashboardKpis();
    const modelPerformance = this.analyticsRepository.getModelPerformance();

    return {
      kpis,
      modelQuality: modelPerformance.metrics,
      datasetSummary: modelPerformance.dataset_summary,
      confusionMatrix: modelPerformance.confusion_matrix,
    };
  }

  getModelPerformance() {
    return this.analyticsRepository.getModelPerformance();
  }

  async recordMetric(dto: RecordMetricDto): Promise<AnalyticsMetric> {
    logger.debug({ metricName: dto.metricName, value: dto.value }, 'Recording analytics metric');
    return this.analyticsRepository.recordMetric(dto);
  }
}
