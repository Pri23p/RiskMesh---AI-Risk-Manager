import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { redis, RedisClient } from '../redis/redis.client.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface IdempotentResult<T = unknown> {
  statusCode: number;
  body: T;
}

export class IdempotencyService {
  constructor(private redisClient: RedisClient = redis) {}

  private getRedisKey(key: string): string {
    return `idempotency:${key}`;
  }

  /**
   * Fast-path lookup in Redis -> PostgreSQL fallback -> return cached response if present.
   */
  async getRecord<T = unknown>(key: string): Promise<IdempotentResult<T> | null> {
    const redisKey = this.getRedisKey(key);

    // 1. Fast path: Redis lookup
    try {
      const cached = await this.redisClient.safeGet(redisKey);
      if (cached) {
        const parsed = JSON.parse(cached) as IdempotentResult<T>;
        logger.info({ idempotencyKey: key, source: 'redis' }, 'Returning idempotent response from Redis cache');
        return parsed;
      }
    } catch (err) {
      logger.warn({ err, key }, 'Redis idempotency lookup failed. Falling back to PostgreSQL.');
    }

    // 2. Slow path: PostgreSQL lookup (Persistent Source of Truth)
    try {
      const record = await prisma.idempotencyRecord.findUnique({
        where: { key },
      });

      if (!record) {
        return null;
      }

      // Check expiration
      if (record.expiresAt && record.expiresAt < new Date()) {
        await prisma.idempotencyRecord.delete({ where: { key } }).catch(() => null);
        await this.redisClient.safeDel(redisKey);
        return null;
      }

      const result: IdempotentResult<T> = {
        statusCode: record.statusCode,
        body: record.responseBody as T,
      };

      // Rehydrate Redis cache for subsequent rapid duplicate requests
      const remainingTtl = record.expiresAt
        ? Math.max(1, Math.floor((record.expiresAt.getTime() - Date.now()) / 1000))
        : env.IDEMPOTENCY_TTL_SEC;

      await this.redisClient.safeSet(redisKey, JSON.stringify(result), remainingTtl);

      logger.info({ idempotencyKey: key, source: 'postgresql' }, 'Returning idempotent response from PostgreSQL');
      return result;
    } catch (err) {
      logger.error({ err, key }, 'PostgreSQL idempotency lookup failed');
      return null;
    }
  }

  /**
   * Save idempotency record to PostgreSQL (source of truth) and Redis (fast cache).
   */
  async saveRecord<T>(
    key: string,
    targetPath: string,
    statusCode: number,
    responseBody: T,
    ttlSeconds = env.IDEMPOTENCY_TTL_SEC
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const result: IdempotentResult<T> = {
      statusCode,
      body: responseBody,
    };

    // 1. Persistent Source of Truth: PostgreSQL
    try {
      await prisma.idempotencyRecord.upsert({
        where: { key },
        create: {
          key,
          targetPath,
          statusCode,
          responseBody: responseBody as Prisma.InputJsonValue,
          expiresAt,
        },
        update: {
          statusCode,
          responseBody: responseBody as Prisma.InputJsonValue,
          expiresAt,
        },
      });
    } catch (err) {
      logger.error({ err, key }, 'Failed to persist idempotency record in PostgreSQL');
    }

    // 2. High-speed cache: Redis
    try {
      const redisKey = this.getRedisKey(key);
      await this.redisClient.safeSet(redisKey, JSON.stringify(result), ttlSeconds);
    } catch (err) {
      logger.warn({ err, key }, 'Failed to cache idempotency record in Redis');
    }
  }
}
