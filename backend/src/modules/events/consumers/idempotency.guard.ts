import { redis, RedisClient } from '../../../infrastructure/redis/redis.client.js';
import { logger } from '../../../utils/logger.js';

export class ConsumerIdempotencyGuard {
  constructor(private redisClient: RedisClient = redis) {}

  /**
   * Returns true if event has NOT been processed before and acquires lock for processing.
   * Returns false if event was already processed (duplicate).
   */
  async shouldProcess(consumerGroup: string, eventId: string, ttlSeconds = 86400): Promise<boolean> {
    const key = `consumer:${consumerGroup}:event:${eventId}`;
    const acquired = await this.redisClient.safeSetNX(key, 'PROCESSED', ttlSeconds);
    if (!acquired) {
      logger.info({ consumerGroup, eventId }, 'Duplicate event detected by consumer. Safely skipping.');
      return false;
    }
    return true;
  }
}

export const consumerIdempotencyGuard = new ConsumerIdempotencyGuard();
