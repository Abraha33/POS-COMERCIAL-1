import type { Product } from '@/shared/contracts';
import type { HeldSale } from './useHeldSales';

export type PriceChange = { productId: string; from: number; to: number };
export type Revalidated = {
  lines: HeldSale['lines'];
  /** Productos que ya no están en el catálogo o están inactivos: se quitan del carrito. */
  dropped: string[];
  /** Precios que cambiaron desde que se suspendió (solo si se guardó el precio al suspender). */
  changes: PriceChange[];
};

/** Al reanudar, el carrito se revalida contra el catálogo vigente: nada se reanuda con datos viejos sin avisar. */
export const revalidateHeld = (held: HeldSale, catalog: readonly Product[]): Revalidated => {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const lines: HeldSale['lines'] = [];
  const dropped: string[] = [];
  const changes: PriceChange[] = [];
  for (const line of held.lines) {
    const product = byId.get(line.productId);
    if (!product || !product.active) {
      dropped.push(line.productId);
      continue;
    }
    lines.push(line);
    const before = held.prices?.[line.productId];
    if (before !== undefined && before !== product.price) changes.push({ productId: line.productId, from: before, to: product.price });
  }
  return { lines, dropped, changes };
};
