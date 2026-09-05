import { Transaction } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma.js';
import { TransactionMLFeatures } from '../../infrastructure/ml/ml.client.js';
import { customerRiskCacheService, CustomerRiskCacheService } from '../../infrastructure/redis/customer-cache.service.js';
import { logger } from '../../utils/logger.js';

export class FeatureGeneratorService {
  constructor(
    private customerCache: CustomerRiskCacheService = customerRiskCacheService
  ) {}

  async generateFeatures(transaction: Transaction): Promise<TransactionMLFeatures> {
    const customerId = transaction.customerId;
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Check Redis Cache for Customer Profile & Risk Summary
    const cached = await this.customerCache.getCustomerRiskSummary(customerId);

    let accountAge = cached?.accountAge ?? 30;
    let customerAvgAmount = cached?.avgTransactionAmount ?? Number(transaction.amount);
    let previousFraudCount = cached?.previousFraudCount ?? 0;

    if (!cached) {
      // Slow-path: Query PostgreSQL (Source of Truth)
      const customer = await prisma.customer.findUnique({
        where: { externalCustomerId: customerId },
      });

      if (customer) {
        accountAge = customer.accountAge;
      }

      const [avgAmountAggregate, blockedCount, totalCount] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            customerId,
            id: { not: transaction.id },
            status: { in: ['APPROVED', 'PENDING'] },
          },
          _avg: { amount: true },
        }),
        prisma.transaction.count({
          where: {
            customerId,
            status: 'BLOCKED',
          },
        }),
        prisma.transaction.count({
          where: {
            customerId,
          },
        }),
      ]);

      customerAvgAmount = avgAmountAggregate._avg.amount
        ? Number(avgAmountAggregate._avg.amount)
        : Number(transaction.amount);
      previousFraudCount = blockedCount;

      // Populate Redis Cache for subsequent high-throughput evaluations
      await this.customerCache.setCustomerRiskSummary({
        customerId,
        accountAge,
        totalTransactions: totalCount,
        previousFraudCount,
        avgTransactionAmount: Math.round(customerAvgAmount * 100) / 100,
        cachedAt: now.toISOString(),
      });
    }

    // 2. Query dynamic velocity & device recognition
    const [txCount10Min, txCount24Hours, pastDevices, pastIps] = await Promise.all([
      prisma.transaction.count({
        where: {
          customerId,
          createdAt: { gte: tenMinutesAgo },
        },
      }),
      prisma.transaction.count({
        where: {
          customerId,
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
      transaction.deviceId
        ? prisma.transaction.findFirst({
            where: {
              customerId,
              id: { not: transaction.id },
              deviceId: transaction.deviceId,
            },
          })
        : null,
      transaction.ipAddress
        ? prisma.transaction.findFirst({
            where: {
              customerId,
              id: { not: transaction.id },
              ipAddress: transaction.ipAddress,
            },
          })
        : null,
    ]);

    const isNewDevice = transaction.deviceId ? (pastDevices ? 0 : 1) : 0;
    const isNewIp = transaction.ipAddress ? (pastIps ? 0 : 1) : 0;
    const failedAttempts = Math.min(previousFraudCount, 5);

    const features: TransactionMLFeatures = {
      amount: Number(transaction.amount),
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      customerAvgAmount: Math.round(customerAvgAmount * 100) / 100,
      transactionsLast10Min: Math.max(1, txCount10Min),
      transactionsLast24Hours: Math.max(1, txCount24Hours),
      failedAttempts,
      accountAge,
      isNewDevice,
      isNewIp,
      previousFraudCount,
    };

    logger.debug({ transactionId: transaction.transactionId, features }, 'Generated ML features');
    return features;
  }
}
