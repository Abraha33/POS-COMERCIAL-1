import { describe, expect, it } from 'vitest';
import {
  APPROVAL_TTL_MS, REQUEST_TTL_MS, approve, cancel, createRequest, execute, expireIfNeeded, fingerprintOf, reject,
  summarize, type Approver, type NewRequest,
} from '@/features/pos-ops/authorization';
import type { AuthRequest } from '@/features/pos-ops/types';

const scope = { companyId: 'co-001', branchId: 'br-001', registerId: 'reg-001', terminalId: 'ter-001' };
const t0 = new Date('2026-10-11T13:00:00Z');
const after = (ms: number) => new Date(t0.getTime() + ms);
const admin: Approver = { id: 'emp-003', name: 'María', canApprove: true };
const cashierAsApprover: Approver = { id: 'emp-001', name: 'Laura', canApprove: false };

const input: NewRequest = {
  type: 'descuento', scope, requesterId: 'emp-001', requesterName: 'Laura',
  resource: { kind: 'carrito', id: 'cart-7' }, amount: 120000,
  previous: { descuento: 0 }, proposed: { descuento: 12 }, reason: 'Cliente frecuente',
};
const make = (): AuthRequest => {
  const r = createRequest(input, t0);
  if (!r.ok) throw new Error(r.message);
  return r.value;
};
const same = { type: input.type, resource: input.resource, amount: input.amount, proposed: input.proposed };

describe('POS-F12 · autorizaciones', () => {
  it('crea la solicitud con contexto y sin ejecutar nada; exige motivo', () => {
    const r = make();
    expect(r).toMatchObject({ status: 'pendiente', requesterId: 'emp-001', amount: 120000, executedAt: null });
    expect(r.audit[0]).toMatchObject({ event: 'solicitada' });
    expect(createRequest({ ...input, reason: '  ' }, t0)).toMatchObject({ ok: false, error: 'MOTIVO_REQUERIDO' });
    expect(createRequest({ ...input, amount: -1 }, t0)).toMatchObject({ ok: false, error: 'IMPORTE_INVALIDO' });
  });

  it('aprobar y luego ejecutar son pasos separados', () => {
    const a = approve(make(), admin, 'Ok', t0);
    if (!a.ok) throw new Error(a.message);
    expect(a.value).toMatchObject({ status: 'aprobada', decidedById: 'emp-003', executedAt: null });
    const e = execute(a.value, 'emp-001', same, after(1000));
    if (!e.ok) throw new Error(e.message);
    expect(e.value.status).toBe('ejecutada');
    expect(e.value.audit.map((x) => x.event)).toEqual(['solicitada', 'aprobada', 'ejecutada']);
  });

  it('rechazar exige motivo y no permite ejecutar', () => {
    expect(reject(make(), admin, '', t0)).toMatchObject({ ok: false, error: 'MOTIVO_REQUERIDO' });
    const r = reject(make(), admin, 'Excede política', t0);
    if (!r.ok) throw new Error();
    expect(r.value.status).toBe('rechazada');
    expect(execute(r.value, 'emp-001', same, t0)).toMatchObject({ ok: false, error: 'ESTADO_INVALIDO' });
  });

  it('cancelar: solo quien solicitó y solo si está pendiente', () => {
    const r = make();
    expect(cancel(r, 'emp-009', t0)).toMatchObject({ ok: false, error: 'NO_ES_SOLICITANTE' });
    const c = cancel(r, 'emp-001', t0);
    if (!c.ok) throw new Error();
    expect(c.value.status).toBe('cancelada');
    expect(cancel(c.value, 'emp-001', t0)).toMatchObject({ ok: false, error: 'ESTADO_INVALIDO' });
  });

  it('vence sin decisión y no se puede decidir después', () => {
    const r = make();
    const late = after(REQUEST_TTL_MS + 1);
    expect(expireIfNeeded(r, late).status).toBe('vencida');
    expect(approve(r, admin, '', late)).toMatchObject({ ok: false, error: 'VENCIDA' });
  });

  it('una aprobación no ejecutada a tiempo vence', () => {
    const a = approve(make(), admin, '', t0);
    if (!a.ok) throw new Error();
    expect(execute(a.value, 'emp-001', same, after(APPROVAL_TTL_MS + 1))).toMatchObject({ ok: false, error: 'VENCIDA' });
  });

  it('no se reutiliza: la segunda ejecución falla', () => {
    const a = approve(make(), admin, '', t0);
    if (!a.ok) throw new Error();
    const e = execute(a.value, 'emp-001', same, after(1000));
    if (!e.ok) throw new Error();
    expect(execute(e.value, 'emp-001', same, after(2000))).toMatchObject({ ok: false, error: 'YA_EJECUTADA' });
  });

  it('se invalida si cambia el importe, el recurso o lo propuesto', () => {
    const a = approve(make(), admin, '', t0);
    if (!a.ok) throw new Error();
    expect(execute(a.value, 'emp-001', { ...same, amount: 130000 }, t0)).toMatchObject({ ok: false, error: 'DATOS_CAMBIARON' });
    expect(execute(a.value, 'emp-001', { ...same, proposed: { descuento: 20 } }, t0)).toMatchObject({ ok: false, error: 'DATOS_CAMBIARON' });
    expect(execute(a.value, 'emp-001', { ...same, resource: { kind: 'carrito', id: 'cart-8' } }, t0)).toMatchObject({ ok: false, error: 'DATOS_CAMBIARON' });
    expect(fingerprintOf({ ...same, proposed: { b: 1, a: 2 } })).toBe(fingerprintOf({ ...same, proposed: { a: 2, b: 1 } }));
  });

  it('no concede permisos: un usuario sin permiso no decide y nadie se autoaprueba', () => {
    expect(approve(make(), cashierAsApprover, '', t0)).toMatchObject({ ok: false, error: 'SIN_PERMISO' });
    expect(approve(make(), { id: 'emp-001', name: 'Laura', canApprove: true }, '', t0)).toMatchObject({ ok: false, error: 'AUTOAPROBACION' });
  });

  it('solo el solicitante ejecuta su autorización', () => {
    const a = approve(make(), admin, '', t0);
    if (!a.ok) throw new Error();
    expect(execute(a.value, 'emp-002', same, t0)).toMatchObject({ ok: false, error: 'NO_ES_SOLICITANTE' });
  });

  it('no guarda PIN ni credenciales en la solicitud', () => {
    expect(JSON.stringify(make())).not.toMatch(/pin|password|secret/i);
  });

  it('resumen para el supervisor: pendientes, demoradas y rechazadas, sin ruido', () => {
    const old = make();
    const fresh = { ...make(), id: 'auth-new', createdAt: after(9 * 60_000).toISOString(), expiresAt: after(9 * 60_000 + REQUEST_TTL_MS).toISOString() };
    const rej = reject(make(), admin, 'No', t0);
    if (!rej.ok) throw new Error();
    expect(summarize([old, fresh, rej.value], after(10 * 60_000))).toEqual({ pending: 2, slow: 1, rejected: 1 });
  });
});
