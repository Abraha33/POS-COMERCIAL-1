import { z } from 'zod';
import { isoDate, money, type Contract } from './common';
import { paymentMethodSchema } from './sale';

/**
 * Reportes agregados (PROPUESTA v0.5.0, docs/business-rules/08-*): el servidor agrega; el cliente no
 * descarga listas completas para calcularlos.
 */

export const salesSummarySchema = z.object({
  from: z.string().nullable(),
  to: z.string().nullable(),
  branchId: z.string().nullable(),
  salesCount: z.number().int().nonnegative(),
  voidedCount: z.number().int().nonnegative(),
  /** Σ total de ventas no anuladas. */
  grossTotal: money,
  /** Σ devoluciones de esas ventas (BR-DEV-04). */
  returnsTotal: money,
  /** grossTotal - returnsTotal. */
  netTotal: z.number().int(),
  averageTicket: money,
  /** Σ pagos a crédito de ventas no anuladas. */
  creditTotal: money,
  byPaymentMethod: z.array(z.object({ method: paymentMethodSchema, amount: money })),
  byDay: z.array(z.object({ date: isoDate, count: z.number().int().nonnegative(), total: money })),
  topProducts: z.array(z.object({ productId: z.string(), quantity: z.number(), total: money })),
});
export type SalesSummary = z.infer<typeof salesSummarySchema>;
export const salesSummaryContract: Contract<typeof salesSummarySchema> = {
  doctype: '(reporte) POS Invoice',
  schema: salesSummarySchema,
  example: {
    from: '2026-10-01', to: '2026-10-11', branchId: null, salesCount: 2, voidedCount: 0, grossTotal: 53600,
    returnsTotal: 0, netTotal: 53600, averageTicket: 26800, creditTotal: 0,
    byPaymentMethod: [{ method: 'efectivo', amount: 25600 }, { method: 'nequi', amount: 28000 }],
    byDay: [{ date: '2026-10-01', count: 1, total: 5600 }, { date: '2026-10-03', count: 1, total: 48000 }],
    topProducts: [{ productId: 'prd-004', quantity: 6, total: 27000 }],
  },
};

export const agingBucketKeySchema = z.enum(['current', 'd1_30', 'd31_60', 'd61_90', 'd90_plus']);
export type AgingBucketKey = z.infer<typeof agingBucketKeySchema>;

const agingSideSchema = z.object({
  /** Saldo abierto total. */
  total: money,
  /** Parte del total ya vencida (todos los tramos menos `current`). */
  overdueTotal: money,
  buckets: z.array(z.object({ key: agingBucketKeySchema, count: z.number().int().nonnegative(), amount: money })),
});

export const agingReportSchema = z.object({
  asOf: isoDate,
  branchId: z.string().nullable(),
  receivables: agingSideSchema,
  payables: agingSideSchema,
});
export type AgingReport = z.infer<typeof agingReportSchema>;
export const agingReportContract: Contract<typeof agingReportSchema> = {
  doctype: '(reporte) Accounts Receivable / Payable',
  schema: agingReportSchema,
  example: {
    asOf: '2026-10-11', branchId: null,
    receivables: {
      total: 300000, overdueTotal: 0,
      buckets: [
        { key: 'current', count: 1, amount: 300000 }, { key: 'd1_30', count: 0, amount: 0 },
        { key: 'd31_60', count: 0, amount: 0 }, { key: 'd61_90', count: 0, amount: 0 },
        { key: 'd90_plus', count: 0, amount: 0 },
      ],
    },
    payables: {
      total: 210000, overdueTotal: 0,
      buckets: [
        { key: 'current', count: 1, amount: 210000 }, { key: 'd1_30', count: 0, amount: 0 },
        { key: 'd31_60', count: 0, amount: 0 }, { key: 'd61_90', count: 0, amount: 0 },
        { key: 'd90_plus', count: 0, amount: 0 },
      ],
    },
  },
};

export const inventoryValuationSchema = z.object({
  branchId: z.string().nullable(),
  /**
   * `branch_weighted_average`: costo promedio ponderado por sede (BR-INV-05, objetivo).
   * `product_cost`: costo vigente del producto (lo que sirve el mock mientras no exista costo por sede).
   */
  costBasis: z.enum(['product_cost', 'branch_weighted_average']),
  totalValue: money,
  items: z.array(z.object({
    productId: z.string(),
    branchId: z.string(),
    onHand: z.number(),
    unitCost: money,
    /** max(onHand, 0) × unitCost. */
    value: money,
  })),
});
export type InventoryValuation = z.infer<typeof inventoryValuationSchema>;
export const inventoryValuationContract: Contract<typeof inventoryValuationSchema> = {
  doctype: '(reporte) Stock Balance',
  schema: inventoryValuationSchema,
  example: {
    branchId: 'br-001', costBasis: 'product_cost', totalValue: 84000,
    items: [{ productId: 'prd-001', branchId: 'br-001', onHand: 40, unitCost: 2100, value: 84000 }],
  },
};
