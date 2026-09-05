import { env } from '../../../config/env.js';
import { DecisionContext, EngineDecision, IDecisionRule } from './types.js';
import { defaultDecisionRules } from './rules.js';
import { logger } from '../../../utils/logger.js';

export class RiskDecisionEngine {
  private readonly approveThreshold: number;
  private readonly blockThreshold: number;
  private readonly rules: IDecisionRule[];

  constructor(
    approveThreshold = env.RISK_THRESHOLD_APPROVE,
    blockThreshold = env.RISK_THRESHOLD_BLOCK,
    rules: IDecisionRule[] = defaultDecisionRules
  ) {
    this.approveThreshold = approveThreshold;
    this.blockThreshold = blockThreshold;
    this.rules = [...rules].sort((a, b) => a.priority - b.priority);
  }

  calculateExpectedLoss(amount: number, fraudProbability: number): number {
    const rawLoss = amount * Math.max(0, Math.min(1.0, fraudProbability));
    return Math.round(rawLoss * 100) / 100;
  }

  evaluate(context: DecisionContext): EngineDecision {
    // 1. Calculate Expected Loss
    const expectedLoss = this.calculateExpectedLoss(context.amount, context.fraudProbability);

    logger.debug(
      {
        transactionId: context.transactionId,
        riskScore: context.riskScore,
        probability: context.fraudProbability,
        expectedLoss,
      },
      'Evaluating deterministic risk decision'
    );

    // 2. Evaluate Rule Overrides in priority order
    for (const rule of this.rules) {
      const evaluation = rule.evaluate(context, expectedLoss);
      if (evaluation.matches && evaluation.decision) {
        logger.info(
          { transactionId: context.transactionId, ruleId: rule.id, decision: evaluation.decision },
          'Deterministic rule override triggered'
        );

        return {
          decision: evaluation.decision,
          reason: evaluation.reason ?? `Triggered rule: ${rule.name}`,
          expectedLoss,
          ruleTriggered: rule.id,
        };
      }
    }

    // 3. Evaluate Configurable Threshold Bands
    if (context.riskScore >= this.blockThreshold) {
      return {
        decision: 'BLOCK',
        reason: `THRESHOLD_BLOCK: Risk score ${context.riskScore} exceeds block threshold of ${this.blockThreshold}.`,
        expectedLoss,
      };
    }

    if (context.riskScore >= this.approveThreshold) {
      return {
        decision: 'REVIEW',
        reason: `THRESHOLD_REVIEW: Risk score ${context.riskScore} falls in manual review band (${this.approveThreshold}-${this.blockThreshold - 1}).`,
        expectedLoss,
      };
    }

    return {
      decision: 'APPROVE',
      reason: `THRESHOLD_APPROVE: Risk score ${context.riskScore} is below review threshold of ${this.approveThreshold}.`,
      expectedLoss,
    };
  }
}
