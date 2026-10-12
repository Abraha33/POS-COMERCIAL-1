import { api } from './client';
import { paymentProofPublicSchema, paymentProofSchema } from '@/shared/contracts';
import type { PaymentProofCreate, PaymentProofEvidenceCreate, PaymentProofReason } from '@/shared/contracts';

export const createPaymentProof = (input: PaymentProofCreate) => api.post('/pos/payment-proofs', input, paymentProofSchema);
export const getPaymentProof = (id: string) => api.get(`/pos/payment-proofs/${id}`, paymentProofSchema);
export const submitPaymentProofEvidence = (id: string, input: PaymentProofEvidenceCreate) => api.post(`/pos/payment-proofs/${id}/evidence`, input, paymentProofSchema);
export const verifyPaymentProof = (id: string) => api.post(`/pos/payment-proofs/${id}/verify`, {}, paymentProofSchema);
export const confirmPaymentProof = (id: string) => api.post(`/pos/payment-proofs/${id}/confirm`, {}, paymentProofSchema);
export const rejectPaymentProof = (id: string, input: PaymentProofReason) => api.post(`/pos/payment-proofs/${id}/reject`, input, paymentProofSchema);
export const authorizePaymentProofException = (id: string, input: PaymentProofReason) => api.post(`/pos/payment-proofs/${id}/exception`, input, paymentProofSchema);
export const getPublicPaymentProof = (token: string) => api.get(`/pos/payment-proofs/public/${token}`, paymentProofPublicSchema);
export const submitPublicPaymentProofEvidence = (token: string, input: PaymentProofEvidenceCreate) => api.post(`/pos/payment-proofs/public/${token}/evidence`, input, paymentProofSchema);