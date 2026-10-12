/**
 * Suite de conformidad del contrato (contracts/openapi.yaml + docs/business-rules).
 *
 * La MISMA suite corre contra:
 *  - los mocks MSW (src/tests/conformance.mock.test.ts) -> el mock cumple las reglas aprobadas;
 *  - el backend real (pnpm conformance con API_BASE_URL) -> el backend cumple el mismo contrato.
 *
 * Requisitos del entorno bajo prueba: cargado con contracts/fixtures (seed.json y users.json).
 * Los escenarios son independientes del orden (cada uno asegura su propio turno abierto).
 */
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  approvalSchema, apiErrorSchema, authorizationRequestSchema, custodyEntrySchema, posOrderSchema,
  syncBatchResultSchema, authSessionSchema, inventoryAlertSchema, receivableSchema, saleReceiptSchema,
  payableSchema, purchaseOrderSchema, saleReturnSchema, saleSchema, shiftSchema, stockLevelSchema, transferSchema, z,
  agingReportSchema, companySchema, customerPaymentResultSchema, customerSchema, inventoryCountSchema,
  inventoryValuationSchema, purchaseOrderReceiptSchema, receivablePaymentSchema, salesSummarySchema,
  stockAdjustmentResultSchema, stockMovementSchema,
  type SaleCreate, type Shift,
} from './contracts-bridge';
import { createSchemaValidator } from './spec';

type Result = { status: number; body: unknown };

const PASSWORD = 'cambiar-en-desarrollo';
const PINS = { admin: '1234', owner: '9999' } as const;

export const registerConformance = (target: string | (() => string)) => {
  const baseUrl = () => (typeof target === 'function' ? target() : target);
  const validateSchema = createSchemaValidator();

  const call = async (
    method: 'GET' | 'POST' | 'PUT', path: string,
    options: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<Result> => {
    const response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  const expectSchema = (schemaName: string, body: unknown) => {
    const result = validateSchema(schemaName, body);
    expect(result.valid, `${schemaName}: ${result.errors}`).toBe(true);
  };

  const expectError = (result: Result, status: number, code: string) => {
    expect(result.status, JSON.stringify(result.body)).toBe(status);
    const parsed = apiErrorSchema.parse(result.body);
    expect(parsed.code).toBe(code);
    expectSchema('Error', result.body);
  };

  const login = async (username: string): Promise<string> => {
    const result = await call('POST', '/auth/login', { body: { username, password: PASSWORD } });
    expect(result.status, JSON.stringify(result.body)).toBe(200);
    expectSchema('AuthSession', result.body);
    return authSessionSchema.parse(result.body).accessToken;
  };

  const ensureOpenShift = async (token: string): Promise<Shift> => {
    const current = await call('GET', '/pos/shifts/current', { token });
    if (current.status === 200) return shiftSchema.parse(current.body);
    expect(current.status).toBe(404);
    const opened = await call('POST', '/pos/shifts', { token, body: { registerId: 'reg-001', openingCash: 100000 } });
    expect(opened.status, JSON.stringify(opened.body)).toBe(201);
    expectSchema('Shift', opened.body);
    return shiftSchema.parse(opened.body);
  };

  const sellRequest = (shiftId: string, overrides: Partial<SaleCreate> = {}): SaleCreate => ({
    clientOperationId: randomUUID(),
    shiftId,
    customerId: null,
    lines: [{ productId: 'prd-001', quantity: 2, discount: 0 }],
    payments: [{ method: 'efectivo', amount: 10000 }],
    ...overrides,
  });

  const sell = (token: string, body: SaleCreate): Promise<Result> =>
    call('POST', '/pos/sales', { token, body, headers: { 'Idempotency-Key': body.clientOperationId } });

  const stockOf = async (token: string, productId: string, branchId: string) => {
    const result = await call('GET', '/stock/levels', { token });
    const levels = z.array(stockLevelSchema).parse(result.body);
    return levels.find((l) => l.productId === productId && l.branchId === branchId);
  };

  describe('conformance: autenticación', () => {
    it('login devuelve una sesión válida y GET /auth/session coincide', async () => {
      const token = await login('laura.gomez');
      const session = await call('GET', '/auth/session', { token });
      expect(session.status).toBe(200);
      expectSchema('Session', session.body);
    });

    it('credenciales inválidas -> 401 UNAUTHORIZED', async () => {
      const result = await call('POST', '/auth/login', { body: { username: 'laura.gomez', password: 'mala' } });
      expectError(result, 401, 'UNAUTHORIZED');
    });

    it('operaciones del POS sin token -> 401 UNAUTHORIZED', async () => {
      expectError(await call('GET', '/pos/shifts/current'), 401, 'UNAUTHORIZED');
    });
  });

  describe('conformance: caja y turnos (BR-CAJ)', () => {
    it('una caja no puede tener dos turnos abiertos -> SHIFT_ALREADY_OPEN', async () => {
      const token = await login('laura.gomez');
      await ensureOpenShift(token);
      const again = await call('POST', '/pos/shifts', { token, body: { registerId: 'reg-001', openingCash: 0 } });
      expectError(again, 409, 'SHIFT_ALREADY_OPEN');
    });

    it('un egreso tipificado reduce el efectivo esperado; categoría incompatible -> 422', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const ok = await call('POST', `/pos/shifts/${shift.id}/movements`, {
        token, body: { type: 'egreso', category: 'transporte', amount: 15000 },
      });
      expect(ok.status, JSON.stringify(ok.body)).toBe(200);
      expectSchema('Shift', ok.body);
      expect(shiftSchema.parse(ok.body).expectedCash).toBe(shift.expectedCash - 15000);

      const bad = await call('POST', `/pos/shifts/${shift.id}/movements`, {
        token, body: { type: 'ingreso', category: 'transporte', amount: 1000 },
      });
      expectError(bad, 422, 'VALIDATION_ERROR');
    });

    it('cerrar con diferencia exige nota (CASH_NOTE_REQUIRED); cerrado no admite ventas (SHIFT_NOT_OPEN)', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const counted = shift.expectedCash + 1;

      const withoutNote = await call('POST', `/pos/shifts/${shift.id}/close`, { token, body: { countedCash: counted } });
      expectError(withoutNote, 422, 'CASH_NOTE_REQUIRED');

      const closed = await call('POST', `/pos/shifts/${shift.id}/close`, {
        token, body: { countedCash: counted, note: 'Sobrante por cambio' },
      });
      expect(closed.status, JSON.stringify(closed.body)).toBe(200);
      expectSchema('Shift', closed.body);
      const parsed = shiftSchema.parse(closed.body);
      expect(parsed.status).toBe('closed');
      expect(parsed.difference).toBe(1);

      expectError(await sell(token, sellRequest(shift.id)), 409, 'SHIFT_NOT_OPEN');
    });
  });

  describe('conformance: ventas (BR-VEN)', () => {
    it('venta en efectivo: precio del servidor, ajuste al peso y cambio', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const result = await sell(token, sellRequest(shift.id, {
        lines: [{ productId: 'prd-001', quantity: 0.333, discount: 0 }],
        payments: [{ method: 'efectivo', amount: 1000 }],
      }));
      expect(result.status, JSON.stringify(result.body)).toBe(201);
      expectSchema('SaleReceipt', result.body);
      const receipt = saleReceiptSchema.parse(result.body);
      expect(receipt.lines[0]?.unitPrice).toBe(2800); // BR-GEN-06: precio fijado por el servidor
      expect(receipt.total).toBe(950); // 932,4 -> múltiplo de 50 más cercano (BR-GEN-05, A1)
      expect(receipt.roundingAdjustment).toBe(18); // 950 - round(932,4)
      expect(receipt.change).toBe(50);
      expect(receipt.status).toBe('pagada');
    });

    it('idempotencia: misma clave y cuerpo -> 200 misma venta; otro cuerpo -> 409', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const body = sellRequest(shift.id);
      const first = await sell(token, body);
      expect(first.status).toBe(201);

      const replay = await sell(token, body);
      expect(replay.status).toBe(200);
      expect(saleReceiptSchema.parse(replay.body).id).toBe(saleReceiptSchema.parse(first.body).id);

      const reused = await sell(token, { ...body, lines: [{ productId: 'prd-001', quantity: 3, discount: 0 }] });
      expectError(reused, 409, 'IDEMPOTENCY_KEY_REUSED');
    });

    it('pago mixto: efectivo + nequi cubre el total sin cambio', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const result = await sell(token, sellRequest(shift.id, {
        lines: [{ productId: 'prd-002', quantity: 2, discount: 0 }],
        payments: [{ method: 'efectivo', amount: 10000 }, { method: 'nequi', amount: 15000 }],
      }));
      expect(result.status, JSON.stringify(result.body)).toBe(201);
      const receipt = saleReceiptSchema.parse(result.body);
      expect(receipt.total).toBe(25000);
      expect(receipt.change).toBe(0);
    });

    it('pagos que no cubren el total -> PAYMENT_INSUFFICIENT', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const result = await sell(token, sellRequest(shift.id, { payments: [{ method: 'efectivo', amount: 1000 }] }));
      expectError(result, 409, 'PAYMENT_INSUFFICIENT');
    });

    it('excedente con un medio que no es efectivo -> 422', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const result = await sell(token, sellRequest(shift.id, { payments: [{ method: 'tarjeta', amount: 50000 }] }));
      expectError(result, 422, 'VALIDATION_ERROR');
    });

    it('sin existencias -> STOCK_INSUFFICIENT; con PIN de supervisor -> 201 y alerta STOCK_NEGATIVE', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const huge = (overrides: Partial<SaleCreate> = {}) =>
        sellRequest(shift.id, {
          lines: [{ productId: 'prd-005', quantity: 100000, discount: 0 }],
          payments: [{ method: 'efectivo', amount: 980000000 }],
          ...overrides,
        });

      expectError(await sell(token, huge()), 409, 'STOCK_INSUFFICIENT');

      const approvalResult = await call('POST', '/auth/supervisor-approvals', {
        token, body: { action: 'negative_stock', pin: PINS.admin },
      });
      expect(approvalResult.status, JSON.stringify(approvalResult.body)).toBe(200);
      expectSchema('Approval', approvalResult.body);
      const approval = approvalSchema.parse(approvalResult.body);

      const approved = await sell(token, huge({ approvalToken: approval.approvalToken }));
      expect(approved.status, JSON.stringify(approved.body)).toBe(201);

      const alerts = await call('GET', '/inventory/alerts', { token });
      const parsed = z.array(inventoryAlertSchema).parse(alerts.body);
      expect(parsed.some((a) => a.productId === 'prd-005' && !a.resolved)).toBe(true);
    });

    it('descuento del cajero > 5 % requiere PIN; admin no autoriza > 15 %', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const discounted = (discount: number, overrides: Partial<SaleCreate> = {}) =>
        sellRequest(shift.id, {
          lines: [{ productId: 'prd-002', quantity: 1, discount }], // precio 12.500
          payments: [{ method: 'efectivo', amount: 20000 }],
          ...overrides,
        });

      expect((await sell(token, discounted(500))).status).toBe(201); // 4 %: dentro del tope del cajero
      expectError(await sell(token, discounted(1250)), 409, 'APPROVAL_REQUIRED'); // 10 %

      const adminApproval = approvalSchema.parse((await call('POST', '/auth/supervisor-approvals', {
        token, body: { action: 'discount', pin: PINS.admin },
      })).body);
      const ok = await sell(token, discounted(1250, { approvalToken: adminApproval.approvalToken }));
      expect(ok.status, JSON.stringify(ok.body)).toBe(201);

      const secondApproval = approvalSchema.parse((await call('POST', '/auth/supervisor-approvals', {
        token, body: { action: 'discount', pin: PINS.admin },
      })).body);
      const tooMuch = await sell(token, discounted(3750, { approvalToken: secondApproval.approvalToken })); // 30 %
      expectError(tooMuch, 409, 'DISCOUNT_NOT_ALLOWED');
    });

    it('nunca bajo el costo salvo autorización del propietario (below_cost)', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const belowCost = (overrides: Partial<SaleCreate> = {}) =>
        sellRequest(shift.id, {
          lines: [{ productId: 'prd-002', quantity: 1, discount: 3000 }], // 9.500 < costo 9.800
          payments: [{ method: 'efectivo', amount: 10000 }],
          ...overrides,
        });

      const ownerDiscount = approvalSchema.parse((await call('POST', '/auth/supervisor-approvals', {
        token, body: { action: 'discount', pin: PINS.owner },
      })).body);
      expectError(
        await sell(token, belowCost({ approvalToken: ownerDiscount.approvalToken })), 409, 'PRICE_BELOW_COST',
      );

      const ownerBelowCost = approvalSchema.parse((await call('POST', '/auth/supervisor-approvals', {
        token, body: { action: 'below_cost', pin: PINS.owner },
      })).body);
      const ok = await sell(token, belowCost({ approvalToken: ownerBelowCost.approvalToken }));
      expect(ok.status, JSON.stringify(ok.body)).toBe(201);
    });

    it('below_cost solo lo autoriza el propietario', async () => {
      const token = await login('laura.gomez');
      const result = await call('POST', '/auth/supervisor-approvals', {
        token, body: { action: 'below_cost', pin: PINS.admin },
      });
      expectError(result, 403, 'FORBIDDEN');
    });

    it('crédito: sin cliente -> 422; sobre el cupo -> CREDIT_LIMIT_EXCEEDED; válido -> estado credito y cuenta por cobrar', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);

      const noCustomer = await sell(token, sellRequest(shift.id, { payments: [{ method: 'credito', amount: 5600 }] }));
      expectError(noCustomer, 422, 'VALIDATION_ERROR');

      const overLimit = await sell(token, sellRequest(shift.id, {
        customerId: 'cus-002', // cupo 800.000
        lines: [{ productId: 'prd-002', quantity: 40, discount: 0 }, { productId: 'prd-004', quantity: 80, discount: 0 }],
        payments: [{ method: 'credito', amount: 868000 }],
      }));
      expectError(overLimit, 409, 'CREDIT_LIMIT_EXCEEDED');

      const valid = await sell(token, sellRequest(shift.id, {
        customerId: 'cus-001', // cupo 1.500.000, saldo 300.000
        payments: [{ method: 'credito', amount: 5600 }],
      }));
      expect(valid.status, JSON.stringify(valid.body)).toBe(201);
      const receipt = saleReceiptSchema.parse(valid.body);
      expect(receipt.status).toBe('credito');

      const receivables = z.array(receivableSchema).parse((await call('GET', '/receivables', { token })).body);
      expect(receivables.some((r) => r.saleId === receipt.id && r.amount === 5600)).toBe(true);
    });

    it('PROPUESTA v0.6.0: plazo de crédito elegido define el vencimiento; referencia de pago repetida -> REFERENCE_DUPLICATED', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);

      const term = await sell(token, sellRequest(shift.id, {
        customerId: 'cus-001',
        payments: [{ method: 'credito', amount: 5600 }],
        creditTermDays: 60,
      }));
      expect(term.status, JSON.stringify(term.body)).toBe(201);
      const termSale = saleReceiptSchema.parse(term.body);
      const receivables = z.array(receivableSchema).parse((await call('GET', '/receivables', { token })).body);
      const created = receivables.find((r) => r.saleId === termSale.id);
      const days = Math.round((Date.parse(created?.due ?? '') - Date.parse(created?.issued ?? '')) / 86_400_000);
      expect(days).toBe(60);

      const pay = { method: 'transferencia' as const, amount: 5600, channel: 'bancolombia', reference: 'CONF-REF-1', destination: 'Ahorros ••• 1234' };
      const first = await sell(token, sellRequest(shift.id, { payments: [pay] }));
      expect(first.status, JSON.stringify(first.body)).toBe(201);
      const again = await sell(token, sellRequest(shift.id, { payments: [pay] }));
      expectError(again, 409, 'REFERENCE_DUPLICATED');
    });

    it('PROPUESTA v0.6.0: excedente de cupo, vencimiento libre y cuotas exigen credit_exception; cuotas suman el saldo', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const over = (extra: Partial<SaleCreate> = {}) => sellRequest(shift.id, {
        customerId: 'cus-002', // cupo 800.000
        lines: [{ productId: 'prd-002', quantity: 40, discount: 0 }, { productId: 'prd-004', quantity: 80, discount: 0 }],
        payments: [{ method: 'credito', amount: 868000 }],
        ...extra,
      });
      expectError(await sell(token, over()), 409, 'CREDIT_LIMIT_EXCEEDED');

      const cashier = await call('POST', '/auth/supervisor-approvals', { token, body: { action: 'credit_exception', pin: PINS.admin } });
      expect(cashier.status).toBe(200); // un administrador puede autorizar
      const ok = await sell(token, over({ approvalToken: approvalSchema.parse(cashier.body).approvalToken, creditInstallments: 4 }));
      expect(ok.status, JSON.stringify(ok.body)).toBe(201);
      const sale = saleReceiptSchema.parse(ok.body);
      const receivables = z.array(receivableSchema).parse((await call('GET', '/receivables', { token })).body)
        .filter((r) => r.saleId === sale.id);
      expect(receivables).toHaveLength(4);
      expect(receivables.reduce((sum, r) => sum + r.amount, 0)).toBe(868000);

      const free = sellRequest(shift.id, {
        customerId: 'cus-001', payments: [{ method: 'credito', amount: 5600 }], creditDueDate: '2099-01-01',
      });
      expectError(await sell(token, free), 422, 'VALIDATION_ERROR');
    });

    it('PROPUESTA v0.6.0 · autorizaciones y relevo: sin auto-aprobación, diferencia exige autorización aprobada', async () => {
      const cashier = await login('laura.gomez');
      const admin = await login('maria.perez');
      const shift = await ensureOpenShift(cashier);

      const created = await call('POST', '/pos/authorizations', {
        token: cashier,
        body: { type: 'relevo', resource: { kind: 'shift', id: shift.id }, amount: 1000, reason: 'Sobrante en el arqueo', fingerprint: 'fp-1' },
      });
      expect(created.status, JSON.stringify(created.body)).toBe(201);
      expectSchema('AuthorizationRequest', created.body);
      const auth = authorizationRequestSchema.parse(created.body);
      expect(auth.status).toBe('pendiente');

      expectError(await call('POST', `/pos/authorizations/${auth.id}/decision`, { token: cashier, body: { decision: 'aprobar' } }), 403, 'FORBIDDEN');
      const approved = await call('POST', `/pos/authorizations/${auth.id}/decision`, { token: admin, body: { decision: 'aprobar' } });
      expect(approved.status, JSON.stringify(approved.body)).toBe(200);
      expect(authorizationRequestSchema.parse(approved.body).status).toBe('aprobada');
      expectError(await call('POST', `/pos/authorizations/${auth.id}/decision`, { token: admin, body: { decision: 'rechazar' } }), 409, 'INVALID_STATE');

      const own = authorizationRequestSchema.parse((await call('POST', '/pos/authorizations', {
        token: admin,
        body: { type: 'otra', resource: { kind: 'x', id: '1' }, amount: 0, reason: 'Prueba propia', fingerprint: 'fp-2' },
      })).body);
      expectError(await call('POST', `/pos/authorizations/${own.id}/decision`, { token: admin, body: { decision: 'aprobar' } }), 403, 'SELF_APPROVAL');

      // Relevo con diferencia: sin autorización -> 409; con la autorización aprobada -> 200 y se consume.
      const counted = shift.expectedCash + 1000;
      expectError(await call('POST', `/pos/shifts/${shift.id}/handover`, { token: cashier, body: { toEmployeeId: 'emp-003', countedCash: counted } }), 409, 'AUTHORIZATION_REQUIRED');
      const handed = await call('POST', `/pos/shifts/${shift.id}/handover`, {
        token: cashier, body: { toEmployeeId: 'emp-003', countedCash: counted, authorizationId: auth.id },
      });
      expect(handed.status, JSON.stringify(handed.body)).toBe(200);
      expectSchema('CustodyEntry', handed.body);
      expect(custodyEntrySchema.parse(handed.body).difference).toBe(1000);
      const reused = await call('POST', `/pos/shifts/${shift.id}/handover`, {
        token: admin, body: { toEmployeeId: 'emp-001', countedCash: counted, authorizationId: auth.id },
      });
      expectError(reused, 409, 'AUTHORIZATION_REQUIRED'); // la autorización era de un solo uso

      // Devolver la caja a la cajera para no alterar los escenarios siguientes (arqueo exacto).
      const back = await call('POST', `/pos/shifts/${shift.id}/handover`, { token: admin, body: { toEmployeeId: 'emp-001', countedCash: shift.expectedCash } });
      expect(back.status, JSON.stringify(back.body)).toBe(200);
    });

    it('PROPUESTA v0.6.0 · sincronización: idempotente, respeta dependencias y rechaza datos sensibles', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const base = { shiftId: shift.id, createdAt: '2026-10-11T14:00:00Z' };
      const batch = {
        deviceId: 'dev-1',
        operations: [
          { ...base, idempotencyKey: 'op-a', kind: 'movimiento-efectivo', payload: { amount: 5000 } },
          { ...base, idempotencyKey: 'op-b', kind: 'documento-fiscal', payload: { sale: 'x' }, dependsOn: ['op-a'] },
          { ...base, idempotencyKey: 'op-c', kind: 'cobro-tarjeta', payload: { pin: '1234' } },
          { ...base, idempotencyKey: 'op-d', kind: 'inventada', payload: {} },
          { ...base, idempotencyKey: 'op-e', kind: 'autorizacion', payload: {}, dependsOn: ['op-nunca'] },
        ],
      };
      const first = await call('POST', '/pos/sync/batches', { token, body: batch });
      expect(first.status, JSON.stringify(first.body)).toBe(200);
      expectSchema('SyncBatchResult', first.body);
      const r1 = syncBatchResultSchema.parse(first.body).results;
      expect(r1.map((r) => `${r.idempotencyKey}:${r.status}`)).toEqual([
        'op-a:confirmada', 'op-b:confirmada', 'op-c:rechazada', 'op-d:rechazada', 'op-e:reintentable',
      ]);
      expect(r1[2]?.code).toBe('SENSITIVE_DATA');

      const again = syncBatchResultSchema.parse((await call('POST', '/pos/sync/batches', { token, body: batch })).body).results;
      expect(again[0]?.remoteRef).toBe(r1[0]?.remoteRef); // mismo resultado, sin duplicar

      const found = await call('GET', '/pos/sync/operations/op-a', { token });
      expect(found.status, JSON.stringify(found.body)).toBe(200);
      expectSchema('SyncOperationResult', found.body);
      expectError(await call('GET', '/pos/sync/operations/nunca-llego', { token }), 404, 'NOT_FOUND');
      expect(again.map((r) => r.status)).toEqual(r1.map((r) => r.status));
    });

    it('PROPUESTA v0.6.0 · pedidos: máquina de estados, despacho con saldo y cancelación', async () => {
      const token = await login('laura.gomez');
      const newOrder = {
        customerId: null, fulfillment: 'recogida', shippingCost: 0,
        lines: [{ productId: 'prd-001', quantity: 2, unitPrice: 2800, packed: 0, missing: 0 }],
      };
      const created = await call('POST', '/pos/orders', { token, body: newOrder });
      expect(created.status, JSON.stringify(created.body)).toBe(201);
      expectSchema('PosOrder', created.body);
      const order = posOrderSchema.parse(created.body);
      expect([order.status, order.paymentState, order.total]).toEqual(['pendiente', 'sin-pago', 5600]);

      const step = (id: string, body: Record<string, unknown>) => call('POST', `/pos/orders/${id}/transitions`, { token, body });
      expectError(await step(order.id, { action: 'despachar' }), 409, 'ESTADO_INVALIDO');
      expect((await step(order.id, { action: 'tomar' })).status).toBe(200);
      expect((await step(order.id, { action: 'verificar' })).status).toBe(200);
      expectError(await step(order.id, { action: 'despachar' }), 409, 'SALDO_PENDIENTE');
      const paid = posOrderSchema.parse((await step(order.id, { action: 'registrar-pago', amount: 5600 })).body);
      expect(paid.paymentState).toBe('pagado');
      expect(posOrderSchema.parse((await step(order.id, { action: 'despachar' })).body).status).toBe('despachado');
      expect(posOrderSchema.parse((await step(order.id, { action: 'entregar' })).body).status).toBe('entregado');
      expectError(await step(order.id, { action: 'cancelar', reason: 'tarde' }), 409, 'ESTADO_INVALIDO');

      const second = posOrderSchema.parse((await call('POST', '/pos/orders', { token, body: newOrder })).body);
      expectError(await step(second.id, { action: 'cancelar' }), 422, 'VALIDATION_ERROR');
      expect(posOrderSchema.parse((await step(second.id, { action: 'cancelar', reason: 'Cliente desistió' })).body).status).toBe('cancelado');
    });

    it('PROPUESTA v0.6.0 · pedidos: guardado con versión (concurrencia optimista), salto de estado ilegal y número reasignado', async () => {
      const token = await login('laura.gomez');
      const base = {
        id: 'ord-conf-1', number: 'PED-0001', status: 'pendiente', total: 5600, paymentState: 'sin-pago', paidAmount: 0,
        customerId: null, fulfillment: 'recogida', branchId: 'br-001', history: [],
        lines: [{ productId: 'prd-001', quantity: 2, unitPrice: 2800, packed: 0, missing: 0 }],
      };
      const save = (order: Record<string, unknown>, expectedVersion: number) =>
        call('PUT', `/pos/orders/${String(order.id)}`, { token, body: { order, expectedVersion } });

      const created = await save(base, 0);
      expect(created.status, JSON.stringify(created.body)).toBe(200);
      expectSchema('PosOrder', created.body);
      expect(posOrderSchema.parse(created.body).version).toBe(1);

      // Misma versión vista por dos terminales: la segunda pierde.
      const first = await save({ ...base, status: 'en-proceso', version: 1 }, 1);
      expect(posOrderSchema.parse(first.body).version).toBe(2);
      expectError(await save({ ...base, notes: 'otra caja', version: 1 }, 1), 409, 'VERSION_CONFLICT');

      // Salto ilegal: en-proceso -> entregado.
      expectError(await save({ ...base, status: 'entregado', version: 2 }, 2), 409, 'ESTADO_INVALIDO');

      // Número repetido en otro pedido nuevo: el servidor asigna el siguiente.
      const other = await save({ ...base, id: 'ord-conf-2' }, 0);
      expect(other.status, JSON.stringify(other.body)).toBe(200);
      expect(posOrderSchema.parse(other.body).number).not.toBe('PED-0001');
    });

    it('anulación: devuelve stock, exige motivo y no se repite', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const before = await stockOf(token, 'prd-003', shift.branchId);
      const sold = saleReceiptSchema.parse((await sell(token, sellRequest(shift.id, {
        lines: [{ productId: 'prd-003', quantity: 1, discount: 0 }],
        payments: [{ method: 'efectivo', amount: 5000 }],
      }))).body);

      const withoutReason = await call('POST', `/pos/sales/${sold.id}/void`, { token, body: {} });
      expectError(withoutReason, 422, 'VALIDATION_ERROR');

      const voided = await call('POST', `/pos/sales/${sold.id}/void`, { token, body: { reason: 'Error de digitación' } });
      expect(voided.status, JSON.stringify(voided.body)).toBe(200);
      expectSchema('Sale', voided.body);
      expect(saleSchema.parse(voided.body).status).toBe('anulada');
      expect((await stockOf(token, 'prd-003', shift.branchId))?.onHand).toBe(before?.onHand);

      const again = await call('POST', `/pos/sales/${sold.id}/void`, { token, body: { reason: 'Otra vez' } });
      expectError(again, 409, 'SALE_ALREADY_VOIDED');
    });
  });

  describe('conformance: inventario y traslados (BR-INV)', () => {
    it('traslado en dos pasos: envío descuenta origen y deja en tránsito; solo destino recibe', async () => {
      const admin = await login('maria.perez');
      const destination = await login('sofia.ruiz'); // encargada sede br-002
      const cashier = await login('laura.gomez');

      const originBefore = await stockOf(admin, 'prd-001', 'br-001');
      const destBefore = await stockOf(admin, 'prd-001', 'br-002');

      const created = await call('POST', '/inventory/transfers', {
        token: admin, body: { fromBranchId: 'br-001', toBranchId: 'br-002', lines: [{ productId: 'prd-001', quantity: 5 }] },
      });
      expect(created.status, JSON.stringify(created.body)).toBe(201);
      expectSchema('Transfer', created.body);
      const transfer = transferSchema.parse(created.body);
      expect(transfer.status).toBe('enviado');

      const originAfter = await stockOf(admin, 'prd-001', 'br-001');
      const destInTransit = await stockOf(admin, 'prd-001', 'br-002');
      expect(originAfter?.onHand).toBe((originBefore?.onHand ?? 0) - 5);
      expect(destInTransit?.inTransit).toBe((destBefore?.inTransit ?? 0) + 5);
      expect(destInTransit?.onHand).toBe(destBefore?.onHand); // aún no cuenta en destino

      expectError(await call('POST', `/inventory/transfers/${transfer.id}/receive`, { token: cashier, body: {} }), 403, 'FORBIDDEN');

      const received = await call('POST', `/inventory/transfers/${transfer.id}/receive`, { token: destination, body: {} });
      expect(received.status, JSON.stringify(received.body)).toBe(200);
      expect(transferSchema.parse(received.body).status).toBe('recibido');
      const destAfter = await stockOf(admin, 'prd-001', 'br-002');
      expect(destAfter?.onHand).toBe((destBefore?.onHand ?? 0) + 5);
      expect(destAfter?.inTransit).toBe(destBefore?.inTransit);

      const twice = await call('POST', `/inventory/transfers/${transfer.id}/receive`, { token: destination, body: {} });
      expectError(twice, 409, 'TRANSFER_ALREADY_RECEIVED');
    });

    it('traslado sin existencias en origen -> STOCK_INSUFFICIENT', async () => {
      const admin = await login('maria.perez');
      const result = await call('POST', '/inventory/transfers', {
        token: admin, body: { fromBranchId: 'br-001', toBranchId: 'br-002', lines: [{ productId: 'prd-001', quantity: 1000000 }] },
      });
      expectError(result, 409, 'STOCK_INSUFFICIENT');
    });
  });

  describe('conformance: compras, cartera, devoluciones y administración (v0.4.0, PROPUESTA)', () => {
    it('orden de compra: borrador -> enviada -> recibida sube stock y abre cuenta por pagar', async () => {
      const buyer = await login('pedro.compras');
      const before = await stockOf(buyer, 'prd-001', 'br-001');
      const payablesBefore = z.array(payableSchema).parse((await call('GET', '/payables', { token: buyer })).body);

      const created = await call('POST', '/purchase-orders', {
        token: buyer, body: { supplierId: 'sup-001', lines: [{ productId: 'prd-001', quantity: 10, unitCost: 2200 }] },
      });
      expect(created.status, JSON.stringify(created.body)).toBe(201);
      expectSchema('PurchaseOrder', created.body);
      const order = purchaseOrderSchema.parse(created.body);
      expect(order.status).toBe('borrador');
      expect(order.total).toBe(22000);

      expectError(await call('POST', `/purchase-orders/${order.id}/receive`, { token: buyer, body: {} }), 409, 'INVALID_STATE');
      const sent = await call('POST', `/purchase-orders/${order.id}/send`, { token: buyer, body: {} });
      expect(purchaseOrderSchema.parse(sent.body).status).toBe('enviada');
      const received = await call('POST', `/purchase-orders/${order.id}/receive`, { token: buyer, body: {} });
      expect(received.status, JSON.stringify(received.body)).toBe(200);
      expect(purchaseOrderSchema.parse(received.body).status).toBe('recibida');

      expect((await stockOf(buyer, 'prd-001', 'br-001'))?.onHand).toBe((before?.onHand ?? 0) + 10);
      const payablesAfter = z.array(payableSchema).parse((await call('GET', '/payables', { token: buyer })).body);
      expect(payablesAfter.length).toBe(payablesBefore.length + 1);
      expect(payablesAfter.some((p) => p.purchaseOrderId === order.id && p.amount === 22000)).toBe(true);
    });

    it('abono: reduce el saldo y no puede superarlo (PAYMENT_EXCEEDS_BALANCE)', async () => {
      const token = await login('ana.cartera');
      const list = z.array(receivableSchema).parse((await call('GET', '/receivables', { token })).body);
      const target = list.find((r) => r.amount - r.paid > 1000);
      expect(target).toBeDefined();
      if (!target) return;

      const paid = await call('POST', `/receivables/${target.id}/payments`, { token, body: { amount: 1000, method: 'efectivo' } });
      expect(paid.status, JSON.stringify(paid.body)).toBe(200);
      expectSchema('Receivable', paid.body);
      expect(receivableSchema.parse(paid.body).paid).toBe(target.paid + 1000);

      const tooMuch = await call('POST', `/receivables/${target.id}/payments`, {
        token, body: { amount: target.amount, method: 'efectivo' },
      });
      expectError(tooMuch, 409, 'PAYMENT_EXCEEDS_BALANCE');
    });

    it('devolución parcial: devuelve stock, no supera lo vendido y exige motivo', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const before = await stockOf(token, 'prd-004', shift.branchId);
      const sold = saleReceiptSchema.parse((await sell(token, sellRequest(shift.id, {
        lines: [{ productId: 'prd-004', quantity: 3, discount: 0 }],
        payments: [{ method: 'efectivo', amount: 14000 }],
      }))).body);

      const ok = await call('POST', `/pos/sales/${sold.id}/returns`, {
        token, body: { lines: [{ productId: 'prd-004', quantity: 1 }], reason: 'Producto en mal estado' },
      });
      expect(ok.status, JSON.stringify(ok.body)).toBe(201);
      expectSchema('SaleReturn', ok.body);
      expect(saleReturnSchema.parse(ok.body).total).toBe(4600);
      expect((await stockOf(token, 'prd-004', shift.branchId))?.onHand).toBe((before?.onHand ?? 0) - 3 + 1);

      const exceeds = await call('POST', `/pos/sales/${sold.id}/returns`, {
        token, body: { lines: [{ productId: 'prd-004', quantity: 3 }], reason: 'Demasiado' },
      });
      expectError(exceeds, 409, 'RETURN_EXCEEDS_SOLD');
      expectError(await call('POST', `/pos/sales/${sold.id}/returns`, {
        token, body: { lines: [{ productId: 'prd-004', quantity: 1 }] },
      }), 422, 'VALIDATION_ERROR');
    });

    it('empleados: solo admin/propietario crean; cliente duplicado -> CUSTOMER_DUPLICATED', async () => {
      const cashier = await login('laura.gomez');
      const admin = await login('maria.perez');
      const employee = { name: 'Nuevo Empleado', role: 'cajero', branchId: 'br-001', active: true };

      expectError(await call('POST', '/employees', { token: cashier, body: employee }), 403, 'FORBIDDEN');
      const created = await call('POST', '/employees', { token: admin, body: employee });
      expect(created.status, JSON.stringify(created.body)).toBe(201);
      expectSchema('Employee', created.body);

      const customer = {
        name: 'Cliente Prueba', documentType: 'CC', taxId: '1010101010', taxResponsibility: 'R-99-PN',
        active: true, creditLimit: 0,
      };
      const first = await call('POST', '/customers', { token: admin, body: customer });
      expect(first.status, JSON.stringify(first.body)).toBe(201);
      expectError(await call('POST', '/customers', { token: admin, body: customer }), 409, 'CUSTOMER_DUPLICATED');
    });
  });

  describe('conformance: v0.5.0 (PROPUESTA): ajustes, conteos, cartera, reportes y permisos', () => {
    const uniqueProduct = (suffix: string) => ({
      sku: `T-${randomUUID().slice(0, 8)}${suffix}`, name: 'Producto de prueba', category: 'Varios', unit: 'und',
      price: 1000, cost: 500, taxCategory: 'gravado', taxRate: 0.19, active: true,
    });

    it('SKU y código de barras duplicados -> SKU_DUPLICATED / BARCODE_DUPLICATED (formato Error)', async () => {
      const admin = await login('maria.perez');
      const skuClash = await call('POST', '/products', { token: admin, body: { ...uniqueProduct('a'), sku: 'SKU-001' } });
      expectError(skuClash, 409, 'SKU_DUPLICATED');
      const barcodeClash = await call('POST', '/products', {
        token: admin, body: { ...uniqueProduct('b'), barcode: '7701234567890' },
      });
      expectError(barcodeClash, 409, 'BARCODE_DUPLICATED');

      const created = await call('POST', '/products', { token: admin, body: uniqueProduct('c') });
      expect(created.status, JSON.stringify(created.body)).toBe(201);
      expectSchema('Product', created.body);
      const productId = (created.body as { id: string }).id;
      const editClash = await call('PUT', `/products/${productId}`, { token: admin, body: { ...uniqueProduct('d'), sku: 'SKU-002' } });
      expectError(editClash, 409, 'SKU_DUPLICATED');
    });

    it('ajuste de inventario: genera movimiento `ajuste` y resuelve la alerta STOCK_NEGATIVE', async () => {
      const cashier = await login('laura.gomez');
      const keeper = await login('andres.rojas'); // bodeguero sede br-001
      const shift = await ensureOpenShift(cashier);

      // Deja prd-005 en negativo con venta aprobada por supervisor (BR-VEN-05).
      const approval = approvalSchema.parse((await call('POST', '/auth/supervisor-approvals', {
        token: cashier, body: { action: 'negative_stock', pin: PINS.admin },
      })).body);
      const negative = await sell(cashier, sellRequest(shift.id, {
        lines: [{ productId: 'prd-005', quantity: 100000, discount: 0 }],
        payments: [{ method: 'efectivo', amount: 980000000 }],
        approvalToken: approval.approvalToken,
      }));
      expect(negative.status, JSON.stringify(negative.body)).toBe(201);
      const level = await stockOf(keeper, 'prd-005', 'br-001');
      expect(level?.onHand).toBeLessThan(0);
      const onHand = level?.onHand ?? 0;

      // Sin permiso, sin sede propia, cantidad 0 o que deja negativo: rechazados.
      const body = { productId: 'prd-005', branchId: 'br-001', quantity: 10 - onHand, reason: 'Conteo físico' };
      expectError(await call('POST', '/inventory/adjustments', { token: cashier, body }), 403, 'FORBIDDEN');
      expectError(await call('POST', '/inventory/adjustments', {
        token: keeper, body: { ...body, branchId: 'br-002' },
      }), 403, 'FORBIDDEN');
      expectError(await call('POST', '/inventory/adjustments', {
        token: keeper, body: { ...body, quantity: 0 },
      }), 422, 'VALIDATION_ERROR');
      expectError(await call('POST', '/inventory/adjustments', {
        token: keeper, body: { ...body, quantity: -1000000000 },
      }), 409, 'STOCK_INSUFFICIENT');

      const adjusted = await call('POST', '/inventory/adjustments', { token: keeper, body });
      expect(adjusted.status, JSON.stringify(adjusted.body)).toBe(201);
      expectSchema('StockAdjustmentResult', adjusted.body);
      const result = stockAdjustmentResultSchema.parse(adjusted.body);
      expect(result.movement.type).toBe('ajuste');
      expect(result.movement.quantity).toBe(10 - onHand);
      expect(result.level.onHand).toBe(10);
      expect(result.resolvedAlertIds.length).toBeGreaterThan(0);

      const alerts = z.array(inventoryAlertSchema).parse((await call('GET', '/inventory/alerts', { token: keeper })).body);
      expect(alerts.some((a) => a.productId === 'prd-005' && a.branchId === 'br-001' && !a.resolved)).toBe(false);
      const movements = z.array(stockMovementSchema).parse((await call('GET', '/stock/movements', { token: keeper })).body);
      expect(movements.some((m) => m.id === result.movement.id && m.type === 'ajuste')).toBe(true);
    });

    it('conteo físico: devuelve diferencias y genera un ajuste por línea con diferencia', async () => {
      const keeper = await login('andres.rojas');
      const cashier = await login('laura.gomez');
      const a = await stockOf(keeper, 'prd-001', 'br-001');
      const b = await stockOf(keeper, 'prd-002', 'br-001');
      const countedA = Math.max(0, (a?.onHand ?? 0) - 2);
      const body = {
        branchId: 'br-001',
        lines: [{ productId: 'prd-001', counted: countedA }, { productId: 'prd-002', counted: b?.onHand ?? 0 }],
      };

      expectError(await call('POST', '/inventory/counts', { token: cashier, body }), 403, 'FORBIDDEN');
      expectError(await call('POST', '/inventory/counts', { token: keeper, body: { ...body, branchId: 'br-002' } }), 403, 'FORBIDDEN');
      expectError(await call('POST', '/inventory/counts', { token: keeper, body: { branchId: 'br-001', lines: [] } }), 422, 'VALIDATION_ERROR');

      const counted = await call('POST', '/inventory/counts', { token: keeper, body });
      expect(counted.status, JSON.stringify(counted.body)).toBe(201);
      expectSchema('InventoryCount', counted.body);
      const count = inventoryCountSchema.parse(counted.body);
      const lineA = count.lines.find((l) => l.productId === 'prd-001');
      const lineB = count.lines.find((l) => l.productId === 'prd-002');
      expect(lineA?.systemQuantity).toBe(a?.onHand);
      expect(lineA?.difference).toBe(countedA - (a?.onHand ?? 0));
      expect(lineA?.movementId).not.toBeNull();
      expect(lineB?.difference).toBe(0);
      expect(lineB?.movementId).toBeNull();
      expect((await stockOf(keeper, 'prd-001', 'br-001'))?.onHand).toBe(countedA);
    });

    it('cancelar orden: borrador/enviada -> cancelada; recibida o ya cancelada -> INVALID_STATE; sin permiso -> 403', async () => {
      const buyer = await login('pedro.compras');
      const cashier = await login('laura.gomez');
      const create = async () => purchaseOrderSchema.parse((await call('POST', '/purchase-orders', {
        token: buyer, body: { supplierId: 'sup-001', lines: [{ productId: 'prd-001', quantity: 1, unitCost: 2100 }] },
      })).body);

      const draft = await create();
      expectError(await call('POST', `/purchase-orders/${draft.id}/cancel`, { token: cashier, body: {} }), 403, 'FORBIDDEN');
      const cancelled = await call('POST', `/purchase-orders/${draft.id}/cancel`, { token: buyer, body: {} });
      expect(cancelled.status, JSON.stringify(cancelled.body)).toBe(200);
      expectSchema('PurchaseOrder', cancelled.body);
      expect(purchaseOrderSchema.parse(cancelled.body).status).toBe('cancelada');
      expectError(await call('POST', `/purchase-orders/${draft.id}/cancel`, { token: buyer, body: {} }), 409, 'INVALID_STATE');

      const sent = await create();
      await call('POST', `/purchase-orders/${sent.id}/send`, { token: buyer, body: {} });
      const cancelSent = await call('POST', `/purchase-orders/${sent.id}/cancel`, { token: buyer, body: {} });
      expect(purchaseOrderSchema.parse(cancelSent.body).status).toBe('cancelada');

      const received = await create();
      await call('POST', `/purchase-orders/${received.id}/send`, { token: buyer, body: {} });
      await call('POST', `/purchase-orders/${received.id}/receive`, { token: buyer, body: {} });
      expectError(await call('POST', `/purchase-orders/${received.id}/cancel`, { token: buyer, body: {} }), 409, 'INVALID_STATE');
    });

    it('el bodeguero recibe (purchases.receive) y la respuesta trae el efecto; no crea ni envía', async () => {
      const buyer = await login('pedro.compras');
      const keeper = await login('andres.rojas');
      const created = purchaseOrderSchema.parse((await call('POST', '/purchase-orders', {
        token: buyer, body: { supplierId: 'sup-001', lines: [{ productId: 'prd-003', quantity: 10, unitCost: 3500 }] },
      })).body);
      expectError(await call('POST', '/purchase-orders', {
        token: keeper, body: { supplierId: 'sup-001', lines: [{ productId: 'prd-003', quantity: 1, unitCost: 1 }] },
      }), 403, 'FORBIDDEN');
      expectError(await call('POST', `/purchase-orders/${created.id}/send`, { token: keeper, body: {} }), 403, 'FORBIDDEN');
      await call('POST', `/purchase-orders/${created.id}/send`, { token: buyer, body: {} });

      const before = await stockOf(keeper, 'prd-003', 'br-001');
      const received = await call('POST', `/purchase-orders/${created.id}/receive`, { token: keeper, body: {} });
      expect(received.status, JSON.stringify(received.body)).toBe(200);
      expectSchema('PurchaseOrderReceipt', received.body);
      const receipt = purchaseOrderReceiptSchema.parse(received.body);
      expect(receipt.status).toBe('recibida');
      const line = receipt.effect?.lines.find((l) => l.productId === 'prd-003');
      expect(line?.stockBefore).toBe(before?.onHand);
      expect(line?.stockAfter).toBe((before?.onHand ?? 0) + 10);
      expect(line?.avgCostAfter).toBeGreaterThan(0);
      const payables = z.array(payableSchema).parse((await call('GET', '/payables', { token: buyer })).body);
      expect(payables.some((p) => p.id === receipt.effect?.payableId && p.purchaseOrderId === created.id)).toBe(true);
    });

    it('abono del cliente: imputa a las facturas más antiguas primero, deja historial y no supera el saldo', async () => {
      const cashier = await login('laura.gomez');
      const shift = await ensureOpenShift(cashier);
      const clerk = await login('ana.cartera');
      // Una factura nueva (más reciente que la del seed) para que haya al menos dos abiertas.
      const sold = await sell(cashier, sellRequest(shift.id, {
        customerId: 'cus-001', payments: [{ method: 'credito', amount: 5600 }],
      }));
      expect(sold.status, JSON.stringify(sold.body)).toBe(201);

      const list = async () => z.array(receivableSchema).parse((await call('GET', '/receivables', { token: clerk })).body);
      const mine = (await list())
        .filter((r) => r.customerId === 'cus-001' && r.balance > 0)
        .sort((x, y) => x.issued.localeCompare(y.issued) || x.due.localeCompare(y.due) || x.id.localeCompare(y.id));
      expect(mine.length).toBeGreaterThanOrEqual(2);
      const [oldest, second] = mine;
      if (!oldest || !second) return;
      const totalBefore = mine.reduce((sum, r) => sum + r.balance, 0);
      const amount = oldest.balance + 100;

      expectError(await call('POST', '/customers/cus-001/payments', {
        token: cashier, body: { amount: 100, method: 'efectivo' },
      }), 403, 'FORBIDDEN');
      expectError(await call('POST', '/customers/cus-001/payments', {
        token: clerk, body: { amount: totalBefore + 1, method: 'efectivo' },
      }), 409, 'PAYMENT_EXCEEDS_BALANCE');

      const paid = await call('POST', '/customers/cus-001/payments', {
        token: clerk, body: { amount, method: 'transferencia', note: 'Abono general' },
      });
      expect(paid.status, JSON.stringify(paid.body)).toBe(200);
      expectSchema('CustomerPaymentResult', paid.body);
      const result = customerPaymentResultSchema.parse(paid.body);
      expect(result.payments.map((p) => p.receivableId)).toEqual([oldest.id, second.id]);
      expect(result.payments.map((p) => p.amount)).toEqual([oldest.balance, 100]);
      expect(result.balanceAfter).toBe(totalBefore - amount);

      const after = await list();
      expect(after.find((r) => r.id === oldest.id)).toMatchObject({ balance: 0, status: 'pagada', daysOverdue: 0 });
      expect(after.find((r) => r.id === second.id)?.balance).toBe(second.balance - 100);

      const history = await call('GET', `/receivables/${oldest.id}/payments`, { token: clerk });
      expect(history.status).toBe(200);
      const payments = z.array(receivablePaymentSchema).parse(history.body);
      expect(payments.some((p) => p.amount === oldest.balance && p.method === 'transferencia')).toBe(true);
      expectError(await call('GET', '/receivables/rec-no-existe/payments', { token: clerk }), 404, 'NOT_FOUND');
    });

    it('derivados del servidor: saldo, estado y mora de cuentas; saldos del cliente', async () => {
      const clerk = await login('ana.cartera');
      const receivables = z.array(receivableSchema).parse((await call('GET', '/receivables', { token: clerk })).body);
      expect(receivables.length).toBeGreaterThan(0);
      for (const r of receivables) {
        expect(r.balance).toBe(r.amount - r.paid);
        expect(r.status === 'pagada').toBe(r.balance === 0);
        if (r.status === 'vigente' || r.status === 'pagada') expect(r.daysOverdue).toBeGreaterThanOrEqual(0);
        if (r.status === 'vencida') expect(r.daysOverdue).toBeGreaterThan(3);
      }
      const payables = z.array(payableSchema).parse((await call('GET', '/payables', { token: clerk })).body);
      expect(payables.every((p) => p.status !== 'en_gracia' && p.balance === p.amount - p.paid)).toBe(true);

      const customers = z.array(customerSchema).parse((await call('GET', '/customers', { token: clerk })).body);
      for (const c of customers) {
        const own = receivables.filter((r) => r.customerId === c.id);
        expect(c.outstandingBalance).toBe(own.reduce((sum, r) => sum + r.balance, 0));
        expect(c.overdueBalance).toBe(own.filter((r) => r.status === 'vencida').reduce((sum, r) => sum + r.balance, 0));
      }
    });

    it('venta con turno y devoluciones listadas: shiftId y returnedQuantity por línea', async () => {
      const token = await login('laura.gomez');
      const shift = await ensureOpenShift(token);
      const sold = saleReceiptSchema.parse((await sell(token, sellRequest(shift.id, {
        lines: [{ productId: 'prd-004', quantity: 3, discount: 0 }],
        payments: [{ method: 'efectivo', amount: 14000 }],
      }))).body);
      expect(sold.shiftId).toBe(shift.id);
      expect(sold.lines[0]?.returnedQuantity).toBe(0);

      expect(z.array(saleReturnSchema).parse((await call('GET', `/pos/sales/${sold.id}/returns`, { token })).body)).toEqual([]);

      const returned = await call('POST', `/pos/sales/${sold.id}/returns`, {
        token, body: { lines: [{ productId: 'prd-004', quantity: 2 }], reason: 'Cambio de opinión' },
      });
      expect(returned.status, JSON.stringify(returned.body)).toBe(201);

      const listed = await call('GET', `/pos/sales/${sold.id}/returns`, { token });
      expect(listed.status).toBe(200);
      const returns = z.array(saleReturnSchema).parse(listed.body);
      expect(returns.length).toBe(1);
      expect(returns[0]?.lines[0]?.quantity).toBe(2);

      const sales = z.array(saleSchema).parse((await call('GET', '/sales', { token })).body);
      const found = sales.find((s) => s.id === sold.id);
      expect(found?.lines[0]?.returnedQuantity).toBe(2);
      expect(found?.shiftId).toBe(shift.id);
      expectError(await call('GET', '/pos/sales/sal-no-existe/returns', { token }), 404, 'NOT_FOUND');
    });

    it('reportes agregados: KPIs consistentes con las listas; exigen reports.view', async () => {
      const clerk = await login('ana.cartera'); // reports.view
      const cashier = await login('laura.gomez');
      const shift = await ensureOpenShift(cashier);

      const before = salesSummarySchema.parse((await call('GET', '/reports/sales-summary', { token: clerk })).body);
      const sold = saleReceiptSchema.parse((await sell(cashier, sellRequest(shift.id, {
        lines: [{ productId: 'prd-002', quantity: 2, discount: 0 }],
        payments: [{ method: 'nequi', amount: 25000 }],
      }))).body);

      const afterResult = await call('GET', '/reports/sales-summary', { token: clerk });
      expect(afterResult.status, JSON.stringify(afterResult.body)).toBe(200);
      expectSchema('SalesSummary', afterResult.body);
      const after = salesSummarySchema.parse(afterResult.body);
      expect(after.salesCount).toBe(before.salesCount + 1);
      expect(after.grossTotal).toBe(before.grossTotal + sold.total);
      expect(after.netTotal).toBe(after.grossTotal - after.returnsTotal);
      expect(after.byDay.reduce((sum, d) => sum + d.count, 0)).toBe(after.salesCount);
      expect(after.byDay.reduce((sum, d) => sum + d.total, 0)).toBe(after.grossTotal);
      const nequiBefore = before.byPaymentMethod.find((m) => m.method === 'nequi')?.amount ?? 0;
      expect(after.byPaymentMethod.find((m) => m.method === 'nequi')?.amount).toBe(nequiBefore + 25000);

      const scoped = salesSummarySchema.parse((await call('GET', '/reports/sales-summary?branchId=br-002', { token: clerk })).body);
      expect(scoped.branchId).toBe('br-002');
      expect(scoped.salesCount).toBe(0);

      const aging = await call('GET', '/reports/aging', { token: clerk });
      expect(aging.status, JSON.stringify(aging.body)).toBe(200);
      expectSchema('AgingReport', aging.body);
      const agingReport = agingReportSchema.parse(aging.body);
      const receivables = z.array(receivableSchema).parse((await call('GET', '/receivables', { token: clerk })).body);
      expect(agingReport.receivables.total).toBe(receivables.reduce((sum, r) => sum + r.balance, 0));
      expect(agingReport.receivables.buckets.reduce((sum, b) => sum + b.amount, 0)).toBe(agingReport.receivables.total);
      expect(agingReport.receivables.overdueTotal).toBe(
        receivables.filter((r) => r.daysOverdue > 0).reduce((sum, r) => sum + r.balance, 0),
      );

      const valuation = await call('GET', '/reports/inventory-valuation', { token: clerk });
      expect(valuation.status, JSON.stringify(valuation.body)).toBe(200);
      expectSchema('InventoryValuation', valuation.body);
      const inventory = inventoryValuationSchema.parse(valuation.body);
      expect(inventory.totalValue).toBe(inventory.items.reduce((sum, i) => sum + i.value, 0));
      expect(inventory.items.every((i) => i.value === Math.round(Math.max(0, i.onHand) * i.unitCost))).toBe(true);

      for (const path of ['/reports/sales-summary', '/reports/aging', '/reports/inventory-valuation']) {
        expectError(await call('GET', path, { token: cashier }), 403, 'FORBIDDEN');
      }
    });

    it('historial de turnos: reports.view ve todos, el cajero los suyos, otros roles -> FORBIDDEN', async () => {
      const cashier = await login('laura.gomez');
      const clerk = await login('ana.cartera');
      const keeper = await login('andres.rojas');
      const shift = await ensureOpenShift(cashier);

      const own = await call('GET', '/pos/shifts', { token: cashier });
      expect(own.status, JSON.stringify(own.body)).toBe(200);
      const ownShifts = z.array(shiftSchema).parse(own.body);
      expect(ownShifts.some((s) => s.id === shift.id)).toBe(true);
      expect(ownShifts.every((s) => s.cashierId === shift.cashierId)).toBe(true);

      const all = z.array(shiftSchema).parse((await call('GET', `/pos/shifts?branchId=${shift.branchId}`, { token: clerk })).body);
      expect(all.some((s) => s.id === shift.id)).toBe(true);
      const none = z.array(shiftSchema).parse((await call('GET', '/pos/shifts?branchId=br-002', { token: clerk })).body);
      expect(none.some((s) => s.id === shift.id)).toBe(false);
      expectError(await call('GET', '/pos/shifts', { token: keeper }), 403, 'FORBIDDEN');
    });

    it('permisos nuevos: customers.edit, receivables.pay, payables.pay, purchases.receive -> FORBIDDEN', async () => {
      const cashier = await login('laura.gomez');
      const keeper = await login('andres.rojas');
      const buyer = await login('pedro.compras');
      const clerk = await login('ana.cartera');
      const customer = {
        name: 'Tienda La Esquina', documentType: 'NIT', taxId: '900123456-1', taxResponsibility: 'R-99-PN',
        active: true, creditLimit: 1500000,
      };

      expectError(await call('PUT', '/customers/cus-001', { token: cashier, body: customer }), 403, 'FORBIDDEN');
      expectError(await call('PUT', '/customers/cus-001', { token: buyer, body: customer }), 403, 'FORBIDDEN');
      expect((await call('PUT', '/customers/cus-001', { token: clerk, body: customer })).status).toBe(200);

      expectError(await call('POST', '/receivables/rec-001/payments', {
        token: buyer, body: { amount: 1, method: 'efectivo' },
      }), 403, 'FORBIDDEN');
      expectError(await call('POST', '/payables/pay-001/payments', {
        token: keeper, body: { amount: 1, method: 'efectivo' },
      }), 403, 'FORBIDDEN');
      expectError(await call('POST', '/payables/pay-001/payments', {
        token: cashier, body: { amount: 1, method: 'efectivo' },
      }), 403, 'FORBIDDEN');
      const payable = await call('POST', '/payables/pay-001/payments', {
        token: buyer, body: { amount: 1, method: 'efectivo' },
      });
      expect(payable.status, JSON.stringify(payable.body)).toBe(200);
      expectSchema('Payable', payable.body);

      const order = purchaseOrderSchema.parse((await call('POST', '/purchase-orders', {
        token: buyer, body: { supplierId: 'sup-001', lines: [{ productId: 'prd-001', quantity: 1, unitCost: 2100 }] },
      })).body);
      await call('POST', `/purchase-orders/${order.id}/send`, { token: buyer, body: {} });
      expectError(await call('POST', `/purchase-orders/${order.id}/receive`, { token: clerk, body: {} }), 403, 'FORBIDDEN');
      expectError(await call('POST', `/purchase-orders/${order.id}/receive`, { token: cashier, body: {} }), 403, 'FORBIDDEN');
    });

    it('administración: sedes y empresa solo admin/propietario; catálogo cerrado de taxResponsibility', async () => {
      const admin = await login('maria.perez');
      const cashier = await login('laura.gomez');
      const clerk = await login('ana.cartera');

      expectError(await call('PUT', '/branches/br-002', { token: cashier, body: { name: 'Otra', active: true } }), 403, 'FORBIDDEN');
      expectError(await call('PUT', '/branches/br-999', { token: admin, body: { name: 'Otra', active: true } }), 404, 'NOT_FOUND');
      expectError(await call('PUT', '/branches/br-002', { token: admin, body: { name: '', active: true } }), 422, 'VALIDATION_ERROR');
      const branch = await call('PUT', '/branches/br-002', { token: admin, body: { name: 'Sede Norte', active: true } });
      expect(branch.status, JSON.stringify(branch.body)).toBe(200);
      expectSchema('Branch', branch.body);

      expectError(await call('GET', '/company', { token: clerk }), 403, 'FORBIDDEN');
      const company = await call('GET', '/company', { token: admin });
      expect(company.status, JSON.stringify(company.body)).toBe(200);
      expectSchema('Company', company.body);
      const current = companySchema.parse(company.body);
      const { id: _id, ...input } = current;
      void _id;
      expectError(await call('PUT', '/company', { token: clerk, body: input }), 403, 'FORBIDDEN');
      expectError(await call('PUT', '/company', { token: admin, body: { ...input, taxResponsibility: 'X-00' } }), 422, 'VALIDATION_ERROR');
      const updated = await call('PUT', '/company', { token: admin, body: input });
      expect(updated.status, JSON.stringify(updated.body)).toBe(200);
      expectSchema('Company', updated.body);

      const bad = {
        name: 'Cliente Catálogo', documentType: 'CC', taxId: '2020202020', taxResponsibility: 'texto-libre',
        active: true, creditLimit: 0,
      };
      expectError(await call('POST', '/customers', { token: admin, body: bad }), 422, 'VALIDATION_ERROR');
    });

    it('la sesión trae la sede real del empleado (Session.branch)', async () => {
      const token = await login('sofia.ruiz'); // bodeguera de br-002
      const session = await call('GET', '/auth/session', { token });
      expectSchema('Session', session.body);
      expect((session.body as { branch: { id: string } }).branch.id).toBe('br-002');
    });
  });
};
