import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RedisClient } from '../src/infrastructure/redis/redis.client.js';
import { RateLimiterService } from '../src/infrastructure/redis/rate-limiter.service.js';
import { IdempotencyService } from '../src/infrastructure/idempotency/idempotency.service.js';
import { CustomerRiskCacheService } from '../src/infrastructure/redis/customer-cache.service.js';
import { RiskStateCacheService } from '../src/infrastructure/redis/risk-state-cache.service.js';
import { prisma } from '../src/infrastructure/database/prisma.js';

describe('Phase 6: Redis & API Resilience Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. RATE LIMITING TESTS
  // ==========================================
  describe('API Rate Limiter', () => {
    it('should allow requests within configured threshold and block when exceeded (HTTP 429)', async () => {
      // Mock Redis client with simulated in-memory store
      const mockRedisClient = {
        isAvailable: vi.fn().mockReturnValue(true),
        safeEval: vi.fn(),
      } as unknown as RedisClient;

      let callCount = 0;
      // Simulate Lua script execution
      (mockRedisClient.safeEval as any).mockImplementation(
        async (_script: string, _numKeys: number, _key: string, limit: number, window: number) => {
          callCount++;
          if (callCount <= limit) {
            return [1, callCount, window]; // Allowed: [1, count, ttl]
          } else {
            return [0, callCount, window]; // Exceeded: [0, count, ttl]
          }
        }
      );

      const rateLimiter = new RateLimiterService(mockRedisClient);
      const config = { maxRequests: 3, windowSeconds: 60, keyPrefix: 'test' };

      // Requests 1, 2, 3 should be allowed
      const res1 = await rateLimiter.checkLimit('192.168.1.1', config);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = await rateLimiter.checkLimit('192.168.1.1', config);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = await rateLimiter.checkLimit('192.168.1.1', config);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);

      // Request 4 should exceed limit and be rejected
      const res4 = await rateLimiter.checkLimit('192.168.1.1', config);
      expect(res4.allowed).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.resetSeconds).toBe(60);
    });

    it('should safely fall back to in-memory rate limiting when Redis is unavailable', async () => {
      const mockDegradedRedis = {
        isAvailable: vi.fn().mockReturnValue(false),
      } as unknown as RedisClient;

      const rateLimiter = new RateLimiterService(mockDegradedRedis);
      const config = { maxRequests: 2, windowSeconds: 60, keyPrefix: 'memory_test' };

      const res1 = await rateLimiter.checkLimit('10.0.0.1', config);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(1);

      const res2 = await rateLimiter.checkLimit('10.0.0.1', config);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(0);

      const res3 = await rateLimiter.checkLimit('10.0.0.1', config);
      expect(res3.allowed).toBe(false);
      expect(res3.remaining).toBe(0);
    });
  });

  // ==========================================
  // 2. IDEMPOTENCY DUAL-LAYER TESTS
  // ==========================================
  describe('Idempotency Service (Redis + PostgreSQL)', () => {
    it('should return cached result directly from Redis on duplicate request', async () => {
      const cachedResult = {
        statusCode: 201,
        body: { id: 'tx-1', transactionId: 'TXN100', status: 'APPROVED' },
      };

      const mockRedisClient = {
        safeGet: vi.fn().mockResolvedValue(JSON.stringify(cachedResult)),
        safeSet: vi.fn().mockResolvedValue(true),
        safeDel: vi.fn().mockResolvedValue(true),
      } as unknown as RedisClient;

      const dbSpy = vi.spyOn(prisma.idempotencyRecord, 'findUnique');

      const idempotencyService = new IdempotencyService(mockRedisClient);
      const result = await idempotencyService.getRecord('idem-key-1');

      expect(result).toEqual(cachedResult);
      expect(mockRedisClient.safeGet).toHaveBeenCalledWith('idempotency:idem-key-1');
      // Should NOT query PostgreSQL when Redis hits
      expect(dbSpy).not.toHaveBeenCalled();
    });

    it('should fall back to PostgreSQL and rehydrate Redis if Redis cache misses', async () => {
      const mockRedisClient = {
        safeGet: vi.fn().mockResolvedValue(null), // Cache miss
        safeSet: vi.fn().mockResolvedValue(true),
        safeDel: vi.fn().mockResolvedValue(true),
      } as unknown as RedisClient;

      const dbRecord = {
        id: 'rec-1',
        key: 'idem-key-2',
        targetPath: '/api/transactions',
        statusCode: 201,
        responseBody: { transactionId: 'TXN200', amount: 5000 },
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
      };

      vi.spyOn(prisma.idempotencyRecord, 'findUnique').mockResolvedValue(dbRecord as any);

      const idempotencyService = new IdempotencyService(mockRedisClient);
      const result = await idempotencyService.getRecord('idem-key-2');

      expect(result).toEqual({
        statusCode: 201,
        body: dbRecord.responseBody,
      });
      // Should rehydrate Redis
      expect(mockRedisClient.safeSet).toHaveBeenCalledWith(
        'idempotency:idem-key-2',
        JSON.stringify(result),
        expect.any(Number)
      );
    });

    it('should evict expired idempotency keys and return null', async () => {
      const mockRedisClient = {
        safeGet: vi.fn().mockResolvedValue(null),
        safeDel: vi.fn().mockResolvedValue(true),
      } as unknown as RedisClient;

      const expiredRecord = {
        id: 'rec-expired',
        key: 'expired-key',
        targetPath: '/api/transactions',
        statusCode: 200,
        responseBody: {},
        expiresAt: new Date(Date.now() - 10000), // Expired 10s ago
        createdAt: new Date(),
      };

      vi.spyOn(prisma.idempotencyRecord, 'findUnique').mockResolvedValue(expiredRecord as any);
      const deleteSpy = vi.spyOn(prisma.idempotencyRecord, 'delete').mockResolvedValue(expiredRecord as any);

      const idempotencyService = new IdempotencyService(mockRedisClient);
      const result = await idempotencyService.getRecord('expired-key');

      expect(result).toBeNull();
      expect(deleteSpy).toHaveBeenCalledWith({ where: { key: 'expired-key' } });
      expect(mockRedisClient.safeDel).toHaveBeenCalledWith('idempotency:expired-key');
    });

    it('should save dual-layer idempotency record to both PostgreSQL and Redis', async () => {
      const mockRedisClient = {
        safeSet: vi.fn().mockResolvedValue(true),
      } as unknown as RedisClient;

      const upsertSpy = vi.spyOn(prisma.idempotencyRecord, 'upsert').mockResolvedValue({} as any);

      const idempotencyService = new IdempotencyService(mockRedisClient);
      await idempotencyService.saveRecord('key-save', '/api/transactions', 201, { success: true }, 3600);

      expect(upsertSpy).toHaveBeenCalledWith({
        where: { key: 'key-save' },
        create: expect.objectContaining({ key: 'key-save', statusCode: 201 }),
        update: expect.objectContaining({ statusCode: 201 }),
      });
      expect(mockRedisClient.safeSet).toHaveBeenCalledWith(
        'idempotency:key-save',
        JSON.stringify({ statusCode: 201, body: { success: true } }),
        3600
      );
    });
  });

  // ==========================================
  // 3. REDIS UNAVAILABLE RESILIENCE TESTS
  // ==========================================
  describe('Redis Unavailable Resilience & Safe Degradation', () => {
    it('should not throw or crash when Redis encounters network disconnects during get/set', async () => {
      const mockFailingRedis = {
        safeGet: vi.fn().mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:6379')),
        safeSet: vi.fn().mockRejectedValue(new Error('ETIMEDOUT')),
      } as unknown as RedisClient;

      vi.spyOn(prisma.idempotencyRecord, 'findUnique').mockResolvedValue(null);

      const idempotencyService = new IdempotencyService(mockFailingRedis);
      // Should handle gracefully without throwing
      await expect(idempotencyService.getRecord('offline-key')).resolves.toBeNull();
    });

    it('CustomerRiskCacheService should gracefully degrade to null when Redis fails', async () => {
      const mockFailingRedis = {
        safeGet: vi.fn().mockResolvedValue(null),
        safeSet: vi.fn().mockResolvedValue(false),
        safeDel: vi.fn().mockResolvedValue(false),
      } as unknown as RedisClient;

      const customerCache = new CustomerRiskCacheService(mockFailingRedis);
      const summary = await customerCache.getCustomerRiskSummary('CUS_UNKNOWN');
      expect(summary).toBeNull();

      // Setting cache should not throw
      await expect(
        customerCache.setCustomerRiskSummary({
          customerId: 'CUS_1',
          accountAge: 30,
          totalTransactions: 5,
          previousFraudCount: 0,
          avgTransactionAmount: 1500,
          cachedAt: new Date().toISOString(),
        })
      ).resolves.not.toThrow();
    });
  });

  // ==========================================
  // 4. TEMPORARY RISK STATE & REVIEW LOCKS
  // ==========================================
  describe('Temporary Risk State Cache', () => {
    it('should store and retrieve verification challenge state with TTL', async () => {
      const challenge = {
        transactionId: 'TXN999',
        customerId: 'CUS999',
        challengeType: '3DS_STEP_UP' as const,
        status: 'PENDING' as const,
        attemptsRemaining: 3,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      };

      const mockRedisClient = {
        safeSet: vi.fn().mockResolvedValue(true),
        safeGet: vi.fn().mockResolvedValue(JSON.stringify(challenge)),
        safeDel: vi.fn().mockResolvedValue(true),
      } as unknown as RedisClient;

      const riskStateService = new RiskStateCacheService(mockRedisClient);

      await riskStateService.setVerificationChallenge(challenge);
      expect(mockRedisClient.safeSet).toHaveBeenCalledWith(
        'risk:verification_challenge:TXN999',
        JSON.stringify(challenge),
        expect.any(Number)
      );

      const fetched = await riskStateService.getVerificationChallenge('TXN999');
      expect(fetched).toEqual(challenge);
    });

    it('should acquire atomic analyst review locks using setNX', async () => {
      const mockRedisClient = {
        safeSetNX: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
      } as unknown as RedisClient;

      const riskStateService = new RiskStateCacheService(mockRedisClient);

      // Analyst 1 acquires lock
      const acquired1 = await riskStateService.acquireReviewLock('TXN_LOCK_1', 'analyst_alice');
      expect(acquired1).toBe(true);

      // Analyst 2 tries to acquire lock on same transaction -> fails (already locked)
      const acquired2 = await riskStateService.acquireReviewLock('TXN_LOCK_1', 'analyst_bob');
      expect(acquired2).toBe(false);
    });
  });

  // ==========================================
  // 5. CONCURRENT REQUESTS TEST
  // ==========================================
  describe('Concurrent Requests Handling', () => {
    it('should handle simultaneous concurrent rate limit evaluations accurately', async () => {
      const mockRedisClient = {
        isAvailable: vi.fn().mockReturnValue(false), // Test in-memory atomic concurrent counter
      } as unknown as RedisClient;

      const rateLimiter = new RateLimiterService(mockRedisClient);
      const config = { maxRequests: 5, windowSeconds: 60, keyPrefix: 'concurrent' };

      // Dispatch 10 concurrent requests simultaneously
      const results = await Promise.all(
        Array.from({ length: 10 }).map(() => rateLimiter.checkLimit('192.168.0.50', config))
      );

      const allowedCount = results.filter((r) => r.allowed).length;
      const blockedCount = results.filter((r) => !r.allowed).length;

      expect(allowedCount).toBe(5);
      expect(blockedCount).toBe(5);
    });
  });
});
