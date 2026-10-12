import { useMemo } from 'react';
import { useSales } from '@/shared/api/queries';
import { MoneyText } from '@/shared/ui';
import { summarize } from './reconcile';

/** Ingresos del turno por tipo y canal, para cerrar sabiendo qué es efectivo y qué es banco (PROPUESTA). */
export const ShiftIncome = ({ shiftId }: { shiftId: string }) => {
  const sales = useSales();
  const summary = useMemo(() => summarize(sales.data ?? [], shiftId), [sales.data, shiftId]);
  const unbacked = summary.rows.filter((r) => r.withoutProof > 0);

  return (
    <section className="pos-cash__income" aria-label="Ingresos del turno por canal">
      <h3 className="pos-detail__title">Ingresos del turno por canal</h3>
      <dl className="pos__facts">
        <div><dt>Efectivo</dt><dd data-testid="close-cash"><MoneyText value={summary.cash} /></dd></div>
        <div><dt>Banco y billeteras</dt><dd data-testid="close-bank"><MoneyText value={summary.bank} /></dd></div>
        <div><dt>A crédito (no es ingreso)</dt><dd><MoneyText value={summary.credit} /></dd></div>
      </dl>
      {summary.rows.length > 0 ? (
        <ul className="pos__hint pos-detail__list" aria-label="Detalle por canal">
          {summary.rows.map((r) => (
            <li key={r.key}>{r.label}{r.destination !== '—' ? ` · ${r.destination}` : ''}: <MoneyText value={r.reported} /></li>
          ))}
        </ul>
      ) : null}
      {unbacked.length > 0 ? (
        <p className="pos__hint" role="status" data-testid="close-unbacked">
          Hay cobros digitales sin comprobante confirmado en: {unbacked.map((r) => r.label).join(', ')}. Verifícalos en
          «Conciliación de cobros» antes de cerrar.
        </p>
      ) : null}
    </section>
  );
};
