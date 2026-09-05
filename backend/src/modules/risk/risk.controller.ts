import { FastifyReply, FastifyRequest } from 'fastify';
import { RiskService } from './risk.service.js';
import { RiskDecisionService } from './risk-decision.service.js';
import { rateLimiterService, RateLimiterService } from '../../infrastructure/redis/rate-limiter.service.js';
import { env } from '../../config/env.js';
import { ScoreTransactionParams, GetRiskScoreParams } from './dto/risk.dto.js';
import { createSuccessResponse } from '../../utils/response.js';

export class RiskController {
  constructor(
    private readonly riskService: RiskService,
    private readonly riskDecisionService: RiskDecisionService,
    private readonly rateLimiter: RateLimiterService = rateLimiterService
  ) {}

  async scoreTransaction(
    request: FastifyRequest<{ Params: ScoreTransactionParams }>,
    reply: FastifyReply
  ): Promise<void> {
    // 1. Rate Limiting Check
    const clientIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      '127.0.0.1';

    const rateLimit = await this.rateLimiter.checkLimit(clientIp, {
      keyPrefix: 'risk_score',
      maxRequests: env.RATE_LIMIT_RISK_SCORE_MAX,
      windowSeconds: env.RATE_LIMIT_RISK_SCORE_WINDOW_SEC,
    });

    reply.header('X-RateLimit-Limit', rateLimit.limit);
    reply.header('X-RateLimit-Remaining', rateLimit.remaining);
    reply.header('X-RateLimit-Reset', rateLimit.resetSeconds);

    if (!rateLimit.allowed) {
      reply.header('Retry-After', rateLimit.resetSeconds);
      reply.status(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit of ${rateLimit.limit} requests per ${env.RATE_LIMIT_RISK_SCORE_WINDOW_SEC} seconds exceeded. Try again in ${rateLimit.resetSeconds} seconds.`,
        retryAfter: rateLimit.resetSeconds,
      });
      return;
    }

    // 2. Compute Risk Score
    const result = await this.riskService.calculateRisk(request.params.transactionId);
    reply.status(200).send(
      createSuccessResponse(
        {
          transactionId: result.transactionId,
          riskScore: result.riskScore,
          fraudProbability: result.fraudProbability,
          modelVersion: result.modelVersion,
          riskFactors: result.riskFactors.map((f) => ({
            feature: f.feature,
            impact: f.impact,
            explanation: f.explanation,
          })),
        },
        'Risk evaluated successfully'
      )
    );
  }

  async getRiskScore(
    request: FastifyRequest<{ Params: GetRiskScoreParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const result = await this.riskService.getRiskScore(request.params.transactionId);
    reply.status(200).send(
      createSuccessResponse({
        transactionId: result.transactionId,
        riskScore: result.riskScore,
        fraudProbability: result.fraudProbability,
        modelVersion: result.modelVersion,
        riskFactors: result.riskFactors.map((f) => ({
          feature: f.feature,
          impact: f.impact,
          explanation: f.explanation,
        })),
      })
    );
  }

  async makeDecision(
    request: FastifyRequest<{ Params: ScoreTransactionParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const decision = await this.riskDecisionService.makeDecision(request.params.transactionId);
    reply.status(200).send(
      createSuccessResponse(
        {
          id: decision.id,
          transactionId: decision.transactionId,
          riskScoreId: decision.riskScoreId,
          decision: decision.decision,
          reason: decision.reason,
          expectedLoss: Number(decision.expectedLoss),
          status: decision.status,
          createdAt: decision.createdAt,
        },
        'Risk decision computed and applied'
      )
    );
  }

  async getDecision(
    request: FastifyRequest<{ Params: GetRiskScoreParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const decision = await this.riskDecisionService.getDecision(request.params.transactionId);
    reply.status(200).send(
      createSuccessResponse({
        id: decision.id,
        transactionId: decision.transactionId,
        riskScoreId: decision.riskScoreId,
        decision: decision.decision,
        reason: decision.reason,
        expectedLoss: Number(decision.expectedLoss),
        status: decision.status,
        createdAt: decision.createdAt,
      })
    );
  }
}
