import { z } from 'zod';

export const initiateVerificationSchema = z.object({
  transactionId: z.string().min(1, 'transactionId is required'),
  method: z.enum(['SMS_OTP', 'EMAIL_OTP', 'BIOMETRIC', 'CARD_3DS']).default('SMS_OTP'),
});

export const verifyCodeSchema = z.object({
  transactionId: z.string().min(1, 'transactionId is required'),
  code: z.string().min(4, 'Verification code must be at least 4 digits'),
});

export const verificationFilterSchema = z.object({
  transactionId: z.string().optional(),
  status: z.enum(['PENDING', 'VERIFIED', 'FAILED', 'EXPIRED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const verificationParamsSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export type InitiateVerificationInput = z.infer<typeof initiateVerificationSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type VerificationFilterInput = z.infer<typeof verificationFilterSchema>;
export type VerificationParamsInput = z.infer<typeof verificationParamsSchema>;
