import { http, HttpResponse } from 'msw';
import type {
  AgingBucketKey, AgingReport, InventoryValuation, PaymentMethod, SalesSummary,
} from '@/shared/contracts';
import { today } from '@/shared/utils/clock';
import { db } from '../db';
import { daysBetween, toPayable, toReceivable } from '../derive';
import { authenticate, forbidden, hasPermission, unauthorized } from '../http';

const day = (iso: string): string => iso.slice(0, 10);

const param = (request: Request, name: string): string | null => {
  const value = new URL(request.url).searchParams.get(name);
  return value && value.trim() !== '' ? value : null;
};

const BUCKETS: AgingBucketKey[] = ['current', 'd1_30', 'd31_60', 'd61_90', 'd90_plus'];

const bucketOf = (daysOverdue: number): AgingBucketKey => {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return 'd1_30';
  if (daysOverdue <= 60) return 'd31_60';
  if (daysOverdue <= 90) return 'd61_90';
  return 'd90_plus';
};

const agingSide = (rows: { balance: number; due: string }[], asOf: string): AgingReport['receivables'] => {
  const buckets = BUCKETS.map((key) => ({ key, count: 0, amount: 0 }));
  for (const row of rows) {
    if (row.balance <= 0) continue;
    const bucket = buckets.find((b) => b.key === bucketOf(daysBetween(row.due, asOf)));
    if (bucket) {
      bucket.count += 1;
      bucket.amount += row.balance;
    }
  }
  const total = buckets.reduce((sum, b) => sum + b.amount, 0);
  const current = buckets.find((b) => b.key === 'current')?.amount ?? 0;
  return { total, overdueTotal: total - current, buckets };
};

export const reportHandlers = [
  // PROPUESTA v0.5.0: resumen de ventas del periodo.
  http.get('/api/v1/reports/sales-summary', ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!hasPermission(user, 'reports.view')) return forbidden();
    const from = param(request, 'from');
    const to = param(request, 'to');
    const branchId = param(request, 'branchId');

    const inScope = db.sales.filter((s) => {
      const d = day(s.date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return branchId === null || s.branchId === branchId;
    });
    const valid = inScope.filter((s) => s.status !== 'anulada');
    const validIds = new Set(valid.map((s) => s.id));
    const grossTotal = valid.reduce((sum, s) => sum + s.total, 0);
    const returnsTotal = db.saleReturns.filter((r) => validIds.has(r.saleId)).reduce((sum, r) => sum + r.total, 0);

    const byMethod = new Map<PaymentMethod, number>();
    for (const sale of valid) {
      const paid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
      let change = paid - sale.total;
      for (const p of sale.payments) {
        // El cambio se devuelve en efectivo (BR-VEN-08): el efectivo neto es lo cobrado menos el cambio.
        const net = p.method === 'efectivo' ? Math.max(0, p.amount - change) : p.amount;
        if (p.method === 'efectivo') change = Math.max(0, change - p.amount);
        byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + net);
      }
    }

    const byDayMap = new Map<string, { count: number; total: number }>();
    for (const sale of valid) {
      const entry = byDayMap.get(day(sale.date)) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += sale.total;
      byDayMap.set(day(sale.date), entry);
    }

    const byProduct = new Map<string, { quantity: number; total: number }>();
    for (const sale of valid) {
      for (const line of sale.lines) {
        const entry = byProduct.get(line.productId) ?? { quantity: 0, total: 0 };
        entry.quantity += line.quantity;
        entry.total += Math.round(line.quantity * line.unitPrice - line.discount);
        byProduct.set(line.productId, entry);
      }
    }

    const summary: SalesSummary = {
      from, to, branchId,
      salesCount: valid.length,
      voidedCount: inScope.length - valid.length,
      grossTotal,
      returnsTotal,
      netTotal: grossTotal - returnsTotal,
      averageTicket: valid.length === 0 ? 0 : Math.round(grossTotal / valid.length),
      creditTotal: valid.reduce(
        (sum, s) => sum + s.payments.filter((p) => p.method === 'credito').reduce((a, p) => a + p.amount, 0), 0,
      ),
      byPaymentMethod: [...byMethod].map(([method, amount]) => ({ method, amount })),
      byDay: [...byDayMap].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
      topProducts: [...byProduct]
        .map(([productId, v]) => ({ productId, ...v }))
        .sort((a, b) => b.total - a.total || a.productId.localeCompare(b.productId))
        .slice(0, 5),
    };
    return HttpResponse.json(summary);
  }),

  // PROPUESTA v0.5.0: antigüedad de cartera por cobrar y por pagar.
  http.get('/api/v1/reports/aging', ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!hasPermission(user, 'reports.view')) return forbidden();
    const asOf = param(request, 'asOf') ?? today();
    const branchId = param(request, 'branchId');
    const scoped = <T extends { branchId: string }>(rows: T[]) =>
      rows.filter((r) => branchId === null || r.branchId === branchId);
    const report: AgingReport = {
      asOf,
      branchId,
      receivables: agingSide(scoped(db.receivables).map((r) => toReceivable(r, asOf)), asOf),
      payables: agingSide(scoped(db.payables).map((p) => toPayable(p, asOf)), asOf),
    };
    return HttpResponse.json(report);
  }),

  // PROPUESTA v0.5.0: valor del inventario. El seed solo tiene costo por producto (no por sede).
  http.get('/api/v1/reports/inventory-valuation', ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!hasPermission(user, 'reports.view')) return forbidden();
    const branchId = param(request, 'branchId');
    const items = db.stockLevels
      .filter((l) => branchId === null || l.branchId === branchId)
      .map((l) => {
        const unitCost = db.products.find((p) => p.id === l.productId)?.cost ?? 0;
        return {
          productId: l.productId, branchId: l.branchId, onHand: l.onHand, unitCost,
          value: Math.round(Math.max(0, l.onHand) * unitCost),
        };
      });
    const valuation: InventoryValuation = {
      branchId,
      costBasis: 'product_cost',
      totalValue: items.reduce((sum, i) => sum + i.value, 0),
      items,
    };
    return HttpResponse.json(valuation);
  }),
];
