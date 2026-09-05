import { Consumer } from 'kafkajs';
import { kafkaClient, KafkaClient } from '../../../infrastructure/kafka/kafka.client.js';
import { KAFKA_TOPICS } from '../../../infrastructure/events/event.types.js';
import { consumerIdempotencyGuard, ConsumerIdempotencyGuard } from './idempotency.guard.js';
import { prisma } from '../../../infrastructure/database/prisma.js';
import { logger } from '../../../utils/logger.js';

export class AuditConsumer {
  private consumer: Consumer | null = null;
  public readonly groupId = 'riskmesh-audit-group';

  constructor(
    private readonly kafka: KafkaClient = kafkaClient,
    private readonly idempotency: ConsumerIdempotencyGuard = consumerIdempotencyGuard
  ) {}

  public async handleMessage(payloadString: string): Promise<boolean> {
    try {
      const event = JSON.parse(payloadString);
      const { eventId, eventType, aggregateType, aggregateId, payload } = event;

      if (!eventId || !eventType) {
        return false;
      }

      // Consumer Idempotency Check
      const shouldProcess = await this.idempotency.shouldProcess(this.groupId, eventId);
      if (!shouldProcess) {
        return true;
      }

      logger.info({ eventId, eventType, aggregateId }, 'AuditConsumer recording audit event');

      await prisma.auditEvent.create({
        data: {
          entityType: aggregateType || 'TRANSACTION',
          entityId: aggregateId || 'UNKNOWN',
          eventType,
          metadata: payload || {},
        },
      });

      return true;
    } catch (err) {
      logger.error({ err, payloadString }, 'Error processing message in AuditConsumer');
      return false;
    }
  }

  public async start(): Promise<void> {
    try {
      this.consumer = this.kafka.createConsumer(this.groupId);
      await this.consumer.connect();
      await this.consumer.subscribe({
        topics: [
          KAFKA_TOPICS.TRANSACTIONS,
          KAFKA_TOPICS.RISK_EVENTS,
          KAFKA_TOPICS.VERIFICATIONS,
          KAFKA_TOPICS.AUDIT_STREAM,
        ],
        fromBeginning: false,
      });

      await this.consumer.run({
        eachMessage: async ({ message }) => {
          if (message.value) {
            await this.handleMessage(message.value.toString());
          }
        },
      });

      logger.info({ groupId: this.groupId }, 'AuditConsumer started and subscribed to all domain topics');
    } catch (err) {
      logger.warn({ err, groupId: this.groupId }, 'Failed to start AuditConsumer');
    }
  }

  public async stop(): Promise<void> {
    if (this.consumer) {
      try {
        await this.consumer.disconnect();
      } catch (err) {
        logger.warn({ err }, 'Error disconnecting AuditConsumer');
      }
      this.consumer = null;
    }
  }
}

export const auditConsumer = new AuditConsumer();
