import { describe, expect, it } from 'vitest';
import { computeTotals, roundToStep } from './pricing';

describe('pricing', () => {
  it('redondea al múltiplo de 50 más cercano', () => {
    expect(roundToStep(1024)).toBe(1000);
    expect(roundToStep(1025)).toBe(1050);
    expect(roundToStep(1049)).toBe(1050);
  });

  it('sin efectivo solo redondea al peso, sobre el total y no por línea', () => {
    const totals = computeTotals(
      [
        { unitPrice: 1000, quantity: 0.333, discount: 0 },
        { unitPrice: 1000, quantity: 0.333, discount: 0 },
      ],
      false,
    );
    expect(totals.exactSubtotal).toBeCloseTo(666);
    expect(totals.total).toBe(666);
    expect(totals.roundingAdjustment).toBe(0);
  });

  it('con efectivo aplica ajuste al peso (puede ser negativo o positivo)', () => {
    const down = computeTotals([{ unitPrice: 1020, quantity: 1, discount: 0 }], true);
    expect(down).toMatchObject({ subtotal: 1020, total: 1000, roundingAdjustment: -20 });
    const up = computeTotals([{ unitPrice: 1030, quantity: 1, discount: 0 }], true);
    expect(up).toMatchObject({ subtotal: 1030, total: 1050, roundingAdjustment: 20 });
  });

  it('resta el descuento por línea', () => {
    expect(computeTotals([{ unitPrice: 4600, quantity: 6, discount: 600 }], false).total).toBe(27000);
  });
});
