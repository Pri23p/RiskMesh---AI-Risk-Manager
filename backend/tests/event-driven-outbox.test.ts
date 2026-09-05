import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OutboxPublisherService } from '../src/infrastructure/outbox/outbox-publisher.service.js';
import { OutboxRepository } from '../src/infrastructure/outbox/outbox.repository.js';
import { KafkaClient } from '../src/infrastructure/kafka/kafka.client.js';
import { ConsumerIdempotencyGuard } from '../src/modules/events/consumers/idempotency.guard.js';
import { AnalyticsConsumer } from '../src/modules/events/consumers/analytics.consumer.js';
import { AuditConsumer } from '../src/modules/events/consumers/audit.consumer.js';
import { RiskProcessorConsumer } from '../src/modules/events/consumers/risk-processor.consumer.js';
import { RedisClient } from '../src/infrastructure/redis/redis.client.js';
import { prisma } from '../src/infrastructure/database/prisma.js';

describe('Phase 7: Event-Driven Architecture & Transactional Outbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. SUCCESSFUL PUBLISHING
  // ==========================================
  describe('Transactional Outbox Publishing', () => {
    it('should fetch pending outbox events, publish to Kafka, and mark as PUBLISHED', async () => {
      const pendingEvents = [
        {
          id: 'outbox-1',
          eventType: 'transaction.created',
          aggregateType: 'TRANSACTION',
          aggregateId: 'TXN101',
          payload: { amount: 5000, currency: 'INR' },
          status: 'PENDING' as const,
          retryCount: 0,
          createdAt: new Date(),
          publishedAt: null,
          lastError: null,
        },
      ];

      const mockOutboxRepo = {
        fetchPendingBatch: vi.fn().mockResolvedValue(pendingEvents),
        markPublished: vi.fn().mockResolvedValue({ ...pendingEvents[0], status: 'PUBLISHED' }),
        recordFailure: vi.fn(),
      } as unknown as OutboxRepository;

      const mockKafkaClient = {
        publish: vi.fn().mockResolvedValue([{ topicName: 'riskmesh.transactions', partition: 0, errorCode: 0 }]),
      } as unknown as KafkaClient;

      const publisher = new OutboxPublisherService(mockOutboxRepo, mockKafkaClient);
      const result = await publisher.processOutboxBatch();

      expect(result.published).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockKafkaClient.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'riskmesh.transactions',
          messages: [
            expect.objectContaining({
              key: 'TXN101',
            }),
          ],
        })
      );
      expect(mockOutboxRepo.markPublished).toHaveBeenCalledWith('outbox-1');
    });
  });

  // ==========================================
  // 2. KAFKA UNAVAILABLE RESILIENCE
  // ==========================================
  describe('Kafka Unavailable & Zero Event Loss', () => {
    it('should keep events in PENDING status and record failure when Kafka is unavailable', async () => {
      const pendingEvents = [
        {
          id: 'outbox-fail-1',
          eventType: 'transaction.created',
          aggregateType: 'TRANSACTION',
          aggregateId: 'TXN_FAIL',
          payload: { amount: 99000 },
          status: 'PENDING' as const,
          retryCount: 0,
          createdAt: new Date(),
          publishedAt: null,
          lastError: null,
        },
      ];

      const mockOutboxRepo = {
        fetchPendingBatch: vi.fn().mockResolvedValue(pendingEvents),
        markPublished: vi.fn(),
        recordFailure: vi.fn().mockResolvedValue({
          ...pendingEvents[0],
          status: 'PENDING',
          retryCount: 1,
          lastError: 'Kafka broker unavailable',
        }),
      } as unknown as OutboxRepository;

      const mockFailingKafka = {
        publish: vi.fn().mockRejectedValue(new Error('Kafka broker connection refused (localhost:9092)')),
      } as unknown as KafkaClient;

      const publisher = new OutboxPublisherService(mockOutboxRepo, mockFailingKafka);
      const result = await publisher.processOutboxBatch();

      // Zero loss: event recorded failure and staged for next poll
      expect(result.published).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockOutboxRepo.markPublished).not.toHaveBeenCalled();
      expect(mockOutboxRepo.recordFailure).toHaveBeenCalledWith(
        'outbox-fail-1',
        expect.stringContaining('Kafka broker connection refused')
      );
    });
  });

  // ==========================================
  // 3. RETRY COUNT & EXHAUSTION
  // ==========================================
  describe('Outbox Repository Retry Tracking', () => {
    it('should increment retryCount and transition to FAILED when max retries exceeded', async () => {
      const mockEvent = {
        id: 'outbox-retry',
        retryCount: 4,
      };

      vi.spyOn(prisma.outboxEvent, 'findUnique').mockResolvedValue(mockEvent as any);
      const updateSpy = vi.spyOn(prisma.outboxEvent, 'update').mockResolvedValue({
        id: 'outbox-retry',
        status: 'FAILED',
        retryCount: 5,
      } as any);

      const repo = new OutboxRepository();
      await repo.recordFailure('outbox-retry', 'Timeout after 5 attempts', 5);

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'outbox-retry' },
        data: expect.objectContaining({
          status: 'FAILED',
          retryCount: 5,
          lastError: 'Timeout after 5 attempts',
        }),
      });
    });
  });

  // ==========================================
  // 4. CONSUMER DUPLICATE EVENT IDEMPOTENCY
  // ==========================================
  describe('Consumer Idempotency Deduplication', () => {
    it('should process first event and skip duplicate event with same eventId', async () => {
      const mockRedisClient = {
        safeSetNX: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
      } as unknown as RedisClient;

      const guard = new ConsumerIdempotencyGuard(mockRedisClient);

      // 1st delivery -> should process
      const first = await guard.shouldProcess('analytics-group', 'evt-1234');
      expect(first).toBe(true);

      // 2nd delivery (duplicate) -> should skip
      const duplicate = await guard.shouldProcess('analytics-group', 'evt-1234');
      expect(duplicate).toBe(false);
    });

    it('AnalyticsConsumer should skip duplicate messages without duplicate metric creation', async () => {
      const mockGuard = {
        shouldProcess: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
      } as unknown as ConsumerIdempotencyGuard;

      const metricCreateSpy = vi.spyOn(prisma.analyticsMetric, 'create').mockResolvedValue({} as any);

      const consumer = new AnalyticsConsumer({} as any, mockGuard);

      const msg = JSON.stringify({
        eventId: 'evt-unique-99',
        eventType: 'transaction.created',
        aggregateId: 'TXN99',
        payload: { amount: 15000, currency: 'INR' },
      });

      // 1st run
      const res1 = await consumer.handleMessage(msg);
      expect(res1).toBe(true);
      expect(metricCreateSpy).toHaveBeenCalledTimes(1);

      // Duplicate run
      const res2 = await consumer.handleMessage(msg);
      expect(res2).toBe(true);
      // Metric create spy should NOT have been called a second time
      expect(metricCreateSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // 5. CONSUMER ERROR HANDLING
  // ==========================================
  describe('Consumer Error Handling', () => {
    it('AuditConsumer should gracefully handle malformed JSON messages without throwing', async () => {
      const consumer = new AuditConsumer({} as any, {} as any);
      const result = await consumer.handleMessage('INVALID_NON_JSON');
      expect(result).toBe(false);
    });

    it('RiskProcessorConsumer should safely catch and log handler errors without crashing', async () => {
      const mockRiskService = {
        calculateRisk: vi.fn().mockRejectedValue(new Error('Downstream scoring error')),
      };

      const mockGuard = {
        shouldProcess: vi.fn().mockResolvedValue(true),
      } as unknown as ConsumerIdempotencyGuard;

      const consumer = new RiskProcessorConsumer(
        {} as any,
        mockGuard,
        mockRiskService as any,
        undefined
      );

      const msg = JSON.stringify({
        eventId: 'evt-err-1',
        eventType: 'transaction.created',
        aggregateId: 'TXN_ERR',
      });

      const result = await consumer.handleMessage(msg);
      expect(result).toBe(false);
    });
  });
});
