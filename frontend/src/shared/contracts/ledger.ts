import { z } from 'zod';
import { isoDate, money, type Contract } from './common';
import { paymentMethodSchema } from './sale';

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

/** Abono a una cuenta por cobrar o pago a una por pagar (BR-CLI-05: se aplica a la factura indicada). */
export const ledgerPaymentSchema = z.object({
  amount: money.refine((v) => v > 0, 'Debe ser mayor que cero'),
  method: paymentMethodSchema.exclude(['credito']),
  note: z.string().optional(),
});
export type LedgerPayment = z.infer<typeof ledgerPaymentSchema>;
export const ledgerPaymentContract: Contract<typeof ledgerPaymentSchema> = {
  doctype: 'Payment Entry',
  schema: ledgerPaymentSchema,
  example: { amount: 100000, method: 'transferencia', note: 'Abono parcial' },
};
