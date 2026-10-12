import { fail, newId, ok, type AuthRequest, type AuthType, type Result, type Scope } from './types';

/**
 * POS-F12: solicitudes de autorización. Funciones puras.
 *
 *   pendiente → aprobada → ejecutada      (aprobar ≠ ejecutar)
 *   pendiente → rechazada | cancelada | vencida
 *   aprobada  → vencida (si pasó la vigencia sin ejecutarse)
 *
 * Reglas de seguridad aplicadas aquí (el backend debe repetirlas, ver docs):
 *  - la aprobación vale solo para la operación autorizada: su huella debe coincidir al ejecutar;
 *  - se ejecuta una sola vez;
 *  - no hay autoaprobación;
 *  - no se guarda PIN ni credencial: el aprobador es la sesión del supervisor, no un código dentro de la solicitud.
 */

export type AuthError =
  | 'ESTADO_INVALIDO' | 'SIN_PERMISO' | 'AUTOAPROBACION' | 'VENCIDA' | 'DATOS_CAMBIARON' | 'YA_EJECUTADA'
  | 'NO_ES_SOLICITANTE' | 'MOTIVO_REQUERIDO' | 'IMPORTE_INVALIDO';

export const authTypeLabels: Record<AuthType, string> = {
  descuento: 'Descuento extraordinario',
  precio: 'Cambio de precio',
  devolucion: 'Devolución excepcional',
  anulacion: 'Anulación o corrección',
  'dif-apertura': 'Diferencia de apertura',
  'dif-cierre': 'Diferencia de cierre',
  relevo: 'Relevo extraordinario',
  'movimiento-efectivo': 'Movimiento de efectivo restringido',
  otra: 'Otra operación',
};

/** Vigencia de la solicitud sin decidir y de la aprobación sin ejecutar. */
export const REQUEST_TTL_MS = 15 * 60_000;
export const APPROVAL_TTL_MS = 5 * 60_000;

/** Huella estable de lo que se autoriza. Si cambia el importe, el recurso o lo propuesto, la aprobación no vale. */
export const fingerprintOf = (input: {
  type: AuthType;
  resource: { kind: string; id: string };
  amount: number;
  proposed: Record<string, string | number>;
}): string => {
  const proposed = Object.keys(input.proposed)
    .sort()
    .map((k) => `${k}=${String(input.proposed[k])}`)
    .join('&');
  return `${input.type}|${input.resource.kind}:${input.resource.id}|${input.amount}|${proposed}`;
};

export type NewRequest = {
  type: AuthType;
  scope: Scope;
  requesterId: string;
  requesterName: string;
  resource: { kind: string; id: string };
  amount: number;
  previous: Record<string, string | number>;
  proposed: Record<string, string | number>;
  reason: string;
};

const audit = (r: AuthRequest, actorId: string, event: string, detail: string, now: Date): AuthRequest['audit'] => [
  ...r.audit,
  { at: now.toISOString(), actorId, event, detail },
];

export const createRequest = (input: NewRequest, now: Date): Result<AuthRequest, AuthError> => {
  if (input.reason.trim() === '') return fail('MOTIVO_REQUERIDO', 'Escribe el motivo de la solicitud.');
  if (!Number.isFinite(input.amount) || input.amount < 0) return fail('IMPORTE_INVALIDO', 'El importe no es válido.');
  const request: AuthRequest = {
    id: newId('auth'),
    type: input.type,
    status: 'pendiente',
    scope: input.scope,
    requesterId: input.requesterId,
    requesterName: input.requesterName,
    resource: input.resource,
    amount: input.amount,
    previous: input.previous,
    proposed: input.proposed,
    reason: input.reason.trim(),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + REQUEST_TTL_MS).toISOString(),
    decidedById: null,
    decidedByName: null,
    decidedAt: null,
    decisionNote: '',
    validUntil: null,
    executedAt: null,
    fingerprint: fingerprintOf(input),
    audit: [],
  };
  return ok({ ...request, audit: audit(request, input.requesterId, 'solicitada', authTypeLabels[input.type], now) });
};

/** Marca como vencidas las que pasaron su plazo. Idempotente. */
export const expireIfNeeded = (r: AuthRequest, now: Date): AuthRequest => {
  const t = now.getTime();
  if (r.status === 'pendiente' && t > Date.parse(r.expiresAt)) {
    return { ...r, status: 'vencida', audit: audit(r, 'sistema', 'vencida', 'Sin decisión a tiempo', now) };
  }
  if (r.status === 'aprobada' && r.validUntil && t > Date.parse(r.validUntil)) {
    return { ...r, status: 'vencida', audit: audit(r, 'sistema', 'vencida', 'Aprobada y no ejecutada a tiempo', now) };
  }
  return r;
};

export type Approver = { id: string; name: string; canApprove: boolean };

const decide = (
  r: AuthRequest,
  approver: Approver,
  decision: 'aprobada' | 'rechazada',
  note: string,
  now: Date,
): Result<AuthRequest, AuthError> => {
  const current = expireIfNeeded(r, now);
  if (current.status === 'vencida') return fail('VENCIDA', 'La solicitud venció sin decisión.');
  if (current.status !== 'pendiente') return fail('ESTADO_INVALIDO', `La solicitud ya está ${current.status}.`);
  if (!approver.canApprove) return fail('SIN_PERMISO', 'Tu rol no puede decidir autorizaciones.');
  if (approver.id === current.requesterId) return fail('AUTOAPROBACION', 'No puedes decidir tu propia solicitud.');
  if (decision === 'rechazada' && note.trim() === '') return fail('MOTIVO_REQUERIDO', 'Escribe el motivo del rechazo.');
  const approved = decision === 'aprobada';
  return ok({
    ...current,
    status: decision,
    decidedById: approver.id,
    decidedByName: approver.name,
    decidedAt: now.toISOString(),
    decisionNote: note.trim(),
    validUntil: approved ? new Date(now.getTime() + APPROVAL_TTL_MS).toISOString() : null,
    audit: audit(current, approver.id, decision, note.trim() || 'Sin observación', now),
  });
};

export const approve = (r: AuthRequest, approver: Approver, note: string, now: Date) => decide(r, approver, 'aprobada', note, now);
export const reject = (r: AuthRequest, approver: Approver, note: string, now: Date) => decide(r, approver, 'rechazada', note, now);

export const cancel = (r: AuthRequest, requesterId: string, now: Date): Result<AuthRequest, AuthError> => {
  if (requesterId !== r.requesterId) return fail('NO_ES_SOLICITANTE', 'Solo quien solicitó puede cancelar.');
  if (r.status !== 'pendiente') return fail('ESTADO_INVALIDO', `No se puede cancelar una solicitud ${r.status}.`);
  return ok({ ...r, status: 'cancelada', audit: audit(r, requesterId, 'cancelada', '', now) });
};

/**
 * Aplica la autorización a UNA operación concreta. Comprueba estado, vigencia y huella; una sola vez.
 * Devuelve la solicitud ejecutada: ejecutar la operación real es responsabilidad de quien llama.
 */
export const execute = (
  r: AuthRequest,
  actorId: string,
  current: { type: AuthType; resource: { kind: string; id: string }; amount: number; proposed: Record<string, string | number> },
  now: Date,
): Result<AuthRequest, AuthError> => {
  if (r.status === 'ejecutada') return fail('YA_EJECUTADA', 'Esta autorización ya se usó y no puede reutilizarse.');
  const live = expireIfNeeded(r, now);
  if (live.status === 'vencida') return fail('VENCIDA', 'La autorización venció.');
  if (live.status !== 'aprobada') return fail('ESTADO_INVALIDO', `La solicitud está ${live.status}, no aprobada.`);
  if (live.requesterId !== actorId) return fail('NO_ES_SOLICITANTE', 'La autorización es de otra persona.');
  if (fingerprintOf(current) !== live.fingerprint) {
    return fail('DATOS_CAMBIARON', 'La operación cambió después de aprobarse: pide una nueva autorización.');
  }
  return ok({ ...live, status: 'ejecutada', executedAt: now.toISOString(), audit: audit(live, actorId, 'ejecutada', '', now) });
};

/** Valor para los contadores del turno y las alertas del supervisor (sin ruido). */
export const summarize = (list: AuthRequest[], now: Date, slowMs = 5 * 60_000) => {
  const live = list.map((r) => expireIfNeeded(r, now));
  const pending = live.filter((r) => r.status === 'pendiente');
  return {
    pending: pending.length,
    slow: pending.filter((r) => now.getTime() - Date.parse(r.createdAt) > slowMs).length,
    rejected: live.filter((r) => r.status === 'rechazada').length,
  };
};
