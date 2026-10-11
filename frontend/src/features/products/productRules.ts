import { z } from 'zod';
import type { Product } from '@/shared/contracts';

export type TaxCategory = Product['taxCategory'];

export const taxCategoryLabels: Record<TaxCategory, string> = {
  gravado: 'Gravado',
  exento: 'Exento',
  excluido: 'Excluido',
  impoconsumo: 'Impoconsumo',
};

/** BR-PRO-04: tarifas permitidas por categoría de IVA. */
export const allowedRates: Record<TaxCategory, readonly number[]> = {
  gravado: [0.19, 0.05, 0],
  exento: [0],
  excluido: [0],
  impoconsumo: [0.08],
};

export const formatRate = (rate: number): string =>
  `${(rate * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;

const wholeMoney = (label: string) =>
  z
    .number({ message: `${label} es obligatorio` })
    .int(`${label} debe ser un entero en pesos`)
    .nonnegative(`${label} no puede ser negativo`);

/** Esquema del formulario con mensajes en español; el contrato (`productInputSchema`) sigue siendo la fuente de verdad. */
export const productFormSchema = z
  .object({
    sku: z.string().trim().min(1, 'El SKU es obligatorio'),
    barcode: z.string().trim().optional(),
    name: z.string().trim().min(1, 'El nombre es obligatorio'),
    category: z.string().trim().min(1, 'La categoría es obligatoria'),
    unit: z.string().trim().min(1, 'La unidad es obligatoria'),
    price: wholeMoney('El precio'),
    cost: wholeMoney('El costo'),
    taxCategory: z.enum(['gravado', 'exento', 'excluido', 'impoconsumo']),
    taxRate: z.number(),
    active: z.boolean(),
  })
  .refine((v) => allowedRates[v.taxCategory].includes(v.taxRate), {
    path: ['taxRate'],
    message: 'La tarifa no corresponde a la categoría de IVA',
  });

export const matchesQuery = (product: Product, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [product.name, product.sku, product.barcode ?? '', product.category].some((v) => v.toLowerCase().includes(q));
};
