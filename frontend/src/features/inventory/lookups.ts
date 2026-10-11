import { useMemo } from 'react';
import type { Product, StockMovement } from '@/shared/contracts';
import { useProducts } from '@/shared/api/queries';
import { useSession } from '@/app/providers/SessionProvider';

/** Producto por id para mostrar el nombre (nunca el id) en las tablas. */
export const useProductLookup = () => {
  const query = useProducts();
  const byId = useMemo(() => new Map((query.data ?? []).map((p) => [p.id, p])), [query.data]);
  const nameOf = (productId: string): string => byId.get(productId)?.name ?? `Producto ${productId}`;
  const skuOf = (productId: string): string => byId.get(productId)?.sku ?? '';
  return { products: query.data as Product[] | undefined, byId, nameOf, skuOf, isLoading: query.isLoading };
};

/**
 * No hay contrato de sedes: el nombre solo se conoce para la sede de la sesión.
 * PROPUESTA: GET /branches (ver docs/qa/requests/lane-b.md).
 */
export const useBranchLabel = () => {
  const { session } = useSession();
  return (branchId: string): string => (branchId === session.branch.id ? session.branch.name : `Sede ${branchId}`);
};

export const movementTypeLabels: Record<StockMovement['type'], string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  traslado_envio: 'Traslado enviado',
  traslado_recepcion: 'Traslado recibido',
};

export const formatDate = (iso: string): string => {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatQuantity = (value: number): string => value.toLocaleString('es-CO');
