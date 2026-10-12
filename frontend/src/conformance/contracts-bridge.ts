/** Reexporta lo que usa la suite de conformidad (contratos del frontend + zod) en un solo punto. */
export { z } from 'zod';
export {
  apiErrorSchema, approvalSchema, authSessionSchema, inventoryAlertSchema, payableSchema, purchaseOrderSchema,
  receivableSchema, saleReceiptSchema, saleReturnSchema, saleSchema, shiftSchema, stockLevelSchema, transferSchema,
  agingReportSchema, companySchema, customerPaymentResultSchema, customerSchema, inventoryCountSchema,
  inventoryValuationSchema, purchaseOrderReceiptSchema, receivablePaymentSchema, salesSummarySchema,
  stockAdjustmentResultSchema, stockMovementSchema, authorizationRequestSchema, custodyEntrySchema, posOrderSchema,
  syncBatchResultSchema,
} from '@/shared/contracts';
export type { SaleCreate, Shift } from '@/shared/contracts';
