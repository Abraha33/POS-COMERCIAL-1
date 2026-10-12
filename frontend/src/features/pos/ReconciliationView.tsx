import { useMemo, useState } from 'react';
import { useSales } from '@/shared/api/queries';
import { EmptyState, ErrorState, LoadingState, MoneyInput, MoneyText, ScreenTemplate } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { reconLabels, reconStatus, summarize, type ReconStatus } from './reconcile';
import { usePosChannels } from './proofs/usePosChannels';
import './pos.css';

const loadReceived = (shiftId: string): Record<string, number> => {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(`pos.recon.${shiftId}`) ?? '{}');
    return raw && typeof raw === 'object' ? (raw as Record<string, number>) : {};
  } catch {
    return {};
  }
};

const tone: Record<ReconStatus, string> = {
  'sin-registro': 'warning', conciliado: 'success', falta: 'danger', sobrante: 'info',
};

/** Conciliación del turno: cobros digitales reportados vs lo recibido que digita el cajero. Efectivo y banco por separado. */
export const ReconciliationView = ({ shiftId }: { shiftId: string }) => {
  const sales = useSales();
  const [received, setReceived] = useState<Record<string, number>>(() => loadReceived(shiftId));
  const channels = usePosChannels();
  const summary = useMemo(() => summarize(sales.data ?? [], shiftId, channels), [sales.data, shiftId, channels]);

  const setValue = (key: string, value: number | null) => {
    setReceived((cur) => {
      const next = { ...cur };
      if (value === null) delete next[key];
      else next[key] = value;
      try {
        window.localStorage.setItem(`pos.recon.${shiftId}`, JSON.stringify(next));
      } catch {
        /* sin almacenamiento: queda en memoria */
      }
      return next;
    });
  };

  if (sales.isLoading) return <ScreenTemplate title="Conciliación de cobros"><LoadingState /></ScreenTemplate>;
  if (sales.error) {
    return <ScreenTemplate title="Conciliación de cobros"><ErrorState error={sales.error} onRetry={() => void sales.refetch()} /></ScreenTemplate>;
  }

  return (
    <ScreenTemplate title="Conciliación de cobros" subtitle={`Turno ${shiftId} · reportado vs recibido (PROPUESTA)`}>
      <dl className="pos__facts recon__totals" aria-label="Ingresos del turno por tipo">
        <div><dt>Efectivo</dt><dd data-testid="recon-cash"><MoneyText value={summary.cash} /></dd></div>
        <div><dt>Banco y billeteras</dt><dd data-testid="recon-bank"><MoneyText value={summary.bank} /></dd></div>
        <div><dt>A crédito (no es ingreso)</dt><dd><MoneyText value={summary.credit} /></dd></div>
      </dl>

      {summary.rows.length === 0 ? (
        <EmptyState title="Sin cobros digitales en este turno" description="Cuando vendas por transferencia, Nequi o datáfono aparecerán aquí para conciliar." />
      ) : (
        <div className="recon__table-wrap">
          <table className="recon__table">
            <caption className="sr-only">Cobros digitales del turno por canal y cuenta destino</caption>
            <thead>
              <tr>
                <th scope="col">Canal</th>
                <th scope="col">Cuenta destino</th>
                <th scope="col" className="pos-detail__num">Reportado</th>
                <th scope="col" className="pos-detail__num">Con comprobante</th>
                <th scope="col" className="pos-detail__num">Sin comprobante</th>
                <th scope="col">Recibido según extracto</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) => {
                const got = received[row.key];
                const status = reconStatus(row, got);
                return (
                  <tr key={row.key} data-testid={`recon-${row.key}`}>
                    <th scope="row">{row.label} <span className="pos__hint">({row.count})</span></th>
                    <td>{row.destination}</td>
                    <td className="pos-detail__num"><MoneyText value={row.reported} /></td>
                    <td className="pos-detail__num"><MoneyText value={row.verified} /></td>
                    <td className="pos-detail__num"><MoneyText value={row.withoutProof} /></td>
                    <td>
                      <MoneyInput
                        aria-label={`Recibido ${row.label} ${row.destination}`}
                        value={got ?? null}
                        onChange={(v) => setValue(row.key, v)}
                      />
                    </td>
                    <td>
                      <span className={`proof__badge proof__badge--${tone[status]}`}>{reconLabels[status]}</span>
                      {got !== undefined && got !== row.reported ? (
                        <span className="pos__hint block">Diferencia {formatMoney(got - row.reported)}</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="pos__hint">
        "Recibido" lo digitas tú desde el extracto o la billetera; el sistema no consulta el banco. Un cobro sin
        comprobante necesita verificación antes del cierre.
      </p>
    </ScreenTemplate>
  );
};
