import { http, HttpResponse } from 'msw';
import { productInputSchema } from '@/shared/contracts';
import { db } from '../db';

export const productHandlers = [
  http.get('/api/v1/products', () => HttpResponse.json(db.products)),

  http.post('/api/v1/products', async ({ request }) => {
    const parsed = productInputSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ error: parsed.error.message }, { status: 422 });
    const product = { id: `prd-${String(db.products.length + 1).padStart(3, '0')}`, ...parsed.data };
    db.products.push(product);
    return HttpResponse.json(product, { status: 201 });
  }),

  http.put('/api/v1/products/:id', async ({ request, params }) => {
    const parsed = productInputSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ error: parsed.error.message }, { status: 422 });
    const index = db.products.findIndex((p) => p.id === params.id);
    if (index === -1) return HttpResponse.json({ error: 'No encontrado' }, { status: 404 });
    const product = { id: String(params.id), ...parsed.data };
    db.products[index] = product;
    return HttpResponse.json(product);
  }),
];
