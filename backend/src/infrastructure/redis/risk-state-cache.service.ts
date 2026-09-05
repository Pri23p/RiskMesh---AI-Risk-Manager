import { redis, RedisClient } from './redis.client.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface VerificationChallengeState {
  transactionId: string;
  customerId: string;
  challengeType: 'OTP' | '3DS_STEP_UP' | 'BIOMETRIC' | 'MANUAL_HOLD';
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  challengePayload?: Record<string, unknown>;
  attemptsRemaining: number;
  createdAt: string;
  expiresAt: string;
}

export class RiskStateCacheService {
  constructor(private redisClient: RedisClient = redis) {}

  private getChallengeKey(transactionId: string): string {
    return `risk:verification_challenge:${transactionId}`;
  }

  private getReviewLockKey(transactionId: string): string {
    return `risk:review_lock:${transactionId}`;
  }

  public async setVerificationChallenge(
    challenge: VerificationChallengeState,
    ttlSeconds = env.RISK_STATE_TTL_SEC
  ): Promise<boolean> {
    const key = this.getChallengeKey(challenge.transactionId);
    try {
      const payload = JSON.stringify(challenge);
      return await this.redisClient.safeSet(key, payload, ttlSeconds);
    } catch (err) {
      logger.warn({ err, transactionId: challenge.transactionId }, 'Failed to set verification challenge state');
      return false;
    }
  }

  public async getVerificationChallenge(
    transactionId: string
  ): Promise<VerificationChallengeState | null> {
    const key = this.getChallengeKey(transactionId);
    const data = await this.redisClient.safeGet(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as VerificationChallengeState;
    } catch (err) {
      logger.warn({ err, transactionId }, 'Failed to parse verification challenge state');
      return null;
    }
  }

  public async clearVerificationChallenge(transactionId: string): Promise<boolean> {
    const key = this.getChallengeKey(transactionId);
    return await this.redisClient.safeDel(key);
  }

  public async acquireReviewLock(
    transactionId: string,
    analystId: string,
    ttlSeconds = 300
  ): Promise<boolean> {
    const key = this.getReviewLockKey(transactionId);
    return await this.redisClient.safeSetNX(key, analystId, ttlSeconds);
  }

  public async releaseReviewLock(transactionId: string): Promise<boolean> {
    const key = this.getReviewLockKey(transactionId);
    return await this.redisClient.safeDel(key);
  }

  public async getReviewLockOwner(transactionId: string): Promise<string | null> {
    const key = this.getReviewLockKey(transactionId);
    return await this.redisClient.safeGet(key);
  }
}

export const riskStateCacheService = new RiskStateCacheService();
