import { FraudRule, Prisma } from '@prisma/client';
import { isDbConnected, prisma } from '../../infrastructure/database/prisma.js';
import { CreateFraudRuleDto, UpdateFraudRuleDto } from './dto/fraud.dto.js';

const FALLBACK_RULES: FraudRule[] = [
  {
    id: 'rule-1',
    code: 'RULE_EXTREME_FRAUD_PROBABILITY',
    name: 'Extreme Fraud Probability',
    description: 'Block transactions with ML fraud probability >= 0.95 and prior fraud count',
    conditions: { minProbability: 0.95, minPriorFraud: 1 },
    action: 'BLOCK',
    priority: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rule-2',
    code: 'RULE_HIGH_PROBABILITY_NEW_DEVICE',
    name: 'High Risk Probability on Novel Device',
    description: 'Review transactions with ML fraud probability >= 0.70 on unrecognized hardware',
    conditions: { minProbability: 0.7, isNewDevice: true },
    action: 'REVIEW',
    priority: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rule-3',
    code: 'RULE_CLEAN_TRANSACTION',
    name: 'Low Risk Clean Profile',
    description: 'Approve transactions with ML fraud probability <= 0.30 and clean customer profile',
    conditions: { maxProbability: 0.3 },
    action: 'APPROVE',
    priority: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export class FraudRepository {
  private inMemoryRules: FraudRule[] = [...FALLBACK_RULES];

  async create(data: CreateFraudRuleDto): Promise<FraudRule> {
    if (isDbConnected()) {
      try {
        return await prisma.fraudRule.create({
          data: {
            code: data.code,
            name: data.name,
            description: data.description,
            conditions: data.conditions as Prisma.InputJsonValue,
            action: data.action,
            priority: data.priority,
            isActive: data.isActive,
          },
        });
      } catch {
        // Fallback below
      }
    }
    const fallback: FraudRule = {
      id: `rule-${Date.now()}`,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      conditions: (data.conditions ?? {}) as Prisma.JsonValue,
      action: data.action,
      priority: data.priority,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.inMemoryRules.push(fallback);
    return fallback;
  }

  async findById(id: string): Promise<FraudRule | null> {
    if (isDbConnected()) {
      try {
        return await prisma.fraudRule.findUnique({ where: { id } });
      } catch {
        // fallback
      }
    }
    return this.inMemoryRules.find((r) => r.id === id) || null;
  }

  async findByCode(code: string): Promise<FraudRule | null> {
    if (isDbConnected()) {
      try {
        return await prisma.fraudRule.findUnique({ where: { code } });
      } catch {
        // fallback
      }
    }
    return this.inMemoryRules.find((r) => r.code === code) || null;
  }

  async findActiveRules(): Promise<FraudRule[]> {
    if (isDbConnected()) {
      try {
        return await prisma.fraudRule.findMany({
          where: { isActive: true },
          orderBy: { priority: 'asc' },
        });
      } catch {
        // fallback
      }
    }
    return this.inMemoryRules.filter((r) => r.isActive).sort((a, b) => a.priority - b.priority);
  }

  async update(id: string, data: UpdateFraudRuleDto): Promise<FraudRule> {
    return prisma.fraudRule.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.conditions && { conditions: data.conditions as Prisma.InputJsonValue }),
        ...(data.action && { action: data.action }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async delete(id: string): Promise<FraudRule> {
    return prisma.fraudRule.delete({
      where: { id },
    });
  }
}
