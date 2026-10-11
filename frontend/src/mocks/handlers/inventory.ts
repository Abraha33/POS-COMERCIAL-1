import { http, HttpResponse } from 'msw';
import {
  inventoryCountCreateSchema, stockAdjustmentCreateSchema, transferCreateSchema, type InventoryCount,
  type StockAdjustmentResult, type StockMovement, type Transfer,
} from '@/shared/contracts';
import { db, mockNow, nextId } from '../db';
import {
  authenticate, failure, forbidden, hasPermission, notFound, unauthorized, validationError,
} from '../http';

const level = (productId: string, branchId: string) => {
  let found = db.stockLevels.find((l) => l.productId === productId && l.branchId === branchId);
  if (!found) {
    found = { productId, branchId, onHand: 0, inTransit: 0, minimum: 0 };
    db.stockLevels.push(found);
  }
  return found;
};


/** BR-INV-02: un ajuste que deja la existencia en 0 o más resuelve las alertas STOCK_NEGATIVE de esa sede. */
const resolveAlerts = (productId: string, branchId: string): string[] => {
  if (level(productId, branchId).onHand < 0) return [];
  const resolved: string[] = [];
  for (const alert of db.alerts) {
    if (!alert.resolved && alert.productId === productId && alert.branchId === branchId) {
      alert.resolved = true;
      resolved.push(alert.id);
    }
  }
  return resolved;
};

const pushAdjustment = (productId: string, branchId: string, quantity: number, reference: string): StockMovement => {
  const movement: StockMovement = {
    id: nextId('stk'), date: mockNow().toISOString().slice(0, 10), productId, branchId, type: 'ajuste', quantity,
    reference,
  };
  level(productId, branchId).onHand += quantity;
  db.stockMovements.push(movement);
  return movement;
};

export const inventoryHandlers = [
  http.get('/api/v1/stock/levels', () => HttpResponse.json(db.stockLevels)),
  http.get('/api/v1/stock/movements', () => HttpResponse.json(db.stockMovements)),
  http.get('/api/v1/inventory/alerts', () => HttpResponse.json(db.alerts)),
  http.get('/api/v1/inventory/transfers', () => HttpResponse.json(db.transfers)),

  // BR-INV-03 paso 1: descuenta de origen y deja las unidades en tránsito en destino.
  http.post('/api/v1/inventory/transfers', async ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (user.role === 'cajero') return forbidden();
    const parsed = transferCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Traslado con formato inválido');
    const { fromBranchId, toBranchId, lines } = parsed.data;
    if (fromBranchId === toBranchId) return validationError('Origen y destino deben ser distintos');

    for (const l of lines) {
      if (!db.products.some((p) => p.id === l.productId)) return validationError(`Producto inexistente: ${l.productId}`);
      const available = level(l.productId, fromBranchId).onHand;
      if (available < l.quantity) {
        return failure(409, 'STOCK_INSUFFICIENT', 'Existencias insuficientes en la sede origen', {
          productId: l.productId, available, requested: l.quantity,
        });
      }
    }

    const sentAt = mockNow().toISOString();
    const transfer: Transfer = {
      id: nextId('trf'), number: `TRF-${String(db.transfers.length + 1).padStart(4, '0')}`,
      fromBranchId, toBranchId, lines, status: 'enviado', sentAt, receivedAt: null,
    };
    for (const l of lines) {
      level(l.productId, fromBranchId).onHand -= l.quantity;
      level(l.productId, toBranchId).inTransit += l.quantity;
      db.stockMovements.push({
        id: nextId('stk'), date: sentAt.slice(0, 10), productId: l.productId, branchId: fromBranchId,
        type: 'traslado_envio', quantity: l.quantity, reference: transfer.number,
      });
    }
    db.transfers.push(transfer);
    return HttpResponse.json(transfer, { status: 201 });
  }),

  // BR-INV-03 paso 2 / BR-INV-04: solo el encargado de la sede destino (o el propietario).
  http.post('/api/v1/inventory/transfers/:id/receive', ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    const transfer = db.transfers.find((t) => t.id === params.id);
    if (!transfer) return notFound('Traslado');
    const isDestinationManager = user.branchId === transfer.toBranchId && user.role !== 'cajero';
    if (!isDestinationManager && user.role !== 'propietario') return forbidden('Solo la sede destino puede recibir');
    if (transfer.status === 'recibido') {
      return failure(409, 'TRANSFER_ALREADY_RECEIVED', 'El traslado ya fue recibido');
    }

    const receivedAt = mockNow().toISOString();
    for (const l of transfer.lines) {
      const destination = level(l.productId, transfer.toBranchId);
      destination.inTransit = Math.max(0, destination.inTransit - l.quantity);
      destination.onHand += l.quantity;
      db.stockMovements.push({
        id: nextId('stk'), date: receivedAt.slice(0, 10), productId: l.productId, branchId: transfer.toBranchId,
        type: 'traslado_recepcion', quantity: l.quantity, reference: transfer.number,
      });
    }
    transfer.status = 'recibido';
    transfer.receivedAt = receivedAt;
    return HttpResponse.json(transfer);
  }),

  // PROPUESTA v0.5.0: ajuste manual con signo (BR-INV-02/06).
  http.post('/api/v1/inventory/adjustments', async ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!hasPermission(user, 'inventory.adjust')) return forbidden();
    const parsed = stockAdjustmentCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Ajuste con formato inválido');
    const { productId, branchId, quantity, reason } = parsed.data;
    if (!db.products.some((p) => p.id === productId)) return validationError(`Producto inexistente: ${productId}`);
    if (!db.branches.some((b) => b.id === branchId)) return validationError('Sede inexistente');
    const isManager = user.role === 'admin' || user.role === 'propietario';
    if (!isManager && user.branchId !== branchId) return forbidden('Solo puedes ajustar el inventario de tu sede');

    const available = level(productId, branchId).onHand;
    if (available + quantity < 0) {
      return failure(409, 'STOCK_INSUFFICIENT', 'El ajuste dejaría la existencia por debajo de cero', {
        productId, available, requested: quantity,
      });
    }
    const movement = pushAdjustment(productId, branchId, quantity, `Ajuste: ${reason.trim()}`);
    const result: StockAdjustmentResult = {
      movement, level: { ...level(productId, branchId) }, resolvedAlertIds: resolveAlerts(productId, branchId),
    };
    return HttpResponse.json(result, { status: 201 });
  }),

  // PROPUESTA v0.5.0: conteo físico; cada diferencia genera un ajuste.
  http.post('/api/v1/inventory/counts', async ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!hasPermission(user, 'inventory.adjust')) return forbidden();
    const parsed = inventoryCountCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Conteo con formato inválido');
    const { branchId, lines } = parsed.data;
    if (!db.branches.some((b) => b.id === branchId)) return validationError('Sede inexistente');
    const isManager = user.role === 'admin' || user.role === 'propietario';
    if (!isManager && user.branchId !== branchId) return forbidden('Solo puedes contar el inventario de tu sede');
    for (const l of lines) {
      if (!db.products.some((p) => p.id === l.productId)) return validationError(`Producto inexistente: ${l.productId}`);
    }
    if (new Set(lines.map((l) => l.productId)).size !== lines.length) {
      return validationError('Un producto aparece más de una vez en el conteo');
    }

    const number = `CNT-${String(db.inventoryCounts.length + 1).padStart(4, '0')}`;
    const resolvedAlertIds: string[] = [];
    const countLines: InventoryCount['lines'] = lines.map((l) => {
      const systemQuantity = level(l.productId, branchId).onHand;
      const difference = Math.round((l.counted - systemQuantity) * 1000) / 1000;
      let movementId: string | null = null;
      if (difference !== 0) {
        movementId = pushAdjustment(l.productId, branchId, difference, `Conteo ${number}`).id;
        resolvedAlertIds.push(...resolveAlerts(l.productId, branchId));
      }
      return { productId: l.productId, systemQuantity, counted: l.counted, difference, movementId };
    });
    const count: InventoryCount = {
      id: nextId('cnt'), number, branchId, date: mockNow().toISOString().slice(0, 10), lines: countLines,
      resolvedAlertIds,
    };
    db.inventoryCounts.push(count);
    return HttpResponse.json(count, { status: 201 });
  }),
];
