import { describe, expect, it } from 'vitest';
import type { Sale } from '@/shared/contracts';
import { reconStatus, summarize } from '@/features/pos/reconcile';
import { summarizeCustomer } from '@/features/pos/CustomerHistoryDialog';

const sale = (over: Partial<Sale> & Pick<Sale, 'id' | 'payments'>): Sale => ({
  number: over.id, date: '2026-10-11', customerId: null, cashierId: 'emp-001', branchId: 'br-001', shiftId: 'sh-1',
  lines: [{ productId: 'p', quantity: 1, unitPrice: 1, discount: 0, returnedQuantity: 0 }],
  roundingAdjustment: 0, total: over.payments.reduce((s, p) => s + p.amount, 0), status: 'pagada', ...over,
});

describe('conciliación del turno', () => {
  const sales: Sale[] = [
    sale({ id: 'a', payments: [{ method: 'efectivo', amount: 10000 }] }),
    sale({ id: 'b', payments: [{ method: 'nequi', amount: 50000, channel: 'nequi', destination: 'Nequi del negocio', proofId: 'pf1' }] }),
    sale({ id: 'c', payments: [{ method: 'nequi', amount: 20000, channel: 'nequi', destination: 'Nequi del negocio' }] }),
    sale({ id: 'd', payments: [{ method: 'transferencia', amount: 30000, channel: 'bancolombia', destination: 'Ahorros ••• 1234', proofId: 'pf2' }, { method: 'credito', amount: 5000 }] }),
    sale({ id: 'e', status: 'anulada', payments: [{ method: 'nequi', amount: 99999, channel: 'nequi', destination: 'Nequi del negocio' }] }),
    sale({ id: 'f', shiftId: 'sh-2', payments: [{ method: 'nequi', amount: 77777, channel: 'nequi', destination: 'Nequi del negocio' }] }),
  ];

  it('separa efectivo, banco y crédito; ignora anuladas y otros turnos', () => {
    const s = summarize(sales, 'sh-1');
    expect([s.cash, s.bank, s.credit]).toEqual([10000, 100000, 5000]);
  });

  it('agrupa por canal y cuenta destino, con lo verificado y lo no verificado', () => {
    const rows = summarize(sales, 'sh-1').rows;
    const nequi = rows.find((r) => r.label === 'Nequi')!;
    expect([nequi.count, nequi.reported, nequi.verified, nequi.withoutProof]).toEqual([2, 70000, 50000, 20000]);
    expect(rows).toHaveLength(2);
  });

  it('el código de aprobación del datáfono respalda el cobro', () => {
    const r = summarize([sale({ id: 'x', payments: [{ method: 'tarjeta', amount: 1000, channel: 'datafono', reference: 'AP-1' }] })], 'sh-1').rows[0]!;
    expect([r.verified, r.withoutProof]).toEqual([1000, 0]);
  });

  it('estado según lo recibido digitado', () => {
    const row = summarize(sales, 'sh-1').rows.find((r) => r.label === 'Nequi')!;
    expect(reconStatus(row, undefined)).toBe('sin-registro');
    expect(reconStatus(row, 70000)).toBe('conciliado');
    expect(reconStatus(row, 50000)).toBe('falta');
    expect(reconStatus(row, 80000)).toBe('sobrante');
  });
});

describe('historial por cliente', () => {
  it('suma solo ventas vigentes, ordena por fecha y separa el crédito', () => {
    const sales: Sale[] = [
      sale({ id: 'a', customerId: 'c1', date: '2026-10-01', payments: [{ method: 'efectivo', amount: 1000 }] }),
      sale({ id: 'b', customerId: 'c1', date: '2026-10-09', status: 'credito', payments: [{ method: 'credito', amount: 4000 }] }),
      sale({ id: 'c', customerId: 'c1', date: '2026-10-10', status: 'anulada', payments: [{ method: 'efectivo', amount: 9000 }] }),
      sale({ id: 'd', customerId: 'c2', payments: [{ method: 'efectivo', amount: 5 }] }),
    ];
    const s = summarizeCustomer(sales, 'c1');
    expect([s.count, s.total, s.credit, s.last]).toEqual([2, 5000, 4000, '2026-10-09']);
    expect(s.sales.map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
});
