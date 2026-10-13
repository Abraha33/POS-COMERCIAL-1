import { z } from 'zod';
import { money } from './common';

/** Estados del comprobante (D-005: varias fotos; "Enviar" pasa la verificación al responsable de la cuenta). */
export const paymentProofStatusSchema = z.enum([
  'pending_evidence', 'evidence_received', 'sent_to_verifier', 'verifying', 'confirmed', 'rejected', 'exception_authorized', 'expired',
]);
export type PaymentProofStatus = z.infer<typeof paymentProofStatusSchema>;

export const paymentProofEvidenceSchema = z.object({
  id: z.string(), fileName: z.string(), mimeType: z.string(), submittedAt: z.string(), submittedBy: z.string(),
});
export type PaymentProofEvidence = z.infer<typeof paymentProofEvidenceSchema>;

export const paymentProofSchema = z.object({
  id: z.string(), operationId: z.string(), channelId: z.string(), channelLabel: z.string(), requestedBy: z.string(),
  amount: money, destination: z.string(),
  status: paymentProofStatusSchema, token: z.string(), expiresAt: z.string(), bankVerified: z.boolean(),
  evidences: z.array(paymentProofEvidenceSchema),
  verifierId: z.string().nullable(),
  reviewedBy: z.string().nullable(), reason: z.string().nullable(),
});
export type PaymentProof = z.infer<typeof paymentProofSchema>;
export const paymentProofCreateSchema = paymentProofSchema.pick({ operationId: true, channelId: true, channelLabel: true, amount: true, destination: true });
export type PaymentProofCreate = z.infer<typeof paymentProofCreateSchema>;
export const paymentProofEvidenceCreateSchema = z.object({ fileName: z.string().min(1), mimeType: z.string().regex(/^image\//) });
export type PaymentProofEvidenceCreate = z.infer<typeof paymentProofEvidenceCreateSchema>;
export const paymentProofSubmitSchema = z.object({ verifierId: z.string().min(1) });
export type PaymentProofSubmit = z.infer<typeof paymentProofSubmitSchema>;
export const paymentProofReasonSchema = z.object({ reason: z.string().min(5) });
export type PaymentProofReason = z.infer<typeof paymentProofReasonSchema>;
export const paymentProofPublicSchema = paymentProofSchema.pick({
  operationId: true, channelId: true, channelLabel: true, requestedBy: true, amount: true, destination: true, status: true, expiresAt: true,
});
export type PaymentProofPublic = z.infer<typeof paymentProofPublicSchema>;
