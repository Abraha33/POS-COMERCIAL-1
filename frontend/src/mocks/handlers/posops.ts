import { http, HttpResponse } from 'msw';
import {
  authorizationCreateSchema, authorizationDecisionSchema, posOrderCreateSchema, posOrderTransitionSchema,
  shiftHandoverRequestSchema, syncBatchSchema,
  type AuthorizationRequest, type CustodyEntry, type PosOrder, type SyncOperationResult,
} from '@/shared/contracts';
import { db, mockNow, nextId, state } from '../db';
import { authenticate, canSell, failure, forbidden, isSupervisor, notFound, unauthorized, validationError } from '../http';

/** Capa 5 (PROPUESTA v0.6.0). Reglas del servidor que el cliente hoy solo simula en `features/pos-ops` y `pos/orders`. */

const AUTH_TTL_MS = 15 * 60 * 1000;
const AUTH_VALID_MS = 10 * 60 * 1000;
const KNOWN_KINDS = [
  'buscar-catalogo', 'preparar-carrito', 'suspender-carrito', 'venta-efectivo', 'verificar-transferencia', 'cobro-tarjeta',
  'credito-nuevo', 'documento-fiscal', 'movimiento-efectivo', 'autorizacion', 'apertura-relevo',
];
const SENSITIVE = ['pin', 'password', 'cardnumber', 'cvv', 'pan'];

const expireIfNeeded = (a: AuthorizationRequest): AuthorizationRequest => {
  if (a.status === 'pendiente' && Date.parse(a.expiresAt) < mockNow().getTime()) a.status = 'vencida';
  return a;
};

export const posOpsHandlers = [
  // ---------- Turnos: relevo ----------
  http.post('/api/v1/pos/shifts/:id/handover', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!canSell(user.role)) return forbidden();
    const parsed = shiftHandoverRequestSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Solicitud de relevo inválida');
    const shift = db.shifts.find((s) => s.id === params.id);
    if (!shift) return notFound('Turno');
    if (shift.status !== 'open') return failure(409, 'SHIFT_NOT_OPEN', 'El turno no está abierto');
    if (shift.cashierId !== user.id && !isSupervisor(user.role)) return forbidden('Solo el responsable del turno entrega la caja');
    const target = db.employees.find((e) => e.id === parsed.data.toEmployeeId);
    if (!target || !canSell(target.role)) return validationError('El receptor no puede operar una caja');
    if (target.id === shift.cashierId) return validationError('El receptor es el mismo responsable');

    const difference = parsed.data.countedCash - shift.expectedCash;
    let authorizationId: string | null = null;
    if (difference !== 0) {
      const auth = parsed.data.authorizationId ? state.authorizations.get(parsed.data.authorizationId) : undefined;
      if (!auth || auth.type !== 'relevo' || auth.status !== 'aprobada' || Date.parse(auth.validUntil ?? '') < mockNow().getTime()) {
        return failure(409, 'AUTHORIZATION_REQUIRED', 'La diferencia del arqueo exige una autorización aprobada', {
          expected: shift.expectedCash, counted: parsed.data.countedCash, difference,
        });
      }
      auth.status = 'ejecutada';
      auth.executedAt = mockNow().toISOString();
      authorizationId = auth.id;
    }
    const entry: CustodyEntry = {
      id: nextId('cust'), at: mockNow().toISOString(), fromId: shift.cashierId, toId: target.id,
      expectedCash: shift.expectedCash, countedCash: parsed.data.countedCash, difference,
      ...(parsed.data.note ? { note: parsed.data.note } : {}), authorizationId,
    };
    shift.cashierId = target.id;
    state.custody.push(entry);
    return HttpResponse.json(entry);
  }),

  // ---------- Autorizaciones ----------
  http.get('/api/v1/pos/authorizations', ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!canSell(user.role)) return forbidden();
    const status = new URL(request.url).searchParams.get('status');
    const list = [...state.authorizations.values()]
      .map(expireIfNeeded)
      .filter((a) => (isSupervisor(user.role) || a.requesterId === user.id) && (!status || a.status === status));
    return HttpResponse.json(list);
  }),

  http.post('/api/v1/pos/authorizations', async ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!canSell(user.role)) return forbidden();
    const parsed = authorizationCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Solicitud de autorización inválida');
    const now = mockNow();
    const created: AuthorizationRequest = {
      ...parsed.data, id: nextId('auth'), status: 'pendiente', requesterId: user.id,
      createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + AUTH_TTL_MS).toISOString(),
      decidedById: null, decidedAt: null, validUntil: null, executedAt: null,
    };
    state.authorizations.set(created.id, created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post('/api/v1/pos/authorizations/:id/decision', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!isSupervisor(user.role)) return forbidden('Solo un supervisor decide autorizaciones');
    const parsed = authorizationDecisionSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Decisión inválida');
    const auth = state.authorizations.get(String(params.id));
    if (!auth) return notFound('Autorización');
    if (auth.requesterId === user.id) return failure(403, 'SELF_APPROVAL', 'No puedes decidir tu propia solicitud');
    expireIfNeeded(auth);
    if (auth.status === 'vencida') return failure(410, 'AUTHORIZATION_EXPIRED', 'La solicitud venció');
    if (auth.status !== 'pendiente') return failure(409, 'INVALID_STATE', 'La solicitud ya fue resuelta');
    const now = mockNow();
    auth.status = parsed.data.decision === 'aprobar' ? 'aprobada' : 'rechazada';
    auth.decidedById = user.id;
    auth.decidedAt = now.toISOString();
    if (parsed.data.note) auth.decisionNote = parsed.data.note;
    if (auth.status === 'aprobada') auth.validUntil = new Date(now.getTime() + AUTH_VALID_MS).toISOString();
    return HttpResponse.json(auth);
  }),

  // ---------- Sincronización idempotente ----------
  http.post('/api/v1/pos/sync/batches', async ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!canSell(user.role)) return forbidden();
    const parsed = syncBatchSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Lote de sincronización inválido');

    const results: SyncOperationResult[] = [];
    for (const op of parsed.data.operations) {
      const known = state.syncLedger.get(op.idempotencyKey);
      if (known) {
        results.push(known); // reenvío: mismo resultado, nunca duplica
        continue;
      }
      const reject = (code: string, message: string): SyncOperationResult => {
        const r: SyncOperationResult = { idempotencyKey: op.idempotencyKey, status: 'rechazada', code, message };
        state.syncLedger.set(op.idempotencyKey, r);
        return r;
      };
      if (Object.keys(op.payload).some((k) => SENSITIVE.includes(k.toLowerCase()))) {
        results.push(reject('SENSITIVE_DATA', 'El payload no admite PIN ni datos de tarjeta'));
        continue;
      }
      if (!KNOWN_KINDS.includes(op.kind)) {
        results.push(reject('UNKNOWN_KIND', `Tipo de operación desconocido: ${op.kind}`));
        continue;
      }
      const pending = (op.dependsOn ?? []).filter((k) => state.syncLedger.get(k)?.status !== 'confirmada');
      if (pending.length > 0) {
        // No se guarda: se podrá reintentar cuando sus dependencias estén confirmadas.
        results.push({ idempotencyKey: op.idempotencyKey, status: 'reintentable', code: 'DEPENDENCY_PENDING', message: pending.join(', ') });
        continue;
      }
      const shift = db.shifts.find((s) => s.id === op.shiftId);
      if (!shift) {
        results.push(reject('SHIFT_NOT_FOUND', 'El turno de la operación no existe'));
        continue;
      }
      if (shift.status !== 'open') {
        const r: SyncOperationResult = { idempotencyKey: op.idempotencyKey, status: 'revision', code: 'SHIFT_CLOSED', message: 'El turno ya está cerrado: requiere revisión' };
        state.syncLedger.set(op.idempotencyKey, r);
        results.push(r);
        continue;
      }
      const ok: SyncOperationResult = { idempotencyKey: op.idempotencyKey, status: 'confirmada', remoteRef: nextId('sync') };
      state.syncLedger.set(op.idempotencyKey, ok);
      results.push(ok);
    }
    return HttpResponse.json({ results });
  }),

  // ---------- Pedidos ----------
  http.get('/api/v1/pos/orders', ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!canSell(user.role)) return forbidden();
    const status = new URL(request.url).searchParams.get('status');
    return HttpResponse.json([...state.orders.values()].filter((o) => !status || o.status === status));
  }),

  http.post('/api/v1/pos/orders', async ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!canSell(user.role)) return forbidden();
    const parsed = posOrderCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Pedido inválido');
    const products = parsed.data.lines.every((l) => db.products.some((p) => p.id === l.productId));
    if (!products) return validationError('El pedido incluye productos inexistentes');
    if (parsed.data.fulfillment === 'domicilio' && !parsed.data.address?.trim()) {
      return validationError('El domicilio exige dirección');
    }
    const goods = parsed.data.lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice), 0);
    const total = goods + (parsed.data.shippingCost ?? 0);
    let paidAmount = 0;
    if (parsed.data.saleId) {
      const sale = db.sales.find((s) => s.id === parsed.data.saleId);
      if (!sale) return notFound('Venta');
      paidAmount = Math.min(sale.total, total);
    }
    const index = state.orders.size + 1;
    const order: PosOrder = {
      ...parsed.data, id: nextId('ord'), number: `PED-${String(index).padStart(4, '0')}`, status: 'pendiente', total,
      paymentState: paidAmount >= total && total > 0 ? 'pagado' : paidAmount > 0 ? 'abono' : 'sin-pago',
      paidAmount, qualityChecked: false,
    };
    state.orders.set(order.id, order);
    return HttpResponse.json(order, { status: 201 });
  }),

  http.post('/api/v1/pos/orders/:id/transitions', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!canSell(user.role)) return forbidden();
    const parsed = posOrderTransitionSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Transición inválida');
    const order = state.orders.get(String(params.id));
    if (!order) return notFound('Pedido');
    const invalid = (what: string) => failure(409, 'ESTADO_INVALIDO', `No se puede ${what} un pedido ${order.status}`);
    const open = ['pendiente', 'en-proceso', 'problema', 'listo'];
    const { action } = parsed.data;

    switch (action) {
      case 'tomar':
        if (order.status !== 'pendiente') return invalid('tomar');
        order.status = 'en-proceso';
        break;
      case 'empacar':
        if (order.status !== 'en-proceso') return invalid('empacar');
        break;
      case 'reportar-faltante':
        if (order.status !== 'en-proceso') return invalid('reportar faltante en');
        order.status = 'problema';
        break;
      case 'resolver-faltante':
        if (order.status !== 'problema') return invalid('resolver faltante en');
        order.status = 'en-proceso';
        break;
      case 'verificar':
        if (order.status !== 'en-proceso') return invalid('verificar');
        order.qualityChecked = true;
        order.status = 'listo';
        break;
      case 'registrar-pago': {
        if (!open.includes(order.status) && order.status !== 'despachado') return invalid('registrar pago en');
        const amount = parsed.data.amount ?? 0;
        if (amount <= 0) return validationError('El pago debe ser mayor que cero');
        if (order.paidAmount + amount > order.total) return validationError('El pago supera el saldo del pedido');
        order.paidAmount += amount;
        order.paymentState = order.paidAmount >= order.total ? 'pagado' : 'abono';
        break;
      }
      case 'despachar':
        if (order.status !== 'listo') return invalid('despachar');
        if (order.paymentState !== 'pagado' && order.paymentState !== 'credito' && order.total - order.paidAmount > 0) {
          return failure(409, 'SALDO_PENDIENTE', 'El pedido tiene saldo pendiente', { balance: order.total - order.paidAmount });
        }
        order.status = 'despachado';
        break;
      case 'entregar':
        if (order.status !== 'despachado') return invalid('entregar');
        order.status = 'entregado';
        break;
      case 'cancelar':
        if (!open.includes(order.status)) return invalid('cancelar');
        if (order.paidAmount > 0) return failure(409, 'TIENE_PAGOS', 'El pedido tiene pagos: requiere devolución');
        if (!parsed.data.reason?.trim()) return validationError('Escribe el motivo de la cancelación');
        order.status = 'cancelado';
        break;
    }
    return HttpResponse.json(order);
  }),
];
