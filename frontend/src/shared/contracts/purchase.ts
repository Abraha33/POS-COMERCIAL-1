import { z } from 'zod';
import { isoDate, money, type Contract } from './common';

export const purchaseOrderSchema = z.object({
  id: z.string(),
  number: z.string(),
  date: isoDate,
  supplierId: z.string(),
  lines: z.array(z.object({ productId: z.string(), quantity: z.number().positive(), unitCost: money })).min(1),
  total: money,
  status: z.enum(['borrador', 'enviada', 'recibida', 'cancelada']),
});
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

export const purchaseOrderContract: Contract<typeof purchaseOrderSchema> = {
  doctype: 'Purchase Order',
  schema: purchaseOrderSchema,
  example: {
    id: 'po-001', number: 'PO-0001', date: '2026-09-28', supplierId: 'sup-001',
    lines: [{ productId: 'prd-001', quantity: 100, unitCost: 2100 }], total: 210000, status: 'recibida',
  },
};

/**
 * Respuesta de `POST /purchase-orders/{id}/receive` (v0.5.0): la orden más el efecto de la recepción
 * (existencias y costo promedio antes/después por línea, y la cuenta por pagar creada).
 */
export const receiveEffectSchema = z.object({
  branchId: z.string(),
  payableId: z.string(),
  lines: z
    .array(z.object({
      productId: z.string(),
      stockBefore: z.number(),
      stockAfter: z.number(),
      avgCostBefore: money,
      avgCostAfter: money,
    }))
    .min(1),
});
export type ReceiveEffect = z.infer<typeof receiveEffectSchema>;

export const purchaseOrderReceiptSchema = purchaseOrderSchema.extend({ effect: receiveEffectSchema.optional() });
export type PurchaseOrderReceipt = z.infer<typeof purchaseOrderReceiptSchema>;
export const purchaseOrderReceiptContract: Contract<typeof purchaseOrderReceiptSchema> = {
  doctype: 'Purchase Receipt',
  schema: purchaseOrderReceiptSchema,
  example: {
    id: 'po-002', number: 'PO-0002', date: '2026-10-05', supplierId: 'sup-002',
    lines: [{ productId: 'prd-004', quantity: 60, unitCost: 3700 }], total: 222000, status: 'recibida',
    effect: {
      branchId: 'br-001', payableId: 'pay-002',
      lines: [{ productId: 'prd-004', stockBefore: 85, stockAfter: 145, avgCostBefore: 3700, avgCostAfter: 3700 }],
    },
  },
};

export const purchaseOrderCreateSchema = z.object({
  supplierId: z.string(),
  lines: z.array(z.object({ productId: z.string(), quantity: z.number().positive(), unitCost: money })).min(1),
});
export type PurchaseOrderCreate = z.infer<typeof purchaseOrderCreateSchema>;
export const purchaseOrderCreateContract: Contract<typeof purchaseOrderCreateSchema> = {
  doctype: 'Purchase Order',
  schema: purchaseOrderCreateSchema,
  example: { supplierId: 'sup-001', lines: [{ productId: 'prd-001', quantity: 50, unitCost: 2100 }] },
};
