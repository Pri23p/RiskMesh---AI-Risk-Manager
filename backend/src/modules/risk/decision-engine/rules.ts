import { DecisionContext, IDecisionRule } from './types.js';

export const defaultDecisionRules: IDecisionRule[] = [
  {
    id: 'RULE_CRITICAL_FRAUD_HISTORY',
    name: 'Critical Probability with Prior Fraud History Override',
    priority: 10,
    evaluate: (ctx: DecisionContext) => {
      if (ctx.fraudProbability > 0.95 && ctx.previousFraudCount > 0) {
        return {
          matches: true,
          decision: 'BLOCK',
          reason: `RULE_CRITICAL_FRAUD_HISTORY: Fraud probability (${(ctx.fraudProbability * 100).toFixed(1)}%) > 95% with ${ctx.previousFraudCount} prior confirmed fraud incidents.`,
        };
      }
      return { matches: false };
    },
  },
  {
    id: 'RULE_FRAUD_RING_SUSPECTED',
    name: 'Multi-Account Fraud Ring & Syndicate Connection Override',
    priority: 15,
    evaluate: (ctx: DecisionContext) => {
      const flaggedConnections = ctx.flaggedAccountConnections ?? 0;
      const networkRisk = ctx.networkRiskScore ?? 0;

      // When connected to multiple confirmed flagged/fraudulent accounts with elevated fraud probability
      if (flaggedConnections >= 2 && ctx.fraudProbability >= 0.50) {
        return {
          matches: true,
          decision: 'BLOCK',
          reason: `RULE_FRAUD_RING_SUSPECTED: Device/IP network graph connects to ${flaggedConnections} confirmed high-risk/blocked accounts with ${(ctx.fraudProbability * 100).toFixed(1)}% ML risk.`,
        };
      }

      // When connected to flagged account or high-risk network ring
      if (flaggedConnections >= 1 && (ctx.fraudProbability >= 0.65 || networkRisk >= 70)) {
        const decision = ctx.riskScore >= 75 ? 'BLOCK' : 'REVIEW';
        return {
          matches: true,
          decision,
          reason: `RULE_FRAUD_RING_SUSPECTED: Associated with suspicious entity cluster (${flaggedConnections} flagged connection, network risk index: ${networkRisk}/100).`,
        };
      }

      return { matches: false };
    },
  },
  {
    id: 'RULE_HIGH_PROBABILITY_NEW_DEVICE',
    name: 'High Fraud Probability on Novel Device Override',
    priority: 20,
    evaluate: (ctx: DecisionContext) => {
      if (ctx.fraudProbability > 0.70 && ctx.isNewDevice) {
        // If score is high (>= 75) block, otherwise review
        const decision = ctx.riskScore >= 75 ? 'BLOCK' : 'REVIEW';
        return {
          matches: true,
          decision,
          reason: `RULE_HIGH_PROBABILITY_NEW_DEVICE: Elevated fraud probability (${(ctx.fraudProbability * 100).toFixed(1)}%) on an unrecognized hardware/device profile.`,
        };
      }
      return { matches: false };
    },
  },
  {
    id: 'RULE_SHARED_DEVICE_CLUSTER',
    name: 'Shared Device Hardware Cluster Override',
    priority: 25,
    evaluate: (ctx: DecisionContext) => {
      const sharedDevices = ctx.sharedDeviceCount ?? 0;
      const sharedIps = ctx.sharedIpCount ?? 0;

      // If hardware is shared across multiple accounts with non-trivial fraud probability
      if (sharedDevices >= 2 && ctx.fraudProbability >= 0.40) {
        return {
          matches: true,
          decision: 'REVIEW',
          reason: `RULE_SHARED_DEVICE_CLUSTER: Hardware fingerprint is actively shared across ${sharedDevices} distinct customer accounts (${(ctx.fraudProbability * 100).toFixed(1)}% probability).`,
        };
      }

      // Multi-account IP farm clustering
      if (sharedIps >= 4 && ctx.fraudProbability >= 0.50) {
        return {
          matches: true,
          decision: 'REVIEW',
          reason: `RULE_SHARED_DEVICE_CLUSTER: IP address is clustered across ${sharedIps} customer accounts in short time window.`,
        };
      }

      return { matches: false };
    },
  },
  {
    id: 'RULE_EXCESSIVE_EXPECTED_LOSS',
    name: 'High Expected Loss Financial Exposure Override',
    priority: 30,
    evaluate: (ctx: DecisionContext, expectedLoss: number) => {
      if (expectedLoss >= 50000 && ctx.fraudProbability >= 0.50) {
        return {
          matches: true,
          decision: 'BLOCK',
          reason: `RULE_EXCESSIVE_EXPECTED_LOSS: Projected expected loss (${ctx.currency} ${expectedLoss.toFixed(2)}) exceeds exposure threshold at ${(ctx.fraudProbability * 100).toFixed(1)}% risk.`,
        };
      }
      return { matches: false };
    },
  },
  {
    id: 'RULE_LOW_PROBABILITY_CLEAN_PROFILE',
    name: 'Low Probability Clean Profile Override',
    priority: 40,
    evaluate: (ctx: DecisionContext) => {
      const flaggedConnections = ctx.flaggedAccountConnections ?? 0;
      if (
        ctx.fraudProbability < 0.30 &&
        ctx.riskScore < 30 &&
        ctx.previousFraudCount === 0 &&
        ctx.failedAttempts === 0 &&
        flaggedConnections === 0
      ) {
        return {
          matches: true,
          decision: 'APPROVE',
          reason: `RULE_LOW_PROBABILITY_CLEAN_PROFILE: Clean account profile with low fraud probability (${(ctx.fraudProbability * 100).toFixed(1)}%) and 0 prior issues.`,
        };
      }
      return { matches: false };
    },
  },
];

