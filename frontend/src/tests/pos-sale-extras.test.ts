import { describe, expect, it } from 'vitest';
import type { Customer, Product } from '@/shared/contracts';
import { searchCustomers } from '@/features/pos/customerSearch';
import { revalidateHeld } from '@/features/pos/heldRevalidate';
import type { HeldSale } from '@/features/pos/useHeldSales';

const customers = [
  { id: 'c1', name: 'Tienda La Esquina', documentType: 'NIT', taxId: '900.123.456-1', phone: '300 111 2233' },
  { id: 'c2', name: 'Restaurante El Sazón', documentType: 'NIT', taxId: '901234567-2' },
] as unknown as Customer[];

describe('búsqueda de cliente', () => {
  it('por nombre sin tildes, por NIT con o sin puntos y por teléfono', () => {
    expect(searchCustomers(customers, 'sazon').map((c) => c.id)).toEqual(['c2']);
    expect(searchCustomers(customers, '900123456').map((c) => c.id)).toEqual(['c1']);
    expect(searchCustomers(customers, '900.123').map((c) => c.id)).toEqual(['c1']);
    expect(searchCustomers(customers, '3001112233').map((c) => c.id)).toEqual(['c1']);
  });
  it('vacío devuelve todos; sin coincidencia, ninguno; pocos dígitos no se confunden con un documento', () => {
    expect(searchCustomers(customers, '')).toHaveLength(2);
    expect(searchCustomers(customers, 'zzz')).toEqual([]);
    expect(searchCustomers(customers, '90')).toEqual([]);
  });
});

describe('reanudar revalidando', () => {
  const catalog = [
    { id: 'p1', name: 'Arroz', price: 3000, active: true },
    { id: 'p2', name: 'Aceite', price: 12500, active: false },
  ] as unknown as Product[];
  const held: HeldSale = {
    id: 'h', heldAt: '2026-10-11T10:00:00Z', customerId: null,
    lines: [{ productId: 'p1', quantity: 1, discount: 0 }, { productId: 'p2', quantity: 1, discount: 0 }, { productId: 'p3', quantity: 1, discount: 0 }],
    prices: { p1: 2800 },
  };
  it('avisa cambios de precio y quita inactivos o inexistentes', () => {
    const r = revalidateHeld(held, catalog);
    expect(r.lines.map((l) => l.productId)).toEqual(['p1']);
    expect(r.dropped).toEqual(['p2', 'p3']);
    expect(r.changes).toEqual([{ productId: 'p1', from: 2800, to: 3000 }]);
  });
  it('sin precios guardados no inventa cambios', () => {
    expect(revalidateHeld({ ...held, prices: undefined }, catalog).changes).toEqual([]);
  });
});

