import { z } from 'zod';
import { money } from './common';

export const paymentProofStatusSchema = z.enum(['pending_evidence', 'evidence_received', 'verifying', 'confirmed', 'rejected', 'exception_authorized', 'expired']);
export type PaymentProofStatus = z.infer<typeof paymentProofStatusSchema>;

export const paymentProofSchema = z.object({
  id: z.string(), operationId: z.string(), channelId: z.string(), amount: money, destination: z.string(),
  status: paymentProofStatusSchema, token: z.string(), expiresAt: z.string(), bankVerified: z.boolean(),
  evidence: z.object({ fileName: z.string(), mimeType: z.string(), submittedAt: z.string(), submittedBy: z.string() }).nullable(),
  reviewedBy: z.string().nullable(), reason: z.string().nullable(),
});
export type PaymentProof = z.infer<typeof paymentProofSchema>;
export const paymentProofCreateSchema = paymentProofSchema.pick({ operationId: true, channelId: true, amount: true, destination: true });
export type PaymentProofCreate = z.infer<typeof paymentProofCreateSchema>;
export const paymentProofEvidenceCreateSchema = z.object({ fileName: z.string().min(1), mimeType: z.string().regex(/^image\//) });
export type PaymentProofEvidenceCreate = z.infer<typeof paymentProofEvidenceCreateSchema>;
export const paymentProofReasonSchema = z.object({ reason: z.string().min(5) });
export type PaymentProofReason = z.infer<typeof paymentProofReasonSchema>;
export const paymentProofPublicSchema = paymentProofSchema.pick({ operationId: true, channelId: true, amount: true, destination: true, status: true, expiresAt: true });
export type PaymentProofPublic = z.infer<typeof paymentProofPublicSchema>;