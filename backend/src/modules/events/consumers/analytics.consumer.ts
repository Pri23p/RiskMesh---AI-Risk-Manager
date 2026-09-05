import { Consumer } from 'kafkajs';
import { kafkaClient, KafkaClient } from '../../../infrastructure/kafka/kafka.client.js';
import { KAFKA_TOPICS } from '../../../infrastructure/events/event.types.js';
import { consumerIdempotencyGuard, ConsumerIdempotencyGuard } from './idempotency.guard.js';
import { prisma } from '../../../infrastructure/database/prisma.js';
import { logger } from '../../../utils/logger.js';

export class AnalyticsConsumer {
  private consumer: Consumer | null = null;
  public readonly groupId = 'riskmesh-analytics-group';

  constructor(
    private readonly kafka: KafkaClient = kafkaClient,
    private readonly idempotency: ConsumerIdempotencyGuard = consumerIdempotencyGuard
  ) {}

  public async handleMessage(payloadString: string): Promise<boolean> {
    try {
      const event = JSON.parse(payloadString);
      const { eventId, eventType, payload } = event;

      if (!eventId || !eventType) {
        logger.warn({ payloadString }, 'Malformed message skipped in AnalyticsConsumer');
        return false;
      }

      // Consumer Idempotency Check
      const shouldProcess = await this.idempotency.shouldProcess(this.groupId, eventId);
      if (!shouldProcess) {
        return true; // Already processed
      }

      logger.info({ eventId, eventType }, 'AnalyticsConsumer processing event');

      // Aggregate analytical metrics based on event type
      if (eventType === 'transaction.created') {
        await prisma.analyticsMetric.create({
          data: {
            metricName: 'transaction.volume',
            value: Number(payload.amount ?? 0),
            dimensions: { currency: payload.currency, customerId: payload.customerId },
          },
        });
      } else if (eventType === 'transaction.blocked' || eventType === 'fraud.confirmed') {
        await prisma.analyticsMetric.create({
          data: {
            metricName: 'fraud.loss_prevented',
            value: Number(payload.amount ?? payload.expectedLoss ?? 0),
            dimensions: { transactionId: payload.transactionId, reason: payload.reason },
          },
        });
      }

      return true;
    } catch (err) {
      logger.error({ err, payloadString }, 'Error processing message in AnalyticsConsumer');
      return false;
    }
  }

  public async start(): Promise<void> {
    try {
      this.consumer = this.kafka.createConsumer(this.groupId);
      await this.consumer.connect();
      await this.consumer.subscribe({
        topics: [KAFKA_TOPICS.TRANSACTIONS, KAFKA_TOPICS.RISK_EVENTS],
        fromBeginning: false,
      });

      await this.consumer.run({
        eachMessage: async ({ message }) => {
          if (message.value) {
            await this.handleMessage(message.value.toString());
          }
        },
      });

      logger.info({ groupId: this.groupId }, 'AnalyticsConsumer started and subscribed to topics');
    } catch (err) {
      logger.warn({ err, groupId: this.groupId }, 'Failed to start AnalyticsConsumer. Operating in standalone mode.');
    }
  }

  public async stop(): Promise<void> {
    if (this.consumer) {
      try {
        await this.consumer.disconnect();
      } catch (err) {
        logger.warn({ err }, 'Error disconnecting AnalyticsConsumer');
      }
      this.consumer = null;
    }
  }
}

export const analyticsConsumer = new AnalyticsConsumer();
