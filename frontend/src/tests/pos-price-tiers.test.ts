import { describe, expect, it } from 'vitest';
import { tierFor, tiersFor } from '@/features/pos/priceTiers';

describe('Precios por volumen (PROPUESTA, informativo)', () => {
  const tiers = tiersFor({ price: 8500 });

  it('deriva tres escalones enteros del precio base', () => {
    expect(tiers.map((t) => t.unitPrice)).toEqual([8500, 8075, 7650]);
    expect(tiers.every((t) => Number.isInteger(t.unitPrice))).toBe(true);
  });

  it('elige el escalón por cantidad, incluidos los bordes', () => {
    expect(tierFor(tiers, 1)?.min).toBe(1);
    expect(tierFor(tiers, 9)?.min).toBe(1);
    expect(tierFor(tiers, 10)?.min).toBe(10);
    expect(tierFor(tiers, 49)?.min).toBe(10);
    expect(tierFor(tiers, 50)?.min).toBe(50);
    expect(tierFor(tiers, 5000)?.min).toBe(50);
    expect(tierFor(tiers, 0)).toBeNull();
  });
});
