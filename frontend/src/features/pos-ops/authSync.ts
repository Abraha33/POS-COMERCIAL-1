import type { ApprovalAction, ApprovalTicket, ApprovalTicketCreate, ApprovalTicketStatus } from '@/shared/contracts';
import type { PosApprovalsApi } from '@/shared/api/approvals';
import type { AuthRequest, AuthStatus, AuthType, Scope } from './types';

/**
 * ADAPTER TEMPORAL (ver docs/architecture/DECISIONES_CONTRATOS.md §2): la interfaz de pos-ops conserva su vocabulario
 * en español; el contrato usa el vocabulario único de máquina. Este es el único lugar que traduce entre ambos.
 */
const ACTION_OF_TYPE: Record<AuthType, ApprovalAction> = {
  descuento: 'discount', precio: 'price_override', devolucion: 'return', anulacion: 'void_sale',
  'dif-apertura': 'cash_difference_opening', 'dif-cierre': 'cash_difference_closing', relevo: 'shift_handover',
  'movimiento-efectivo': 'cash_movement', otra: 'other',
};
const TYPE_OF_ACTION: Partial<Record<ApprovalAction, AuthType>> = {
  discount: 'descuento', price_override: 'precio', return: 'devolucion', void_sale: 'anulacion',
  cash_difference_opening: 'dif-apertura', cash_difference_closing: 'dif-cierre', shift_handover: 'relevo',
  cash_movement: 'movimiento-efectivo',
};
const STATUS_OF_TICKET: Record<ApprovalTicketStatus, AuthStatus> = {
  pending: 'pendiente', approved: 'aprobada', rejected: 'rechazada', expired: 'vencida', cancelled: 'cancelada',
  executed: 'ejecutada',
};

/**
 * Sincronización de autorizaciones con la API (PROPUESTA v0.6.0). La UI sigue operando sobre registros locales
 * (instantáneos y offline); esto los empareja con el servidor por `serverId`:
 *  - lo creado localmente se publica;
 *  - lo decidido localmente por un supervisor se envía;
 *  - lo decidido en otra terminal (o vencido) se baja y gana el servidor.
 * El servidor no tiene "cancelar" ni "ejecutar": esos estados quedan locales (ver docs/architecture/CONTRATO_CAPA_5.md).
 */
export const toCreate = (a: AuthRequest): ApprovalTicketCreate => ({
  action: ACTION_OF_TYPE[a.type], resource: a.resource, amount: a.amount, reason: a.reason, fingerprint: a.fingerprint,
});

export type AuthDecisionPush = { local: AuthRequest; decision: 'approve' | 'reject'; note: string };
export type AuthPlan = { merged: AuthRequest[]; create: AuthRequest[]; decide: AuthDecisionPush[]; pulled: number };

const fromServer = (s: ApprovalTicket, scope: Scope): AuthRequest => ({
  id: `srv-${s.id}`,
  serverId: s.id,
  type: TYPE_OF_ACTION[s.action] ?? 'otra',
  status: STATUS_OF_TICKET[s.status],
  scope,
  requesterId: s.requesterId,
  requesterName: s.requesterId,
  resource: s.resource,
  amount: s.amount,
  previous: {},
  proposed: {},
  reason: s.reason,
  createdAt: s.createdAt,
  expiresAt: s.expiresAt,
  decidedById: s.decidedById ?? null,
  decidedByName: s.decidedById ?? null,
  decidedAt: s.decidedAt ?? null,
  decisionNote: s.decisionNote ?? '',
  validUntil: s.validUntil ?? null,
  executedAt: s.executedAt ?? null,
  fingerprint: s.fingerprint,
  ...(s.approvalToken ? { serverToken: s.approvalToken } : {}),
  audit: [{ at: s.createdAt, actorId: s.requesterId, event: 'solicitada', detail: 'Creada en otra terminal' }],
});

export const planAuthSync = (local: AuthRequest[], server: ApprovalTicket[], scope: Scope, now: Date): AuthPlan => {
  const byServerId = new Map(server.map((s) => [s.id, s]));
  const create: AuthRequest[] = [];
  const decide: AuthDecisionPush[] = [];
  let pulled = 0;

  const merged = local.map((a): AuthRequest => {
    if (!a.serverId) {
      if (a.status === 'pendiente' || a.status === 'aprobada' || a.status === 'rechazada') create.push(a);
      return a;
    }
    const s = byServerId.get(a.serverId);
    if (!s) return a;
    // Local decidió y el servidor no lo sabe: se envía (el servidor valida supervisor y auto-aprobación).
    if ((a.status === 'aprobada' || a.status === 'rechazada') && s.status === 'pending') {
      decide.push({ local: a, decision: a.status === 'aprobada' ? 'approve' : 'reject', note: a.decisionNote });
      return a;
    }
    // El servidor decidió o venció algo que aquí sigue pendiente: gana el servidor.
    if (a.status === 'pendiente' && s.status !== 'pending') {
      pulled += 1;
      return {
        ...a,
        status: STATUS_OF_TICKET[s.status],
        ...(s.approvalToken ? { serverToken: s.approvalToken } : {}),
        decidedById: s.decidedById ?? a.decidedById,
        decidedByName: a.decidedByName ?? s.decidedById ?? null,
        decidedAt: s.decidedAt ?? a.decidedAt,
        decisionNote: s.decisionNote ?? a.decisionNote,
        validUntil: s.validUntil ?? a.validUntil,
        audit: [...a.audit, { at: now.toISOString(), actorId: 'servidor', event: STATUS_OF_TICKET[s.status], detail: 'Sincronizada desde el servidor' }],
      };
    }
    // Aprobada localmente y el servidor ya emitió el token (visible solo para quien pidió): se guarda para usarlo.
    if (a.status === 'aprobada' && !a.serverToken && s.status === 'approved' && s.approvalToken) {
      pulled += 1;
      return { ...a, serverToken: s.approvalToken };
    }
    return a;
  });

  const known = new Set(local.map((a) => a.serverId).filter((v): v is string => Boolean(v)));
  for (const s of server) {
    if (!known.has(s.id)) {
      merged.push(fromServer(s, scope));
      pulled += 1;
    }
  }
  return { merged, create, decide, pulled };
};

export type AuthSyncResult = { created: number; decided: number; pulled: number; failed: number; offline: boolean };

const codeOf = (e: unknown): string | null =>
  typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : null;

/**
 * Un ciclo contra la API. `read`/`write` acceden al almacén local: se relee DESPUÉS de las llamadas para no pisar lo
 * que el usuario cambió mientras tanto (solo se agregan `serverId` y decisiones del servidor sobre pendientes).
 */
export const runAuthSync = async (
  api: PosApprovalsApi,
  read: () => AuthRequest[],
  write: (next: AuthRequest[]) => void,
  scope: Scope,
  now: Date,
): Promise<AuthSyncResult> => {
  const result: AuthSyncResult = { created: 0, decided: 0, pulled: 0, failed: 0, offline: false };
  let server: ApprovalTicket[];
  try {
    server = await api.list();
  } catch (e) {
    result.offline = codeOf(e) === null || codeOf(e) === 'HTTP_ERROR';
    return result;
  }
  const before = read();
  const plan = planAuthSync(before, server, scope, now);
  const serverIds = new Map<string, string>();

  for (const a of plan.create) {
    try {
      const saved = await api.create(toCreate(a));
      serverIds.set(a.id, saved.id);
      result.created += 1;
    } catch {
      result.failed += 1;
    }
  }
  for (const d of plan.decide) {
    try {
      await api.decide(d.local.serverId ?? '', { decision: d.decision, ...(d.note ? { note: d.note } : {}) });
      result.decided += 1;
    } catch {
      // SELF_APPROVAL, sin permiso o vencida: el servidor manda; en el próximo ciclo se baja su estado.
      result.failed += 1;
    }
  }

  const original = new Map(before.map((a) => [a.id, a]));
  const latest = read();
  const have = new Set(latest.map((a) => a.id));
  const next = latest.map((a): AuthRequest => {
    const sid = serverIds.get(a.id);
    const merged = plan.merged.find((m) => m.id === a.id);
    const base = sid ? { ...a, serverId: sid } : a;
    // Solo se aplican bajadas del servidor sobre registros que siguen pendientes y sin cambios locales.
    if (merged && merged !== original.get(a.id) && a.status === 'pendiente' && JSON.stringify(original.get(a.id)) === JSON.stringify(a)) {
      return { ...merged, ...(sid ? { serverId: sid } : {}) };
    }
    return base;
  });
  for (const m of plan.merged) if (!have.has(m.id) && !original.has(m.id)) next.push(m);
  result.pulled = plan.pulled;
  if (serverIds.size > 0 || plan.pulled > 0) write(next);
  return result;
};
