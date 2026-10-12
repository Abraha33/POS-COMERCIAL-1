import type { Product } from '@/shared/contracts';

/**
 * Precios escalonados por volumen (PROPUESTA): el contrato de producto no tiene listas ni escalones.
 * Estos escalones son un ejemplo derivado del precio base y SOLO se muestran como información: el servidor
 * calcula el precio de la venta (BR-GEN-06) y no los aplica todavía.
 */
export type PriceTier = { min: number; max: number | null; unitPrice: number };

/** Ejemplo: 1–9 precio base, 10–49 −5 %, 50+ −10 %. */
export const tiersFor = (product: Pick<Product, 'price'>): PriceTier[] => [
  { min: 1, max: 9, unitPrice: product.price },
  { min: 10, max: 49, unitPrice: Math.round(product.price * 0.95) },
  { min: 50, max: null, unitPrice: Math.round(product.price * 0.9) },
];

export const tierFor = (tiers: PriceTier[], quantity: number): PriceTier | null =>
  tiers.find((t) => quantity >= t.min && (t.max === null || quantity <= t.max)) ?? null;
