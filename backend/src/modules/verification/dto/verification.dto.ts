import { z } from 'zod';

export const createVerificationCaseSchema = z.object({
  transactionId: z.string().uuid('Invalid transaction UUID format'),
  assignedTo: z.string().optional(),
});

export const updateVerificationDecisionSchema = z.object({
  status: z.enum(['IN_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED']),
  decisionNotes: z.string().min(1, 'Decision notes are required'),
  assignedTo: z.string().optional(),
});

export const getVerificationCaseParamsSchema = z.object({
  id: z.string().uuid('Invalid case UUID format'),
});

export const queryVerificationCasesSchema = z.object({
  status: z.enum(['OPEN', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED']).optional(),
  assignedTo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateVerificationCaseDto = z.infer<typeof createVerificationCaseSchema>;
export type UpdateVerificationDecisionDto = z.infer<typeof updateVerificationDecisionSchema>;
export type GetVerificationCaseParams = z.infer<typeof getVerificationCaseParamsSchema>;
export type QueryVerificationCasesDto = z.infer<typeof queryVerificationCasesSchema>;
