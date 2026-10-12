import { beforeEach, describe, expect, it } from 'vitest';
import { defaultChannels, isDuplicateReference, missingFields } from '@/features/pos/proofs/channels';
import { createMemoryGateway, ProofGatewayError } from '@/features/pos/proofs/gateway';
import {
  authorizeException, canCloseSale, confirmPayment, createProof, isExpired, PROOF_TTL_MS, rejectPayment,
  startVerification, submitEvidence, toPublic, type ProofRequest,
} from '@/features/pos/proofs/proofs';
import { resetRelay } from '@/features/pos/proofs/relay';

const T0 = new Date('2026-10-11T10:00:00Z');
const IMG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const input = {
  id: 'p1', token: 'tok', operationId: 'op-1', method: 'transferencia', channelId: 'bancolombia',
  channelLabel: 'Bancolombia', amount: 185000, destination: 'Ahorros ••• 1234', employee: 'Ana',
};
const fresh = (): ProofRequest => {
  const r = createProof(input, T0);
  if (!r.ok) throw new Error(r.message);
  return r.value;
};
const ok = <T,>(r: { ok: true; value: T } | { ok: false; message: string }): T => {
  if (!r.ok) throw new Error(r.message);
  return r.value;
};

describe('comprobantes: máquina de estados', () => {
  it('nace esperando y no deja cerrar la venta', () => {
    const p = fresh();
    expect(p.status).toBe('esperando');
    expect(canCloseSale(p)).toBe(false);
  });

  it('una foto es evidencia: recibido no confirma el pago', () => {
    const p = ok(submitEvidence(fresh(), IMG, 'teléfono', T0));
    expect(p.status).toBe('recibido');
    expect(canCloseSale(p)).toBe(false);
  });

  it('recibido → verificando → confirmado habilita cerrar y deja trazabilidad', () => {
    let p = ok(submitEvidence(fresh(), IMG, 'teléfono', T0));
    p = ok(startVerification(p, 'Ana', T0));
    expect(p.status).toBe('verificando');
    p = ok(confirmPayment(p, 'Ana', T0));
    expect(canCloseSale(p)).toBe(true);
    expect(p.history.map((h) => h.status)).toEqual(['esperando', 'recibido', 'verificando', 'confirmado']);
  });

  it('no se confirma sin evidencia ni sin responsable', () => {
    const p = fresh();
    const r = confirmPayment(p, 'Ana', T0);
    expect(r.ok).toBe(false);
    const received = ok(submitEvidence(p, IMG, 'x', T0));
    const noActor = confirmPayment(received, ' ', T0);
    expect(noActor.ok === false && noActor.code).toBe('ACTOR_REQUIRED');
  });

  it('rechazar exige motivo y permite volver a enviar evidencia', () => {
    const received = ok(submitEvidence(fresh(), IMG, 'x', T0));
    const noReason = rejectPayment(received, 'Ana', '', T0);
    expect(noReason.ok === false && noReason.code).toBe('REASON_REQUIRED');
    const rejected = ok(rejectPayment(received, 'Ana', 'Monto no coincide', T0));
    expect(rejected.status).toBe('rechazado');
    expect(canCloseSale(rejected)).toBe(false);
    const again = ok(submitEvidence(rejected, IMG, 'x', T0));
    expect(again.status).toBe('recibido');
    expect(again.attempts).toBe(2);
  });

  it('un comprobante ya confirmado no admite otra imagen', () => {
    const confirmed = ok(confirmPayment(ok(submitEvidence(fresh(), IMG, 'x', T0)), 'Ana', T0));
    const r = submitEvidence(confirmed, IMG, 'x', T0);
    expect(r.ok === false && r.code).toBe('INVALID_STATE');
  });

  it('el enlace vence', () => {
    const p = fresh();
    const later = new Date(T0.getTime() + PROOF_TTL_MS + 1000);
    expect(isExpired(p, later)).toBe(true);
    const r = submitEvidence(p, IMG, 'x', later);
    expect(r.ok === false && r.code).toBe('EXPIRED');
  });

  it('valida tipo y tamaño de imagen', () => {
    const bad = submitEvidence(fresh(), 'data:application/pdf;base64,AAAA', 'x', T0);
    expect(bad.ok === false && bad.code).toBe('IMAGE_TYPE');
    const big = `data:image/png;base64,${'A'.repeat(5 * 1024 * 1024)}`;
    const tooBig = submitEvidence(fresh(), big, 'x', T0);
    expect(tooBig.ok === false && tooBig.code).toBe('IMAGE_TOO_LARGE');
  });

  it('la excepción autorizada es trazable y exige motivo', () => {
    const p = fresh();
    const noReason = authorizeException(p, 'Dueño', 'no', T0);
    expect(noReason.ok === false && noReason.code).toBe('REASON_REQUIRED');
    const exc = ok(authorizeException(p, 'Dueño', 'Cliente habitual, banco caído', T0));
    expect(exc.status).toBe('esperando');
    expect(exc.exception?.authorizedBy).toBe('Dueño');
    expect(canCloseSale(exc)).toBe(true);
  });

  it('el monto debe ser entero COP positivo', () => {
    expect(createProof({ ...input, amount: 0 }, T0).ok).toBe(false);
    expect(createProof({ ...input, amount: 10.5 }, T0).ok).toBe(false);
  });

  it('la vista pública no expone imagen, token ni historial', () => {
    const view = toPublic(ok(submitEvidence(fresh(), IMG, 'x', T0)));
    expect(Object.keys(view).sort()).toEqual(['amount', 'channelLabel', 'destination', 'employee', 'expiresAt', 'operationId', 'status']);
  });
});

describe('canales dinámicos', () => {
  const byId = (id: string) => defaultChannels.find((c) => c.id === id)!;
  it('los campos salen del tipo de canal', () => {
    expect(missingFields(byId('nequi'), {})).toEqual(['Número de referencia o aprobación']);
    expect(missingFields(byId('otros-bancos'), { reference: '123' })).toEqual(['Banco de origen']);
    expect(missingFields(byId('datafono'), {})).toEqual(['Código de aprobación']);
    expect(missingFields(byId('efectivo'), {})).toEqual([]);
  });
  it('datáfono y efectivo no exigen comprobante; billeteras y bancos sí', () => {
    expect(byId('datafono').requiresProof).toBe(false);
    expect(byId('efectivo').requiresProof).toBe(false);
    for (const id of ['nequi', 'daviplata', 'bancolombia', 'otros-bancos', 'bre-b', 'pse']) expect(byId(id).requiresProof).toBe(true);
  });
  it('detecta referencias repetidas sin distinguir mayúsculas', () => {
    expect(isDuplicateReference(['ABC123'], ' abc123 ')).toBe(true);
    expect(isDuplicateReference(['ABC123'], 'zzz')).toBe(false);
    expect(isDuplicateReference(['ABC123'], '')).toBe(false);
  });
});

describe('relay: flujo teléfono ↔ computador', () => {
  beforeEach(() => resetRelay());
  const gw = createMemoryGateway();
  const base = { operationId: 'op-9', method: 'nequi', channelId: 'nequi', channelLabel: 'Nequi', amount: 50000, destination: 'Nequi del negocio', employee: 'Ana' };

  it('crear es idempotente por operación, canal y monto', async () => {
    const a = await gw.create(base);
    const b = await gw.create(base);
    expect(b.id).toBe(a.id);
  });

  it('el teléfono entrega la imagen por token y el cajero la ve y la confirma', async () => {
    const p = await gw.create(base);
    const view = await gw.getPublic(p.token);
    expect(view.amount).toBe(50000);
    await gw.submitPublic(p.token, IMG);
    const seen = await gw.get(p.id);
    expect(seen.status).toBe('recibido');
    expect(seen.image).toBe(IMG);
    const confirmed = await gw.confirm(p.id, 'Ana');
    expect(canCloseSale(confirmed)).toBe(true);
  });

  it('un token inexistente no da acceso', async () => {
    await expect(gw.getPublic('nope')).rejects.toBeInstanceOf(ProofGatewayError);
    await expect(gw.submitPublic('nope', IMG)).rejects.toMatchObject({ status: 404 });
  });

  it('segundo envío sobre un pago confirmado es rechazado con 409', async () => {
    const p = await gw.create(base);
    await gw.submitPublic(p.token, IMG);
    await gw.confirm(p.id, 'Ana');
    await expect(gw.submitPublic(p.token, IMG)).rejects.toMatchObject({ status: 409, code: 'INVALID_STATE' });
  });
});
