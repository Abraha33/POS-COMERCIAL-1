import { today } from '@/shared/utils/clock';
import type { Payable, PaymentMethod, Product, Receivable, Sale, StockLevel } from '@/shared/contracts';

export const BRANCH_ALL = 'all';

export type DateRange = { from: string; to: string };

const day = (iso: string): string => iso.slice(0, 10);

/** Filtra por rango inclusivo de fechas (YYYY-MM-DD, vacío = sin límite) y sede. */
export const filterSales = (sales: Sale[], range: DateRange, branchId: string): Sale[] =>
  sales.filter((s) => {
    const d = day(s.date);
    if (range.from && d < range.from) return false;
    if (range.to && d > range.to) return false;
    return branchId === BRANCH_ALL || s.branchId === branchId;
  });

export type SalesSummary = { count: number; total: number; average: number; voided: number };

/** Las anuladas no suman a ventas ni a ticket promedio; se cuentan aparte. */
export const summarizeSales = (sales: Sale[]): SalesSummary => {
  const valid = sales.filter((s) => s.status !== 'anulada');
  const total = valid.reduce((sum, s) => sum + s.total, 0);
  return {
    count: valid.length,
    total,
    average: valid.length === 0 ? 0 : Math.round(total / valid.length),
    voided: sales.length - valid.length,
  };
};

export type Bucket = { key: string; label: string; count: number; total: number };

const bucketize = (entries: { key: string; label: string; total: number }[]): Bucket[] => {
  const map = new Map<string, Bucket>();
  for (const e of entries) {
    const current = map.get(e.key) ?? { key: e.key, label: e.label, count: 0, total: 0 };
    current.count += 1;
    current.total += e.total;
    map.set(e.key, current);
  }
  return [...map.values()];
};

const validOnly = (sales: Sale[]): Sale[] => sales.filter((s) => s.status !== 'anulada');

export const salesByDay = (sales: Sale[]): Bucket[] =>
  bucketize(validOnly(sales).map((s) => ({ key: day(s.date), label: day(s.date), total: s.total })))
    .sort((a, b) => a.key.localeCompare(b.key));

export const salesByCashier = (sales: Sale[], names: Map<string, string>): Bucket[] =>
  bucketize(validOnly(sales).map((s) => ({ key: s.cashierId, label: names.get(s.cashierId) ?? s.cashierId, total: s.total })))
    .sort((a, b) => b.total - a.total);

export const paymentLabels: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', nequi: 'Nequi', daviplata: 'Daviplata', credito: 'Crédito',
};

/**
 * Monto por medio de pago. Si la suma de pagos supera el total (BR-VEN-06) el excedente es cambio en efectivo:
 * se descuenta del efectivo para no contar dinero devuelto al cliente.
 */
export const salesByPayment = (sales: Sale[]): Bucket[] => {
  const map = new Map<PaymentMethod, Bucket>();
  for (const sale of validOnly(sales)) {
    const paid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
    let change = Math.max(0, paid - sale.total);
    for (const p of sale.payments) {
      let amount = p.amount;
      if (p.method === 'efectivo' && change > 0) {
        const returned = Math.min(change, amount);
        amount -= returned;
        change -= returned;
      }
      const bucket = map.get(p.method) ?? { key: p.method, label: paymentLabels[p.method], count: 0, total: 0 };
      bucket.count += 1;
      bucket.total += amount;
      map.set(p.method, bucket);
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
};

export type StockRow = {
  key: string;
  productId: string;
  name: string;
  branchId: string;
  onHand: number;
  minimum: number;
};

const toStockRow = (level: StockLevel, products: Map<string, Product>): StockRow => ({
  key: `${level.productId}:${level.branchId}`,
  productId: level.productId,
  name: products.get(level.productId)?.name ?? level.productId,
  branchId: level.branchId,
  onHand: level.onHand,
  minimum: level.minimum,
});

export type InventoryReport = { negative: StockRow[]; belowMinimum: StockRow[]; value: number; units: number };

/** Valor = suma de existencias positivas x costo del producto (el contrato no expone un costo promedio aparte). */
export const inventoryReport = (levels: StockLevel[], products: Map<string, Product>, branchId: string): InventoryReport => {
  const scoped = levels.filter((l) => branchId === BRANCH_ALL || l.branchId === branchId);
  const negative = scoped.filter((l) => l.onHand < 0).map((l) => toStockRow(l, products));
  const belowMinimum = scoped.filter((l) => l.onHand >= 0 && l.onHand < l.minimum).map((l) => toStockRow(l, products));
  const positive = scoped.filter((l) => l.onHand > 0);
  const value = positive.reduce((sum, l) => sum + Math.round(l.onHand * (products.get(l.productId)?.cost ?? 0)), 0);
  const units = positive.reduce((sum, l) => sum + l.onHand, 0);
  return { negative, belowMinimum, value, units };
};

/** Cuenta por cobrar o por pagar; el reporte solo usa sus campos persistidos. */
export type LedgerEntry = Omit<Receivable, 'branchId' | 'balance' | 'status' | 'daysOverdue'>
  | Omit<Payable, 'branchId' | 'balance' | 'status' | 'daysOverdue'>;

export type LedgerReport = {
  balance: number;
  overdue: number;
  current: number;
  openCount: number;
  top: { id: string; name: string; balance: number }[];
};

/** Saldo = amount - paid; vencido si `due` es anterior a la fecha de referencia. Excluye saldos <= 0. */
export const ledgerReport = (
  entries: LedgerEntry[],
  partyOf: (entry: LedgerEntry) => string,
  names: Map<string, string>,
  referenceDate: string = today(),
): LedgerReport => {
  let balance = 0;
  let overdue = 0;
  let openCount = 0;
  const byParty = new Map<string, number>();
  for (const e of entries) {
    const open = e.amount - e.paid;
    if (open <= 0) continue;
    openCount += 1;
    balance += open;
    if (day(e.due) < referenceDate) overdue += open;
    const party = partyOf(e);
    byParty.set(party, (byParty.get(party) ?? 0) + open);
  }
  const top = [...byParty.entries()]
    .map(([id, value]) => ({ id, name: names.get(id) ?? id, balance: value }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);
  return { balance, overdue, current: balance - overdue, openCount, top };
};
