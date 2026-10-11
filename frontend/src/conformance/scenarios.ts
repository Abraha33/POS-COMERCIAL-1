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
  approvalSchema, apiErrorSchema, authSessionSchema, inventoryAlertSchema, receivableSchema, saleReceiptSchema,
  saleSchema, shiftSchema, stockLevelSchema, transferSchema, z,
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
    method: 'GET' | 'POST', path: string,
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
};
