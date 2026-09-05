import { Consumer } from 'kafkajs';
import { kafkaClient, KafkaClient } from '../../../infrastructure/kafka/kafka.client.js';
import { KAFKA_TOPICS } from '../../../infrastructure/events/event.types.js';
import { consumerIdempotencyGuard, ConsumerIdempotencyGuard } from './idempotency.guard.js';
import { RiskService } from '../../risk/risk.service.js';
import { RiskDecisionService } from '../../risk/risk-decision.service.js';
import { logger } from '../../../utils/logger.js';

export class RiskProcessorConsumer {
  private consumer: Consumer | null = null;
  public readonly groupId = 'riskmesh-risk-processor-group';

  constructor(
    private readonly kafka: KafkaClient = kafkaClient,
    private readonly idempotency: ConsumerIdempotencyGuard = consumerIdempotencyGuard,
    private readonly riskService?: RiskService,
    private readonly riskDecisionService?: RiskDecisionService
  ) {}

  public async handleMessage(payloadString: string): Promise<boolean> {
    try {
      const event = JSON.parse(payloadString);
      const { eventId, eventType, aggregateId } = event;

      if (!eventId || eventType !== 'transaction.created') {
        return false;
      }

      // Consumer Idempotency Check
      const shouldProcess = await this.idempotency.shouldProcess(this.groupId, eventId);
      if (!shouldProcess) {
        return true;
      }

      logger.info({ eventId, transactionId: aggregateId }, 'RiskProcessorConsumer triggering async evaluation');

      if (this.riskDecisionService) {
        await this.riskDecisionService.makeDecision(aggregateId);
      } else if (this.riskService) {
        await this.riskService.calculateRisk(aggregateId);
      }

      return true;
    } catch (err) {
      logger.error({ err, payloadString }, 'Error during async risk processing');
      return false;
    }
  }

  public async start(): Promise<void> {
    try {
      this.consumer = this.kafka.createConsumer(this.groupId);
      await this.consumer.connect();
      await this.consumer.subscribe({
        topics: [KAFKA_TOPICS.TRANSACTIONS],
        fromBeginning: false,
      });

      await this.consumer.run({
        eachMessage: async ({ message }) => {
          if (message.value) {
            await this.handleMessage(message.value.toString());
          }
        },
      });

      logger.info({ groupId: this.groupId }, 'RiskProcessorConsumer started and subscribed to transactions');
    } catch (err) {
      logger.warn({ err, groupId: this.groupId }, 'Failed to start RiskProcessorConsumer');
    }
  }

  public async stop(): Promise<void> {
    if (this.consumer) {
      try {
        await this.consumer.disconnect();
      } catch (err) {
        logger.warn({ err }, 'Error disconnecting RiskProcessorConsumer');
      }
      this.consumer = null;
    }
  }
}
