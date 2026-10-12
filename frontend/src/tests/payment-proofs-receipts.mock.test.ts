import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb, db } from '@/mocks/db';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import {
  confirmPaymentProof, createPaymentProof, getPaymentProof, submitPaymentProofEvidence,
  authorizePaymentProofException, verifyPaymentProof,
} from '@/shared/api/paymentProofs';
import { getSaleReceipt, listSaleReprints, createSaleReprint } from '@/shared/api/receipts';

const proofInput = {
  operationId: '11111111-1111-4111-8111-111111111111',
  channelId: 'bancolombia', amount: 18000, destination: 'Ahorros 1234',
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
    await expect(confirmPaymentProof(proof.id)).rejects.toMatchObject({ code: 'PROOF_INVALID_STATE' });
  });

  it('confirma sólo tras verificación y conserva el ciclo contractual', async () => {
    const proof = await createPaymentProof(proofInput);
    await submitPaymentProofEvidence(proof.id, { fileName: 'pago.jpg', mimeType: 'image/jpeg' });
    const verifying = await verifyPaymentProof(proof.id);
    expect(verifying.status).toBe('verifying');
    const confirmed = await confirmPaymentProof(proof.id);
    expect(confirmed).toMatchObject({ status: 'confirmed', bankVerified: true });
    expect((await getPaymentProof(proof.id)).status).toBe('confirmed');
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