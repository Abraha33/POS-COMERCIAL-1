import { z } from 'zod';
import { isoDate, money, type Contract } from './common';
import { paymentSchema, saleSchema } from './sale';

/** Formato único de error (BR-GEN-09). Los `code` están listados en docs/business-rules. */
export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
export const apiErrorContract: Contract<typeof apiErrorSchema> = {
  doctype: '(transversal)',
  schema: apiErrorSchema,
  example: {
    code: 'STOCK_INSUFFICIENT',
    message: 'Existencias insuficientes para SKU-001',
    details: { productId: 'prd-001', available: 1, requested: 2 },
  },
};

/** Venta enviada por el POS. El servidor fija precios, impuestos, ajuste y totales (BR-GEN-06). */
export const saleCreateSchema = z.object({
  clientOperationId: z.uuid(),
  shiftId: z.string(),
  customerId: z.string().nullable(),
  lines: z
    .array(z.object({ productId: z.string(), quantity: z.number().positive(), discount: money }))
    .min(1),
  payments: z.array(paymentSchema).min(1),
  /** Instante real de la venta si se hizo sin conexión (BR-VEN-13). */
  occurredAt: isoDate.optional(),
  /** true si se encoló offline: el servidor acepta aunque no haya stock (BR-VEN-13). */
  offline: z.boolean().optional(),
  /** Token de `POST /auth/supervisor-approvals` para descuento, stock negativo o bajo costo. */
  approvalToken: z.string().optional(),
  /** PROPUESTA v0.6.0: plazo del crédito en días (por defecto 30; BR-CLI-06 aprobada es "30+3"). */
  creditTermDays: z.union([z.literal(7), z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).optional(),
});
export type SaleCreate = z.infer<typeof saleCreateSchema>;
export const saleCreateContract: Contract<typeof saleCreateSchema> = {
  doctype: 'POS Invoice',
  schema: saleCreateSchema,
  example: {
    clientOperationId: '3f2b8c1e-5a47-4d0e-9b1a-6c2d7e8f9a10',
    shiftId: 'sh-001',
    customerId: 'cus-001',
    lines: [{ productId: 'prd-001', quantity: 2, discount: 0 }],
    payments: [{ method: 'efectivo', amount: 10000 }],
  },
};

export const saleReceiptSchema = saleSchema.extend({
  clientOperationId: z.uuid(),
  /** Cambio en efectivo = pagos − total (BR-VEN-08). */
  change: money,
});
export type SaleReceipt = z.infer<typeof saleReceiptSchema>;
export const saleReceiptContract: Contract<typeof saleReceiptSchema> = {
  doctype: 'POS Invoice',
  schema: saleReceiptSchema,
  example: {
    id: 'sal-001', number: 'POS-0001', date: '2026-10-01', customerId: 'cus-001', cashierId: 'emp-001',
    branchId: 'br-001', shiftId: 'sh-001',
    lines: [{ productId: 'prd-001', quantity: 2, unitPrice: 2800, discount: 0, returnedQuantity: 0 }],
    payments: [{ method: 'efectivo', amount: 10000 }], roundingAdjustment: 0, total: 5600, status: 'pagada',
    clientOperationId: '3f2b8c1e-5a47-4d0e-9b1a-6c2d7e8f9a10', change: 4400,
  },
};

export const saleVoidSchema = z.object({ reason: z.string().min(1) });
export type SaleVoid = z.infer<typeof saleVoidSchema>;
export const saleVoidContract: Contract<typeof saleVoidSchema> = {
  doctype: 'POS Invoice (return)',
  schema: saleVoidSchema,
  example: { reason: 'Producto devuelto por el cliente' },
};

export const shiftSchema = z.object({
  id: z.string(),
  registerId: z.string(),
  branchId: z.string(),
  cashierId: z.string(),
  openedAt: isoDate,
  closedAt: isoDate.nullable(),
  openingCash: money,
  expectedCash: money,
  countedCash: money.nullable(),
  difference: z.number().int().nullable(),
  closingNote: z.string().nullable(),
  status: z.enum(['open', 'closed']),
});
export type Shift = z.infer<typeof shiftSchema>;
export const shiftContract: Contract<typeof shiftSchema> = {
  doctype: 'POS Opening Entry / POS Closing Entry',
  schema: shiftSchema,
  example: {
    id: 'sh-001', registerId: 'reg-001', branchId: 'br-001', cashierId: 'emp-001', openedAt: '2026-10-01T13:00:00Z',
    closedAt: null, openingCash: 100000, expectedCash: 105600, countedCash: null, difference: null,
    closingNote: null, status: 'open',
  },
};

export const shiftOpenSchema = z.object({ registerId: z.string(), openingCash: money });
export type ShiftOpen = z.infer<typeof shiftOpenSchema>;
export const shiftOpenContract: Contract<typeof shiftOpenSchema> = {
  doctype: 'POS Opening Entry',
  schema: shiftOpenSchema,
  example: { registerId: 'reg-001', openingCash: 100000 },
};

/** BR-CAJ-06: con diferencia ≠ 0 la nota de justificación es obligatoria (lo valida el servidor). */
export const shiftCloseSchema = z.object({ countedCash: money, note: z.string().optional() });
export type ShiftClose = z.infer<typeof shiftCloseSchema>;
export const shiftCloseContract: Contract<typeof shiftCloseSchema> = {
  doctype: 'POS Closing Entry',
  schema: shiftCloseSchema,
  example: { countedCash: 105000, note: 'Faltante de 600 por cambio' },
};

/** BR-CAJ-09: movimientos tipificados que afectan el efectivo esperado. */
export const cashMovementCategorySchema = z.enum([
  'base', 'sencillo', 'pago_proveedor', 'transporte', 'sangria', 'otro',
]);
export const shiftMovementSchema = z.object({
  type: z.enum(['ingreso', 'egreso']),
  category: cashMovementCategorySchema,
  amount: money.refine((v) => v > 0, 'Debe ser mayor que cero'),
  note: z.string().optional(),
});
export type ShiftMovement = z.infer<typeof shiftMovementSchema>;
export const shiftMovementContract: Contract<typeof shiftMovementSchema> = {
  doctype: 'POS Cash Movement',
  schema: shiftMovementSchema,
  example: { type: 'egreso', category: 'transporte', amount: 15000, note: 'Flete de mercancía' },
};

/** Devolución parcial de una venta (PROPUESTA, docs/business-rules/07-devoluciones.md). */
export const saleReturnCreateSchema = z.object({
  lines: z.array(z.object({ productId: z.string(), quantity: z.number().positive() })).min(1),
  reason: z.string().min(1),
});
export type SaleReturnCreate = z.infer<typeof saleReturnCreateSchema>;
export const saleReturnCreateContract: Contract<typeof saleReturnCreateSchema> = {
  doctype: 'POS Invoice (return)',
  schema: saleReturnCreateSchema,
  example: { lines: [{ productId: 'prd-001', quantity: 1 }], reason: 'Empaque dañado' },
};

export const saleReturnSchema = z.object({
  id: z.string(),
  number: z.string(),
  saleId: z.string(),
  date: isoDate,
  lines: z.array(z.object({ productId: z.string(), quantity: z.number().positive(), amount: money })).min(1),
  total: money,
  reason: z.string(),
});
export type SaleReturn = z.infer<typeof saleReturnSchema>;
export const saleReturnContract: Contract<typeof saleReturnSchema> = {
  doctype: 'POS Invoice (return)',
  schema: saleReturnSchema,
  example: {
    id: 'ret-001', number: 'DEV-0001', saleId: 'sal-001', date: '2026-10-11',
    lines: [{ productId: 'prd-001', quantity: 1, amount: 2800 }], total: 2800, reason: 'Empaque dañado',
  },
};
