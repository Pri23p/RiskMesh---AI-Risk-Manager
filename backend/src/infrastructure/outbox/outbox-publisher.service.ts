import { OutboxRepository } from './outbox.repository.js';
import { kafkaClient, KafkaClient } from '../kafka/kafka.client.js';
import { DomainEventType, mapEventToTopic } from '../events/event.types.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class OutboxPublisherService {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly outboxRepository: OutboxRepository = new OutboxRepository(),
    private readonly kafka: KafkaClient = kafkaClient
  ) {}

  /**
   * Process a single batch of pending outbox events.
   * Returns count of published events.
   */
  async processOutboxBatch(): Promise<{ published: number; failed: number }> {
    const pendingEvents = await this.outboxRepository.fetchPendingBatch();
    if (pendingEvents.length === 0) {
      return { published: 0, failed: 0 };
    }

    let publishedCount = 0;
    let failedCount = 0;

    for (const event of pendingEvents) {
      const topic = mapEventToTopic(event.eventType as DomainEventType);
      const messageValue = JSON.stringify({
        eventId: event.id,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        createdAt: event.createdAt.toISOString(),
      });

      try {
        await this.kafka.publish({
          topic,
          messages: [
            {
              key: event.aggregateId,
              value: messageValue,
              headers: {
                eventType: event.eventType,
                eventId: event.id,
                aggregateType: event.aggregateType,
              },
            },
          ],
        });

        await this.outboxRepository.markPublished(event.id);
        publishedCount++;

        logger.info(
          {
            eventId: event.id,
            eventType: event.eventType,
            topic,
            aggregateId: event.aggregateId,
          },
          'Outbox event published to Kafka successfully'
        );
      } catch (err: unknown) {
        failedCount++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.warn(
          {
            eventId: event.id,
            eventType: event.eventType,
            retryCount: event.retryCount + 1,
            error: errorMessage,
          },
          'Failed to publish outbox event to Kafka. Staged safely in PostgreSQL for retry.'
        );

        await this.outboxRepository.recordFailure(event.id, errorMessage);
      }
    }

    return { published: publishedCount, failed: failedCount };
  }

  public startPublisherLoop(intervalMs = env.OUTBOX_POLL_INTERVAL_MS): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const poll = async () => {
      try {
        await this.processOutboxBatch();
      } catch (err) {
        logger.error({ err }, 'Error during outbox polling batch execution');
      } finally {
        if (this.isRunning) {
          this.timer = setTimeout(poll, intervalMs);
        }
      }
    };

    this.timer = setTimeout(poll, intervalMs);
    logger.info({ intervalMs }, 'Outbox Publisher polling loop started');
  }

  public stopPublisherLoop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info('Outbox Publisher polling loop stopped');
  }
}

export const outboxPublisherService = new OutboxPublisherService();
