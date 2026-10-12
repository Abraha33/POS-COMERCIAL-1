import { uuid } from '@/shared/utils/uuid';

/**
 * Dominio de POS-F03 (turnos), POS-F12 (autorizaciones) y POS-F13 (offline).
 * SIMULADO en el cliente: ninguno de estos registros existe en el contrato del backend todavía.
 * Distingue sesión de usuario, caja física, terminal y turno (el `ShiftRecord` es el turno).
 */

export type Scope = {
  companyId: string;
  branchId: string;
  registerId: string;
  terminalId: string;
};

export const scopeKey = (s: Scope): string => `${s.companyId}.${s.branchId}.${s.registerId}`;

// ---------- F03: turnos ----------
export type ShiftStatus = 'activo' | 'pausado' | 'finalizando' | 'cerrado';

export type IncidentKind =
  | 'error-operativo' | 'problema-caja' | 'dispositivo' | 'pago-pendiente'
  | 'transferencia-por-verificar' | 'resultado-incierto' | 'conexion' | 'relevo-incompleto';

export type Incident = {
  id: string;
  at: string;
  kind: IncidentKind;
  detail: string;
  reporterId: string;
  status: 'abierta' | 'resuelta';
  resolvedAt: string | null;
};

/** Entrega de custodia: nunca cambia el responsable sin dejar esta huella. */
export type CustodyEntry = {
  id: string;
  at: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
  note: string;
  authorizationId: string | null;
};

export type ShiftRecord = {
  id: string;
  scope: Scope;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  /** Referencia al POS-F02 que lo originó (apertura confirmada). */
  openingRef: string;
  status: ShiftStatus;
  custody: CustodyEntry[];
  incidents: Incident[];
  /** Identificadores estables de operaciones vinculadas al turno (cola, autorizaciones). */
  operationIds: string[];
  /** Solicitud de finalización: el cierre lo hace POS-F10, no este módulo. */
  finishRequestedAt: string | null;
};

// ---------- F12: autorizaciones ----------
export type AuthType =
  | 'descuento' | 'precio' | 'devolucion' | 'anulacion' | 'dif-apertura' | 'dif-cierre'
  | 'relevo' | 'movimiento-efectivo' | 'otra';

export type AuthStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'vencida' | 'cancelada' | 'ejecutada';

export type AuthRequest = {
  id: string;
  type: AuthType;
  status: AuthStatus;
  scope: Scope;
  requesterId: string;
  requesterName: string;
  /** Recurso vinculado por identificador estable, no por nombre visible. */
  resource: { kind: string; id: string };
  amount: number;
  previous: Record<string, string | number>;
  proposed: Record<string, string | number>;
  reason: string;
  createdAt: string;
  expiresAt: string;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string;
  /** Tras aprobar: hasta cuándo puede ejecutarse. */
  validUntil: string | null;
  executedAt: string | null;
  /** Huella de lo autorizado: si cambian los datos esenciales, la aprobación deja de valer. */
  fingerprint: string;
  audit: { at: string; actorId: string; event: string; detail: string }[];
  /** Id de la misma solicitud en el servidor (capa 5); ausente hasta que se publica. */
  serverId?: string;
};

// ---------- F13: offline ----------
export type OperationKind =
  | 'buscar-catalogo' | 'preparar-carrito' | 'suspender-carrito' | 'venta-efectivo' | 'verificar-transferencia'
  | 'cobro-tarjeta' | 'credito-nuevo' | 'documento-fiscal' | 'movimiento-efectivo' | 'autorizacion' | 'apertura-relevo';

export type QueueStatus =
  | 'pendiente' | 'enviando' | 'confirmada' | 'reintentable' | 'rechazada' | 'revision' | 'incierto';

export type QueuedOperation = {
  id: string;
  idempotencyKey: string;
  kind: OperationKind;
  scope: Scope;
  shiftId: string;
  cashierId: string;
  /** Sin credenciales, PIN ni datos de tarjeta. */
  payload: Record<string, string | number>;
  createdAt: string;
  lastAttemptAt: string | null;
  attempts: number;
  status: QueueStatus;
  lastError: string | null;
  remoteRef: string | null;
  dependsOn: string[];
  version: number;
};

export type ConnectivityState =
  | 'sincronizado' | 'pendientes' | 'sin-conexion' | 'reconectando' | 'sincronizando' | 'con-errores' | 'incierto';

export type Result<T, E extends string = string> = { ok: true; value: T } | { ok: false; error: E; message: string };
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const fail = <E extends string>(error: E, message: string): Result<never, E> => ({ ok: false, error, message });

/** Id estable y único: UUID cuando existe, contador + tiempo en el resto de entornos. */
export const newId = (prefix: string): string => {
  return `${prefix}-${uuid()}`;
};
