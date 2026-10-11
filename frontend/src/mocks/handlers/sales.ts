import { http, HttpResponse } from 'msw';
import {
  saleCreateSchema, saleReturnCreateSchema, saleVoidSchema, type InventoryAlert, type Sale, type SaleCreate,
  type SaleReceipt, type SaleReturn,
} from '@/shared/contracts';
import { computeTotals, lineGross } from '@/shared/utils/pricing';
import { db, mockNow, nextId, state } from '../db';
import {
  authenticate, canRefund, canSell, discountCap, failure, forbidden, notFound, unauthorized, validationError,
} from '../http';

const GRACE_DAYS = 3;
const CREDIT_TERM_DAYS = 30;
const DAY_MS = 24 * 3600 * 1000;

const addDays = (isoDate: string, days: number): string =>
  new Date(new Date(isoDate).getTime() + days * DAY_MS).toISOString().slice(0, 10);

const stockLevel = (productId: string, branchId: string) => {
  let level = db.stockLevels.find((l) => l.productId === productId && l.branchId === branchId);
  if (!level) {
    level = { productId, branchId, onHand: 0, inTransit: 0, minimum: 0 };
    db.stockLevels.push(level);
  }
  return level;
};

const raiseNegativeAlert = (productId: string, branchId: string) => {
  const exists = db.alerts.some((a) => a.productId === productId && a.branchId === branchId && !a.resolved);
  if (exists) return;
  const alert: InventoryAlert = {
    id: nextId('alt'), type: 'STOCK_NEGATIVE', productId, branchId, createdAt: mockNow().toISOString(), resolved: false,
  };
  db.alerts.push(alert);
};

/** Huella estable del cuerpo para detectar reutilización de la clave de idempotencia (BR-VEN-11). */
const fingerprint = (body: SaleCreate): string => JSON.stringify(body);

export const saleHandlers = [
  http.get('/api/v1/sales', () => HttpResponse.json(db.sales)),

  http.post('/api/v1/pos/sales', async ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!canSell(user.role)) return forbidden();

    const parsed = saleCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Venta con formato inválido', { issues: parsed.error.issues.length });
    const body = parsed.data;

    const key = request.headers.get('Idempotency-Key');
    if (key !== body.clientOperationId) {
      return validationError('Idempotency-Key debe ser igual a clientOperationId');
    }

    // BR-VEN-11: repetir la misma operación devuelve la misma venta.
    const previous = state.idempotency.get(key);
    if (previous) {
      if (previous.fingerprint !== fingerprint(body)) {
        return failure(409, 'IDEMPOTENCY_KEY_REUSED', 'La clave ya se usó con otro contenido');
      }
      return HttpResponse.json(previous.receipt, { status: 200 });
    }

    // BR-VEN-01
    const shift = db.shifts.find((s) => s.id === body.shiftId);
    if (!shift || shift.status !== 'open') {
      return failure(409, 'SHIFT_NOT_OPEN', 'No hay un turno de caja abierto para esta venta');
    }

    // Líneas con precio del servidor (BR-VEN-02).
    const lines = [];
    for (const line of body.lines) {
      const product = db.products.find((p) => p.id === line.productId);
      if (!product) return validationError(`Producto inexistente: ${line.productId}`);
      if (!product.active) {
        return failure(409, 'PRODUCT_INACTIVE', `Producto inactivo: ${product.sku}`, { productId: product.id });
      }
      const priced = { unitPrice: product.price, quantity: line.quantity, discount: line.discount };
      if (line.discount > lineGross(priced)) {
        return validationError('El descuento supera el valor de la línea', { productId: product.id });
      }
      lines.push({ product, ...priced });
    }

    const token = body.approvalToken ? state.approvals.get(body.approvalToken) : undefined;
    type ApprovalAction = 'discount' | 'negative_stock' | 'below_cost';
    /** `accepted`: acciones cuyo token vale para esta comprobación (el de below_cost, solo del propietario, cubre descuento). */
    const needApproval = (accepted: ApprovalAction[]) => {
      if (!body.approvalToken) {
        return failure(409, 'APPROVAL_REQUIRED', 'Esta operación requiere PIN de supervisor', { action: accepted[0] });
      }
      if (!token || token.used || !accepted.includes(token.action)) {
        return failure(409, 'APPROVAL_INVALID', 'La aprobación no es válida para esta operación', {
          action: accepted[0],
        });
      }
      return null;
    };
    let approvalUsed = false;

    // BR-VEN-04: descuentos por rol.
    const maxDiscount = Math.max(0, ...lines.map((l) => (lineGross(l) > 0 ? l.discount / lineGross(l) : 0)));
    if (maxDiscount > discountCap(user.role) + 1e-9) {
      const rejected = needApproval(['discount', 'below_cost']);
      if (rejected) return rejected;
      if (token && discountCap(token.supervisorRole) + 1e-9 < maxDiscount) {
        return failure(409, 'DISCOUNT_NOT_ALLOWED', 'El descuento supera lo que el supervisor puede autorizar', {
          requested: maxDiscount,
        });
      }
      approvalUsed = true;
    }

    // BR-VEN-14: nunca bajo el costo promedio salvo autorización del propietario.
    const belowCost = lines.some((l) => l.quantity > 0 && (lineGross(l) - l.discount) / l.quantity < l.product.cost);
    if (belowCost && user.role !== 'propietario') {
      const authorized = token && !token.used && token.action === 'below_cost';
      if (!authorized) {
        return failure(409, 'PRICE_BELOW_COST', 'El precio final queda por debajo del costo promedio');
      }
      approvalUsed = true;
    }

    // BR-VEN-05 / BR-VEN-13: stock.
    const wanted = new Map<string, number>();
    for (const l of lines) wanted.set(l.product.id, (wanted.get(l.product.id) ?? 0) + l.quantity);
    const short = [...wanted].filter(([productId, qty]) => stockLevel(productId, shift.branchId).onHand < qty);
    if (short.length > 0 && !body.offline) {
      if (!body.approvalToken) {
        return failure(409, 'STOCK_INSUFFICIENT', 'Existencias insuficientes', {
          items: short.map(([productId, qty]) => ({
            productId, requested: qty, available: stockLevel(productId, shift.branchId).onHand,
          })),
        });
      }
      const rejected = needApproval(['negative_stock']);
      if (rejected) return rejected;
      approvalUsed = true;
    }

    // Totales (BR-GEN-05) y pagos (BR-VEN-06).
    const cashAmount = body.payments.filter((p) => p.method === 'efectivo').reduce((s, p) => s + p.amount, 0);
    const creditAmount = body.payments.filter((p) => p.method === 'credito').reduce((s, p) => s + p.amount, 0);
    const totals = computeTotals(lines, cashAmount > 0);
    const paid = body.payments.reduce((s, p) => s + p.amount, 0);
    if (paid < totals.total) {
      return failure(409, 'PAYMENT_INSUFFICIENT', 'Los pagos no cubren el total', { total: totals.total, paid });
    }
    const change = paid - totals.total;
    if (change > cashAmount) {
      return validationError('El excedente solo puede devolverse en efectivo', { change, cashAmount });
    }

    // BR-VEN-07 / BR-CLI-02..06: crédito.
    if (creditAmount > 0) {
      const customer = body.customerId ? db.customers.find((c) => c.id === body.customerId) : undefined;
      if (!customer) return validationError('El crédito exige un cliente identificado');
      const today = mockNow().toISOString().slice(0, 10);
      const open = db.receivables.filter((r) => r.customerId === customer.id && r.paid < r.amount);
      if (open.some((r) => addDays(r.due, GRACE_DAYS) < today)) {
        return failure(409, 'CUSTOMER_BLOCKED_OVERDUE', 'El cliente tiene facturas vencidas', { customerId: customer.id });
      }
      const outstanding = open.reduce((s, r) => s + (r.amount - r.paid), 0);
      if (outstanding + creditAmount > customer.creditLimit) {
        return failure(409, 'CREDIT_LIMIT_EXCEEDED', 'La venta supera el cupo de crédito', {
          creditLimit: customer.creditLimit, outstanding, requested: creditAmount,
        });
      }
    }

    // --- Confirmación ---
    if (approvalUsed && token) token.used = true;
    const index = db.sales.length + 1;
    const date = (body.occurredAt ?? mockNow().toISOString()).slice(0, 10);
    const sale: Sale = {
      id: `sal-${String(index).padStart(3, '0')}`,
      number: `POS-${String(index).padStart(4, '0')}`,
      date,
      customerId: body.customerId,
      cashierId: user.id,
      branchId: shift.branchId,
      lines: lines.map((l) => ({
        productId: l.product.id, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount,
      })),
      payments: body.payments,
      roundingAdjustment: totals.roundingAdjustment,
      total: totals.total,
      status: creditAmount > 0 ? 'credito' : 'pagada',
    };
    db.sales.push(sale);

    for (const l of lines) {
      const level = stockLevel(l.product.id, shift.branchId);
      level.onHand -= l.quantity;
      db.stockMovements.push({
        id: nextId('stk'), date, productId: l.product.id, branchId: shift.branchId, type: 'salida',
        quantity: l.quantity, reference: sale.number,
      });
      if (level.onHand < 0) raiseNegativeAlert(l.product.id, shift.branchId);
    }

    if (creditAmount > 0 && body.customerId) {
      db.receivables.push({
        id: nextId('rec'), customerId: body.customerId, saleId: sale.id, issued: date,
        due: addDays(date, CREDIT_TERM_DAYS), amount: creditAmount, paid: 0,
      });
    }

    const cashNet = cashAmount - change;
    shift.expectedCash += cashNet;
    state.saleMeta.set(sale.id, { shiftId: shift.id, cashNet, branchId: shift.branchId });

    const receipt: SaleReceipt = { ...sale, clientOperationId: body.clientOperationId, change };
    state.idempotency.set(body.clientOperationId, { fingerprint: fingerprint(body), receipt });
    return HttpResponse.json(receipt, { status: 201 });
  }),

  // PROPUESTA (docs/business-rules/07-devoluciones.md): devolución parcial.
  http.post('/api/v1/pos/sales/:id/returns', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!canSell(user.role)) return forbidden();
    const sale = db.sales.find((s) => s.id === params.id);
    if (!sale) return notFound('Venta');
    const parsed = saleReturnCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('La devolución exige líneas y motivo');
    if (sale.status === 'anulada') return failure(409, 'SALE_ALREADY_VOIDED', 'La venta está anulada');

    const alreadyReturned = (productId: string) =>
      db.saleReturns.filter((r) => r.saleId === sale.id)
        .flatMap((r) => r.lines).filter((l) => l.productId === productId)
        .reduce((sum, l) => sum + l.quantity, 0);

    const lines: SaleReturn['lines'] = [];
    for (const requested of parsed.data.lines) {
      const sold = sale.lines.find((l) => l.productId === requested.productId);
      if (!sold) return validationError(`El producto no está en la venta: ${requested.productId}`);
      const available = sold.quantity - alreadyReturned(requested.productId);
      if (requested.quantity > available + 1e-9) {
        return failure(409, 'RETURN_EXCEEDS_SOLD', 'La devolución supera lo vendido', {
          productId: requested.productId, available, requested: requested.quantity,
        });
      }
      // Descuento proporcional a la cantidad devuelta.
      const gross = sold.unitPrice * requested.quantity;
      const discount = (sold.discount * requested.quantity) / sold.quantity;
      lines.push({ productId: requested.productId, quantity: requested.quantity, amount: Math.round(gross - discount) });
    }

    const date = mockNow().toISOString().slice(0, 10);
    const meta = state.saleMeta.get(sale.id);
    const branchId = meta?.branchId ?? sale.branchId;
    const saleReturn: SaleReturn = {
      id: nextId('ret'),
      number: `DEV-${String(db.saleReturns.length + 1).padStart(4, '0')}`,
      saleId: sale.id,
      date,
      lines,
      total: lines.reduce((sum, l) => sum + l.amount, 0),
      reason: parsed.data.reason,
    };
    db.saleReturns.push(saleReturn);

    for (const l of lines) {
      stockLevel(l.productId, branchId).onHand += l.quantity;
      db.stockMovements.push({
        id: nextId('stk'), date, productId: l.productId, branchId, type: 'entrada',
        quantity: l.quantity, reference: `${saleReturn.number} (devolución de ${sale.number})`,
      });
    }

    // El efectivo devuelto sale de la caja si el turno de la venta sigue abierto.
    const shift = meta ? db.shifts.find((s) => s.id === meta.shiftId) : undefined;
    if (shift?.status === 'open' && meta) {
      const refund = Math.min(saleReturn.total, meta.cashNet);
      shift.expectedCash -= refund;
      meta.cashNet -= refund;
    }
    return HttpResponse.json(saleReturn, { status: 201 });
  }),

  // BR-VEN-10
  http.post('/api/v1/pos/sales/:id/void', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    const sale = db.sales.find((s) => s.id === params.id);
    if (!sale) return notFound('Venta');
    const parsed = saleVoidSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('La anulación exige un motivo');
    if (sale.status === 'anulada') return failure(409, 'SALE_ALREADY_VOIDED', 'La venta ya está anulada');

    const meta = state.saleMeta.get(sale.id);
    const shift = meta ? db.shifts.find((s) => s.id === meta.shiftId) : undefined;
    const shiftOpen = shift?.status === 'open';
    if (!canRefund(user.role) && !(shiftOpen && canSell(user.role))) return forbidden();

    sale.status = 'anulada';
    const branchId = meta?.branchId ?? sale.branchId;
    for (const line of sale.lines) {
      stockLevel(line.productId, branchId).onHand += line.quantity;
      db.stockMovements.push({
        id: nextId('stk'), date: mockNow().toISOString().slice(0, 10), productId: line.productId, branchId,
        type: 'entrada', quantity: line.quantity, reference: `${sale.number} (anulación)`,
      });
    }
    db.receivables = db.receivables.filter((r) => r.saleId !== sale.id);
    if (shift && shiftOpen && meta) shift.expectedCash -= meta.cashNet;
    return HttpResponse.json(sale);
  }),
];
