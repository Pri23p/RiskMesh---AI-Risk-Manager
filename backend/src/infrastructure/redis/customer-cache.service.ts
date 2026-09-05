import { redis, RedisClient } from './redis.client.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface CachedCustomerRiskSummary {
  customerId: string;
  accountAge: number;
  totalTransactions: number;
  previousFraudCount: number;
  avgTransactionAmount: number;
  lastKnownLocation?: string;
  cachedAt: string;
}

export class CustomerRiskCacheService {
  constructor(private redisClient: RedisClient = redis) {}

  private getKey(customerId: string): string {
    return `cache:customer_risk:${customerId}`;
  }

  public async getCustomerRiskSummary(
    customerId: string
  ): Promise<CachedCustomerRiskSummary | null> {
    const key = this.getKey(customerId);
    const data = await this.redisClient.safeGet(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as CachedCustomerRiskSummary;
    } catch (err) {
      logger.warn({ err, customerId }, 'Failed to parse cached customer risk summary');
      await this.redisClient.safeDel(key);
      return null;
    }
  }

  public async setCustomerRiskSummary(
    summary: CachedCustomerRiskSummary,
    ttlSeconds = env.CUSTOMER_CACHE_TTL_SEC
  ): Promise<void> {
    const key = this.getKey(summary.customerId);
    try {
      const payload = JSON.stringify(summary);
      await this.redisClient.safeSet(key, payload, ttlSeconds);
    } catch (err) {
      logger.warn({ err, customerId: summary.customerId }, 'Failed to cache customer risk summary');
    }
  }

  public async invalidateCustomer(customerId: string): Promise<void> {
    const key = this.getKey(customerId);
    await this.redisClient.safeDel(key);
    logger.debug({ customerId }, 'Invalidated customer risk cache');
  }
}

export const customerRiskCacheService = new CustomerRiskCacheService();
