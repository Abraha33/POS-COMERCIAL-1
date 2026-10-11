/**
 * Cálculo de totales de venta (BR-GEN-05, BR-VEN-03). El servidor es la autoridad (BR-GEN-06);
 * esta función sirve para mostrar el total estimado en el POS y para los mocks.
 *
 * `total = round(Σ líneas) + roundingAdjustment`. El redondeo se hace sobre el total, no por línea.
 * Con efectivo en el pago, el total se lleva al múltiplo de $50 más cercano (A1).
 */
export const CASH_ROUNDING_STEP = 50;

export type PricedLine = { unitPrice: number; quantity: number; discount: number };

export type SaleTotals = {
  /** Σ (precio × cantidad − descuento), con decimales; no redondeado. */
  exactSubtotal: number;
  /** Subtotal redondeado al peso. */
  subtotal: number;
  /** "Ajuste al peso": total − subtotal (positivo, negativo o cero). */
  roundingAdjustment: number;
  total: number;
};

export const roundToStep = (value: number, step: number = CASH_ROUNDING_STEP): number =>
  Math.round(value / step) * step;

export const lineGross = (line: PricedLine): number => line.unitPrice * line.quantity;
export const lineNet = (line: PricedLine): number => lineGross(line) - line.discount;

export const computeTotals = (lines: readonly PricedLine[], hasCashPayment: boolean): SaleTotals => {
  const exactSubtotal = lines.reduce((sum, line) => sum + lineNet(line), 0);
  const subtotal = Math.round(exactSubtotal);
  const total = hasCashPayment ? roundToStep(exactSubtotal) : subtotal;
  return { exactSubtotal, subtotal, roundingAdjustment: total - subtotal, total };
};
