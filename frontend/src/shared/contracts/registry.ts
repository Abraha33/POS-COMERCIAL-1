import { productContract } from './product';
import { customerContract, supplierContract, employeeContract } from './party';
import { saleContract } from './sale';
import { stockMovementContract } from './stock';
import { purchaseOrderContract } from './purchase';
import { receivableContract, payableContract } from './ledger';
import {
  apiErrorContract, saleCreateContract, saleReceiptContract, saleVoidContract,
  shiftContract, shiftOpenContract, shiftCloseContract,
} from './pos';
import { loginContract, authSessionContract } from './auth';

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
} as const;
