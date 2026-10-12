import { newId, type ConnectivityState, type OperationKind, type QueuedOperation, type Scope } from './types';

/**
 * POS-F13: política de operaciones sin conexión, cola persistente y motor de sincronización.
 * Principio: tener almacenamiento local NO habilita una operación. Cada una se decide en la matriz.
 */

// ---------- Política ----------
export type OfflineMode = 'permitir' | 'condicionado' | 'bloquear';

export type PolicyContext = {
  /** Hay un turno propio activo y reconocido localmente. */
  shiftValid: boolean;
  /** El negocio habilitó vender en efectivo sin conexión (configuración, apagada por defecto). */
  offlineCashSalesEnabled: boolean;
  /** El tratamiento fiscal offline fue validado contra los requisitos y la integración real. */
  fiscalOfflineValidated: boolean;
};

export const defaultPolicyContext: PolicyContext = {
  shiftValid: false,
  offlineCashSalesEnabled: false,
  fiscalOfflineValidated: false,
};

type Rule = { mode: OfflineMode; label: string; why: string; check?: (ctx: PolicyContext) => string | null };

export const offlineMatrix: Record<OperationKind, Rule> = {
  'buscar-catalogo': { mode: 'permitir', label: 'Buscar productos precargados', why: 'Usa el catálogo ya descargado.' },
  'preparar-carrito': { mode: 'permitir', label: 'Preparar carrito', why: 'Es local hasta cobrar.' },
  'suspender-carrito': { mode: 'permitir', label: 'Suspender carrito', why: 'Se guarda en este dispositivo.' },
  'venta-efectivo': {
    mode: 'condicionado',
    label: 'Venta en efectivo',
    why: 'Exige turno válido, política offline habilitada y fiscal validado.',
    check: (c) =>
      !c.shiftValid ? 'No hay un turno válido en este dispositivo.'
      : !c.offlineCashSalesEnabled ? 'La venta offline en efectivo no está habilitada para esta caja.'
      : !c.fiscalOfflineValidated ? 'El tratamiento fiscal offline no está validado.'
      : null,
  },
  'verificar-transferencia': { mode: 'bloquear', label: 'Verificar transferencia', why: 'No se puede confirmar sin el banco.' },
  'cobro-tarjeta': { mode: 'bloquear', label: 'Cobrar con tarjeta', why: 'Requiere la confirmación del procesador.' },
  'credito-nuevo': { mode: 'bloquear', label: 'Autorizar nuevo crédito', why: 'No hay autorización verificable.' },
  'documento-fiscal': { mode: 'bloquear', label: 'Emitir documento fiscal', why: 'No se marca aceptado sin confirmación.' },
  'movimiento-efectivo': {
    mode: 'condicionado',
    label: 'Movimiento de efectivo',
    why: 'Solo con turno válido; queda pendiente de sincronizar.',
    check: (c) => (c.shiftValid ? null : 'No hay un turno válido en este dispositivo.'),
  },
  autorizacion: { mode: 'bloquear', label: 'Autorizar operación restringida', why: 'No hay mecanismo seguro habilitado sin conexión.' },
  'apertura-relevo': { mode: 'bloquear', label: 'Abrir o relevar caja', why: 'No hay control de custodia verificable.' },
};

export type PolicyDecision = { allowed: boolean; mode: OfflineMode; reason: string };

export const evaluate = (kind: OperationKind, online: boolean, ctx: PolicyContext): PolicyDecision => {
  const rule = offlineMatrix[kind];
  if (online) return { allowed: true, mode: rule.mode, reason: '' };
  if (rule.mode === 'permitir') return { allowed: true, mode: rule.mode, reason: '' };
  if (rule.mode === 'bloquear') return { allowed: false, mode: rule.mode, reason: `${rule.label}: ${rule.why}` };
  const problem = rule.check?.(ctx) ?? null;
  return problem ? { allowed: false, mode: rule.mode, reason: `${rule.label}: ${problem}` } : { allowed: true, mode: rule.mode, reason: '' };
};

// ---------- Cola ----------
export type EnqueueInput = {
  kind: OperationKind;
  scope: Scope;
  shiftId: string;
  cashierId: string;
  payload: Record<string, string | number>;
  /** Clave de idempotencia estable de la operación de negocio (p. ej. clientOperationId de la venta). */
  idempotencyKey?: string;
  dependsOn?: string[];
};

/** Claves que nunca deben persistirse en la cola. */
const FORBIDDEN_KEYS = /pin|password|clave|secret|token|card|tarjeta|cvv|pan/i;

export const sanitizePayload = (payload: Record<string, string | number>): Record<string, string | number> =>
  Object.fromEntries(Object.entries(payload).filter(([k]) => !FORBIDDEN_KEYS.test(k)));

/** Encola sin duplicar: la misma clave de idempotencia devuelve la operación existente. */
export const enqueue = (queue: QueuedOperation[], input: EnqueueInput, now: Date) => {
  const key = input.idempotencyKey ?? newId('idem');
  const existing = queue.find((o) => o.idempotencyKey === key);
  if (existing) return { queue, op: existing, duplicate: true };
  const op: QueuedOperation = {
    id: newId('op'),
    idempotencyKey: key,
    kind: input.kind,
    scope: input.scope,
    shiftId: input.shiftId,
    cashierId: input.cashierId,
    payload: sanitizePayload(input.payload),
    createdAt: now.toISOString(),
    lastAttemptAt: null,
    attempts: 0,
    status: 'pendiente',
    lastError: null,
    remoteRef: null,
    dependsOn: input.dependsOn ?? [],
    version: 1,
  };
  return { queue: [...queue, op], op, duplicate: false };
};

// ---------- Sincronización ----------
export type SendResult =
  | { kind: 'ok'; remoteRef: string }
  | { kind: 'rejected'; code: string; message: string }
  | { kind: 'conflict'; code: string; message: string }
  | { kind: 'network' }
  /** El servidor pudo aplicarla, pero la respuesta no llegó: NO se reenvía a ciegas. */
  | { kind: 'lost' };

export type LookupResult = { kind: 'applied'; remoteRef: string } | { kind: 'not-applied' } | { kind: 'unavailable' };

export type Transport = {
  send: (op: QueuedOperation) => Promise<SendResult>;
  /** Consulta por clave de idempotencia si el servidor ya la aplicó. */
  lookup: (idempotencyKey: string) => Promise<LookupResult>;
};

export const MAX_ATTEMPTS = 5;

const patch = (op: QueuedOperation, changes: Partial<QueuedOperation>, now: Date): QueuedOperation => ({
  ...op,
  ...changes,
  lastAttemptAt: now.toISOString(),
  version: op.version + 1,
});

/**
 * Recupera lo que quedó "enviando" tras una recarga o cierre: su resultado es incierto, no se reenvía a ciegas.
 */
export const recoverInterrupted = (queue: QueuedOperation[]): QueuedOperation[] =>
  queue.map((o) => (o.status === 'enviando' ? { ...o, status: 'incierto', lastError: 'Se interrumpió mientras se enviaba.', version: o.version + 1 } : o));

const resolveUncertain = async (op: QueuedOperation, transport: Transport, now: Date): Promise<QueuedOperation> => {
  const found = await transport.lookup(op.idempotencyKey);
  if (found.kind === 'applied') return patch(op, { status: 'confirmada', remoteRef: found.remoteRef, lastError: null }, now);
  if (found.kind === 'not-applied') return patch(op, { status: 'reintentable', lastError: 'El servidor no la aplicó; se puede reenviar con la misma clave.' }, now);
  return patch(op, { status: 'incierto', lastError: 'No se pudo consultar el resultado remoto.' }, now);
};

/**
 * Un ciclo de sincronización en orden de creación y respetando dependencias.
 * Nunca crea operaciones nuevas ni modifica dinero: solo cambia el estado de la cola.
 */
export const syncQueue = async (
  input: QueuedOperation[],
  transport: Transport,
  now: Date,
): Promise<QueuedOperation[]> => {
  let queue = recoverInterrupted(input);
  const byId = (id: string) => queue.find((o) => o.id === id);
  const replace = (next: QueuedOperation) => {
    queue = queue.map((o) => (o.id === next.id ? next : o));
  };
  const ordered = [...queue].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const original of ordered) {
    let op = byId(original.id)!;
    if (op.status === 'confirmada' || op.status === 'rechazada' || op.status === 'revision') continue;

    const blocking = op.dependsOn.map(byId).filter((d) => d && d.status !== 'confirmada');
    if (blocking.length > 0) {
      const dead = blocking.some((d) => d!.status === 'rechazada' || d!.status === 'revision');
      if (dead) replace(patch(op, { status: 'revision', lastError: 'Depende de una operación que no se confirmó.' }, now));
      continue;
    }

    if (op.status === 'incierto') {
      op = await resolveUncertain(op, transport, now);
      replace(op);
      if (op.status !== 'reintentable') continue;
    }

    if (op.attempts >= MAX_ATTEMPTS) {
      replace(patch(op, { status: 'revision', lastError: 'Se agotaron los reintentos: requiere revisión.' }, now));
      continue;
    }

    replace(patch(op, { status: 'enviando', attempts: op.attempts + 1 }, now));
    const sent = byId(op.id)!;
    const result = await transport.send(sent);
    if (result.kind === 'ok') replace(patch(sent, { status: 'confirmada', remoteRef: result.remoteRef, lastError: null }, now));
    else if (result.kind === 'rejected') replace(patch(sent, { status: 'rechazada', lastError: `${result.code}: ${result.message}` }, now));
    else if (result.kind === 'conflict') replace(patch(sent, { status: 'revision', lastError: `${result.code}: ${result.message}` }, now));
    else if (result.kind === 'network') replace(patch(sent, { status: 'reintentable', lastError: 'Sin respuesta del servidor.' }, now));
    else replace(patch(sent, { status: 'incierto', lastError: 'Se envió pero no llegó la respuesta.' }, now));
  }
  return queue;
};

/** Reintento manual permitido solo en estados donde reenviar con la misma clave es seguro. */
export const canRetry = (op: QueuedOperation): boolean => op.status === 'reintentable' || op.status === 'incierto';

export const requestReview = (op: QueuedOperation, now: Date): QueuedOperation =>
  op.status === 'rechazada' || op.status === 'reintentable' || op.status === 'incierto'
    ? patch(op, { status: 'revision', lastError: op.lastError ?? 'Revisión solicitada.' }, now)
    : op;

/** Estado visible de conectividad: no es solo `navigator.onLine`. */
export const connectivityOf = (input: {
  browserOnline: boolean;
  backendReachable: boolean | null;
  syncing: boolean;
  reconnecting: boolean;
  queue: QueuedOperation[];
}): ConnectivityState => {
  const { queue } = input;
  if (!input.browserOnline || input.backendReachable === false) return 'sin-conexion';
  if (input.reconnecting) return 'reconectando';
  if (input.syncing) return 'sincronizando';
  if (queue.some((o) => o.status === 'incierto')) return 'incierto';
  if (queue.some((o) => o.status === 'rechazada' || o.status === 'revision')) return 'con-errores';
  if (queue.some((o) => o.status === 'pendiente' || o.status === 'reintentable' || o.status === 'enviando')) return 'pendientes';
  return input.backendReachable === null ? 'sincronizado' : 'sincronizado';
};

export const pendingCount = (queue: QueuedOperation[]): number =>
  queue.filter((o) => o.status !== 'confirmada' && o.status !== 'rechazada').length;
