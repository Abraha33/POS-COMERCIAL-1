import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  branchSchema, customerSchema, employeeSchema, payableSchema, productSchema, purchaseOrderSchema,
  receivableSchema, saleSchema, stockLevelSchema, stockMovementSchema, supplierSchema,
} from '@/shared/contracts';
import { api } from './client';

const list = <S extends z.ZodType>(key: string, path: string, schema: S) =>
  () => useQuery({ queryKey: [key], queryFn: () => api.get(path, z.array(schema)) });

/** Lecturas compartidas (propiedad del integrador). Las mutaciones viven en cada feature. */
export const useProducts = list('products', '/products', productSchema);
export const useCustomers = list('customers', '/customers', customerSchema);
export const useSuppliers = list('suppliers', '/suppliers', supplierSchema);
export const useEmployees = list('employees', '/employees', employeeSchema);
export const useSales = list('sales', '/sales', saleSchema);
export const useStockLevels = list('stock-levels', '/stock/levels', stockLevelSchema);
export const useStockMovements = list('stock-movements', '/stock/movements', stockMovementSchema);
export const usePurchaseOrders = list('purchase-orders', '/purchase-orders', purchaseOrderSchema);
export const useReceivables = list('receivables', '/receivables', receivableSchema);
export const usePayables = list('payables', '/payables', payableSchema);
export const useBranches = list('branches', '/branches', branchSchema);
