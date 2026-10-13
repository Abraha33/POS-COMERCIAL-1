import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { api, setAccessToken } from '@/shared/api/client';
import { productSchema } from '@/shared/contracts';
import { mockTokenForRole } from '@/mocks/test-users';

/** Carril catalog · operación APROBADA del contrato: el catálogo responde con la forma publicada. */
describe('catálogo · contrato aprobado', () => {
  it('productos: cada producto cumple el esquema y el precio es un entero COP', async () => {
    setAccessToken(mockTokenForRole('propietario'));
    const products = await api.get('/products', z.array(productSchema));
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((p) => Number.isInteger(p.price))).toBe(true);
  });
});
