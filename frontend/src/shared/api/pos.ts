import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  approvalSchema, saleReceiptSchema, saleReturnSchema, saleSchema, shiftSchema,
  type Approval, type ApprovalRequest, type Sale, type SaleCreate, type SaleReceipt, type SaleReturn,
  type SaleReturnCreate, type SaleVoid,
  type Shift, type ShiftClose, type ShiftMovement, type ShiftOpen,
} from '@/shared/contracts';
import { api, ApiError } from './client';

/**
 * Operaciones del POS contra /api/v1/pos/* (mocks hoy, Frappe después). Propiedad del integrador:
 * los módulos las usan, no las reimplementan. Los errores llegan como `ApiError` con `code` del contrato.
 */

export const currentShiftKey = ['shift', 'current'] as const;

/** Turno abierto del usuario, o `null` si no tiene (404). */
export const useCurrentShift = () =>
  useQuery<Shift | null, ApiError>({
    queryKey: currentShiftKey,
    queryFn: async () => {
      try {
        return await api.get('/pos/shifts/current', shiftSchema);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });

const useInvalidateShift = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['shifts'] });
    return queryClient.invalidateQueries({ queryKey: currentShiftKey });
  };
};

export type ShiftFilters = { from?: string; to?: string; branchId?: string };

const queryString = (params: Record<string, string | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};

/** Historial de turnos con cuadre y diferencia (PROPUESTA v0.5.0). `reports.view` ve todos; el cajero, los suyos. */
export const useShifts = (filters: ShiftFilters = {}) =>
  useQuery<Shift[], ApiError>({
    queryKey: ['shifts', filters],
    queryFn: () => api.get(`/pos/shifts${queryString(filters)}`, z.array(shiftSchema)),
  });

/** Devoluciones ya registradas de una venta (BR-DEV-01). Con `saleId` nulo no consulta. */
export const useSaleReturns = (saleId: string | null) =>
  useQuery<SaleReturn[], ApiError>({
    queryKey: ['sale-returns', saleId],
    enabled: saleId !== null,
    queryFn: () => api.get(`/pos/sales/${saleId}/returns`, z.array(saleReturnSchema)),
  });

export const useOpenShift = () => {
  const invalidate = useInvalidateShift();
  return useMutation<Shift, ApiError, ShiftOpen>({
    mutationFn: (input) => api.post('/pos/shifts', input, shiftSchema),
    onSuccess: invalidate,
  });
};

export const useCloseShift = () => {
  const invalidate = useInvalidateShift();
  return useMutation<Shift, ApiError, { shiftId: string; input: ShiftClose }>({
    mutationFn: ({ shiftId, input }) => api.post(`/pos/shifts/${shiftId}/close`, input, shiftSchema),
    onSuccess: invalidate,
  });
};

export const useAddShiftMovement = () => {
  const invalidate = useInvalidateShift();
  return useMutation<Shift, ApiError, { shiftId: string; input: ShiftMovement }>({
    mutationFn: ({ shiftId, input }) => api.post(`/pos/shifts/${shiftId}/movements`, input, shiftSchema),
    onSuccess: invalidate,
  });
};

/** Confirma una venta. Idempotente: reintentar con el mismo `clientOperationId` devuelve la misma venta. */
export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation<SaleReceipt, ApiError, SaleCreate>({
    mutationFn: (input) =>
      api.post('/pos/sales', input, saleReceiptSchema, { headers: { 'Idempotency-Key': input.clientOperationId } }),
    onSuccess: () => {
      for (const key of ['sales', 'stock-levels', 'stock-movements', 'receivables', 'inventory-alerts']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      void queryClient.invalidateQueries({ queryKey: currentShiftKey });
    },
  });
};

export const useVoidSale = () => {
  const queryClient = useQueryClient();
  return useMutation<Sale, ApiError, { saleId: string; input: SaleVoid }>({
    mutationFn: ({ saleId, input }) => api.post(`/pos/sales/${saleId}/void`, input, saleSchema),
    onSuccess: () => {
      for (const key of ['sales', 'stock-levels', 'stock-movements', 'receivables']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      void queryClient.invalidateQueries({ queryKey: currentShiftKey });
    },
  });
};

/** Canjea el PIN de un supervisor por un `approvalToken` de un solo uso (BR-VEN-04/05/14). */
export const useRequestApproval = () =>
  useMutation<Approval, ApiError, ApprovalRequest>({
    mutationFn: (input) => api.post('/auth/supervisor-approvals', input, approvalSchema),
  });

/** Devolución parcial de una venta (PROPUESTA, docs/business-rules/07-devoluciones.md). */
export const useReturnSale = () => {
  const queryClient = useQueryClient();
  return useMutation<SaleReturn, ApiError, { saleId: string; input: SaleReturnCreate }>({
    mutationFn: ({ saleId, input }) => api.post(`/pos/sales/${saleId}/returns`, input, saleReturnSchema),
    onSuccess: () => {
      for (const key of ['sales', 'sale-returns', 'stock-levels', 'stock-movements']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      void queryClient.invalidateQueries({ queryKey: currentShiftKey });
    },
  });
};
