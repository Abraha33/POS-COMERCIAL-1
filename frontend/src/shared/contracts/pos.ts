import { z } from 'zod';
import { isoDate, money, type Contract } from './common';
import { paymentMethodSchema, saleSchema } from './sale';

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

/** Venta enviada por el POS. El servidor fija precios, impuestos y totales (BR-GEN-06). */
export const saleCreateSchema = z.object({
  clientOperationId: z.uuid(),
  shiftId: z.string(),
  customerId: z.string().nullable(),
  lines: z
    .array(z.object({ productId: z.string(), quantity: z.number().positive(), discount: money }))
    .min(1),
  paymentMethod: paymentMethodSchema,
  amountTendered: money.optional(),
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
    paymentMethod: 'efectivo',
    amountTendered: 10000,
  },
};

export const saleReceiptSchema = saleSchema.extend({
  clientOperationId: z.uuid(),
  change: money,
});
export type SaleReceipt = z.infer<typeof saleReceiptSchema>;
export const saleReceiptContract: Contract<typeof saleReceiptSchema> = {
  doctype: 'POS Invoice',
  schema: saleReceiptSchema,
  example: {
    id: 'sal-001', number: 'POS-0001', date: '2026-10-01', customerId: 'cus-001', cashierId: 'emp-001',
    branchId: 'br-001', lines: [{ productId: 'prd-001', quantity: 2, unitPrice: 2800, discount: 0 }],
    paymentMethod: 'efectivo', total: 5600, status: 'pagada',
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
  cashierId: z.string(),
  openedAt: isoDate,
  closedAt: isoDate.nullable(),
  openingCash: money,
  expectedCash: money,
  countedCash: money.nullable(),
  difference: z.number().int().nullable(),
  status: z.enum(['open', 'closed']),
});
export type Shift = z.infer<typeof shiftSchema>;
export const shiftContract: Contract<typeof shiftSchema> = {
  doctype: 'POS Opening Entry / POS Closing Entry',
  schema: shiftSchema,
  example: {
    id: 'sh-001', registerId: 'reg-001', cashierId: 'emp-001', openedAt: '2026-10-01T13:00:00Z',
    closedAt: null, openingCash: 100000, expectedCash: 105600, countedCash: null, difference: null, status: 'open',
  },
};

export const shiftOpenSchema = z.object({ registerId: z.string(), openingCash: money });
export type ShiftOpen = z.infer<typeof shiftOpenSchema>;
export const shiftOpenContract: Contract<typeof shiftOpenSchema> = {
  doctype: 'POS Opening Entry',
  schema: shiftOpenSchema,
  example: { registerId: 'reg-001', openingCash: 100000 },
};

export const shiftCloseSchema = z.object({ countedCash: money, note: z.string().optional() });
export type ShiftClose = z.infer<typeof shiftCloseSchema>;
export const shiftCloseContract: Contract<typeof shiftCloseSchema> = {
  doctype: 'POS Closing Entry',
  schema: shiftCloseSchema,
  example: { countedCash: 105000, note: 'Faltante de 600 por cambio' },
};
