/** Reexporta lo que usa la suite de conformidad (contratos del frontend + zod) en un solo punto. */
export { z } from 'zod';
export {
  apiErrorSchema, approvalSchema, authSessionSchema, inventoryAlertSchema, payableSchema, purchaseOrderSchema,
  receivableSchema, saleReceiptSchema, saleReturnSchema, saleSchema, shiftSchema, stockLevelSchema, transferSchema,
  agingReportSchema, companySchema, customerPaymentResultSchema, customerSchema, inventoryCountSchema,
  inventoryValuationSchema, purchaseOrderReceiptSchema, receivablePaymentSchema, salesSummarySchema,
  stockAdjustmentResultSchema, stockMovementSchema, approvalTicketSchema, custodyEntrySchema, posOrderSchema,
  syncBatchResultSchema, registerSchema, countryPackSchema,
} from '@/shared/contracts';
export type { SaleCreate, Shift } from '@/shared/contracts';
