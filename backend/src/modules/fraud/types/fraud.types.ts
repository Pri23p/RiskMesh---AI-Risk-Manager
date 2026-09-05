import { RuleAction } from '@prisma/client';

export interface IFraudRule {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  conditions: Record<string, unknown>;
  action: RuleAction;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
