import { z } from 'zod';
import { isoDate, type Contract } from './common';

export const stockMovementSchema = z.object({
  id: z.string(),
  date: isoDate,
  productId: z.string(),
  branchId: z.string(),
  type: z.enum(['entrada', 'salida', 'ajuste', 'traslado']),
  quantity: z.number(),
  reference: z.string(),
});
export type StockMovement = z.infer<typeof stockMovementSchema>;

export const stockMovementContract: Contract<typeof stockMovementSchema> = {
  doctype: 'Stock Ledger Entry',
  schema: stockMovementSchema,
  example: { id: 'stk-001', date: '2026-10-01', productId: 'prd-001', branchId: 'br-001', type: 'entrada', quantity: 100, reference: 'PO-0001' },
};

export const stockLevelSchema = z.object({
  productId: z.string(),
  branchId: z.string(),
  onHand: z.number(),
  minimum: z.number().nonnegative(),
});
export type StockLevel = z.infer<typeof stockLevelSchema>;
