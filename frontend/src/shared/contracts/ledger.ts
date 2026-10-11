import { z } from 'zod';
import { isoDate, money, type Contract } from './common';

export const receivableSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  saleId: z.string().nullable(),
  issued: isoDate,
  due: isoDate,
  amount: money,
  paid: money,
});
export type Receivable = z.infer<typeof receivableSchema>;
export const receivableContract: Contract<typeof receivableSchema> = {
  doctype: 'Sales Invoice (outstanding)',
  schema: receivableSchema,
  example: { id: 'rec-001', customerId: 'cus-001', saleId: 'sal-002', issued: '2026-09-20', due: '2026-10-20', amount: 400000, paid: 100000 },
};

export const payableSchema = z.object({
  id: z.string(),
  supplierId: z.string(),
  purchaseOrderId: z.string().nullable(),
  issued: isoDate,
  due: isoDate,
  amount: money,
  paid: money,
});
export type Payable = z.infer<typeof payableSchema>;
export const payableContract: Contract<typeof payableSchema> = {
  doctype: 'Purchase Invoice (outstanding)',
  schema: payableSchema,
  example: { id: 'pay-001', supplierId: 'sup-001', purchaseOrderId: 'po-001', issued: '2026-09-28', due: '2026-10-28', amount: 210000, paid: 0 },
};
