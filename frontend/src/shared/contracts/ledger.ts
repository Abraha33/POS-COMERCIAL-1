import { z } from 'zod';
import { isoDate, money, type Contract } from './common';
import { paymentMethodSchema } from './sale';

/**
 * Estado de una cuenta (derivado por el servidor, v0.5.0). `en_gracia`: venció hace 1 a 3 días (BR-CLI-06).
 * Las cuentas por pagar no tienen gracia (PROPUESTA): nunca devuelven `en_gracia`.
 */
export const ledgerStatusSchema = z.enum(['vigente', 'en_gracia', 'vencida', 'pagada']);
export type LedgerStatus = z.infer<typeof ledgerStatusSchema>;

const derived = {
  /** amount - paid. */
  balance: money,
  status: ledgerStatusSchema,
  /** Días desde `due` (0 si no ha vencido o está pagada). */
  daysOverdue: z.number().int().nonnegative(),
};

/** Lo que persiste la cuenta por cobrar; el servidor añade los derivados. */
export const receivableRecordSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  saleId: z.string().nullable(),
  branchId: z.string(),
  issued: isoDate,
  due: isoDate,
  amount: money,
  paid: money,
});
export type ReceivableRecord = z.infer<typeof receivableRecordSchema>;

export const receivableSchema = receivableRecordSchema.extend(derived);
export type Receivable = z.infer<typeof receivableSchema>;
export const receivableContract: Contract<typeof receivableSchema> = {
  doctype: 'Sales Invoice (outstanding)',
  schema: receivableSchema,
  example: {
    id: 'rec-001', customerId: 'cus-001', saleId: 'sal-002', branchId: 'br-001', issued: '2026-09-20',
    due: '2026-10-20', amount: 400000, paid: 100000, balance: 300000, status: 'vigente', daysOverdue: 0,
  },
};

export const payableRecordSchema = z.object({
  id: z.string(),
  supplierId: z.string(),
  purchaseOrderId: z.string().nullable(),
  branchId: z.string(),
  issued: isoDate,
  due: isoDate,
  amount: money,
  paid: money,
});
export type PayableRecord = z.infer<typeof payableRecordSchema>;

export const payableSchema = payableRecordSchema.extend(derived);
export type Payable = z.infer<typeof payableSchema>;
export const payableContract: Contract<typeof payableSchema> = {
  doctype: 'Purchase Invoice (outstanding)',
  schema: payableSchema,
  example: {
    id: 'pay-001', supplierId: 'sup-001', purchaseOrderId: 'po-001', branchId: 'br-001', issued: '2026-09-28',
    due: '2026-10-28', amount: 210000, paid: 0, balance: 210000, status: 'vigente', daysOverdue: 0,
  },
};

/**
 * Abono a una cuenta por cobrar o pago a una por pagar (BR-CAR-01: a la factura indicada).
 * `POST /customers/{id}/payments` usa el mismo cuerpo e imputa a las facturas más antiguas (BR-CLI-05).
 */
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

/** Registro de un abono aplicado a una cuenta por cobrar (historial, PROPUESTA v0.5.0). */
export const receivablePaymentSchema = z.object({
  id: z.string(),
  receivableId: z.string(),
  customerId: z.string(),
  date: isoDate,
  amount: money.refine((v) => v > 0, 'Debe ser mayor que cero'),
  method: paymentMethodSchema.exclude(['credito']),
  note: z.string().optional(),
});
export type ReceivablePayment = z.infer<typeof receivablePaymentSchema>;
export const receivablePaymentContract: Contract<typeof receivablePaymentSchema> = {
  doctype: 'Payment Entry',
  schema: receivablePaymentSchema,
  example: {
    id: 'rpay-001', receivableId: 'rec-001', customerId: 'cus-001', date: '2026-10-11', amount: 100000,
    method: 'transferencia', note: 'Abono parcial',
  },
};

/** Respuesta de `POST /customers/{id}/payments`: un abono por factura afectada (BR-CLI-05). */
export const customerPaymentResultSchema = z.object({
  customerId: z.string(),
  amount: money.refine((v) => v > 0, 'Debe ser mayor que cero'),
  payments: z.array(receivablePaymentSchema).min(1),
  balanceAfter: money,
});
export type CustomerPaymentResult = z.infer<typeof customerPaymentResultSchema>;
export const customerPaymentResultContract: Contract<typeof customerPaymentResultSchema> = {
  doctype: 'Payment Entry',
  schema: customerPaymentResultSchema,
  example: {
    customerId: 'cus-001', amount: 100000,
    payments: [{
      id: 'rpay-001', receivableId: 'rec-001', customerId: 'cus-001', date: '2026-10-11', amount: 100000,
      method: 'transferencia', note: 'Abono parcial',
    }],
    balanceAfter: 200000,
  },
};
