import { z } from 'zod';

export const createFraudRuleSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  conditions: z.record(z.unknown()),
  action: z.enum(['APPROVE', 'REVIEW', 'BLOCK']).default('REVIEW'),
  priority: z.number().int().min(1).max(1000).default(100),
  isActive: z.boolean().default(true),
});

export const updateFraudRuleSchema = createFraudRuleSchema.partial();

export const getFraudRuleParamsSchema = z.object({
  id: z.string().uuid('Invalid rule UUID format'),
});

export const getCustomerNetworkParamsSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
});

export type CreateFraudRuleDto = z.infer<typeof createFraudRuleSchema>;
export type UpdateFraudRuleDto = z.infer<typeof updateFraudRuleSchema>;
export type GetFraudRuleParams = z.infer<typeof getFraudRuleParamsSchema>;
export type GetCustomerNetworkParams = z.infer<typeof getCustomerNetworkParamsSchema>;

