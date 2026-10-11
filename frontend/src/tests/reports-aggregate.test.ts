import { describe, expect, it } from 'vitest';
import type { Product, Sale, StockLevel } from '@/shared/contracts';
import {
  BRANCH_ALL, filterSales, inventoryReport, ledgerReport, salesByPayment, summarizeSales,
} from '@/features/reports/aggregate';

const sale = (over: Partial<Sale>): Sale => ({
  id: 's', number: 'N', date: '2026-10-01', customerId: null, cashierId: 'emp-001', branchId: 'br-001',
  shiftId: null,
  lines: [{ productId: 'p', quantity: 1, unitPrice: 1000, discount: 0, returnedQuantity: 0 }],
  payments: [{ method: 'efectivo', amount: 1000 }], roundingAdjustment: 0, total: 1000, status: 'pagada', ...over,
});

describe('reports: agregaciones', () => {
  it('resume ventas excluyendo anuladas y calcula ticket promedio', () => {
    const s = summarizeSales([sale({ total: 1000 }), sale({ total: 3000 }), sale({ status: 'anulada', total: 9999 })]);
    expect(s).toEqual({ count: 2, total: 4000, average: 2000, voided: 1 });
  });

  it('filtra por rango inclusivo y por sede', () => {
    const all = [
      sale({ id: 'a', date: '2026-09-30' }),
      sale({ id: 'b', date: '2026-10-01' }),
      sale({ id: 'c', date: '2026-10-05', branchId: 'br-002' }),
    ];
    expect(filterSales(all, { from: '2026-10-01', to: '2026-10-05' }, BRANCH_ALL).map((x) => x.id)).toEqual(['b', 'c']);
    expect(filterSales(all, { from: '', to: '' }, 'br-002').map((x) => x.id)).toEqual(['c']);
  });

  it('descuenta el cambio del efectivo en el reporte por medio de pago', () => {
    const [cash] = salesByPayment([sale({ payments: [{ method: 'efectivo', amount: 5000 }], total: 3800 })]);
    expect(cash).toMatchObject({ key: 'efectivo', total: 3800 });
  });

  it('separa cartera vencida y vigente contra la fecha de referencia', () => {
    const r = ledgerReport(
      [
        { id: '1', customerId: 'c1', saleId: null, issued: '2026-09-01', due: '2026-10-01', amount: 100, paid: 40 },
        { id: '2', customerId: 'c2', saleId: null, issued: '2026-10-01', due: '2026-10-20', amount: 300, paid: 0 },
        { id: '3', customerId: 'c2', saleId: null, issued: '2026-10-01', due: '2026-10-20', amount: 50, paid: 50 },
      ],
      (e) => ('customerId' in e ? e.customerId : ''),
      new Map([['c2', 'Cliente Dos']]),
      '2026-10-11',
    );
    expect(r).toMatchObject({ balance: 360, overdue: 60, current: 300, openCount: 2 });
    expect(r.top[0]).toEqual({ id: 'c2', name: 'Cliente Dos', balance: 300 });
  });

  it('inventario: negativos, bajo mínimo y valor a costo', () => {
    const products = new Map<string, Product>([
      ['p1', { id: 'p1', sku: 'S', name: 'Uno', category: 'c', unit: 'u', price: 10, cost: 5, taxCategory: 'gravado', taxRate: 0.19, active: true }],
    ]);
    const levels: StockLevel[] = [
      { productId: 'p1', branchId: 'br-001', onHand: 4, inTransit: 0, minimum: 10 },
      { productId: 'p1', branchId: 'br-002', onHand: -2, inTransit: 0, minimum: 1 },
    ];
    const inv = inventoryReport(levels, products, BRANCH_ALL);
    expect(inv.negative).toHaveLength(1);
    expect(inv.belowMinimum).toHaveLength(1);
    expect(inv.value).toBe(20);
  });
});
