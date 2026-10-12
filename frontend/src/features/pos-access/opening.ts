import type { Shift, ShiftOpen } from '@/shared/contracts';
import type { AccessScenario, AccessStatus, CashDenomination, CashRegister, CashierSession, OpeningCount } from './model';

/** Cantidad válida = entero ≥ 0. Vacío cuenta como 0; cualquier otra cosa devuelve null. */
export const parseQuantity = (raw: string): number | null => {
  const text = raw.trim();
  if (text === '') return 0;
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) ? value : null;
};

export const rowSubtotal = (d: CashDenomination, quantity: number): number => d.value * quantity;

/** Conteo completo: total en COP entero y diferencia contra la base esperada (null si no hay base). */
export const computeOpening = (
  denominations: CashDenomination[],
  quantities: Record<string, number>,
  expected: number | null,
  note = '',
): OpeningCount => {
  const total = denominations.reduce((sum, d) => sum + rowSubtotal(d, quantities[d.id] ?? 0), 0);
  return { quantities, total, expected, difference: expected === null ? null : total - expected, note };
};

/** Con diferencia ≠ 0, o con base cero, hacen falta motivo y autorización (BR-CAJ: descuadre con nota). */
export const needsJustification = (count: OpeningCount): boolean =>
  count.total === 0 || (count.difference !== null && count.difference !== 0);

/** Forma exacta que el POS ya acepta para abrir turno (`ShiftOpen`). */
export const toShiftOpen = (count: OpeningCount, register: CashRegister): ShiftOpen => ({
  registerId: register.id,
  openingCash: count.total,
});

/** Turno SIMULADO con la forma del contrato `Shift`; nunca se persiste ni se envía. */
export const simulatedShift = (payload: ShiftOpen, session: CashierSession, register: CashRegister, now: Date): Shift => ({
  id: `sim-${payload.registerId}-${now.getTime()}`,
  registerId: payload.registerId,
  branchId: register.branchId,
  cashierId: session.userId,
  openedAt: now.toISOString(),
  closedAt: null,
  openingCash: payload.openingCash,
  expectedCash: payload.openingCash,
  countedCash: null,
  difference: null,
  closingNote: null,
  status: 'open',
});

/** Estado de acceso derivado: un solo lugar decide qué puede hacer la persona. */
export const accessStatus = (scenario: AccessScenario, openedShift: Shift | null): AccessStatus => {
  if (!scenario.session.canSell) return 'sin-permiso';
  if (!scenario.session.online) return 'sin-conexion';
  if (!scenario.register) return 'sin-caja';
  if (scenario.register.occupiedBy) return 'caja-ocupada';
  return (openedShift ?? scenario.activeShift) ? 'turno-propio' : 'caja-cerrada';
};
