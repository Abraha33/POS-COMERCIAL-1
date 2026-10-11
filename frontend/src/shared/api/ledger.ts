import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  branchSchema, companySchema, customerPaymentResultSchema, purchaseOrderReceiptSchema, receivablePaymentSchema,
  customerSchema, employeeSchema, payableSchema, purchaseOrderSchema, receivableSchema, supplierSchema,
  type Branch, type BranchInput, type Company, type CompanyInput, type Customer, type CustomerInput,
  type CustomerPaymentResult, type Employee, type EmployeeInput, type LedgerPayment, type Payable, type PurchaseOrder,
  type PurchaseOrderCreate, type PurchaseOrderReceipt, type Receivable, type ReceivablePayment, type Supplier,
  type SupplierInput,
} from '@/shared/contracts';
import { api, type ApiError } from './client';

/**
 * Escrituras de compras, cartera y administración (contrato v0.4.0, PROPUESTA). Cada hook invalida las
 * listas afectadas. Propiedad del integrador: los módulos los usan, no los reimplementan.
 */

const useInvalidate = (keys: string[]) => {
  const queryClient = useQueryClient();
  return () => {
    for (const key of keys) void queryClient.invalidateQueries({ queryKey: [key] });
  };
};

type SaveArgs<T> = { id?: string; input: T };

export const useSaveCustomer = () => {
  const invalidate = useInvalidate(['customers']);
  return useMutation<Customer, ApiError, SaveArgs<CustomerInput>>({
    mutationFn: ({ id, input }) =>
      id ? api.put(`/customers/${id}`, input, customerSchema) : api.post('/customers', input, customerSchema),
    onSuccess: invalidate,
  });
};

export const useSaveSupplier = () => {
  const invalidate = useInvalidate(['suppliers']);
  return useMutation<Supplier, ApiError, SaveArgs<SupplierInput>>({
    mutationFn: ({ id, input }) =>
      id ? api.put(`/suppliers/${id}`, input, supplierSchema) : api.post('/suppliers', input, supplierSchema),
    onSuccess: invalidate,
  });
};

export const useSaveEmployee = () => {
  const invalidate = useInvalidate(['employees']);
  return useMutation<Employee, ApiError, SaveArgs<EmployeeInput>>({
    mutationFn: ({ id, input }) =>
      id ? api.put(`/employees/${id}`, input, employeeSchema) : api.post('/employees', input, employeeSchema),
    onSuccess: invalidate,
  });
};

export const useCreatePurchaseOrder = () => {
  const invalidate = useInvalidate(['purchase-orders']);
  return useMutation<PurchaseOrder, ApiError, PurchaseOrderCreate>({
    mutationFn: (input) => api.post('/purchase-orders', input, purchaseOrderSchema),
    onSuccess: invalidate,
  });
};

export const useSendPurchaseOrder = () => {
  const invalidate = useInvalidate(['purchase-orders']);
  return useMutation<PurchaseOrder, ApiError, { orderId: string }>({
    mutationFn: ({ orderId }) => api.post(`/purchase-orders/${orderId}/send`, {}, purchaseOrderSchema),
    onSuccess: invalidate,
  });
};

/** Recibir: entrada de inventario, costo promedio nuevo y cuenta por pagar. */
export const useReceivePurchaseOrder = () => {
  const invalidate = useInvalidate(['purchase-orders', 'payables', 'stock-levels', 'stock-movements', 'products']);
  return useMutation<PurchaseOrderReceipt, ApiError, { orderId: string }>({
    mutationFn: ({ orderId }) => api.post(`/purchase-orders/${orderId}/receive`, {}, purchaseOrderReceiptSchema),
    onSuccess: invalidate,
  });
};

/** Cancela una orden `borrador` o `enviada` (PROPUESTA v0.5.0). */
export const useCancelPurchaseOrder = () => {
  const invalidate = useInvalidate(['purchase-orders']);
  return useMutation<PurchaseOrder, ApiError, { orderId: string }>({
    mutationFn: ({ orderId }) => api.post(`/purchase-orders/${orderId}/cancel`, {}, purchaseOrderSchema),
    onSuccess: invalidate,
  });
};

/** Historial de abonos de una cuenta por cobrar (PROPUESTA v0.5.0). Con `receivableId` nulo no consulta. */
export const useReceivablePayments = (receivableId: string | null) =>
  useQuery<ReceivablePayment[], ApiError>({
    queryKey: ['receivable-payments', receivableId],
    enabled: receivableId !== null,
    queryFn: () => api.get(`/receivables/${receivableId}/payments`, z.array(receivablePaymentSchema)),
  });

/** Abono del cliente imputado a las facturas más antiguas primero (BR-CLI-05, PROPUESTA v0.5.0). */
export const usePayCustomer = () => {
  const invalidate = useInvalidate(['receivables', 'receivable-payments', 'customers']);
  return useMutation<CustomerPaymentResult, ApiError, { customerId: string; input: LedgerPayment }>({
    mutationFn: ({ customerId, input }) =>
      api.post(`/customers/${customerId}/payments`, input, customerPaymentResultSchema),
    onSuccess: invalidate,
  });
};

/** Edita una sede (solo admin/propietario, PROPUESTA v0.5.0). */
export const useSaveBranch = () => {
  const invalidate = useInvalidate(['branches']);
  return useMutation<Branch, ApiError, { id: string; input: BranchInput }>({
    mutationFn: ({ id, input }) => api.put(`/branches/${id}`, input, branchSchema),
    onSuccess: invalidate,
  });
};

/** Datos de la empresa (solo admin/propietario, PROPUESTA v0.5.0). */
export const useCompany = () =>
  useQuery<Company, ApiError>({ queryKey: ['company'], queryFn: () => api.get('/company', companySchema) });

export const useSaveCompany = () => {
  const invalidate = useInvalidate(['company']);
  return useMutation<Company, ApiError, CompanyInput>({
    mutationFn: (input) => api.put('/company', input, companySchema),
    onSuccess: invalidate,
  });
};

export const usePayReceivable = () => {
  const invalidate = useInvalidate(['receivables', 'receivable-payments', 'customers']);
  return useMutation<Receivable, ApiError, { receivableId: string; input: LedgerPayment }>({
    mutationFn: ({ receivableId, input }) => api.post(`/receivables/${receivableId}/payments`, input, receivableSchema),
    onSuccess: invalidate,
  });
};

export const usePayPayable = () => {
  const invalidate = useInvalidate(['payables']);
  return useMutation<Payable, ApiError, { payableId: string; input: LedgerPayment }>({
    mutationFn: ({ payableId, input }) => api.post(`/payables/${payableId}/payments`, input, payableSchema),
    onSuccess: invalidate,
  });
};
