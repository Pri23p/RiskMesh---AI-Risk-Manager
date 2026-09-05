import { Redis, RedisOptions } from 'ioredis';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class RedisClient {
  private static instance: RedisClient | null = null;
  private client: Redis | null = null;
  private isConnected = false;
  private isDegraded = false;

  private constructor() {
    if (!env.REDIS_ENABLED) {
      logger.info('Redis is explicitly disabled via configuration. Running in degraded in-memory mode.');
      this.isDegraded = true;
      return;
    }

    this.initialize();
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  private initialize(): void {
    try {
      const options: RedisOptions = {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        connectTimeout: 2000,
        retryStrategy: (times: number) => {
          if (times > 3) {
            if (!this.isDegraded) {
              logger.warn('Redis unavailable. Operating in degraded fallback mode.');
              this.isDegraded = true;
            }
            return null; // Stop reconnecting when offline
          }
          return Math.min(times * 300, 1000);
        },

        reconnectOnError: (err) => {
          logger.warn({ err: err.message }, 'Redis reconnect on error triggered');
          return true;
        },
        lazyConnect: true,
      };

      this.client = new Redis(env.REDIS_URL, options);

      this.client.on('connect', () => {
        this.isConnected = true;
        this.isDegraded = false;
        logger.info('Connected to Redis server');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.isDegraded = false;
        logger.info('Redis client ready');
      });

      this.client.on('error', (err: Error) => {
        this.isConnected = false;
        this.isDegraded = true;
        logger.warn({ error: err.message }, 'Redis connection error. Safely degrading to fallback.');
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.isDegraded = true;
      });

      this.client.on('reconnecting', () => {
        logger.debug('Reconnecting to Redis...');
      });

      // Attempt initial connection asynchronously without blocking server startup
      this.client.connect().catch((err: Error) => {
        this.isConnected = false;
        this.isDegraded = true;
        logger.warn(
          { error: err.message },
          'Initial Redis connection failed. System will operate in degraded safe fallback mode.'
        );
      });
    } catch (err: unknown) {
      this.isConnected = false;
      this.isDegraded = true;
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ error: message }, 'Failed to instantiate Redis client. Degraded mode active.');
    }
  }

  public isAvailable(): boolean {
    return this.isConnected && !this.isDegraded && this.client !== null;
  }

  public getRawClient(): Redis | null {
    return this.client;
  }

  public async safeGet(key: string): Promise<string | null> {
    if (!this.isAvailable() || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch (err: unknown) {
      this.logFailure('safeGet', key, err);
      return null;
    }
  }

  public async safeSet(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable() || !this.client) return false;
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (err: unknown) {
      this.logFailure('safeSet', key, err);
      return false;
    }
  }

  public async safeSetNX(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable() || !this.client) return false;
    try {
      let result: string | null;
      if (ttlSeconds && ttlSeconds > 0) {
        result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      } else {
        result = await this.client.set(key, value, 'NX');
      }
      return result === 'OK';
    } catch (err: unknown) {
      this.logFailure('safeSetNX', key, err);
      return false;
    }
  }

  public async safeDel(key: string): Promise<boolean> {
    if (!this.isAvailable() || !this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (err: unknown) {
      this.logFailure('safeDel', key, err);
      return false;
    }
  }

  public async safeIncr(key: string): Promise<number | null> {
    if (!this.isAvailable() || !this.client) return null;
    try {
      return await this.client.incr(key);
    } catch (err: unknown) {
      this.logFailure('safeIncr', key, err);
      return null;
    }
  }

  public async safeExpire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.isAvailable() || !this.client) return false;
    try {
      const res = await this.client.expire(key, ttlSeconds);
      return res === 1;
    } catch (err: unknown) {
      this.logFailure('safeExpire', key, err);
      return false;
    }
  }

  public async safeEval<T = unknown>(
    script: string,
    numKeys: number,
    ...args: (string | number)[]
  ): Promise<T | null> {
    if (!this.isAvailable() || !this.client) return null;
    try {
      const result = await this.client.eval(script, numKeys, ...args);
      return result as T;
    } catch (err: unknown) {
      this.logFailure('safeEval', 'lua_script', err);
      return null;
    }
  }

  public async safeMget(keys: string[]): Promise<(string | null)[]> {
    if (!this.isAvailable() || !this.client || keys.length === 0) return keys.map(() => null);
    try {
      return await this.client.mget(...keys);
    } catch (err: unknown) {
      this.logFailure('safeMget', keys.join(','), err);
      return keys.map(() => null);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.isConnected = false;
      this.isDegraded = true;
    }
  }

  private logFailure(method: string, key: string, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(
      { method, key, error: message },
      'Redis operation failed. Handled safely without affecting transaction correctness.'
    );
  }
}

export const redis = RedisClient.getInstance();
