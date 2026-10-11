import { useMemo } from 'react';
import type { Product, StockMovement } from '@/shared/contracts';
import { useBranches, useProducts } from '@/shared/api/queries';
import { useSession } from '@/app/providers/SessionProvider';

/** Producto por id para mostrar el nombre (nunca el id) en las tablas. */
export const useProductLookup = () => {
  const query = useProducts();
  const byId = useMemo(() => new Map((query.data ?? []).map((p) => [p.id, p])), [query.data]);
  const nameOf = (productId: string): string => byId.get(productId)?.name ?? `Producto ${productId}`;
  const skuOf = (productId: string): string => byId.get(productId)?.sku ?? '';
  return { products: query.data as Product[] | undefined, byId, nameOf, skuOf, isLoading: query.isLoading };
};

/** Nombre de la sede desde `GET /branches`; si aún no carga, la sede de la sesión o `Sede <id>`. */
export const useBranchLabel = () => {
  const { session } = useSession();
  const branches = useBranches();
  const names = useMemo(() => new Map((branches.data ?? []).map((b) => [b.id, b.name])), [branches.data]);
  return (branchId: string): string =>
    names.get(branchId) ?? (branchId === session.branch.id ? session.branch.name : `Sede ${branchId}`);
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

export type StockState = 'negative' | 'low' | 'ok';

/** BR-INV-02: negativo si onHand < 0; bajo mínimo si onHand < mínimo. */
export const stockState = (onHand: number, minimum: number): StockState => {
  if (onHand < 0) return 'negative';
  if (onHand < minimum) return 'low';
  return 'ok';
};

/** Mapa para `StatusTag`: Normal / Bajo stock / Negativo. */
export const stockStatusMap = {
  negative: { label: 'Negativo', tone: 'danger', icon: 'pi pi-exclamation-triangle' },
  low: { label: 'Bajo stock', tone: 'warning', icon: 'pi pi-arrow-down' },
  ok: { label: 'Normal', tone: 'success', icon: 'pi pi-check-circle' },
} as const;

/** Mapa para `StatusTag` de traslados y alertas. */
export const flowStatusMap = {
  enviado: { label: 'Enviado', tone: 'info', icon: 'pi pi-send' },
  recibido: { label: 'Recibido', tone: 'success', icon: 'pi pi-check-circle' },
  resolved: { label: 'Resuelta', tone: 'success', icon: 'pi pi-check-circle' },
  pendiente: { label: 'Pendiente', tone: 'warning', icon: 'pi pi-exclamation-triangle' },
} as const;
