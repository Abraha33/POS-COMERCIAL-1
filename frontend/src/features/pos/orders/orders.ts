import { uuid } from '@/shared/utils/uuid';

/**
 * Gestión de pedidos del POS (PROPUESTA: no hay contrato ni reglas aprobadas para pedidos).
 * Funciones puras sobre `Order`. El estado se guarda en el dispositivo (ver `useOrders`); no existe en el backend.
 *
 *   pendiente → en-proceso → listo → despachado → entregado
 *                   ⇅ problema (faltante)
 *   cancelado: solo antes de despachar y sin pagos registrados
 */

export type OrderStatus = 'pendiente' | 'en-proceso' | 'problema' | 'listo' | 'despachado' | 'entregado' | 'cancelado';
export type Fulfillment = 'domicilio' | 'recogida' | 'acordada';
export type PaymentState = 'sin-pago' | 'abono' | 'pagado' | 'credito';
export type Slot = 'manana' | 'tarde' | 'noche';
export type Semaphore = 'pendiente' | 'proceso' | 'problema' | 'listo';

export type OrderLine = {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  /** Unidades ya empacadas. */
  packed: number;
  /** Unidades reportadas como faltantes. */
  missing: number;
  missingNote: string;
};

export type OrderEvent = { at: string; actorId: string; actorName: string; event: string; detail: string };

export type Order = {
  id: string;
  number: string;
  createdAt: string;
  createdById: string;
  createdByName: string;
  customerId: string | null;
  customerName: string;
  fulfillment: Fulfillment;
  address: string;
  scheduledFor: string;
  slot: Slot;
  assigneeId: string | null;
  assigneeName: string;
  shippingCost: number;
  notes: string;
  priority: 'normal' | 'alta';
  lines: OrderLine[];
  /** Total de productos + envío (COP entero). El servidor sería la autoridad. */
  total: number;
  paymentState: PaymentState;
  paidAmount: number;
  /** Venta ya cobrada que originó este pedido (cobrar y entregar después). */
  saleId: string | null;
  status: OrderStatus;
  qualityChecked: boolean;
  history: OrderEvent[];
};

export type Actor = { id: string; name: string };
export type OrderError =
  | 'ESTADO_INVALIDO' | 'SIN_LINEAS' | 'DATOS_INCOMPLETOS' | 'CANTIDAD_INVALIDA' | 'FALTANTES' | 'SALDO_PENDIENTE'
  | 'TIENE_PAGOS' | 'NO_ENCONTRADO';
export type Res<T> = { ok: true; value: T } | { ok: false; error: OrderError; message: string };

const ok = <T,>(value: T): Res<T> => ({ ok: true, value });
const fail = (error: OrderError, message: string): Res<never> => ({ ok: false, error, message });

const log = (o: Order, actor: Actor, event: string, detail: string, now: Date): OrderEvent[] => [
  ...o.history,
  { at: now.toISOString(), actorId: actor.id, actorName: actor.name, event, detail },
];

export const statusLabels: Record<OrderStatus, string> = {
  pendiente: 'Pendiente', 'en-proceso': 'En proceso', problema: 'Con faltante', listo: 'Listo',
  despachado: 'Despachado', entregado: 'Entregado', cancelado: 'Cancelado',
};
export const fulfillmentLabels: Record<Fulfillment, string> = {
  domicilio: 'Domicilio', recogida: 'Recogida en tienda', acordada: 'Entrega acordada',
};
export const slotLabels: Record<Slot, string> = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
export const paymentLabels: Record<PaymentState, string> = {
  'sin-pago': 'Sin pago', abono: 'Abono', pagado: 'Pagado', credito: 'A crédito',
};

/** Semáforo de la bandeja: agrupa estados para el cajero; lo ya despachado no cuenta como trabajo abierto. */
export const semaphoreOf = (o: Order): Semaphore | null => {
  switch (o.status) {
    case 'pendiente': return 'pendiente';
    case 'en-proceso': return 'proceso';
    case 'problema': return 'problema';
    case 'listo': return 'listo';
    default: return null;
  }
};

export const isOpen = (o: Order): boolean => o.status !== 'entregado' && o.status !== 'cancelado';
export const balanceOf = (o: Order): number => Math.max(0, o.total - o.paidAmount);
export const linesTotal = (lines: Pick<OrderLine, 'quantity' | 'unitPrice'>[]): number =>
  lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

export type NewOrder = {
  customerId: string | null;
  customerName: string;
  fulfillment: Fulfillment;
  address: string;
  scheduledFor: string;
  slot: Slot;
  assigneeId: string | null;
  assigneeName: string;
  shippingCost: number;
  notes: string;
  lines: Pick<OrderLine, 'productId' | 'name' | 'sku' | 'quantity' | 'unitPrice'>[];
  paymentState: PaymentState;
  paidAmount: number;
  saleId: string | null;
  priority?: 'normal' | 'alta';
};

/** Siguiente número legible. */
export const nextNumber = (orders: Order[]): string =>
  `PED-${String(orders.reduce((max, o) => Math.max(max, Number(o.number.replace(/\D/g, '')) || 0), 0) + 1).padStart(4, '0')}`;

export const createOrder = (input: NewOrder, orders: Order[], actor: Actor, now: Date): Res<Order> => {
  if (input.lines.length === 0) return fail('SIN_LINEAS', 'El pedido necesita al menos un producto.');
  if (input.lines.some((l) => !Number.isInteger(l.quantity) || l.quantity <= 0)) {
    return fail('CANTIDAD_INVALIDA', 'Las cantidades deben ser enteros mayores que 0.');
  }
  if (input.fulfillment === 'domicilio' && (input.address.trim() === '' || input.customerId === null)) {
    return fail('DATOS_INCOMPLETOS', 'Un domicilio necesita cliente identificado y dirección.');
  }
  if (input.scheduledFor === '') return fail('DATOS_INCOMPLETOS', 'Elige la fecha de entrega.');
  if (input.paymentState === 'credito' && input.customerId === null) {
    return fail('DATOS_INCOMPLETOS', 'El crédito necesita un cliente identificado.');
  }
  const total = linesTotal(input.lines) + Math.max(0, input.shippingCost);
  if (input.paidAmount < 0 || input.paidAmount > total) return fail('DATOS_INCOMPLETOS', 'El abono no puede superar el total.');
  const order: Order = {
    id: `ord-${uuid()}`,
    number: nextNumber(orders),
    createdAt: now.toISOString(),
    createdById: actor.id,
    createdByName: actor.name,
    customerId: input.customerId,
    customerName: input.customerName,
    fulfillment: input.fulfillment,
    address: input.address.trim(),
    scheduledFor: input.scheduledFor,
    slot: input.slot,
    assigneeId: input.assigneeId,
    assigneeName: input.assigneeName,
    shippingCost: Math.max(0, input.shippingCost),
    notes: input.notes.trim(),
    priority: input.priority ?? 'normal',
    lines: input.lines.map((l) => ({ ...l, packed: 0, missing: 0, missingNote: '' })),
    total,
    paymentState: input.paymentState,
    paidAmount: input.paymentState === 'pagado' ? total : input.paidAmount,
    saleId: input.saleId,
    status: 'pendiente',
    qualityChecked: false,
    history: [],
  };
  return ok({ ...order, history: log(order, actor, 'creado', input.saleId ? 'Venta cobrada, entrega programada' : 'Pedido creado', now) });
};

const need = (o: Order, allowed: OrderStatus[], action: string): Res<Order> | null =>
  allowed.includes(o.status) ? null : fail('ESTADO_INVALIDO', `No se puede ${action} un pedido ${statusLabels[o.status].toLowerCase()}.`);

export const takeOrder = (o: Order, actor: Actor, now: Date): Res<Order> =>
  need(o, ['pendiente'], 'tomar') ?? ok({
    ...o, status: 'en-proceso', assigneeId: o.assigneeId ?? actor.id, assigneeName: o.assigneeName || actor.name,
    history: log(o, actor, 'tomado', 'Preparación iniciada', now),
  });

/** Registra unidades empacadas (progreso parcial permitido; corrige a la baja también). */
export const setPacked = (o: Order, productId: string, packed: number, actor: Actor, now: Date): Res<Order> => {
  const blocked = need(o, ['en-proceso', 'problema'], 'empacar');
  if (blocked) return blocked;
  const line = o.lines.find((l) => l.productId === productId);
  if (!line) return fail('NO_ENCONTRADO', 'El producto no está en el pedido.');
  if (!Number.isInteger(packed) || packed < 0 || packed > line.quantity - line.missing) {
    return fail('CANTIDAD_INVALIDA', `Empacado debe estar entre 0 y ${line.quantity - line.missing}.`);
  }
  return ok({
    ...o,
    qualityChecked: false,
    lines: o.lines.map((l) => (l.productId === productId ? { ...l, packed } : l)),
    history: log(o, actor, 'empaque', `${line.name}: ${packed}/${line.quantity}`, now),
  });
};

export const reportMissing = (o: Order, productId: string, missing: number, note: string, actor: Actor, now: Date): Res<Order> => {
  const blocked = need(o, ['en-proceso', 'problema'], 'reportar faltantes en');
  if (blocked) return blocked;
  const line = o.lines.find((l) => l.productId === productId);
  if (!line) return fail('NO_ENCONTRADO', 'El producto no está en el pedido.');
  if (!Number.isInteger(missing) || missing <= 0 || missing > line.quantity) {
    return fail('CANTIDAD_INVALIDA', `El faltante debe estar entre 1 y ${line.quantity}.`);
  }
  return ok({
    ...o,
    status: 'problema',
    qualityChecked: false,
    lines: o.lines.map((l) =>
      l.productId === productId ? { ...l, missing, packed: Math.min(l.packed, l.quantity - missing), missingNote: note.trim() } : l,
    ),
    history: log(o, actor, 'faltante', `${line.name}: faltan ${missing}`, now),
  });
};

/** El faltante se resolvió (existencia interna encontrada o compra recibida): vuelve a preparación. */
export const resolveMissing = (o: Order, productId: string, actor: Actor, now: Date): Res<Order> => {
  const blocked = need(o, ['problema'], 'resolver faltantes de');
  if (blocked) return blocked;
  const line = o.lines.find((l) => l.productId === productId);
  if (!line || line.missing === 0) return fail('NO_ENCONTRADO', 'Ese producto no tiene faltante.');
  const lines = o.lines.map((l) => (l.productId === productId ? { ...l, missing: 0, missingNote: '' } : l));
  const stillMissing = lines.some((l) => l.missing > 0);
  return ok({
    ...o, lines, status: stillMissing ? 'problema' : 'en-proceso',
    history: log(o, actor, 'faltante-resuelto', line.name, now),
  });
};

/** Control de calidad: solo con todo empacado y sin faltantes. */
export const verify = (o: Order, actor: Actor, now: Date): Res<Order> => {
  const blocked = need(o, ['en-proceso'], 'verificar');
  if (blocked) return blocked;
  if (o.lines.some((l) => l.missing > 0)) return fail('FALTANTES', 'Hay faltantes sin resolver.');
  if (o.lines.some((l) => l.packed !== l.quantity)) return fail('FALTANTES', 'Todavía hay productos sin empacar completos.');
  return ok({ ...o, status: 'listo', qualityChecked: true, history: log(o, actor, 'verificado', 'Pedido listo', now) });
};

export const registerPayment = (o: Order, amount: number, actor: Actor, now: Date): Res<Order> => {
  if (!isOpen(o)) return fail('ESTADO_INVALIDO', 'El pedido ya no admite pagos.');
  if (!Number.isInteger(amount) || amount <= 0) return fail('CANTIDAD_INVALIDA', 'El valor debe ser un entero mayor que 0.');
  if (amount > balanceOf(o)) return fail('CANTIDAD_INVALIDA', 'El pago supera el saldo del pedido.');
  const paid = o.paidAmount + amount;
  return ok({
    ...o, paidAmount: paid, paymentState: paid >= o.total ? 'pagado' : 'abono',
    history: log(o, actor, 'pago', `${amount}`, now),
  });
};

/** Vincula el cobro hecho en caja con el pedido (sin cobrar dos veces). */
export const markCharged = (o: Order, saleId: string, actor: Actor, now: Date): Res<Order> => {
  if (!isOpen(o)) return fail('ESTADO_INVALIDO', 'El pedido ya no admite pagos.');
  return ok({
    ...o, saleId, paidAmount: o.total, paymentState: 'pagado',
    history: log(o, actor, 'cobrado', `Venta ${saleId}`, now),
  });
};

export const dispatch = (o: Order, actor: Actor, now: Date): Res<Order> => {
  const blocked = need(o, ['listo'], 'despachar');
  if (blocked) return blocked;
  if (o.paymentState !== 'pagado' && o.paymentState !== 'credito') {
    return fail('SALDO_PENDIENTE', `Hay un saldo de ${balanceOf(o)} sin cobrar ni crédito autorizado.`);
  }
  return ok({ ...o, status: 'despachado', history: log(o, actor, 'despachado', fulfillmentLabels[o.fulfillment], now) });
};

export const deliver = (o: Order, actor: Actor, now: Date): Res<Order> =>
  need(o, ['despachado'], 'entregar') ?? ok({ ...o, status: 'entregado', history: log(o, actor, 'entregado', '', now) });

export const cancelOrder = (o: Order, reason: string, actor: Actor, now: Date): Res<Order> => {
  const blocked = need(o, ['pendiente', 'en-proceso', 'problema', 'listo'], 'cancelar');
  if (blocked) return blocked;
  if (o.paidAmount > 0) return fail('TIENE_PAGOS', 'El pedido tiene pagos: requiere devolución, no cancelación directa.');
  if (reason.trim() === '') return fail('DATOS_INCOMPLETOS', 'Escribe el motivo de la cancelación.');
  return ok({ ...o, status: 'cancelado', history: log(o, actor, 'cancelado', reason.trim(), now) });
};

export const counts = (orders: Order[]): Record<Semaphore, number> => {
  const c: Record<Semaphore, number> = { pendiente: 0, proceso: 0, problema: 0, listo: 0 };
  for (const o of orders) {
    const s = semaphoreOf(o);
    if (s) c[s] += 1;
  }
  return c;
};

/** Pedidos con dinero por cobrar (para "Cobros pendientes"). */
export const withBalance = (orders: Order[]): Order[] =>
  orders.filter((o) => isOpen(o) && o.paymentState !== 'pagado' && o.paymentState !== 'credito' && balanceOf(o) > 0);
