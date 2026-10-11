import { http, HttpResponse } from 'msw';
import { productInputSchema, type ProductInput } from '@/shared/contracts';
import { db } from '../db';
import { failure, notFound, validationError } from '../http';

/** BR-PRO-01 (SKU único, sin distinguir mayúsculas) y BR-PRO-02 (código de barras único). `selfId` excluye al propio producto. */
const duplicateOf = (input: ProductInput, selfId?: string) => {
  const sku = input.sku.trim().toLowerCase();
  const skuClash = db.products.find((p) => p.id !== selfId && p.sku.trim().toLowerCase() === sku);
  if (skuClash) {
    return failure(409, 'SKU_DUPLICATED', `Ya existe un producto con el SKU ${input.sku}`, { productId: skuClash.id });
  }
  const barcode = input.barcode?.trim();
  const barcodeClash = barcode ? db.products.find((p) => p.id !== selfId && p.barcode === barcode) : undefined;
  if (barcodeClash) {
    return failure(409, 'BARCODE_DUPLICATED', `Ya existe un producto con el código de barras ${barcode}`, {
      productId: barcodeClash.id,
    });
  }
  return null;
};

export const productHandlers = [
  http.get('/api/v1/products', () => HttpResponse.json(db.products)),

  http.post('/api/v1/products', async ({ request }) => {
    const parsed = productInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Producto con formato inválido');
    const duplicated = duplicateOf(parsed.data);
    if (duplicated) return duplicated;
    const product = { id: `prd-${String(db.products.length + 1).padStart(3, '0')}`, ...parsed.data };
    db.products.push(product);
    return HttpResponse.json(product, { status: 201 });
  }),

  http.put('/api/v1/products/:id', async ({ request, params }) => {
    const parsed = productInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Producto con formato inválido');
    const index = db.products.findIndex((p) => p.id === params.id);
    if (index === -1) return notFound('Producto');
    const duplicated = duplicateOf(parsed.data, String(params.id));
    if (duplicated) return duplicated;
    const product = { id: String(params.id), ...parsed.data };
    db.products[index] = product;
    return HttpResponse.json(product);
  }),
];
