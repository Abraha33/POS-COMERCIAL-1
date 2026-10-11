import { z } from 'zod';
import { isoDate, type Contract } from './common';
import { stockLevelSchema, stockMovementSchema } from './stock';

/**
 * Ajuste manual de existencias (PROPUESTA v0.5.0, docs/business-rules/08-*). `quantity` es un entero con
 * signo distinto de 0 (positivo suma, negativo resta).
 */
export const stockAdjustmentCreateSchema = z.object({
  productId: z.string(),
  branchId: z.string(),
  quantity: z.number().int().refine((v) => v !== 0, 'Debe ser distinto de cero'),
  reason: z.string().min(1),
});
export type StockAdjustmentCreate = z.infer<typeof stockAdjustmentCreateSchema>;
export const stockAdjustmentCreateContract: Contract<typeof stockAdjustmentCreateSchema> = {
  doctype: 'Stock Reconciliation',
  schema: stockAdjustmentCreateSchema,
  example: { productId: 'prd-001', branchId: 'br-001', quantity: 5, reason: 'Producto hallado en bodega' },
};

export const stockAdjustmentResultSchema = z.object({
  movement: stockMovementSchema,
  level: stockLevelSchema,
  /** Alertas `STOCK_NEGATIVE` resueltas por este ajuste. */
  resolvedAlertIds: z.array(z.string()),
});
export type StockAdjustmentResult = z.infer<typeof stockAdjustmentResultSchema>;
export const stockAdjustmentResultContract: Contract<typeof stockAdjustmentResultSchema> = {
  doctype: 'Stock Reconciliation',
  schema: stockAdjustmentResultSchema,
  example: {
    movement: {
      id: 'stk-004', date: '2026-10-11', productId: 'prd-001', branchId: 'br-001', type: 'ajuste', quantity: 5,
      reference: 'Ajuste: Producto hallado en bodega',
    },
    level: { productId: 'prd-001', branchId: 'br-001', onHand: 45, inTransit: 0, minimum: 20 },
    resolvedAlertIds: ['alt-001'],
  },
};

/** Conteo físico de una sede: `counted` es lo contado; el servidor calcula la diferencia contra el sistema. */
export const inventoryCountCreateSchema = z.object({
  branchId: z.string(),
  lines: z.array(z.object({ productId: z.string(), counted: z.number().nonnegative() })).min(1),
});
export type InventoryCountCreate = z.infer<typeof inventoryCountCreateSchema>;
export const inventoryCountCreateContract: Contract<typeof inventoryCountCreateSchema> = {
  doctype: 'Stock Reconciliation',
  schema: inventoryCountCreateSchema,
  example: { branchId: 'br-001', lines: [{ productId: 'prd-001', counted: 38 }, { productId: 'prd-002', counted: 55 }] },
};

export const inventoryCountSchema = z.object({
  id: z.string(),
  number: z.string(),
  branchId: z.string(),
  date: isoDate,
  lines: z
    .array(z.object({
      productId: z.string(),
      systemQuantity: z.number(),
      counted: z.number().nonnegative(),
      /** counted - systemQuantity. */
      difference: z.number(),
      /** Movimiento `ajuste` generado; `null` si no hubo diferencia. */
      movementId: z.string().nullable(),
    }))
    .min(1),
  resolvedAlertIds: z.array(z.string()),
});
export type InventoryCount = z.infer<typeof inventoryCountSchema>;
export const inventoryCountContract: Contract<typeof inventoryCountSchema> = {
  doctype: 'Stock Reconciliation',
  schema: inventoryCountSchema,
  example: {
    id: 'cnt-001', number: 'CNT-0001', branchId: 'br-001', date: '2026-10-11',
    lines: [
      { productId: 'prd-001', systemQuantity: 40, counted: 38, difference: -2, movementId: 'stk-004' },
      { productId: 'prd-002', systemQuantity: 55, counted: 55, difference: 0, movementId: null },
    ],
    resolvedAlertIds: [],
  },
};
