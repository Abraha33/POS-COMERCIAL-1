import { describe, expect, it } from 'vitest';
import { shiftOpenSchema, shiftSchema } from '@/shared/contracts';
import { computeOpening, needsJustification, parseQuantity, simulatedShift, toShiftOpen } from '@/features/pos-access/opening';
import { defaultDenominations, scenarios } from '@/features/pos-access/scenarios';

const register = scenarios[0]!.register!;
const session = scenarios[0]!.session;

describe('POS-F02 · cálculos de apertura', () => {
  it('parseQuantity: enteros ≥ 0; vacío = 0; el resto es inválido', () => {
    expect(parseQuantity('')).toBe(0);
    expect(parseQuantity(' 12 ')).toBe(12);
    for (const bad of ['-1', '1.5', '1,5', 'abc', '1e3', '99999999999999999999']) expect(parseQuantity(bad), bad).toBeNull();
  });

  it('moneda y billete de $1.000 son denominaciones distintas', () => {
    const thousands = defaultDenominations.filter((d) => d.value === 1000);
    expect(thousands.map((d) => d.kind).sort()).toEqual(['billete', 'moneda']);
    expect(new Set(defaultDenominations.map((d) => d.id)).size).toBe(defaultDenominations.length);
    const count = computeOpening(defaultDenominations, { 'billete-1000': 2, 'moneda-1000': 3 }, null);
    expect(count.total).toBe(5000);
  });

  it('total, diferencia y justificación: exacta, faltante, sobrante y base cero', () => {
    const exact = computeOpening(defaultDenominations, { 'billete-100000': 2 }, 200000);
    expect([exact.total, exact.difference, needsJustification(exact)]).toEqual([200000, 0, false]);
    const short = computeOpening(defaultDenominations, { 'billete-100000': 1 }, 200000);
    expect([short.difference, needsJustification(short)]).toEqual([-100000, true]);
    const over = computeOpening(defaultDenominations, { 'billete-100000': 3 }, 200000);
    expect([over.difference, needsJustification(over)]).toEqual([100000, true]);
    const zero = computeOpening(defaultDenominations, {}, 200000);
    expect([zero.total, zero.difference, needsJustification(zero)]).toEqual([0, -200000, true]);
    const zeroNoBase = computeOpening(defaultDenominations, {}, null);
    expect([zeroNoBase.difference, needsJustification(zeroNoBase)]).toEqual([null, true]);
  });

  it('el resultado es compatible con el contrato del POS (ShiftOpen y Shift)', () => {
    const count = computeOpening(defaultDenominations, { 'billete-50000': 4 }, 200000);
    const payload = toShiftOpen(count, register);
    expect(shiftOpenSchema.safeParse(payload).success).toBe(true);
    expect(payload).toEqual({ registerId: 'reg-001', openingCash: 200000 });
    const shift = simulatedShift(payload, session, register, new Date('2026-10-11T13:00:00Z'));
    expect(shiftSchema.safeParse(shift).success).toBe(true);
  });
});
