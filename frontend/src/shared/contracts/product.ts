import { z } from 'zod';
import { money, type Contract } from './common';

export const productSchema = z.object({
  id: z.string(),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  name: z.string().min(1),
  category: z.string(),
  unit: z.string(),
  price: money,
  cost: money,
  /** BR-PRO-04: excluido y exento se separan contablemente aunque ambos tengan tarifa 0. */
  taxCategory: z.enum(['gravado', 'exento', 'excluido', 'impoconsumo']),
  taxRate: z.number().min(0).max(1),
  active: z.boolean(),
  /** PROPUESTA v0.6.0. */
  brand: z.string().optional(),
  /** PROPUESTA v0.6.0: `factor` = unidades base por presentación; el precio es informativo. */
  presentations: z
    .array(z.object({ name: z.string().min(1), factor: z.number().positive(), price: money.optional() }))
    .optional(),
});
export type Product = z.infer<typeof productSchema>;
export const productInputSchema = productSchema.omit({ id: true });
export type ProductInput = z.infer<typeof productInputSchema>;

export const productContract: Contract<typeof productSchema> = {
  doctype: 'Item',
  schema: productSchema,
  example: {
    id: 'prd-001', sku: 'SKU-001', barcode: '7701234567890', name: 'Arroz 500 g',
    category: 'Granos', unit: 'und', price: 2800, cost: 2100, taxCategory: 'excluido', taxRate: 0, active: true,
  },
};
