/**
 * Comprobación solo de tipos (la ejecuta `tsc`): los tipos inferidos de Zod deben ser
 * asignables en ambos sentidos a los generados desde contracts/openapi.yaml.
 * Si esto falla, el Zod y el OpenAPI divergieron.
 */
import type { components } from '@/shared/api/generated/schema';
import type {
  ApiErrorBody, AuthSession, Customer, Employee, Login, Payable, Product, ProductInput, PurchaseOrder,
  Receivable, Sale, SaleCreate, SaleReceipt, SaleVoid, Session, Shift, ShiftClose, ShiftOpen,
  StockLevel, StockMovement, Supplier, ShiftMovement, ApprovalRequest, Approval, TransferCreate, Transfer,
  InventoryAlert, Payment,
} from '@/shared/contracts';

type Schemas = components['schemas'];
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;


/** Exportado para que ni tsc ni eslint lo traten como código muerto; `Assert` falla si algún par diverge. */
export type ContractTypeChecks = [
  Assert<Same<Product, Schemas['Product']>>,
  Assert<Same<ProductInput, Schemas['ProductInput']>>,
  Assert<Same<Customer, Schemas['Customer']>>,
  Assert<Same<Supplier, Schemas['Supplier']>>,
  Assert<Same<Employee, Schemas['Employee']>>,
  Assert<Same<Sale, Schemas['Sale']>>,
  Assert<Same<SaleCreate, Schemas['SaleCreate']>>,
  Assert<Same<SaleReceipt, Schemas['SaleReceipt']>>,
  Assert<Same<SaleVoid, Schemas['SaleVoid']>>,
  Assert<Same<Shift, Schemas['Shift']>>,
  Assert<Same<ShiftOpen, Schemas['ShiftOpen']>>,
  Assert<Same<ShiftClose, Schemas['ShiftClose']>>,
  Assert<Same<StockMovement, Schemas['StockMovement']>>,
  Assert<Same<StockLevel, Schemas['StockLevel']>>,
  Assert<Same<PurchaseOrder, Schemas['PurchaseOrder']>>,
  Assert<Same<Receivable, Schemas['Receivable']>>,
  Assert<Same<Payable, Schemas['Payable']>>,
  Assert<Same<ApiErrorBody, Schemas['Error']>>,
  Assert<Same<Login, Schemas['Login']>>,
  Assert<Same<AuthSession, Schemas['AuthSession']>>,
  Assert<Same<Session, Schemas['Session']>>,
  Assert<Same<ShiftMovement, Schemas['ShiftMovement']>>,
  Assert<Same<ApprovalRequest, Schemas['ApprovalRequest']>>,
  Assert<Same<Approval, Schemas['Approval']>>,
  Assert<Same<TransferCreate, Schemas['TransferCreate']>>,
  Assert<Same<Transfer, Schemas['Transfer']>>,
  Assert<Same<InventoryAlert, Schemas['InventoryAlert']>>,
  Assert<Same<Payment, Schemas['Payment']>>,
  Assert<Same<ApprovalRequest, Schemas['ApprovalRequest']>>,
  Assert<Same<Approval, Schemas['Approval']>>,
  Assert<Same<TransferCreate, Schemas['TransferCreate']>>,
  Assert<Same<Transfer, Schemas['Transfer']>>,
  Assert<Same<InventoryAlert, Schemas['InventoryAlert']>>,
  Assert<Same<Payment, Schemas['Payment']>>,
];
