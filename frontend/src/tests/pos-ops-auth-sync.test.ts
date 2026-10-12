import { describe, expect, it } from 'vitest';
import type { ApprovalTicket } from '@/shared/contracts';
import { ApiError } from '@/shared/api/client';
import type { PosApprovalsApi } from '@/shared/api/approvals';
import { runAuthSync } from '@/features/pos-ops/authSync';
import { createRequest } from '@/features/pos-ops/authorization';
import type { AuthRequest, Scope } from '@/features/pos-ops/types';

const scope: Scope = { companyId: 'co-001', branchId: 'br-001', registerId: 'reg-001', terminalId: 'ter-001' };
const NOW = new Date('2026-10-11T15:00:00Z');

const local = (reason = 'Sobrante'): AuthRequest => {
  const r = createRequest(
    { type: 'dif-apertura', scope, requesterId: 'emp-001', requesterName: 'Laura', resource: { kind: 'shift', id: 's1' }, amount: 1000, previous: {}, proposed: {}, reason },
    NOW,
  );
  if (!r.ok) throw new Error(r.message);
  return r.value;
};

const fakeApi = (initial: ApprovalTicket[] = [], opts: { offline?: boolean; rejectDecision?: boolean } = {}) => {
  const store = new Map(initial.map((a) => [a.id, a]));
  let n = 0;
  const api: PosApprovalsApi = {
    list: async () => {
      if (opts.offline) throw new TypeError('fetch failed');
      return [...store.values()];
    },
    create: async (input) => {
      n += 1;
      const created: ApprovalTicket = {
        ...input, id: `auth-${n}`, status: 'pending', requesterId: 'emp-001', createdAt: NOW.toISOString(),
        expiresAt: '2026-10-11T15:15:00Z',
      };
      store.set(created.id, created);
      return created;
    },
    decide: async (id, input) => {
      if (opts.rejectDecision) throw new ApiError('no', 403, 'SELF_APPROVAL');
      const a = store.get(id)!;
      const next = { ...a, status: input.decision === 'approve' ? ('approved' as const) : ('rejected' as const), decidedById: 'emp-003', ...(input.decision === 'approve' ? { approvalToken: `tok-${id}` } : {}) };
      store.set(id, next);
      return next;
    },
  };
  return { api, store };
};

const harness = (initial: AuthRequest[]) => {
  let data = initial;
  return { read: () => data, write: (next: AuthRequest[]) => { data = next; }, get data() { return data; } };
};

describe('autorizaciones de pos-ops ↔ API', () => {
  it('publica lo creado localmente y guarda el serverId', async () => {
    const { api, store } = fakeApi();
    const h = harness([local()]);
    const r = await runAuthSync(api, h.read, h.write, scope, NOW);
    expect(r.created).toBe(1);
    expect(h.data[0]?.serverId).toBe('auth-1');
    expect(store.size).toBe(1);
    // Segundo ciclo: no vuelve a crear.
    const again = await runAuthSync(api, h.read, h.write, scope, NOW);
    expect(again.created).toBe(0);
    expect(store.size).toBe(1);
  });

  it('baja la decisión tomada en otra terminal', async () => {
    const { api, store } = fakeApi();
    const h = harness([local()]);
    await runAuthSync(api, h.read, h.write, scope, NOW);
    store.set('auth-1', { ...store.get('auth-1')!, status: 'approved', decidedById: 'emp-003', validUntil: '2026-10-11T15:05:00Z', approvalToken: 'tok-1' });
    const r = await runAuthSync(api, h.read, h.write, scope, NOW);
    expect(r.pulled).toBe(1);
    expect(h.data[0]?.status).toBe('aprobada');
    expect(h.data[0]?.decidedById).toBe('emp-003');
    expect(h.data[0]?.audit.at(-1)?.event).toBe('aprobada');
    expect(h.data[0]?.serverToken).toBe('tok-1');
  });

  it('envía al servidor la decisión tomada localmente por un supervisor', async () => {
    const { api, store } = fakeApi();
    const h = harness([local()]);
    await runAuthSync(api, h.read, h.write, scope, NOW);
    h.write(h.data.map((a) => ({ ...a, status: 'aprobada' as const, decidedById: 'emp-003', decidedByName: 'María' })));
    const r = await runAuthSync(api, h.read, h.write, scope, NOW);
    expect(r.decided).toBe(1);
    expect(store.get('auth-1')?.status).toBe('approved');
  });

  it('trae solicitudes creadas en otra terminal', async () => {
    const remote: ApprovalTicket = {
      id: 'auth-9', action: 'discount', resource: { kind: 'sale', id: 'x' }, amount: 500, reason: 'Cliente frecuente',
      fingerprint: 'fp', status: 'pending', requesterId: 'emp-002', createdAt: NOW.toISOString(), expiresAt: '2026-10-11T15:15:00Z',
    };
    const { api } = fakeApi([remote]);
    const h = harness([]);
    await runAuthSync(api, h.read, h.write, scope, NOW);
    expect(h.data).toHaveLength(1);
    expect(h.data[0]).toMatchObject({ serverId: 'auth-9', status: 'pendiente', requesterId: 'emp-002' });
  });

  it('sin conexión no cambia nada', async () => {
    const { api } = fakeApi([], { offline: true });
    const l = local();
    const h = harness([l]);
    const r = await runAuthSync(api, h.read, h.write, scope, NOW);
    expect(r.offline).toBe(true);
    expect(h.data).toEqual([l]);
  });

  it('si el servidor rechaza la decisión (auto-aprobación) no la da por aplicada', async () => {
    const { api, store } = fakeApi([], { rejectDecision: true });
    const h = harness([local()]);
    await runAuthSync(api, h.read, h.write, scope, NOW);
    h.write(h.data.map((a) => ({ ...a, status: 'aprobada' as const })));
    const r = await runAuthSync(api, h.read, h.write, scope, NOW);
    expect(r.failed).toBe(1);
    expect(store.get('auth-1')?.status).toBe('pending');
  });
});
