import { RiskRepository } from './risk.repository';
import { EvaluateRiskDTO, IRiskAssessment, RiskFactor, RiskLevel, RiskRecommendation } from './risk.types';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { logger } from '../../config/logger';

export class RiskService {
  constructor(
    private readonly repository: RiskRepository = new RiskRepository(),
    private readonly transactionsRepo: TransactionsRepository = new TransactionsRepository()
  ) {}

  async evaluateRisk(dto: EvaluateRiskDTO): Promise<IRiskAssessment> {
    const transaction = await this.transactionsRepo.findById(dto.transactionId);
    if (!transaction) {
      throw new NotFoundError(`Transaction ${dto.transactionId} not found`);
    }

    const existingAssessment = await this.repository.findByTransactionId(dto.transactionId);
    if (existingAssessment) {
      throw new ConflictError(`Risk assessment already exists for transaction ${dto.transactionId}`);
    }

    // Risk Feature Calculation & Scoring Logic
    const factors: RiskFactor[] = [];
    let baseScore = 15; // baseline risk

    // 1. Transaction Amount check
    if (transaction.amount > 50000) {
      baseScore += 35;
      factors.push({
        name: 'HIGH_VALUE_TRANSACTION',
        weight: 0.35,
        description: 'Transaction value exceeds high-risk threshold (>₹50,000)',
        scoreImpact: 35,
      });
    } else if (transaction.amount > 15000) {
      baseScore += 15;
      factors.push({
        name: 'ELEVATED_VALUE',
        weight: 0.15,
        description: 'Transaction value above normal average',
        scoreImpact: 15,
      });
    }

    // 2. IP & Device presence
    if (!transaction.ipAddress || !transaction.deviceId) {
      baseScore += 20;
      factors.push({
        name: 'MISSING_DEVICE_TELEMETRY',
        weight: 0.2,
        description: 'Device fingerprint or client IP missing from telemetry payload',
        scoreImpact: 20,
      });
    }

    // 3. Item count checks
    if (transaction.itemsCount > 5) {
      baseScore += 15;
      factors.push({
        name: 'BULK_ITEM_VELOCITY',
        weight: 0.15,
        description: 'High number of items in single transaction',
        scoreImpact: 15,
      });
    }

    const finalScore = Math.min(100, Math.max(0, baseScore));

    let riskLevel: RiskLevel = RiskLevel.LOW;
    let recommendation: RiskRecommendation = RiskRecommendation.ALLOW;

    if (finalScore >= 75) {
      riskLevel = RiskLevel.CRITICAL;
      recommendation = RiskRecommendation.REJECT;
    } else if (finalScore >= 50) {
      riskLevel = RiskLevel.HIGH;
      recommendation = RiskRecommendation.MANUAL_REVIEW;
    } else if (finalScore >= 30) {
      riskLevel = RiskLevel.MEDIUM;
      recommendation = RiskRecommendation.REQUIRE_2FA;
    }

    logger.info(
      { transactionId: dto.transactionId, finalScore, riskLevel, recommendation },
      'Risk evaluation completed'
    );

    return this.repository.create({
      transactionId: dto.transactionId,
      riskScore: finalScore,
      riskLevel,
      recommendation,
      factors,
    });
  }

  async getById(id: string): Promise<IRiskAssessment> {
    const assessment = await this.repository.findById(id);
    if (!assessment) {
      throw new NotFoundError(`Risk assessment ${id} not found`);
    }
    return assessment;
  }

  async getByTransactionId(transactionId: string): Promise<IRiskAssessment> {
    const assessment = await this.repository.findByTransactionId(transactionId);
    if (!assessment) {
      throw new NotFoundError(`No risk assessment found for transaction ${transactionId}`);
    }
    return assessment;
  }

  async listAssessments(filters: { riskLevel?: RiskLevel; recommendation?: RiskRecommendation; page?: number; limit?: number }) {
    return this.repository.findMany(filters);
  }
}
