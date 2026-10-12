import { describe, expect, it } from 'vitest';
import type { PosOrder } from '@/shared/contracts';
import { ApiError } from '@/shared/api/client';
import { createOrder, type Order } from '@/features/pos/orders/orders';
import { fromWire, syncOrders, toWire, type OrdersGateway } from '@/features/pos/orders/ordersSync';

const actor = { id: 'emp-001', name: 'Laura' };
const make = (n: number): Order => {
  const r = createOrder(
    {
      customerId: null, customerName: 'Mostrador', fulfillment: 'recogida', address: '', scheduledFor: '2026-10-12', slot: 'manana',
      assigneeId: null, assigneeName: '', shippingCost: 0, notes: '', priority: 'normal', saleId: null, paymentState: 'sin-pago',
      paidAmount: 0, lines: [{ productId: 'prd-001', name: 'Arroz', sku: 'SKU-001', quantity: n, unitPrice: 2800, missingNote: '' } as never],
    } as never,
    [],
    actor,
    new Date('2026-10-11T10:00:00Z'),
  );
  if (!r.ok) throw new Error(r.message);
  return r.value;
};

const fakeServer = (initial: PosOrder[] = [], opts: { offline?: boolean } = {}) => {
  const store = new Map(initial.map((o) => [o.id, o]));
  const calls: string[] = [];
  const gateway: OrdersGateway = {
    list: async () => {
      if (opts.offline) throw new TypeError('Failed to fetch');
      return [...store.values()];
    },
    save: async (order, expected) => {
      if (opts.offline) throw new TypeError('Failed to fetch');
      calls.push(`${order.id}@${expected}`);
      const have = store.get(order.id)?.version ?? 0;
      if (have !== expected) throw new ApiError('conflicto', 409, 'VERSION_CONFLICT');
      const saved = { ...order, version: have + 1 };
      store.set(order.id, saved);
      return saved;
    },
  };
  return { gateway, store, calls };
};

describe('pedidos: ida y vuelta al contrato', () => {
  it('toWire/fromWire conserva líneas, historial y responsable', () => {
    const o = make(2);
    const back = fromWire(toWire(o, 'br-001'));
    expect(back).toEqual(o);
  });
});

describe('pedidos: sincronización offline-first', () => {
  it('sube lo pendiente con versión 0, guarda la versión y limpia pendientes', async () => {
    const o = make(1);
    const { gateway, store, calls } = fakeServer();
    const r = await syncOrders('br-001', [o], [o.id], gateway);
    expect(calls).toEqual([`${o.id}@0`]);
    expect(r.dirty).toEqual([]);
    expect(r.orders[0]?.version).toBe(1);
    expect(store.get(o.id)?.branchId).toBe('br-001');
    expect(r.report).toMatchObject({ pushed: 1, conflicts: 0, offline: false });
  });

  it('baja los pedidos de otras terminales', async () => {
    const other = toWire(make(3), 'br-001');
    const { gateway } = fakeServer([{ ...other, id: 'ord-remote', version: 4 }]);
    const r = await syncOrders('br-001', [], [], gateway);
    expect(r.orders.map((x) => x.id)).toEqual(['ord-remote']);
    expect(r.orders[0]?.version).toBe(4);
    expect(r.report.pulled).toBe(1);
  });

  it('sin conexión nada se pierde: todo queda pendiente', async () => {
    const o = make(1);
    const { gateway } = fakeServer([], { offline: true });
    const r = await syncOrders('br-001', [o], [o.id], gateway);
    expect(r.dirty).toEqual([o.id]);
    expect(r.orders).toEqual([o]);
    expect(r.report.offline).toBe(true);
  });

  it('conflicto de versión: gana el servidor y se cuenta', async () => {
    const o = { ...make(1), version: 1 };
    const server = { ...toWire(o, 'br-001'), version: 3, notes: 'Cambiado en otra caja' };
    const { gateway } = fakeServer([server]);
    const r = await syncOrders('br-001', [{ ...o, notes: 'mi cambio' }], [o.id], gateway);
    expect(r.report.conflicts).toBe(1);
    expect(r.dirty).toEqual([]);
    expect(r.orders[0]?.notes).toBe('Cambiado en otra caja');
    expect(r.orders[0]?.version).toBe(3);
  });

  it('un pedido con versión más nueva en el servidor reemplaza al local no modificado', async () => {
    const o = { ...make(1), version: 1 };
    const { gateway } = fakeServer([{ ...toWire(o, 'br-001'), version: 2, status: 'en-proceso' }]);
    const r = await syncOrders('br-001', [o], [], gateway);
    expect(r.orders[0]?.status).toBe('en-proceso');
    expect(r.report.pulled).toBe(1);
  });
});
