import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  inventoryAlertSchema, transferSchema, type InventoryAlert, type Transfer, type TransferCreate,
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
