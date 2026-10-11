import { productContract } from './product';
import {
  customerContract, supplierContract, employeeContract, customerInputContract, supplierInputContract,
  employeeInputContract, branchContract, branchInputContract, companyContract, companyInputContract,
} from './party';
import { saleContract } from './sale';
import { stockMovementContract, transferContract, transferCreateContract, inventoryAlertContract } from './stock';
import { purchaseOrderContract, purchaseOrderCreateContract, purchaseOrderReceiptContract } from './purchase';
import {
  stockAdjustmentCreateContract, stockAdjustmentResultContract, inventoryCountCreateContract, inventoryCountContract,
} from './inventory';
import { salesSummaryContract, agingReportContract, inventoryValuationContract } from './reports';
import {
  receivableContract, payableContract, ledgerPaymentContract, receivablePaymentContract,
  customerPaymentResultContract,
} from './ledger';
import {
  apiErrorContract, saleCreateContract, saleReceiptContract, saleVoidContract,
  shiftContract, shiftOpenContract, shiftCloseContract, shiftMovementContract,
  saleReturnCreateContract, saleReturnContract,
} from './pos';
import { loginContract, authSessionContract, approvalRequestContract, approvalContract } from './auth';

/**
 * Todos los contratos con DocType Frappe y ejemplo. La clave es el nombre de
 * contracts/examples/<clave>.json; los recorren los tests y core:check.
 */
export const contracts = {
  product: productContract,
  customer: customerContract,
  supplier: supplierContract,
  employee: employeeContract,
  sale: saleContract,
  stockMovement: stockMovementContract,
  purchaseOrder: purchaseOrderContract,
  receivable: receivableContract,
  payable: payableContract,
  apiError: apiErrorContract,
  saleCreate: saleCreateContract,
  saleReceipt: saleReceiptContract,
  saleVoid: saleVoidContract,
  shift: shiftContract,
  shiftOpen: shiftOpenContract,
  shiftClose: shiftCloseContract,
  login: loginContract,
  authSession: authSessionContract,
  shiftMovement: shiftMovementContract,
  approvalRequest: approvalRequestContract,
  approval: approvalContract,
  transferCreate: transferCreateContract,
  transfer: transferContract,
  inventoryAlert: inventoryAlertContract,
  customerInput: customerInputContract,
  supplierInput: supplierInputContract,
  employeeInput: employeeInputContract,
  branch: branchContract,
  purchaseOrderCreate: purchaseOrderCreateContract,
  ledgerPayment: ledgerPaymentContract,
  saleReturnCreate: saleReturnCreateContract,
  saleReturn: saleReturnContract,
  // v0.5.0 (PROPUESTA)
  receivablePayment: receivablePaymentContract,
  customerPaymentResult: customerPaymentResultContract,
  purchaseOrderReceipt: purchaseOrderReceiptContract,
  stockAdjustmentCreate: stockAdjustmentCreateContract,
  stockAdjustmentResult: stockAdjustmentResultContract,
  inventoryCountCreate: inventoryCountCreateContract,
  inventoryCount: inventoryCountContract,
  salesSummary: salesSummaryContract,
  agingReport: agingReportContract,
  inventoryValuation: inventoryValuationContract,
  branchInput: branchInputContract,
  company: companyContract,
  companyInput: companyInputContract,
} as const;
