import { describe, expect, it } from 'vitest';
import {
  canRetry, connectivityOf, defaultPolicyContext, enqueue, evaluate, pendingCount, recoverInterrupted, requestReview,
  syncQueue, type EnqueueInput,
} from '@/features/pos-ops/offline';
import { createSimulatedRemote } from '@/features/pos-ops/simulator';
import { StorageUnavailableError, createOpsStore, memoryStorage } from '@/features/pos-ops/store';
import type { QueuedOperation, Scope } from '@/features/pos-ops/types';

const scope: Scope = { companyId: 'co-001', branchId: 'br-001', registerId: 'reg-001', terminalId: 'ter-001' };
const now = new Date('2026-10-11T13:00:00Z');
const at = (n: number) => new Date(now.getTime() + n * 1000);

const sale = (n: number, extra: Partial<EnqueueInput> = {}): EnqueueInput => ({
  kind: 'venta-efectivo', scope, shiftId: 'shift-1', cashierId: 'emp-001', idempotencyKey: `venta-${n}`,
  payload: { total: 2800 * n, pin: '1234', cardNumber: '4111' }, ...extra,
});

const queueOf = (...inputs: EnqueueInput[]): QueuedOperation[] => {
  let q: QueuedOperation[] = [];
  inputs.forEach((input, i) => {
    q = enqueue(q, input, at(i)).queue;
  });
  return q;
};

describe('POS-F13 · política offline', () => {
  const ctx = { ...defaultPolicyContext, shiftValid: true };

  it('permite catálogo, carrito y suspender sin conexión', () => {
    for (const kind of ['buscar-catalogo', 'preparar-carrito', 'suspender-carrito'] as const) {
      expect(evaluate(kind, false, defaultPolicyContext).allowed, kind).toBe(true);
    }
  });

  it('bloquea por defecto transferencia, tarjeta, crédito nuevo, fiscal, autorizaciones y relevo', () => {
    for (const kind of ['verificar-transferencia', 'cobro-tarjeta', 'credito-nuevo', 'documento-fiscal', 'autorizacion', 'apertura-relevo'] as const) {
      const d = evaluate(kind, false, { shiftValid: true, offlineCashSalesEnabled: true, fiscalOfflineValidated: true });
      expect(d.allowed, kind).toBe(false);
      expect(d.reason, kind).not.toBe('');
    }
  });

  it('venta en efectivo: condicionada a turno, política offline y fiscal validado', () => {
    expect(evaluate('venta-efectivo', false, defaultPolicyContext).allowed).toBe(false);
    expect(evaluate('venta-efectivo', false, ctx).reason).toMatch(/no está habilitada/);
    expect(evaluate('venta-efectivo', false, { ...ctx, offlineCashSalesEnabled: true }).reason).toMatch(/fiscal/);
    expect(evaluate('venta-efectivo', false, { shiftValid: true, offlineCashSalesEnabled: true, fiscalOfflineValidated: true }).allowed).toBe(true);
  });

  it('con conexión no restringe', () => {
    expect(evaluate('cobro-tarjeta', true, defaultPolicyContext).allowed).toBe(true);
  });

  it('revocación de permisos durante la desconexión: sin turno válido se bloquea', () => {
    expect(evaluate('movimiento-efectivo', false, ctx).allowed).toBe(true);
    expect(evaluate('movimiento-efectivo', false, { ...ctx, shiftValid: false }).allowed).toBe(false);
  });
});

describe('POS-F13 · cola y sincronización', () => {
  it('encola con idempotencia: la misma clave no duplica, y no guarda PIN ni tarjeta', () => {
    const q1 = enqueue([], sale(1), now);
    const q2 = enqueue(q1.queue, sale(1), at(5));
    expect(q2.duplicate).toBe(true);
    expect(q2.queue).toHaveLength(1);
    expect(JSON.stringify(q1.queue)).not.toMatch(/1234|4111|pin|card/i);
    expect(q1.op.payload).toEqual({ total: 2800 });
  });

  it('sincroniza en orden y confirma solo con respuesta del servidor', async () => {
    const remote = createSimulatedRemote();
    const out = await syncQueue(queueOf(sale(1), sale(2)), remote.transport, at(60));
    expect(out.map((o) => o.status)).toEqual(['confirmada', 'confirmada']);
    expect(out[0]!.remoteRef).toBe('REM-0001');
    expect(remote.appliedCount()).toBe(2);
    expect(pendingCount(out)).toBe(0);
  });

  it('falla de red: queda reintentable y al reintentar no duplica', async () => {
    const remote = createSimulatedRemote();
    remote.script('network');
    const first = await syncQueue(queueOf(sale(1)), remote.transport, at(60));
    expect(first[0]).toMatchObject({ status: 'reintentable', attempts: 1 });
    expect(canRetry(first[0]!)).toBe(true);
    const second = await syncQueue(first, remote.transport, at(120));
    expect(second[0]).toMatchObject({ status: 'confirmada', attempts: 2 });
    expect(remote.appliedCount()).toBe(1);
  });

  it('respuesta perdida: queda incierta, se resuelve consultando y NO crea otra venta', async () => {
    const remote = createSimulatedRemote();
    remote.script('lost');
    const first = await syncQueue(queueOf(sale(1)), remote.transport, at(60));
    expect(first[0]!.status).toBe('incierto');
    expect(remote.appliedCount()).toBe(1);
    expect(connectivityOf({ browserOnline: true, backendReachable: true, syncing: false, reconnecting: false, queue: first })).toBe('incierto');
    const second = await syncQueue(first, remote.transport, at(120));
    expect(second[0]).toMatchObject({ status: 'confirmada', remoteRef: 'REM-0001' });
    expect(remote.appliedCount()).toBe(1);
    expect(remote.sentLog().filter((s) => s.outcome === 'duplicate')).toHaveLength(0);
  });

  it('rechazo: no se reintenta indefinidamente; conflicto: pide revisión', async () => {
    const remote = createSimulatedRemote();
    remote.script('rejected', 'conflict');
    const out = await syncQueue(queueOf(sale(1), sale(2)), remote.transport, at(60));
    expect(out.map((o) => o.status)).toEqual(['rechazada', 'revision']);
    const again = await syncQueue(out, remote.transport, at(120));
    expect(again.map((o) => o.attempts)).toEqual([1, 1]);
    expect(connectivityOf({ browserOnline: true, backendReachable: true, syncing: false, reconnecting: false, queue: again })).toBe('con-errores');
  });

  it('dependencias: si la anterior no se confirma, la dependiente pasa a revisión y no se envía', async () => {
    const remote = createSimulatedRemote();
    remote.script('rejected');
    const base = queueOf(sale(1));
    const withDep = enqueue(base, sale(2, { dependsOn: [base[0]!.id] }), at(5)).queue;
    const out = await syncQueue(withDep, remote.transport, at(60));
    expect(out.map((o) => o.status)).toEqual(['rechazada', 'revision']);
    expect(remote.appliedCount()).toBe(0);
  });

  it('reinicio durante el envío: "enviando" se recupera como incierto, no se reenvía a ciegas', async () => {
    const remote = createSimulatedRemote();
    const q = queueOf(sale(1)).map((o) => ({ ...o, status: 'enviando' as const }));
    expect(recoverInterrupted(q)[0]!.status).toBe('incierto');
    remote.setReachable(true);
    const out = await syncQueue(q, remote.transport, at(60));
    // El servidor nunca la aplicó: se reenvía con la misma clave y se aplica una sola vez.
    expect(out[0]!.status).toBe('confirmada');
    expect(remote.appliedCount()).toBe(1);
  });

  it('sin acceso al servidor no resuelve lo incierto ni lo da por bueno', async () => {
    const remote = createSimulatedRemote();
    remote.script('lost');
    const first = await syncQueue(queueOf(sale(1)), remote.transport, at(60));
    remote.setReachable(false);
    const out = await syncQueue(first, remote.transport, at(120));
    expect(out[0]!.status).toBe('incierto');
    expect(connectivityOf({ browserOnline: true, backendReachable: false, syncing: false, reconnecting: false, queue: out })).toBe('sin-conexion');
  });

  it('agota reintentos y pasa a revisión; la revisión manual solo desde estados válidos', async () => {
    const remote = createSimulatedRemote();
    remote.script('network', 'network', 'network', 'network', 'network');
    let q = queueOf(sale(1));
    for (let i = 0; i < 6; i += 1) q = await syncQueue(q, remote.transport, at(60 + i));
    expect(q[0]).toMatchObject({ status: 'revision', attempts: 5 });
    const rejected: QueuedOperation = { ...q[0]!, status: 'rechazada' };
    expect(requestReview(rejected, now).status).toBe('revision');
    expect(requestReview({ ...q[0]!, status: 'confirmada' }, now).status).toBe('confirmada');
  });

  it('estados de conectividad', () => {
    const q = queueOf(sale(1));
    const base = { browserOnline: true, backendReachable: true, syncing: false, reconnecting: false };
    expect(connectivityOf({ ...base, queue: [] })).toBe('sincronizado');
    expect(connectivityOf({ ...base, queue: q })).toBe('pendientes');
    expect(connectivityOf({ ...base, browserOnline: false, queue: q })).toBe('sin-conexion');
    expect(connectivityOf({ ...base, reconnecting: true, queue: q })).toBe('reconectando');
    expect(connectivityOf({ ...base, syncing: true, queue: q })).toBe('sincronizando');
  });
});

describe('POS-F13 · persistencia local', () => {
  it('sobrevive a una recarga (nuevo store, mismo almacenamiento) y aísla por empresa/sede/caja', () => {
    const storage = memoryStorage();
    createOpsStore(scope, storage).write('queue', queueOf(sale(1)));
    expect(createOpsStore(scope, storage).read<QueuedOperation>('queue')).toHaveLength(1);
    expect(createOpsStore({ ...scope, branchId: 'br-002' }, storage).read('queue')).toHaveLength(0);
    expect(createOpsStore({ ...scope, companyId: 'co-002' }, storage).read('queue')).toHaveLength(0);
    expect(createOpsStore({ ...scope, registerId: 'reg-002' }, storage).read('queue')).toHaveLength(0);
  });

  it('almacenamiento lleno: lanza un error tipado para bloquear la operación y no pierde lo anterior', () => {
    const storage = memoryStorage();
    const store = createOpsStore(scope, storage);
    store.write('queue', queueOf(sale(1)));
    storage.fail = true;
    expect(() => store.write('queue', queueOf(sale(1), sale(2)))).toThrow(StorageUnavailableError);
    expect(store.read('queue')).toHaveLength(1);
  });

  it('datos corruptos no rompen la lectura', () => {
    const storage = memoryStorage();
    storage.setItem('pos.ops.v1.co-001.br-001.reg-001.queue', '{no es json');
    expect(createOpsStore(scope, storage).read('queue')).toEqual([]);
  });
});
