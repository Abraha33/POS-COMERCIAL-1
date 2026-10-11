/** Reexporta lo que usa la suite de conformidad (contratos del frontend + zod) en un solo punto. */
export { z } from 'zod';
export {
  apiErrorSchema, approvalSchema, authSessionSchema, inventoryAlertSchema, payableSchema, purchaseOrderSchema,
  receivableSchema, saleReceiptSchema, saleReturnSchema, saleSchema, shiftSchema, stockLevelSchema, transferSchema,
} from '@/shared/contracts';
export type { SaleCreate, Shift } from '@/shared/contracts';
