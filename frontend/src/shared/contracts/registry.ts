import { productContract } from './product';
import {
  customerContract, supplierContract, employeeContract, customerInputContract, supplierInputContract,
  employeeInputContract, branchContract,
} from './party';
import { saleContract } from './sale';
import { stockMovementContract, transferContract, transferCreateContract, inventoryAlertContract } from './stock';
import { purchaseOrderContract, purchaseOrderCreateContract } from './purchase';
import { receivableContract, payableContract, ledgerPaymentContract } from './ledger';
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
} as const;
