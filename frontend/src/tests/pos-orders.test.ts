import { describe, expect, it } from 'vitest';
import {
  balanceOf, cancelOrder, counts, createOrder, deliver, dispatch, markCharged, registerPayment, reportMissing,
  resolveMissing, setPacked, takeOrder, verify, withBalance, type NewOrder, type Order,
} from '@/features/pos/orders/orders';

const actor = { id: 'emp-001', name: 'Laura' };
const t = new Date('2026-10-11T13:00:00Z');

const base: NewOrder = {
  customerId: 'cus-001', customerName: 'Tienda La Esquina', fulfillment: 'domicilio', address: 'Cra 7 # 10-20',
  scheduledFor: '2026-10-12', slot: 'manana', assigneeId: null, assigneeName: '', shippingCost: 5000, notes: '',
  lines: [
    { productId: 'prd-001', name: 'Arroz 500 g', sku: 'SKU-001', quantity: 10, unitPrice: 2800 },
    { productId: 'prd-002', name: 'Aceite 1 L', sku: 'SKU-002', quantity: 2, unitPrice: 12500 },
  ],
  paymentState: 'sin-pago', paidAmount: 0, saleId: null,
};

const make = (over: Partial<NewOrder> = {}, existing: Order[] = []): Order => {
  const r = createOrder({ ...base, ...over }, existing, actor, t);
  if (!r.ok) throw new Error(r.message);
  return r.value;
};
const must = <T,>(r: { ok: true; value: T } | { ok: false; message: string }): T => {
  if (!r.ok) throw new Error(r.message);
  return r.value;
};

const ready = (): Order => {
  let o = must(takeOrder(make(), actor, t));
  o = must(setPacked(o, 'prd-001', 10, actor, t));
  o = must(setPacked(o, 'prd-002', 2, actor, t));
  return must(verify(o, actor, t));
};

describe('Pedidos · creación', () => {
  it('crea pendiente con total (productos + envío), número consecutivo y trazabilidad', () => {
    const a = make();
    expect(a).toMatchObject({ status: 'pendiente', number: 'PED-0001', total: 2800 * 10 + 12500 * 2 + 5000, paidAmount: 0 });
    expect(a.history[0]).toMatchObject({ event: 'creado', actorId: 'emp-001' });
    expect(make({}, [a]).number).toBe('PED-0002');
  });

  it('valida: líneas, cantidades enteras, domicilio con cliente y dirección, fecha, abono', () => {
    const bad = (over: Partial<NewOrder>) => createOrder({ ...base, ...over }, [], actor, t);
    expect(bad({ lines: [] })).toMatchObject({ ok: false, error: 'SIN_LINEAS' });
    expect(bad({ lines: [{ ...base.lines[0]!, quantity: 1.5 }] })).toMatchObject({ ok: false, error: 'CANTIDAD_INVALIDA' });
    expect(bad({ address: ' ' })).toMatchObject({ ok: false, error: 'DATOS_INCOMPLETOS' });
    expect(bad({ customerId: null })).toMatchObject({ ok: false, error: 'DATOS_INCOMPLETOS' });
    expect(bad({ scheduledFor: '' })).toMatchObject({ ok: false, error: 'DATOS_INCOMPLETOS' });
    expect(bad({ fulfillment: 'recogida', address: '', customerId: null, paymentState: 'credito' })).toMatchObject({ ok: false });
    expect(bad({ paymentState: 'abono', paidAmount: 10_000_000 })).toMatchObject({ ok: false });
    expect(bad({ fulfillment: 'recogida', address: '', customerId: null })).toMatchObject({ ok: true });
  });

  it('cobrar y entregar después: queda pagado y vinculado a la venta, sin saldo', () => {
    const o = make({ paymentState: 'pagado', saleId: 'sale-9' });
    expect(o).toMatchObject({ paymentState: 'pagado', paidAmount: o.total, saleId: 'sale-9' });
    expect(balanceOf(o)).toBe(0);
  });

  it('crear pedido y cobrar después: NO simula una venta pagada', () => {
    const o = make();
    expect(o).toMatchObject({ saleId: null, paymentState: 'sin-pago', paidAmount: 0 });
    expect(balanceOf(o)).toBe(o.total);
    expect(withBalance([o])).toHaveLength(1);
  });
});

describe('Pedidos · preparación, faltantes y calidad', () => {
  it('tomar → empacar parcial → verificar solo cuando todo está completo', () => {
    let o = must(takeOrder(make(), actor, t));
    expect(o).toMatchObject({ status: 'en-proceso', assigneeId: 'emp-001' });
    o = must(setPacked(o, 'prd-001', 4, actor, t));
    expect(verify(o, actor, t)).toMatchObject({ ok: false, error: 'FALTANTES' });
    o = must(setPacked(o, 'prd-001', 10, actor, t));
    o = must(setPacked(o, 'prd-002', 2, actor, t));
    expect(must(verify(o, actor, t))).toMatchObject({ status: 'listo', qualityChecked: true });
  });

  it('no empaca más de lo pedido ni en estado equivocado; corregir a la baja invalida la calidad', () => {
    const o = must(takeOrder(make(), actor, t));
    expect(setPacked(o, 'prd-001', 11, actor, t)).toMatchObject({ ok: false, error: 'CANTIDAD_INVALIDA' });
    expect(setPacked(make(), 'prd-001', 1, actor, t)).toMatchObject({ ok: false, error: 'ESTADO_INVALIDO' });
    const l = ready();
    expect(l.qualityChecked).toBe(true);
  });

  it('faltante: pasa a problema, no se puede verificar, y al resolverse vuelve a proceso', () => {
    let o = must(takeOrder(make(), actor, t));
    o = must(reportMissing(o, 'prd-001', 3, 'Sin stock en bodega', actor, t));
    expect(o).toMatchObject({ status: 'problema' });
    expect(o.lines[0]).toMatchObject({ missing: 3, missingNote: 'Sin stock en bodega' });
    expect(verify(o, actor, t)).toMatchObject({ ok: false });
    expect(counts([o]).problema).toBe(1);
    expect(reportMissing(o, 'prd-001', 0, '', actor, t)).toMatchObject({ ok: false });
    o = must(resolveMissing(o, 'prd-001', actor, t));
    expect(o.status).toBe('en-proceso');
    expect(resolveMissing(o, 'prd-001', actor, t)).toMatchObject({ ok: false });
  });

  it('con varios faltantes sigue en problema hasta resolverlos todos', () => {
    let o = must(takeOrder(make(), actor, t));
    o = must(reportMissing(o, 'prd-001', 1, '', actor, t));
    o = must(reportMissing(o, 'prd-002', 1, '', actor, t));
    o = must(resolveMissing(o, 'prd-001', actor, t));
    expect(o.status).toBe('problema');
    o = must(resolveMissing(o, 'prd-002', actor, t));
    expect(o.status).toBe('en-proceso');
  });
});

describe('Pedidos · pago, despacho y cancelación', () => {
  it('no despacha con saldo sin crédito; con abono completo o crédito sí', () => {
    const o = ready();
    expect(dispatch(o, actor, t)).toMatchObject({ ok: false, error: 'SALDO_PENDIENTE' });
    const partial = must(registerPayment(o, 10_000, actor, t));
    expect(partial).toMatchObject({ paymentState: 'abono', paidAmount: 10_000 });
    expect(dispatch(partial, actor, t)).toMatchObject({ ok: false, error: 'SALDO_PENDIENTE' });
    const paid = must(registerPayment(partial, balanceOf(partial), actor, t));
    expect(paid.paymentState).toBe('pagado');
    expect(must(dispatch(paid, actor, t)).status).toBe('despachado');
  });

  it('el pago no supera el saldo; valor entero positivo', () => {
    const o = make();
    expect(registerPayment(o, o.total + 1, actor, t)).toMatchObject({ ok: false });
    expect(registerPayment(o, 0, actor, t)).toMatchObject({ ok: false });
    expect(registerPayment(o, 10.5, actor, t)).toMatchObject({ ok: false });
  });

  it('pasar a cobro sin reconstruir carrito: markCharged liquida y vincula la venta', () => {
    const o = must(markCharged(make(), 'sale-77', make().total, actor, t));
    expect(o).toMatchObject({ paymentState: 'pagado', saleId: 'sale-77', paidAmount: o.total });
    const noShipping = make();
    const partial = must(markCharged(noShipping, 'sale-78', noShipping.total - 5000, actor, t));
    expect(partial).toMatchObject({ paymentState: 'abono', paidAmount: noShipping.total - 5000, saleId: 'sale-78' });
    expect(balanceOf(partial)).toBe(5000);
    expect(must(markCharged(ready(), 'sale-1', ready().total, actor, t)).paymentState).toBe('pagado');
  });

  it('flujo completo hasta entregado', () => {
    let o = must(markCharged(ready(), 'sale-1', ready().total, actor, t));
    o = must(dispatch(o, actor, t));
    expect(deliver(make(), actor, t)).toMatchObject({ ok: false });
    o = must(deliver(o, actor, t));
    expect(o.status).toBe('entregado');
    expect(o.history.map((h) => h.event)).toEqual(['creado', 'tomado', 'empaque', 'empaque', 'verificado', 'cobrado', 'despachado', 'entregado']);
    expect(registerPayment(o, 1, actor, t)).toMatchObject({ ok: false });
  });

  it('cancelar: con motivo, solo antes de despachar y sin pagos', () => {
    expect(cancelOrder(make(), '', actor, t)).toMatchObject({ ok: false, error: 'DATOS_INCOMPLETOS' });
    expect(must(cancelOrder(make(), 'Cliente desistió', actor, t)).status).toBe('cancelado');
    const paid = make({ paymentState: 'pagado', saleId: 's' });
    expect(cancelOrder(paid, 'x', actor, t)).toMatchObject({ ok: false, error: 'TIENE_PAGOS' });
    const sent = must(dispatch(must(markCharged(ready(), 's', ready().total, actor, t)), actor, t));
    expect(cancelOrder(sent, 'x', actor, t)).toMatchObject({ ok: false, error: 'ESTADO_INVALIDO' });
  });

  it('semáforo: cuenta abiertos por color y no cuenta despachados ni cancelados', () => {
    const a = make();
    const b = must(takeOrder(make(), actor, t));
    const c = must(reportMissing(must(takeOrder(make(), actor, t)), 'prd-001', 1, '', actor, t));
    const d = ready();
    const e = must(cancelOrder(make(), 'x', actor, t));
    expect(counts([a, b, c, d, e])).toEqual({ pendiente: 1, proceso: 1, problema: 1, listo: 1 });
  });
});
