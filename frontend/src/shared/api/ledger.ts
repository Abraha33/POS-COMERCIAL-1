import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  customerSchema, employeeSchema, payableSchema, purchaseOrderSchema, receivableSchema, supplierSchema,
  type Customer, type CustomerInput, type Employee, type EmployeeInput, type LedgerPayment, type Payable,
  type PurchaseOrder, type PurchaseOrderCreate, type Receivable, type Supplier, type SupplierInput,
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
  return useMutation<PurchaseOrder, ApiError, { orderId: string }>({
    mutationFn: ({ orderId }) => api.post(`/purchase-orders/${orderId}/receive`, {}, purchaseOrderSchema),
    onSuccess: invalidate,
  });
};

export const usePayReceivable = () => {
  const invalidate = useInvalidate(['receivables']);
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
