import { http, HttpResponse } from 'msw';
import { transferCreateSchema, type Transfer } from '@/shared/contracts';
import { db, mockNow, nextId } from '../db';
import { authenticate, failure, forbidden, notFound, unauthorized, validationError } from '../http';

const level = (productId: string, branchId: string) => {
  let found = db.stockLevels.find((l) => l.productId === productId && l.branchId === branchId);
  if (!found) {
    found = { productId, branchId, onHand: 0, inTransit: 0, minimum: 0 };
    db.stockLevels.push(found);
  }
  return found;
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
];
