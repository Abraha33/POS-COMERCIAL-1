import { z } from 'zod';
import { isoDate, money, type Contract } from './common';

/** BR-VEN-06: pago mixto; Nequi y Daviplata son medios propios. */
export const paymentMethodSchema = z.enum(['efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata', 'credito']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentSchema = z.object({
  method: paymentMethodSchema,
  amount: money,
  /** PROPUESTA v0.6.0: canal del catálogo, referencia, cuenta destino y comprobante verificado. */
  channel: z.string().optional(),
  reference: z.string().optional(),
  destination: z.string().optional(),
  proofId: z.string().optional(),
});
export type Payment = z.infer<typeof paymentSchema>;

export const saleLineSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: money,
  discount: money,
  /** Cantidad ya devuelta de la línea (BR-DEV-01); la deriva el servidor de las devoluciones. */
  returnedQuantity: z.number().nonnegative(),
});

export const saleSchema = z.object({
  id: z.string(),
  number: z.string(),
  date: isoDate,
  customerId: z.string().nullable(),
  cashierId: z.string(),
  branchId: z.string(),
  /** Turno de la venta (v0.5.0); `null` en datos previos. Permite anticipar el FORBIDDEN de anulación. */
  shiftId: z.string().nullable(),
  lines: z.array(saleLineSchema).min(1),
  payments: z.array(paymentSchema).min(1),
  /** "Ajuste al peso" (BR-GEN-05): positivo o negativo; total = Σ líneas + ajuste. */
  roundingAdjustment: z.number().int(),
  total: money,
  status: z.enum(['pagada', 'credito', 'anulada']),
});
export type Sale = z.infer<typeof saleSchema>;

export const saleContract: Contract<typeof saleSchema> = {
  doctype: 'POS Invoice',
  schema: saleSchema,
  example: {
    id: 'sal-001', number: 'POS-0001', date: '2026-10-01', customerId: 'cus-001', cashierId: 'emp-001',
    branchId: 'br-001', shiftId: 'sh-001',
    lines: [{ productId: 'prd-001', quantity: 2, unitPrice: 2800, discount: 0, returnedQuantity: 0 }],
    payments: [{ method: 'efectivo', amount: 5600 }], roundingAdjustment: 0, total: 5600, status: 'pagada',
  },
};
