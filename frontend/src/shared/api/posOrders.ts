import { z } from 'zod';
import { posOrderSchema, type PosOrder } from '@/shared/contracts';
import { api } from './client';

/**
 * Pedidos del POS en el servidor (PROPUESTA v0.6.0, capa 5). Sin hooks de react-query a propósito: la sincronización
 * de `features/pos/orders` es offline-first (el dispositivo manda mientras no haya conexión) y decide cuándo llamar.
 */
export const posOrdersApi = {
  list: (branchId: string): Promise<PosOrder[]> =>
    api.get(`/pos/orders?branchId=${encodeURIComponent(branchId)}`, z.array(posOrderSchema)),
  /** `expectedVersion`: la versión que el cliente vio por última vez (0 si es nuevo). Conflicto → ApiError VERSION_CONFLICT. */
  save: (order: PosOrder, expectedVersion: number): Promise<PosOrder> =>
    api.put(`/pos/orders/${encodeURIComponent(order.id)}`, { order, expectedVersion }, posOrderSchema),
};

export type PosOrdersApi = typeof posOrdersApi;
