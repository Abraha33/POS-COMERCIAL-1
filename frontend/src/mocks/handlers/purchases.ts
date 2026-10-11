import { http, HttpResponse } from 'msw';
import { purchaseOrderCreateSchema, supplierInputSchema, type PurchaseOrder, type Role } from '@/shared/contracts';
import { db, mockNow, nextId } from '../db';
import { authenticate, failure, forbidden, notFound, unauthorized, validationError } from '../http';

const BUYER_ROLES: Role[] = ['comprador', 'admin', 'propietario'];
const DAY_MS = 24 * 3600 * 1000;

const addDays = (isoDate: string, days: number): string =>
  new Date(new Date(isoDate).getTime() + days * DAY_MS).toISOString().slice(0, 10);

export const purchaseHandlers = [
  http.post('/api/v1/suppliers', async ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!BUYER_ROLES.includes(user.role)) return forbidden();
    const parsed = supplierInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Proveedor con formato inválido');
    if (db.suppliers.some((s) => s.taxId === parsed.data.taxId)) {
      return failure(409, 'SUPPLIER_DUPLICATED', 'Ya existe un proveedor con ese documento');
    }
    const supplier = { id: `sup-${String(db.suppliers.length + 1).padStart(3, '0')}`, ...parsed.data };
    db.suppliers.push(supplier);
    return HttpResponse.json(supplier, { status: 201 });
  }),

  http.put('/api/v1/suppliers/:id', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!BUYER_ROLES.includes(user.role)) return forbidden();
    const parsed = supplierInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Proveedor con formato inválido');
    const index = db.suppliers.findIndex((s) => s.id === params.id);
    if (index === -1) return notFound('Proveedor');
    const supplier = { id: String(params.id), ...parsed.data };
    db.suppliers[index] = supplier;
    return HttpResponse.json(supplier);
  }),

  http.post('/api/v1/purchase-orders', async ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!BUYER_ROLES.includes(user.role)) return forbidden();
    const parsed = purchaseOrderCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Orden con formato inválido');
    const { supplierId, lines } = parsed.data;
    if (!db.suppliers.some((s) => s.id === supplierId && s.active)) return validationError('Proveedor inexistente o inactivo');
    for (const l of lines) {
      if (!db.products.some((p) => p.id === l.productId)) return validationError(`Producto inexistente: ${l.productId}`);
    }
    const index = db.purchaseOrders.length + 1;
    const order: PurchaseOrder = {
      id: `po-${String(index).padStart(3, '0')}`,
      number: `PO-${String(index).padStart(4, '0')}`,
      date: mockNow().toISOString().slice(0, 10),
      supplierId,
      lines,
      total: Math.round(lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0)),
      status: 'borrador',
    };
    db.purchaseOrders.push(order);
    return HttpResponse.json(order, { status: 201 });
  }),

  http.post('/api/v1/purchase-orders/:id/send', ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!BUYER_ROLES.includes(user.role)) return forbidden();
    const order = db.purchaseOrders.find((o) => o.id === params.id);
    if (!order) return notFound('Orden');
    if (order.status !== 'borrador') {
      return failure(409, 'INVALID_STATE', `La orden está ${order.status}; solo se envía un borrador`);
    }
    order.status = 'enviada';
    return HttpResponse.json(order);
  }),

  // BR-PRO-06: la recepción recalcula el costo promedio ponderado y abre la cuenta por pagar.
  http.post('/api/v1/purchase-orders/:id/receive', ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!BUYER_ROLES.includes(user.role) && user.role !== 'bodeguero') return forbidden();
    const order = db.purchaseOrders.find((o) => o.id === params.id);
    if (!order) return notFound('Orden');
    if (order.status !== 'enviada') {
      return failure(409, 'INVALID_STATE', `La orden está ${order.status}; solo se recibe una enviada`);
    }

    const today = mockNow().toISOString().slice(0, 10);
    for (const line of order.lines) {
      const product = db.products.find((p) => p.id === line.productId);
      let level = db.stockLevels.find((l) => l.productId === line.productId && l.branchId === user.branchId);
      if (!level) {
        level = { productId: line.productId, branchId: user.branchId, onHand: 0, inTransit: 0, minimum: 0 };
        db.stockLevels.push(level);
      }
      if (product) {
        const onHand = Math.max(0, level.onHand);
        product.cost = Math.round((onHand * product.cost + line.quantity * line.unitCost) / (onHand + line.quantity));
      }
      level.onHand += line.quantity;
      db.stockMovements.push({
        id: nextId('stk'), date: today, productId: line.productId, branchId: user.branchId,
        type: 'entrada', quantity: line.quantity, reference: order.number,
      });
    }

    const supplier = db.suppliers.find((s) => s.id === order.supplierId);
    db.payables.push({
      id: nextId('pay'), supplierId: order.supplierId, purchaseOrderId: order.id, issued: today,
      due: addDays(today, supplier?.paymentTermsDays ?? 30), amount: order.total, paid: 0,
    });
    order.status = 'recibida';
    return HttpResponse.json(order);
  }),
];
