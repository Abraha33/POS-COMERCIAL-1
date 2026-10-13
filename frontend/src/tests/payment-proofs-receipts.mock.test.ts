import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb, db } from '@/mocks/db';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import {
  confirmPaymentProof, createPaymentProof, getPaymentProof, submitPaymentProofEvidence,
  authorizePaymentProofException, verifyPaymentProof, removePaymentProofEvidence, submitPaymentProofForVerification,
} from '@/shared/api/paymentProofs';
import { getSaleReceipt, listSaleReprints, createSaleReprint } from '@/shared/api/receipts';

const proofInput = {
  operationId: '11111111-1111-4111-8111-111111111111',
  channelId: 'bancolombia', channelLabel: 'Bancolombia', amount: 18000, destination: 'Ahorros 1234',
};

beforeEach(() => {
  resetDb();
  setAccessToken(mockTokenForRole('cajero'));
});

describe('payment proofs mock contract', () => {
  it('evidencia recibida no confirma el pago', async () => {
    const proof = await createPaymentProof(proofInput);
    const evidenced = await submitPaymentProofEvidence(proof.id, { fileName: 'pago.jpg', mimeType: 'image/jpeg' });
    expect(evidenced.status).toBe('evidence_received');
    expect(evidenced.bankVerified).toBe(false);
    // Ni siquiera un supervisor confirma por haber recibido una foto: falta enviar y verificar.
    setAccessToken(mockTokenForRole('propietario'));
    await expect(confirmPaymentProof(proof.id)).rejects.toMatchObject({ code: 'PROOF_INVALID_STATE' });
  });

  it('varias fotos, enviar al responsable, verificar y confirmar (D-005)', async () => {
    const proof = await createPaymentProof(proofInput);
    await submitPaymentProofEvidence(proof.id, { fileName: 'pago-1.jpg', mimeType: 'image/jpeg' });
    const withTwo = await submitPaymentProofEvidence(proof.id, { fileName: 'pago-2.jpg', mimeType: 'image/jpeg' });
    expect(withTwo.evidences).toHaveLength(2);

    // Verificar antes de enviar no está permitido.
    setAccessToken(mockTokenForRole('propietario'));
    await expect(verifyPaymentProof(proof.id)).rejects.toMatchObject({ code: 'PROOF_INVALID_STATE' });

    setAccessToken(mockTokenForRole('cajero'));
    const sent = await submitPaymentProofForVerification(proof.id, { verifierId: 'emp-007' });
    expect(sent).toMatchObject({ status: 'sent_to_verifier', verifierId: 'emp-007' });

    // El cajero que lo solicitó no verifica; el responsable asignado sí.
    await expect(verifyPaymentProof(proof.id)).rejects.toMatchObject({ status: 403 });
    setAccessToken(mockTokenForRole('cartera'));
    const verifying = await verifyPaymentProof(proof.id);
    expect(verifying.status).toBe('verifying');
    const confirmed = await confirmPaymentProof(proof.id);
    expect(confirmed).toMatchObject({ status: 'confirmed', bankVerified: true });
    expect((await getPaymentProof(proof.id)).status).toBe('confirmed');
  });

  it('una foto se puede quitar antes de enviar y ya no después', async () => {
    const proof = await createPaymentProof(proofInput);
    const first = await submitPaymentProofEvidence(proof.id, { fileName: 'a.jpg', mimeType: 'image/jpeg' });
    await submitPaymentProofEvidence(proof.id, { fileName: 'b.jpg', mimeType: 'image/jpeg' });
    const removed = await removePaymentProofEvidence(proof.id, first.evidences[0]!.id);
    expect(removed.evidences).toHaveLength(1);
    await submitPaymentProofForVerification(proof.id, { verifierId: 'emp-007' });
    await expect(removePaymentProofEvidence(proof.id, removed.evidences[0]!.id)).rejects.toMatchObject({ code: 'PROOF_INVALID_STATE' });
  });

  it('enviar exige una foto y un responsable activo', async () => {
    const proof = await createPaymentProof(proofInput);
    await expect(submitPaymentProofForVerification(proof.id, { verifierId: 'emp-007' })).rejects.toMatchObject({ code: 'PROOF_INVALID_STATE' });
    await submitPaymentProofEvidence(proof.id, { fileName: 'a.jpg', mimeType: 'image/jpeg' });
    await expect(submitPaymentProofForVerification(proof.id, { verifierId: 'no-existe' })).rejects.toMatchObject({ code: 'PROOF_VERIFIER_INVALID' });
  });

  it('la excepción autorizada no equivale a verificación bancaria', async () => {
    const proof = await createPaymentProof(proofInput);
    setAccessToken(mockTokenForRole('propietario'));
    const exception = await authorizePaymentProofException(proof.id, { reason: 'Banco fuera de servicio' });
    expect(exception).toMatchObject({ status: 'exception_authorized', bankVerified: false });
  });
});

describe('receipt and reprint mock contract', () => {
  it('una reimpresión crea COPIA sin cambiar venta, caja ni inventario', async () => {
    const sale = db.sales[0]!;
    const shifts = db.shifts.map((item) => ({ ...item }));
    const stock = db.stockLevels.map((item) => ({ ...item }));
    const receipt = await getSaleReceipt(sale.id);
    expect(receipt.copyNumber).toBe(0);

    const reprint = await createSaleReprint(sale.id, { reason: 'Cliente solicita copia' });
    expect(reprint.copyNumber).toBe(1);
    expect(reprint.content).toContain('COPIA 1');
    expect((await listSaleReprints(sale.id))).toHaveLength(1);
    expect(db.sales[0]).toEqual(sale);
    expect(db.shifts).toEqual(shifts);
    expect(db.stockLevels).toEqual(stock);
  });
});
describe('payment proofs: datos que el teléfono necesita (servidor, no el cliente)', () => {
  it('el comprobante guarda el canal legible y quién lo solicitó; la vista pública los expone', async () => {
    const requester = db.employees.find((e) => e.id === 'emp-001')!.name;
    const proof = await createPaymentProof({ ...proofInput, channelLabel: 'Bancolombia · Ahorros' });
    expect(proof.channelLabel).toBe('Bancolombia · Ahorros');
    expect(proof.requestedBy).toBe(requester);

    const { getPublicPaymentProof } = await import('@/shared/api/paymentProofs');
    const publicView = await getPublicPaymentProof(proof.token);
    expect(publicView.channelLabel).toBe('Bancolombia · Ahorros');
    expect(publicView.requestedBy).toBe(requester);
  });
});
