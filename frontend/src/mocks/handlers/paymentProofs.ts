import { http, HttpResponse } from 'msw';
import { paymentProofCreateSchema, paymentProofEvidenceCreateSchema, paymentProofReasonSchema, paymentProofSubmitSchema, type PaymentProof, type ReprintRecord, type SaleReceiptDocument } from '@/shared/contracts';
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
/** D-005: cada foto se agrega a la lista; la primera recepción pasa a evidence_received. */
const addEvidence = (proof: PaymentProof, input: { fileName: string; mimeType: string }, actor: string): PaymentProof => ({
  ...proof,
  status: 'evidence_received',
  evidences: [...proof.evidences, { id: uuid(), ...input, submittedAt: mockNow().toISOString(), submittedBy: actor }],
});
/** Verifica el responsable asignado al enviar, o un supervisor. Nunca el cajero que solicitó el comprobante. */
const canVerify = (user: { id: string; role: Parameters<typeof isSupervisor>[0] }, proof: PaymentProof) =>
  proof.verifierId === user.id || isSupervisor(user.role);
const CAN_EVIDENCE: PaymentProof['status'][] = ['pending_evidence', 'evidence_received', 'rejected'];

export const paymentProofHandlers = [
  http.post('/api/v1/pos/payment-proofs', async ({ request }) => {
    const user = authenticate(request); if (!user) return unauthorized();
    const parsed = paymentProofCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Comprobante con formato inválido');
    const store = getProofStore();
    const existing = await store.findByOperation(parsed.data.operationId, parsed.data.channelId, parsed.data.amount);
    if (existing) return HttpResponse.json(existing);
    // Id y token aleatorios: el almacén puede ser compartido entre navegadores (computador y teléfono).
    const proof: PaymentProof = { id: uuid(), ...parsed.data, requestedBy: employeeName(user.id), status: 'pending_evidence', token: uuid().replace(/-/g, ''), expiresAt: new Date(mockNow().getTime() + TTL_MS).toISOString(), bankVerified: false, evidences: [], verifierId: null, reviewedBy: null, reason: null };
    await store.put(proof);
    return HttpResponse.json(proof, { status: 201 });
  }),
  http.get('/api/v1/pos/payment-proofs/:id', async ({ request, params }) => { if (!authenticate(request)) return unauthorized(); const proof = await getProofStore().get(String(params.id)); return proof ? HttpResponse.json(proof) : failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado'); }),
  http.post('/api/v1/pos/payment-proofs/:id/evidence', async ({ request, params }) => {
    const user = authenticate(request); if (!user) return unauthorized();
    const store = getProofStore();
    const proof = await store.get(String(params.id)); if (!proof) return failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado'); if (expired(proof)) return failure(409, 'PROOF_EXPIRED', 'El enlace del comprobante venció');
    const parsed = paymentProofEvidenceCreateSchema.safeParse(await request.json()); if (!parsed.success) return failure(422, 'PROOF_EVIDENCE_INVALID', 'La evidencia debe ser una imagen');
    if (!CAN_EVIDENCE.includes(proof.status)) return failure(409, 'PROOF_INVALID_STATE', 'El comprobante no acepta fotos en este estado');
    const next = addEvidence(proof, parsed.data, user.id); await store.put(next); return HttpResponse.json(next);
  }),
  http.delete('/api/v1/pos/payment-proofs/:id/evidence/:evidenceId', async ({ request, params }) => {
    const user = authenticate(request); if (!user) return unauthorized();
    const store = getProofStore();
    const proof = await store.get(String(params.id)); if (!proof) return failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado');
    if (proof.status !== 'evidence_received') return failure(409, 'PROOF_INVALID_STATE', 'Solo se quitan fotos antes de enviar');
    const evidences = proof.evidences.filter((item) => item.id !== params.evidenceId);
    const next = { ...proof, evidences, status: evidences.length === 0 ? 'pending_evidence' as const : proof.status };
    await store.put(next); return HttpResponse.json(next);
  }),
  http.post('/api/v1/pos/payment-proofs/:id/submit', async ({ request, params }) => {
    const user = authenticate(request); if (!user) return unauthorized();
    const store = getProofStore();
    const proof = await store.get(String(params.id)); if (!proof) return failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado');
    const parsed = paymentProofSubmitSchema.safeParse(await request.json()); if (!parsed.success) return validationError('Falta el responsable de la cuenta');
    if (proof.status !== 'evidence_received' || proof.evidences.length === 0) return failure(409, 'PROOF_INVALID_STATE', 'Primero agrega al menos una foto');
    const verifier = db.employees.find((employee) => employee.id === parsed.data.verifierId && employee.active);
    if (!verifier) return failure(422, 'PROOF_VERIFIER_INVALID', 'El responsable no existe o está inactivo');
    const next = { ...proof, status: 'sent_to_verifier' as const, verifierId: verifier.id };
    await store.put(next); return HttpResponse.json(next);
  }),
  http.post('/api/v1/pos/payment-proofs/:id/verify', async ({ request, params }) => {
    const user = authenticate(request); if (!user) return unauthorized();
    const store = getProofStore();
    const proof = await store.get(String(params.id)); if (!proof) return failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado');
    if (!canVerify(user, proof)) return forbidden();
    if (proof.status !== 'sent_to_verifier') return failure(409, 'PROOF_INVALID_STATE', 'El comprobante debe enviarse antes de verificar');
    const next = { ...proof, status: 'verifying' as const, reviewedBy: user.id }; await store.put(next); return HttpResponse.json(next);
  }),
  http.post('/api/v1/pos/payment-proofs/:id/confirm', async ({ request, params }) => {
    const user = authenticate(request); if (!user) return unauthorized();
    const store = getProofStore();
    const proof = await store.get(String(params.id)); if (!proof) return failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado');
    if (!canVerify(user, proof)) return forbidden();
    if (proof.status !== 'verifying') return failure(409, 'PROOF_INVALID_STATE', 'El comprobante debe verificarse antes de confirmar');
    const next = { ...proof, status: 'confirmed' as const, bankVerified: true, reviewedBy: user.id }; await store.put(next); return HttpResponse.json(next);
  }),
  http.post('/api/v1/pos/payment-proofs/:id/reject', async ({ request, params }) => {
    const user = authenticate(request); if (!user) return unauthorized();
    const store = getProofStore();
    const proof = await store.get(String(params.id)); if (!proof) return failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado');
    if (!canVerify(user, proof)) return forbidden();
    const parsed = paymentProofReasonSchema.safeParse(await request.json()); if (!parsed.success) return failure(422, 'PROOF_EVIDENCE_REQUIRED', 'El rechazo exige motivo');
    if (!['sent_to_verifier', 'verifying'].includes(proof.status)) return failure(409, 'PROOF_INVALID_STATE', 'El comprobante no puede rechazarse');
    const next = { ...proof, status: 'rejected' as const, reason: parsed.data.reason, reviewedBy: user.id }; await store.put(next); return HttpResponse.json(next);
  }),
  http.post('/api/v1/pos/payment-proofs/:id/exception', async ({ request, params }) => { const user = authenticate(request); if (!user) return unauthorized(); if (!isSupervisor(user.role)) return forbidden(); const store = getProofStore(); const proof = await store.get(String(params.id)); if (!proof) return failure(404, 'PROOF_NOT_FOUND', 'Comprobante no encontrado'); const parsed = paymentProofReasonSchema.safeParse(await request.json()); if (!parsed.success) return failure(422, 'PROOF_EXCEPTION_REASON_REQUIRED', 'La excepción exige motivo'); const next = { ...proof, status: 'exception_authorized' as const, bankVerified: false, reason: parsed.data.reason, reviewedBy: user.id }; await store.put(next); return HttpResponse.json(next); }),
  http.get('/api/v1/pos/payment-proofs/public/:token', async ({ params }) => { const proof = await getProofStore().getByToken(String(params.token)); if (!proof) return failure(404, 'PROOF_TOKEN_INVALID', 'Token inválido'); if (expired(proof)) return failure(409, 'PROOF_EXPIRED', 'El enlace venció'); return HttpResponse.json(publicProof(proof)); }),
  http.post('/api/v1/pos/payment-proofs/public/:token/evidence', async ({ request, params }) => { const store = getProofStore(); const proof = await store.getByToken(String(params.token)); if (!proof) return failure(404, 'PROOF_TOKEN_INVALID', 'Token inválido'); if (expired(proof)) return failure(409, 'PROOF_EXPIRED', 'El enlace venció'); const parsed = paymentProofEvidenceCreateSchema.safeParse(await request.json()); if (!parsed.success) return failure(422, 'PROOF_EVIDENCE_INVALID', 'La evidencia debe ser una imagen'); if (!CAN_EVIDENCE.includes(proof.status)) return failure(409, 'PROOF_INVALID_STATE', 'El comprobante no acepta fotos'); const next = addEvidence(proof, parsed.data, 'public'); await store.put(next); return HttpResponse.json(next); }),
  http.get('/api/v1/pos/sales/:id/receipt', ({ request, params }) => { if (!authenticate(request)) return unauthorized(); const receipt = receiptFor(String(params.id), state.reprints.filter((item) => item.saleId === params.id).length); return receipt ? HttpResponse.json(receipt) : notFound('Venta'); }),
  http.get('/api/v1/pos/sales/:id/reprints', ({ request, params }) => { if (!authenticate(request)) return unauthorized(); if (!db.sales.some((item) => item.id === params.id)) return notFound('Venta'); return HttpResponse.json(state.reprints.filter((item) => item.saleId === params.id)); }),
  http.post('/api/v1/pos/sales/:id/reprints', async ({ request, params }) => { const user = authenticate(request); if (!user) return unauthorized(); if (!db.sales.some((item) => item.id === params.id)) return notFound('Venta'); const body = await request.json() as { reason?: unknown }; if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.trim().length < 3)) return failure(422, 'REPRINT_REASON_REQUIRED', 'El motivo debe tener al menos 3 caracteres'); const record: ReprintRecord = { id: nextId('rpt'), saleId: String(params.id), copyNumber: state.reprints.filter((item) => item.saleId === params.id).length + 1, requestedAt: mockNow().toISOString(), requestedBy: user.id, reason: typeof body.reason === 'string' ? body.reason : null }; state.reprints.push(record); return HttpResponse.json(receiptFor(record.saleId, record.copyNumber), { status: 201 }); }),
];
