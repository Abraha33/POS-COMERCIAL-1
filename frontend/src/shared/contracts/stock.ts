import { z } from 'zod';
import { isoDate, type Contract } from './common';

export const stockMovementSchema = z.object({
  id: z.string(),
  date: isoDate,
  productId: z.string(),
  branchId: z.string(),
  type: z.enum(['entrada', 'salida', 'ajuste', 'traslado_envio', 'traslado_recepcion']),
  quantity: z.number(),
  reference: z.string(),
});
export type StockMovement = z.infer<typeof stockMovementSchema>;

export const stockMovementContract: Contract<typeof stockMovementSchema> = {
  doctype: 'Stock Ledger Entry',
  schema: stockMovementSchema,
  example: { id: 'stk-001', date: '2026-10-01', productId: 'prd-001', branchId: 'br-001', type: 'entrada', quantity: 100, reference: 'PO-0001' },
};

/** `onHand` puede ser negativo (BR-VEN-05/13); `inTransit` son unidades enviadas aún no recibidas (BR-INV-03). */
export const stockLevelSchema = z.object({
  productId: z.string(),
  branchId: z.string(),
  onHand: z.number(),
  inTransit: z.number().nonnegative(),
  minimum: z.number().nonnegative(),
});
export type StockLevel = z.infer<typeof stockLevelSchema>;

export const transferLineSchema = z.object({ productId: z.string(), quantity: z.number().positive() });

export const transferCreateSchema = z.object({
  fromBranchId: z.string(),
  toBranchId: z.string(),
  lines: z.array(transferLineSchema).min(1),
});
export type TransferCreate = z.infer<typeof transferCreateSchema>;
export const transferCreateContract: Contract<typeof transferCreateSchema> = {
  doctype: 'Stock Entry (Material Transfer)',
  schema: transferCreateSchema,
  example: { fromBranchId: 'br-001', toBranchId: 'br-002', lines: [{ productId: 'prd-001', quantity: 20 }] },
};

/** BR-INV-03: dos pasos. `enviado` descuenta de origen y queda en tránsito; `recibido` suma en destino. */
export const transferSchema = transferCreateSchema.extend({
  id: z.string(),
  number: z.string(),
  status: z.enum(['enviado', 'recibido']),
  sentAt: isoDate,
  receivedAt: isoDate.nullable(),
});
export type Transfer = z.infer<typeof transferSchema>;
export const transferContract: Contract<typeof transferSchema> = {
  doctype: 'Stock Entry (Material Transfer)',
  schema: transferSchema,
  example: {
    id: 'trf-001', number: 'TRF-0001', fromBranchId: 'br-001', toBranchId: 'br-002',
    lines: [{ productId: 'prd-001', quantity: 20 }], status: 'enviado', sentAt: '2026-10-01T15:00:00Z', receivedAt: null,
  },
};

/** BR-INV-02: alerta "Ajuste de inventario requerido" cuando el stock queda negativo. */
export const inventoryAlertSchema = z.object({
  id: z.string(),
  type: z.literal('STOCK_NEGATIVE'),
  productId: z.string(),
  branchId: z.string(),
  createdAt: isoDate,
  resolved: z.boolean(),
});
export type InventoryAlert = z.infer<typeof inventoryAlertSchema>;
export const inventoryAlertContract: Contract<typeof inventoryAlertSchema> = {
  doctype: 'Stock Reconciliation (requerida)',
  schema: inventoryAlertSchema,
  example: {
    id: 'alt-001', type: 'STOCK_NEGATIVE', productId: 'prd-001', branchId: 'br-001',
    createdAt: '2026-10-01T16:00:00Z', resolved: false,
  },
};
