import { OutboxEvent, OutboxStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { DomainEventType } from '../events/event.types.js';
import { env } from '../../config/env.js';

export interface CreateOutboxEventParams<T = Record<string, unknown>> {
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload: T;
}

export class OutboxRepository {
  async createEvent<T = Record<string, unknown>>(
    params: CreateOutboxEventParams<T>,
    txClient?: Prisma.TransactionClient
  ): Promise<OutboxEvent> {
    const client = txClient || prisma;
    return client.outboxEvent.create({
      data: {
        eventType: params.eventType,
        aggregateType: params.aggregateType,
        aggregateId: params.aggregateId,
        payload: params.payload as Prisma.InputJsonValue,
        status: OutboxStatus.PENDING,
      },
    });
  }

  async fetchPendingBatch(
    limit = env.OUTBOX_BATCH_SIZE,
    maxRetries = env.OUTBOX_MAX_RETRIES
  ): Promise<OutboxEvent[]> {
    return prisma.outboxEvent.findMany({
      where: {
        status: OutboxStatus.PENDING,
        retryCount: { lt: maxRetries },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async markPublished(id: string): Promise<OutboxEvent> {
    return prisma.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxStatus.PUBLISHED,
        publishedAt: new Date(),
        lastError: null,
      },
    });
  }

  async recordFailure(
    id: string,
    errorMessage: string,
    maxRetries = env.OUTBOX_MAX_RETRIES
  ): Promise<OutboxEvent> {
    const current = await prisma.outboxEvent.findUnique({
      where: { id },
      select: { retryCount: true },
    });

    const nextRetryCount = (current?.retryCount ?? 0) + 1;
    const isExhausted = nextRetryCount >= maxRetries;

    return prisma.outboxEvent.update({
      where: { id },
      data: {
        status: isExhausted ? OutboxStatus.FAILED : OutboxStatus.PENDING,
        retryCount: nextRetryCount,
        lastError: errorMessage.slice(0, 500),
      },
    });
  }
}
