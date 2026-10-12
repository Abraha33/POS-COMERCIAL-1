import { describe, expect, it } from 'vitest';
import {
  addIncident, defaultHandoverPolicy, handover, markClosed, pause, recoverOwnShift, requestFinish, resolveIncident,
  resume, reviewFinish, shouldLockForInactivity, startShift,
} from '@/features/pos-ops/shift';
import type { Scope, ShiftRecord } from '@/features/pos-ops/types';

const scope: Scope = { companyId: 'co-001', branchId: 'br-001', registerId: 'reg-001', terminalId: 'ter-001' };
const t0 = new Date('2026-10-11T13:00:00Z');
const t1 = new Date('2026-10-11T15:00:00Z');

const open = (): ShiftRecord => {
  const r = startShift({ scope, cashierId: 'emp-001', cashierName: 'Laura', openingCash: 200000, openingRef: 'open-1' }, [], t0);
  if (!r.ok) throw new Error('no abrió');
  return r.value;
};

describe('POS-F03 · turnos', () => {
  it('inicia un turno válido con referencia a la apertura y base', () => {
    const s = open();
    expect(s).toMatchObject({ status: 'activo', openingCash: 200000, openingRef: 'open-1', cashierId: 'emp-001' });
  });

  it('rechaza un segundo turno sobre la misma caja', () => {
    const r = startShift({ scope, cashierId: 'emp-002', cashierName: 'Andrés', openingCash: 0, openingRef: 'x' }, [open()], t0);
    expect(r).toMatchObject({ ok: false, error: 'CAJA_OCUPADA' });
  });

  it('recupera el turno propio y no el de otra persona ni uno cerrado', () => {
    const s = open();
    expect(recoverOwnShift([s], 'reg-001', 'emp-001')?.id).toBe(s.id);
    expect(recoverOwnShift([s], 'reg-001', 'emp-002')).toBeNull();
    expect(recoverOwnShift([{ ...s, status: 'cerrado' }], 'reg-001', 'emp-001')).toBeNull();
  });

  it('pausar conserva turno y responsable; reanudar exige reautenticar al responsable', () => {
    const s = open();
    const paused = pause(s);
    if (!paused.ok) throw new Error();
    expect(paused.value).toMatchObject({ status: 'pausado', cashierId: 'emp-001', openingCash: 200000 });
    expect(resume(paused.value, null)).toMatchObject({ ok: false, error: 'REAUTENTICACION_REQUERIDA' });
    expect(resume(paused.value, 'emp-002')).toMatchObject({ ok: false, error: 'REAUTENTICACION_REQUERIDA' });
    expect(resume(paused.value, 'emp-001')).toMatchObject({ ok: true });
    expect(pause(paused.value)).toMatchObject({ ok: false, error: 'ESTADO_INVALIDO' });
  });

  it('bloquea por inactividad solo pasado el límite configurado', () => {
    expect(shouldLockForInactivity(1000, 1000 + 299_999, 300_000)).toBe(false);
    expect(shouldLockForInactivity(1000, 1000 + 300_000, 300_000)).toBe(true);
    expect(shouldLockForInactivity(0, 9_999_999, 0)).toBe(false);
  });

  it('relevo con conteo exacto: transfiere custodia y deja huella', () => {
    const r = handover(open(), { fromId: 'emp-001', toId: 'emp-002', toName: 'Andrés', expectedCash: 250000, countedCash: 250000, note: '', authorizationId: null }, defaultHandoverPolicy, t1);
    if (!r.ok) throw new Error(r.message);
    expect(r.value.current).toMatchObject({ cashierId: 'emp-002', status: 'activo' });
    expect(r.value.current.custody).toHaveLength(1);
    expect(r.value.entry).toMatchObject({ fromId: 'emp-001', toId: 'emp-002', difference: 0 });
  });

  it('relevo: exige conteo, otra persona y ser el responsable', () => {
    const s = open();
    const base = { fromId: 'emp-001', toId: 'emp-002', toName: 'A', expectedCash: 1, countedCash: 1, note: '', authorizationId: null };
    expect(handover(s, { ...base, countedCash: null }, defaultHandoverPolicy, t1)).toMatchObject({ ok: false, error: 'CONTEO_REQUERIDO' });
    expect(handover(s, { ...base, toId: 'emp-001' }, defaultHandoverPolicy, t1)).toMatchObject({ ok: false, error: 'MISMO_CAJERO' });
    expect(handover(s, { ...base, fromId: 'emp-009' }, defaultHandoverPolicy, t1)).toMatchObject({ ok: false, error: 'NO_ES_RESPONSABLE' });
    expect(handover(s, { ...base, countedCash: null }, { ...defaultHandoverPolicy, requireCount: false }, t1)).toMatchObject({ ok: true });
  });

  it('relevo con diferencia: pide motivo y autorización; sin ellas se rechaza', () => {
    const s = open();
    const base = { fromId: 'emp-001', toId: 'emp-002', toName: 'A', expectedCash: 250000, countedCash: 240000, note: '', authorizationId: null };
    expect(handover(s, base, defaultHandoverPolicy, t1)).toMatchObject({ ok: false, error: 'AUTORIZACION_REQUERIDA' });
    expect(handover(s, { ...base, note: 'Faltó sencillo' }, defaultHandoverPolicy, t1)).toMatchObject({ ok: false, error: 'AUTORIZACION_REQUERIDA' });
    const ok = handover(s, { ...base, note: 'Faltó sencillo', authorizationId: 'auth-1' }, defaultHandoverPolicy, t1);
    expect(ok).toMatchObject({ ok: true });
    if (ok.ok) expect(ok.value.entry).toMatchObject({ difference: -10000, authorizationId: 'auth-1' });
  });

  it('modo cerrar-e-iniciar: cierra el turno anterior y abre otro con incidencias abiertas', () => {
    let s = open();
    const inc = addIncident(s, { kind: 'dispositivo', detail: 'Lector desconectado', reporterId: 'emp-001' }, t0);
    if (!inc.ok) throw new Error();
    s = inc.value;
    const r = handover(s, { fromId: 'emp-001', toId: 'emp-002', toName: 'A', expectedCash: 5, countedCash: 5, note: '', authorizationId: null }, { requireCount: true, mode: 'cerrar-e-iniciar' }, t1);
    if (!r.ok) throw new Error(r.message);
    expect(r.value.closed).toMatchObject({ status: 'cerrado', id: s.id });
    expect(r.value.current.id).not.toBe(s.id);
    expect(r.value.current.incidents).toHaveLength(1);
  });

  it('incidencias: se registran, se resuelven y quedan trazadas', () => {
    const a = addIncident(open(), { kind: 'resultado-incierto', detail: ' Pago sin respuesta ', reporterId: 'emp-001' }, t0);
    if (!a.ok) throw new Error();
    const id = a.value.incidents[0]!.id;
    expect(a.value.incidents[0]).toMatchObject({ status: 'abierta', detail: 'Pago sin respuesta' });
    const b = resolveIncident(a.value, id, t1);
    expect(b).toMatchObject({ ok: true });
    expect(resolveIncident(a.value, 'nope', t1)).toMatchObject({ ok: false, error: 'INCIDENCIA_NO_ENCONTRADA' });
  });

  it('finalizar: lo pendiente no desaparece; lo incierto impide pasar a F10', () => {
    const s = open();
    const blocked = reviewFinish(s, { heldCarts: 2, pendingOperations: 3, uncertainOperations: 1, pendingAuthorizations: 0 });
    expect(blocked.blockers.join(' ')).toMatch(/incierto/);
    expect(requestFinish(s, blocked, t1)).toMatchObject({ ok: false });
    const clean = reviewFinish(s, { heldCarts: 2, pendingOperations: 3, uncertainOperations: 0, pendingAuthorizations: 0 });
    expect(clean.warnings.join(' ')).toMatch(/suspendida/);
    expect(clean.warnings.join(' ')).toMatch(/sin sincronizar/);
    const fin = requestFinish(s, clean, t1);
    if (!fin.ok) throw new Error();
    expect(fin.value).toMatchObject({ status: 'finalizando', cashierId: 'emp-001' });
    expect(markClosed(s, t1)).toMatchObject({ ok: false });
    expect(markClosed(fin.value, t1)).toMatchObject({ ok: true });
  });
});
