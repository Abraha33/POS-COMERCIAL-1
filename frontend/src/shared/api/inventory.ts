import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  inventoryAlertSchema, inventoryCountSchema, stockAdjustmentResultSchema, transferSchema, type InventoryAlert,
  type InventoryCount, type InventoryCountCreate, type StockAdjustmentCreate, type StockAdjustmentResult,
  type Transfer, type TransferCreate,
} from '@/shared/contracts';
import { api, type ApiError } from './client';

/** Traslados en dos pasos (BR-INV-03) y alertas de stock negativo (BR-INV-02). Propiedad del integrador. */

export const useTransfers = () =>
  useQuery<Transfer[], ApiError>({
    queryKey: ['transfers'],
    queryFn: () => api.get('/inventory/transfers', z.array(transferSchema)),
  });

export const useInventoryAlerts = () =>
  useQuery<InventoryAlert[], ApiError>({
    queryKey: ['inventory-alerts'],
    queryFn: () => api.get('/inventory/alerts', z.array(inventoryAlertSchema)),
  });

const useInvalidateInventory = () => {
  const queryClient = useQueryClient();
  return () => {
    for (const key of ['transfers', 'stock-levels', 'stock-movements']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
};

export const useCreateTransfer = () => {
  const invalidate = useInvalidateInventory();
  return useMutation<Transfer, ApiError, TransferCreate>({
    mutationFn: (input) => api.post('/inventory/transfers', input, transferSchema),
    onSuccess: invalidate,
  });
};

export const useReceiveTransfer = () => {
  const invalidate = useInvalidateInventory();
  return useMutation<Transfer, ApiError, { transferId: string }>({
    mutationFn: ({ transferId }) => api.post(`/inventory/transfers/${transferId}/receive`, {}, transferSchema),
    onSuccess: invalidate,
  });
};

const useInvalidateStock = () => {
  const queryClient = useQueryClient();
  return () => {
    for (const key of ['stock-levels', 'stock-movements', 'inventory-alerts']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
};

/** Ajuste manual con signo; resuelve las alertas STOCK_NEGATIVE (PROPUESTA v0.5.0). */
export const useCreateStockAdjustment = () => {
  const invalidate = useInvalidateStock();
  return useMutation<StockAdjustmentResult, ApiError, StockAdjustmentCreate>({
    mutationFn: (input) => api.post('/inventory/adjustments', input, stockAdjustmentResultSchema),
    onSuccess: invalidate,
  });
};

/** Conteo físico: devuelve las diferencias y genera los ajustes (PROPUESTA v0.5.0). */
export const useCreateInventoryCount = () => {
  const invalidate = useInvalidateStock();
  return useMutation<InventoryCount, ApiError, InventoryCountCreate>({
    mutationFn: (input) => api.post('/inventory/counts', input, inventoryCountSchema),
    onSuccess: invalidate,
  });
};
