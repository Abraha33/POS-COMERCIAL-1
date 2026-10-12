import { http, HttpResponse } from 'msw';
import { paymentProofCreateSchema, paymentProofEvidenceCreateSchema, paymentProofReasonSchema, type PaymentProof, type ReprintRecord, type SaleReceiptDocument } from '@/shared/contracts';
import { uuid } from '@/shared/utils/uuid';
import { db, mockNow, nextId, state } from '../db';
import { getProofStore } from '../proofStore';
import { authenticate, failure, forbidden, notFound, unauthorized, validationError, isSupervisor } from '../http';

const TTL_MS = 15 * 60 * 1000;
const expired = (proof: PaymentProof) => Date.parse(proof.expiresAt) <= mockNow().getTime();
const publicProof = (proof: PaymentProof) => ({ operationId: proof.operationId, channelId: proof.channelId, channelLabel: proof.channelLabel, requestedBy: proof.requestedBy, amount: proof.amount, destination: proof.destination, status: proof.status, expiresAt: proof.expiresAt });
const employeeName = (id: string): string => db.employees.find((employee) => employee.id === id)?.name ?? id;
const receiptFor = (saleId: string, copyNumber: number): SaleReceiptDocument | null => {
  const sale = db.sales.find((item) => item.id === saleId);
  if (!sale) return null;
  const copy = copyNumber > 0 ? `COPIA ${copyNumber}` : 'ORIGINAL';
  return { saleId: sale.id, saleNumber: sale.number, copyNumber, issuedAt: mockNow().toISOString(), documentType: sale.documentType ?? 'recibo_operativo', content: `${copy}\nRecibo ${sale.number}\nTotal: ${sale.total}` };
};
const evidence = (proof: PaymentProof, input: { fileName: string; mimeType: string }, actor: string): PaymentProof => ({ ...proof, status: 'evidence_received', evidence: { ...input, submittedAt: mockNow().toISOString(), submittedBy: actor } });

export const paymentProofHandlers = [
  http.post('/api/v1/pos/payment-proofs', async ({ request }) => {
    const user = authenticate(request); if (!user) return unauthorized();
    const parsed = paymentProofCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Comprobante con formato inválido');
    const store = getProofStore();
    const existing = await store.findByOperation(parsed.data.operationId, parsed.data.channelId, parsed.data.amount);
    if (existing) return HttpResponse.json(existing);
    // Id y token aleatorios: el almacén puede ser compartido entre navegadores (computador y teléfono).
    const proof: PaymentProof = { id: uuid(), ...parsed.data, requestedBy: employeeName(user.id), status: 'pending_evidence', token: uuid().replace(/-/g, ''), expiresAt: new Date(mockNow().getTime() + TTL_MS).toISOString(), bankVerified: false, evidence: null, reviewedBy: null, reason: null };
    await store.put(proof);
    return HttpResponse.json(proof, { status: 201 });
  }),
  http.get('/api/v1/pos/payment-proofs/:id', async ({ request, params }) => { if (!authenticate(request)) return unauthorized(); const proof = await getProofStore().get(String(params.id)); return proof ? HttpResponse.json(proof) : failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado'); }),
  http.post('/api/v1/pos/payment-proofs/:id/evidence', async ({ request, params }) => {
    const user = authenticate(request); if (!user) return unauthorized();
    const store = getProofStore();
    const proof = await store.get(String(params.id)); if (!proof) return failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado'); if (expired(proof)) return failure(409, 'PROOF_EXPIRED', 'El enlace del comprobante venció');
    const parsed = paymentProofEvidenceCreateSchema.safeParse(await request.json()); if (!parsed.success) return failure(422, 'PROOF_EVIDENCE_INVALID', 'La evidencia debe ser una imagen');
    if (!['pending_evidence', 'rejected'].includes(proof.status)) return failure(409, 'PROOF_INVALID_STATE', 'El comprobante no acepta evidencia en este estado');
    const next = evidence(proof, parsed.data, user.id); await store.put(next); return HttpResponse.json(next);
  }),
  http.post('/api/v1/pos/payment-proofs/:id/verify', async ({ request, params }) => { const user = authenticate(request); if (!user) return unauthorized(); const store = getProofStore(); const proof = await store.get(String(params.id)); if (!proof) return failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado'); if (proof.status !== 'evidence_received') return failure(409, 'PROOF_INVALID_STATE', 'La evidencia debe recibirse antes de verificar'); const next = { ...proof, status: 'verifying' as const, reviewedBy: user.id }; await store.put(next); return HttpResponse.json(next); }),
  http.post('/api/v1/pos/payment-proofs/:id/confirm', async ({ request, params }) => { const user = authenticate(request); if (!user) return unauthorized(); const store = getProofStore(); const proof = await store.get(String(params.id)); if (!proof) return failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado'); if (proof.status !== 'verifying') return failure(409, 'PROOF_INVALID_STATE', 'El comprobante debe verificarse antes de confirmar'); const next = { ...proof, status: 'confirmed' as const, bankVerified: true, reviewedBy: user.id }; await store.put(next); return HttpResponse.json(next); }),
  http.post('/api/v1/pos/payment-proofs/:id/reject', async ({ request, params }) => { const user = authenticate(request); if (!user) return unauthorized(); const store = getProofStore(); const proof = await store.get(String(params.id)); if (!proof) return failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado'); const parsed = paymentProofReasonSchema.safeParse(await request.json()); if (!parsed.success) return failure(422, 'PROOF_EVIDENCE_REQUIRED', 'El rechazo exige motivo'); if (!['evidence_received', 'verifying'].includes(proof.status)) return failure(409, 'PROOF_INVALID_STATE', 'El comprobante no puede rechazarse'); const next = { ...proof, status: 'rejected' as const, reason: parsed.data.reason, reviewedBy: user.id }; await store.put(next); return HttpResponse.json(next); }),
  http.post('/api/v1/pos/payment-proofs/:id/exception', async ({ request, params }) => { const user = authenticate(request); if (!user) return unauthorized(); if (!isSupervisor(user.role)) return forbidden(); const store = getProofStore(); const proof = await store.get(String(params.id)); if (!proof) return failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado'); const parsed = paymentProofReasonSchema.safeParse(await request.json()); if (!parsed.success) return failure(422, 'PROOF_EXCEPTION_REASON_REQUIRED', 'La excepción exige motivo'); const next = { ...proof, status: 'exception_authorized' as const, bankVerified: false, reason: parsed.data.reason, reviewedBy: user.id }; await store.put(next); return HttpResponse.json(next); }),
  http.get('/api/v1/pos/payment-proofs/public/:token', async ({ params }) => { const proof = await getProofStore().getByToken(String(params.token)); if (!proof) return failure(404, 'PROOF_TOKEN_INVALID', 'Token inválido'); if (expired(proof)) return failure(409, 'PROOF_EXPIRED', 'El enlace venció'); return HttpResponse.json(publicProof(proof)); }),
  http.post('/api/v1/pos/payment-proofs/public/:token/evidence', async ({ request, params }) => { const store = getProofStore(); const proof = await store.getByToken(String(params.token)); if (!proof) return failure(404, 'PROOF_TOKEN_INVALID', 'Token inválido'); if (expired(proof)) return failure(409, 'PROOF_EXPIRED', 'El enlace venció'); const parsed = paymentProofEvidenceCreateSchema.safeParse(await request.json()); if (!parsed.success) return failure(422, 'PROOF_EVIDENCE_INVALID', 'La evidencia debe ser una imagen'); if (!['pending_evidence', 'rejected'].includes(proof.status)) return failure(409, 'PROOF_INVALID_STATE', 'El comprobante no acepta evidencia'); const next = evidence(proof, parsed.data, 'public'); await store.put(next); return HttpResponse.json(next); }),
  http.get('/api/v1/pos/sales/:id/receipt', ({ request, params }) => { if (!authenticate(request)) return unauthorized(); const receipt = receiptFor(String(params.id), state.reprints.filter((item) => item.saleId === params.id).length); return receipt ? HttpResponse.json(receipt) : notFound('Venta'); }),
  http.get('/api/v1/pos/sales/:id/reprints', ({ request, params }) => { if (!authenticate(request)) return unauthorized(); if (!db.sales.some((item) => item.id === params.id)) return notFound('Venta'); return HttpResponse.json(state.reprints.filter((item) => item.saleId === params.id)); }),
  http.post('/api/v1/pos/sales/:id/reprints', async ({ request, params }) => { const user = authenticate(request); if (!user) return unauthorized(); if (!db.sales.some((item) => item.id === params.id)) return notFound('Venta'); const body = await request.json() as { reason?: unknown }; if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.trim().length < 3)) return failure(422, 'REPRINT_REASON_REQUIRED', 'El motivo debe tener al menos 3 caracteres'); const record: ReprintRecord = { id: nextId('rpt'), saleId: String(params.id), copyNumber: state.reprints.filter((item) => item.saleId === params.id).length + 1, requestedAt: mockNow().toISOString(), requestedBy: user.id, reason: typeof body.reason === 'string' ? body.reason : null }; state.reprints.push(record); return HttpResponse.json(receiptFor(record.saleId, record.copyNumber), { status: 201 }); }),
];
