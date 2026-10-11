import type { Product, Sale } from '@/shared/contracts';

/** PROPUESTA: cálculos del tablero derivados de `GET /sales` y `GET /products`; no hay contrato de métricas aprobado. */

export type DayTotal = { day: string; total: number; tickets: number };
export type TopProduct = { productId: string; name: string; quantity: number; total: number };
export type Dashboard = {
  /** Día de referencia: hoy si tiene ventas; si no, el último día con ventas. */
  referenceDay: string | null;
  isToday: boolean;
  salesTotal: number;
  tickets: number;
  unitsSold: number;
  last7Days: DayTotal[];
  topProducts: TopProduct[];
};

const dayOf = (sale: Sale): string => sale.date.slice(0, 10);

const addDays = (day: string, delta: number): string => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
};

/** Subtotal de línea = cantidad × precio − descuento (el servidor sigue siendo la autoridad del total de la venta). */
const lineTotal = (line: Sale['lines'][number]): number => Math.max(0, Math.round(line.quantity * line.unitPrice) - line.discount);

export const buildDashboard = (sales: readonly Sale[], products: readonly Product[], today: string): Dashboard => {
  const valid = sales.filter((s) => s.status !== 'anulada');
  const days = [...new Set(valid.map(dayOf))].sort();
  const hasToday = days.includes(today);
  const referenceDay = hasToday ? today : (days[days.length - 1] ?? null);

  const range = referenceDay ? Array.from({ length: 7 }, (_, i) => addDays(referenceDay, i - 6)) : [];
  const last7Days = range.map((day) => {
    const ofDay = valid.filter((s) => dayOf(s) === day);
    return { day, total: ofDay.reduce((sum, s) => sum + s.total, 0), tickets: ofDay.length };
  });

  const ofReference = referenceDay ? valid.filter((s) => dayOf(s) === referenceDay) : [];
  const unitsSold = ofReference.reduce((sum, s) => sum + s.lines.reduce((n, l) => n + l.quantity, 0), 0);

  const names = new Map(products.map((p) => [p.id, p.name]));
  const inRange = valid.filter((s) => range.includes(dayOf(s)));
  const byProduct = new Map<string, TopProduct>();
  for (const sale of inRange) {
    for (const line of sale.lines) {
      const current = byProduct.get(line.productId) ?? {
        productId: line.productId, name: names.get(line.productId) ?? line.productId, quantity: 0, total: 0,
      };
      current.quantity += line.quantity;
      current.total += lineTotal(line);
      byProduct.set(line.productId, current);
    }
  }
  const topProducts = [...byProduct.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  return {
    referenceDay,
    isToday: hasToday,
    salesTotal: ofReference.reduce((sum, s) => sum + s.total, 0),
    tickets: ofReference.length,
    unitsSold,
    last7Days,
    topProducts,
  };
};
