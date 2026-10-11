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
