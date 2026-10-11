import { productContract } from './product';
import { customerContract, supplierContract, employeeContract } from './party';
import { saleContract } from './sale';
import { stockMovementContract } from './stock';
import { purchaseOrderContract } from './purchase';
import { receivableContract, payableContract } from './ledger';

/** Todos los contratos con DocType Frappe y ejemplo; los recorren los tests y core:check. */
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
} as const;
