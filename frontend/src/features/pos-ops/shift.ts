import { fail, newId, ok, type CustodyEntry, type Incident, type IncidentKind, type Result, type Scope, type ShiftRecord } from './types';

/**
 * POS-F03: máquina de estados del turno. Funciones puras: reciben el turno y devuelven el nuevo.
 *
 *   activo ⇄ pausado          (la pausa NO cierra caja, ni borra carritos, ni cambia responsable)
 *   activo | pausado → finalizando   (solicita finalización; el arqueo y cierre son de POS-F10)
 *   finalizando → cerrado     (solo lo hace F10 al cerrar; aquí `markClosed` lo registra)
 */

export type ShiftError =
  | 'ESTADO_INVALIDO' | 'CAJA_OCUPADA' | 'MISMO_CAJERO' | 'CONTEO_REQUERIDO' | 'AUTORIZACION_REQUERIDA'
  | 'REAUTENTICACION_REQUERIDA' | 'NO_ES_RESPONSABLE' | 'INCIDENCIA_NO_ENCONTRADA';

export type HandoverPolicy = {
  /** Si el efectivo debe contarse al relevar. */
  requireCount: boolean;
  /** `transferir`: el mismo turno cambia de custodio. `cerrar-e-iniciar`: cierra uno y abre otro. */
  mode: 'transferir' | 'cerrar-e-iniciar';
};

export const defaultHandoverPolicy: HandoverPolicy = { requireCount: true, mode: 'transferir' };

export const startShift = (
  input: { scope: Scope; cashierId: string; cashierName: string; openingCash: number; openingRef: string },
  existing: ShiftRecord[],
  now: Date,
): Result<ShiftRecord, ShiftError> => {
  const open = existing.find(
    (s) => s.scope.registerId === input.scope.registerId && s.status !== 'cerrado',
  );
  if (open) {
    return fail('CAJA_OCUPADA', `La caja ya tiene un turno ${open.status} a nombre de ${open.cashierName}.`);
  }
  return ok({
    id: newId('shift'),
    scope: input.scope,
    cashierId: input.cashierId,
    cashierName: input.cashierName,
    openedAt: now.toISOString(),
    closedAt: null,
    openingCash: input.openingCash,
    openingRef: input.openingRef,
    status: 'activo',
    custody: [],
    incidents: [],
    operationIds: [],
    finishRequestedAt: null,
  });
};

/** Turno propio activo o pausado de esta persona en esta caja (recuperación tras recargar). */
export const recoverOwnShift = (shifts: ShiftRecord[], registerId: string, cashierId: string): ShiftRecord | null =>
  shifts.find((s) => s.scope.registerId === registerId && s.cashierId === cashierId && s.status !== 'cerrado') ?? null;

export const pause = (s: ShiftRecord): Result<ShiftRecord, ShiftError> =>
  s.status === 'activo'
    ? ok({ ...s, status: 'pausado' })
    : fail('ESTADO_INVALIDO', 'Solo se puede pausar un turno activo.');

/** Reanudar exige reautenticar a quien tiene la custodia. */
export const resume = (s: ShiftRecord, reauthenticatedId: string | null): Result<ShiftRecord, ShiftError> => {
  if (s.status !== 'pausado') return fail('ESTADO_INVALIDO', 'El turno no está pausado.');
  if (reauthenticatedId !== s.cashierId) {
    return fail('REAUTENTICACION_REQUERIDA', 'Solo quien tiene la caja puede reanudar, tras identificarse.');
  }
  return ok({ ...s, status: 'activo' });
};

export type HandoverInput = {
  fromId: string;
  toId: string;
  toName: string;
  /** Efectivo esperado en caja según el sistema. */
  expectedCash: number;
  countedCash: number | null;
  note: string;
  /** Id de una autorización aprobada y vigente cuando hay diferencia. */
  authorizationId: string | null;
};

export type HandoverOutcome = { closed: ShiftRecord | null; current: ShiftRecord; entry: CustodyEntry };

export const handover = (
  s: ShiftRecord,
  input: HandoverInput,
  policy: HandoverPolicy,
  now: Date,
): Result<HandoverOutcome, ShiftError> => {
  if (s.status !== 'activo') return fail('ESTADO_INVALIDO', 'Solo se puede relevar un turno activo.');
  if (input.fromId !== s.cashierId) return fail('NO_ES_RESPONSABLE', 'Quien entrega no es el responsable del turno.');
  if (input.toId === input.fromId) return fail('MISMO_CAJERO', 'Quien recibe debe ser otra persona.');
  if (policy.requireCount && input.countedCash === null) {
    return fail('CONTEO_REQUERIDO', 'La política exige contar el efectivo antes del relevo.');
  }
  const difference = input.countedCash === null ? null : input.countedCash - input.expectedCash;
  if (difference !== null && difference !== 0) {
    if (input.note.trim() === '') return fail('AUTORIZACION_REQUERIDA', 'Hay diferencia: escribe el motivo.');
    if (!input.authorizationId) return fail('AUTORIZACION_REQUERIDA', 'Hay diferencia: se necesita autorización de un supervisor.');
  }
  const entry: CustodyEntry = {
    id: newId('cus'),
    at: now.toISOString(),
    fromId: s.cashierId,
    fromName: s.cashierName,
    toId: input.toId,
    toName: input.toName,
    expectedCash: input.expectedCash,
    countedCash: input.countedCash,
    difference,
    note: input.note.trim(),
    authorizationId: input.authorizationId,
  };
  if (policy.mode === 'cerrar-e-iniciar') {
    const closed: ShiftRecord = { ...s, status: 'cerrado', closedAt: now.toISOString(), custody: [...s.custody, entry] };
    const opened: ShiftRecord = {
      ...s,
      id: newId('shift'),
      cashierId: input.toId,
      cashierName: input.toName,
      openedAt: now.toISOString(),
      closedAt: null,
      openingCash: input.countedCash ?? input.expectedCash,
      openingRef: `relevo:${s.id}`,
      status: 'activo',
      custody: [],
      incidents: s.incidents.filter((i) => i.status === 'abierta'),
      finishRequestedAt: null,
    };
    return ok({ closed, current: opened, entry });
  }
  const next: ShiftRecord = { ...s, cashierId: input.toId, cashierName: input.toName, custody: [...s.custody, entry] };
  return ok({ closed: null, current: next, entry });
};

export const addIncident = (
  s: ShiftRecord,
  input: { kind: IncidentKind; detail: string; reporterId: string },
  now: Date,
): Result<ShiftRecord, ShiftError> => {
  if (s.status === 'cerrado') return fail('ESTADO_INVALIDO', 'El turno ya está cerrado.');
  const incident: Incident = {
    id: newId('inc'),
    at: now.toISOString(),
    kind: input.kind,
    detail: input.detail.trim(),
    reporterId: input.reporterId,
    status: 'abierta',
    resolvedAt: null,
  };
  return ok({ ...s, incidents: [...s.incidents, incident] });
};

export const resolveIncident = (s: ShiftRecord, id: string, now: Date): Result<ShiftRecord, ShiftError> => {
  if (!s.incidents.some((i) => i.id === id)) return fail('INCIDENCIA_NO_ENCONTRADA', 'La incidencia no existe.');
  return ok({
    ...s,
    incidents: s.incidents.map((i) => (i.id === id ? { ...i, status: 'resuelta', resolvedAt: now.toISOString() } : i)),
  });
};

export type FinishReview = {
  /** Impiden pasar a F10 sin una decisión. */
  blockers: string[];
  /** Se conservan para conciliar; no desaparecen al cerrar. */
  warnings: string[];
};

/** Qué hay abierto antes de pasar al arqueo y cierre. Una operación pendiente no desaparece. */
export const reviewFinish = (
  s: ShiftRecord,
  ctx: { heldCarts: number; pendingOperations: number; uncertainOperations: number; pendingAuthorizations: number },
): FinishReview => {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (s.status === 'cerrado') blockers.push('El turno ya está cerrado.');
  if (ctx.uncertainOperations > 0) blockers.push(`${ctx.uncertainOperations} operación(es) con resultado incierto: resuélvelas antes de cerrar.`);
  if (ctx.pendingAuthorizations > 0) blockers.push(`${ctx.pendingAuthorizations} autorización(es) pendiente(s) de decisión.`);
  const open = s.incidents.filter((i) => i.status === 'abierta').length;
  if (open > 0) warnings.push(`${open} incidencia(s) abierta(s) quedan registradas para conciliación.`);
  if (ctx.heldCarts > 0) warnings.push(`${ctx.heldCarts} venta(s) suspendida(s) se conservan en esta caja.`);
  if (ctx.pendingOperations > 0) warnings.push(`${ctx.pendingOperations} operación(es) sin sincronizar se conservan para conciliación.`);
  return { blockers, warnings };
};

export const requestFinish = (s: ShiftRecord, review: FinishReview, now: Date): Result<ShiftRecord, ShiftError> => {
  if (s.status !== 'activo' && s.status !== 'pausado') return fail('ESTADO_INVALIDO', 'El turno no se puede finalizar en su estado actual.');
  if (review.blockers.length > 0) return fail('ESTADO_INVALIDO', review.blockers.join(' '));
  return ok({ ...s, status: 'finalizando', finishRequestedAt: now.toISOString() });
};

/** Lo invoca el flujo de arqueo y cierre (POS-F10) cuando cierra la caja. */
export const markClosed = (s: ShiftRecord, now: Date): Result<ShiftRecord, ShiftError> =>
  s.status === 'finalizando'
    ? ok({ ...s, status: 'cerrado', closedAt: now.toISOString() })
    : fail('ESTADO_INVALIDO', 'Solo se cierra un turno que pasó por la finalización.');

/** ¿Debe bloquearse la pantalla por inactividad? */
export const shouldLockForInactivity = (lastActivity: number, now: number, limitMs: number): boolean =>
  limitMs > 0 && now - lastActivity >= limitMs;
