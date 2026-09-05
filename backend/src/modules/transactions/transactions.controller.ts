import { FastifyReply, FastifyRequest } from 'fastify';
import { TransactionsService } from './transactions.service.js';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service.js';
import { rateLimiterService, RateLimiterService } from '../../infrastructure/redis/rate-limiter.service.js';
import { env } from '../../config/env.js';
import {
  CreateTransactionDto,
  GetTransactionByIdParams,
  QueryTransactionsDto,
  UpdateTransactionStatusDto,
} from './dto/transaction.dto.js';
import { createSuccessResponse } from '../../utils/response.js';

export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly idempotencyService: IdempotencyService,
    private readonly rateLimiter: RateLimiterService = rateLimiterService
  ) {}

  async createTransaction(
    request: FastifyRequest<{ Body: CreateTransactionDto }>,
    reply: FastifyReply
  ): Promise<void> {
    // 1. Rate Limiting Check
    const clientIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      '127.0.0.1';

    const rateLimit = await this.rateLimiter.checkLimit(clientIp, {
      keyPrefix: 'transactions_create',
      maxRequests: env.RATE_LIMIT_TRANSACTIONS_MAX,
      windowSeconds: env.RATE_LIMIT_TRANSACTIONS_WINDOW_SEC,
    });

    reply.header('X-RateLimit-Limit', rateLimit.limit);
    reply.header('X-RateLimit-Remaining', rateLimit.remaining);
    reply.header('X-RateLimit-Reset', rateLimit.resetSeconds);

    if (!rateLimit.allowed) {
      reply.header('Retry-After', rateLimit.resetSeconds);
      reply.status(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit of ${rateLimit.limit} requests per ${env.RATE_LIMIT_TRANSACTIONS_WINDOW_SEC} seconds exceeded. Try again in ${rateLimit.resetSeconds} seconds.`,
        retryAfter: rateLimit.resetSeconds,
      });
      return;
    }

    // 2. Check Idempotency Key
    const rawKey = request.headers['idempotency-key'];
    const idempotencyKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;

    if (idempotencyKey) {
      const cached = await this.idempotencyService.getRecord(idempotencyKey);
      if (cached) {
        reply.status(cached.statusCode).send(cached.body);
        return;
      }
    }

    // 3. Process Transaction
    const transaction = await this.transactionsService.createTransaction(request.body);
    const responsePayload = createSuccessResponse(
      transaction,
      'Transaction created successfully'
    );

    // 4. Save Idempotency Record if key was supplied
    if (idempotencyKey) {
      await this.idempotencyService.saveRecord(
        idempotencyKey,
        request.url,
        201,
        responsePayload
      );
    }

    reply.status(201).send(responsePayload);
  }

  async getTransactionById(
    request: FastifyRequest<{ Params: GetTransactionByIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const transaction = await this.transactionsService.getTransactionById(request.params.id);
    reply.send(createSuccessResponse(transaction));
  }

  async listTransactions(
    request: FastifyRequest<{ Querystring: QueryTransactionsDto }>,
    reply: FastifyReply
  ): Promise<void> {
    const result = await this.transactionsService.listTransactions(request.query);
    reply.send(
      createSuccessResponse(result.items, undefined, {
        total: result.total,
        page: result.page,
        limit: result.limit,
      })
    );
  }

  async updateStatus(
    request: FastifyRequest<{ Params: GetTransactionByIdParams; Body: UpdateTransactionStatusDto }>,
    reply: FastifyReply
  ): Promise<void> {
    const transaction = await this.transactionsService.updateStatus(request.params.id, request.body);
    reply.send(createSuccessResponse(transaction, 'Transaction status updated successfully'));
  }
}
