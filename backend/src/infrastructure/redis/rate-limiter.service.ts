import { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { redis, RedisClient } from './redis.client.js';
import { logger } from '../../utils/logger.js';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export class RateLimiterService {
  private inMemoryFallback = new Map<string, { count: number; resetAt: number }>();

  constructor(private redisClient: RedisClient = redis) {}

  public async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const { maxRequests, windowSeconds, keyPrefix } = config;
    const redisKey = `ratelimit:${keyPrefix}:${identifier}`;

    if (this.redisClient.isAvailable()) {
      try {
        const luaScript = `
          local key = KEYS[1]
          local limit = tonumber(ARGV[1])
          local window = tonumber(ARGV[2])
          
          local current = redis.call('INCR', key)
          if current == 1 then
            redis.call('EXPIRE', key, window)
          end
          
          local ttl = redis.call('TTL', key)
          if ttl < 0 then
            redis.call('EXPIRE', key, window)
            ttl = window
          end
          
          if current > limit then
            return {0, current, ttl}
          else
            return {1, current, ttl}
          end
        `;

        const result = await this.redisClient.safeEval<[number, number, number]>(
          luaScript,
          1,
          redisKey,
          maxRequests,
          windowSeconds
        );

        if (result && Array.isArray(result)) {
          const [allowedCode, currentCount, ttl] = result;
          const allowed = allowedCode === 1;
          const remaining = Math.max(0, maxRequests - currentCount);
          const resetSeconds = ttl > 0 ? ttl : windowSeconds;

          return {
            allowed,
            limit: maxRequests,
            remaining,
            resetSeconds,
          };
        }
      } catch (err) {
        logger.warn({ err, identifier }, 'Redis rate limit check failed. Falling back to memory guard.');
      }
    }

    // In-memory fallback if Redis is unavailable or errored
    return this.checkInMemory(identifier, config);
  }

  private checkInMemory(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const key = `${config.keyPrefix}:${identifier}`;
    const entry = this.inMemoryFallback.get(key);

    if (!entry || entry.resetAt <= now) {
      this.inMemoryFallback.set(key, {
        count: 1,
        resetAt: now + config.windowSeconds * 1000,
      });
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetSeconds: config.windowSeconds,
      };
    }

    entry.count += 1;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    const allowed = entry.count <= config.maxRequests;

    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetSeconds,
    };
  }

  public createPreHandler(config: RateLimitConfig): preHandlerHookHandler {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      // Extract client identifier: X-Forwarded-For, IP address, or API key header
      const clientIp =
        (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        request.ip ||
        '127.0.0.1';

      const result = await this.checkLimit(clientIp, config);

      reply.header('X-RateLimit-Limit', result.limit);
      reply.header('X-RateLimit-Remaining', result.remaining);
      reply.header('X-RateLimit-Reset', result.resetSeconds);

      if (!result.allowed) {
        reply.header('Retry-After', result.resetSeconds);
        logger.warn(
          { clientIp, route: request.url, limit: result.limit, remaining: result.remaining },
          'API Rate Limit Exceeded (HTTP 429)'
        );

        return reply.status(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: `Rate limit of ${result.limit} requests per ${config.windowSeconds} seconds exceeded. Try again in ${result.resetSeconds} seconds.`,
          retryAfter: result.resetSeconds,
        });
      }
    };
  }
}

export const rateLimiterService = new RateLimiterService();
