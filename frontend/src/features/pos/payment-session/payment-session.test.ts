import { describe, expect, it } from 'vitest';
import {
  addAttempt,
  canCompletePaymentSession,
  canStartNewSale,
  createPaymentSession,
  markAttempt,
  markUnknown,
  retryUnknown,
  type PaymentSession,
} from './paymentSession';

const base = {
  id: 'session-1',
  draftId: 'draft-1',
  registerId: 'register-1',
  shiftId: 'shift-1',
  clientOperationId: 'operation-1',
  documentType: 'pos-receipt',
  mode: 'transferencia' as const,
  now: '2026-10-12T22:00:00.000Z',
};

const digitalSession = (): PaymentSession => addAttempt(createPaymentSession(base), {
  id: 'attempt-1',
  method: 'transferencia',
  channelId: 'nequi',
  destinationId: 'nequi-business',
  amount: 25_000,
});

describe('POS · PaymentSession foundation', () => {
  it('separa el cobro del carrito y conserva clientOperationId', () => {
    const session = digitalSession();

    expect(session).toMatchObject({
      draftId: 'draft-1',
      registerId: 'register-1',
      shiftId: 'shift-1',
      clientOperationId: 'operation-1',
      state: 'editing',
    });
    expect(session.attempts[0]).toMatchObject({ status: 'draft', proofId: null, evidence: null });
  });

  it('UNKNOWN no aprueba, bloquea una venta nueva y reintenta con la misma clave idempotente', () => {
    const unknown = markUnknown(digitalSession(), base.now);

    expect(unknown.state).toBe('unknown');
    expect(canCompletePaymentSession(unknown)).toBe(false);
    expect(canStartNewSale(unknown)).toBe(false);

    const retried = retryUnknown(unknown, '2026-10-12T22:01:00.000Z');
    expect(retried).toMatchObject({ state: 'submitting', clientOperationId: 'operation-1' });
  });

  it('solo confirmed o authorized_exception permiten completar un pago digital', () => {
    const pending = markAttempt(digitalSession(), 'attempt-1', 'pending_evidence', base.now);
    expect(canCompletePaymentSession(pending)).toBe(false);

    const confirmed = markAttempt(pending, 'attempt-1', 'confirmed', '2026-10-12T22:01:00.000Z');
    expect(canCompletePaymentSession(confirmed)).toBe(true);

    const exception = markAttempt(digitalSession(), 'attempt-1', 'authorized_exception', base.now);
    expect(canCompletePaymentSession(exception)).toBe(true);
  });

  it('no expone ni persiste base64: evidencia sólo conserva metadatos y proofId', () => {
    const session = markAttempt(digitalSession(), 'attempt-1', 'pending_evidence', base.now, {
      proofId: 'proof-1',
      evidence: { submittedAt: base.now, submittedBy: 'cashier-1', attemptCount: 1 },
    });
    const serialized = JSON.stringify(session);

    expect(serialized).toContain('proof-1');
    expect(serialized).not.toMatch(/base64|data:image|imageData/i);
  });
});
