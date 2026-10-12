import { useMemo } from 'react';
import { Dialog } from 'primereact/dialog';
import type { Customer, Sale } from '@/shared/contracts';
import { useSales } from '@/shared/api/queries';
import { EmptyState, ErrorState, LoadingState, MoneyText, StatusTag } from '@/shared/ui';
import { formatSaleDate, paymentSummary } from './saleText';

export type CustomerSummary = { count: number; total: number; last: string | null; credit: number; sales: Sale[] };

/** Resumen de compras de un cliente (ventas anuladas aparecen en la lista pero no suman). */
export const summarizeCustomer = (sales: readonly Sale[], customerId: string): CustomerSummary => {
  const mine = sales
    .filter((s) => s.customerId === customerId)
    .sort((a, b) => (a.date === b.date ? b.number.localeCompare(a.number) : b.date.localeCompare(a.date)));
  const live = mine.filter((s) => s.status !== 'anulada');
  return {
    count: live.length,
    total: live.reduce((sum, s) => sum + s.total, 0),
    last: live[0]?.date ?? null,
    credit: live.filter((s) => s.status === 'credito').reduce((sum, s) => sum + s.total, 0),
    sales: mine,
  };
};

type Props = { customer: Customer; onHide: () => void };

export const CustomerHistoryDialog = ({ customer, onHide }: Props) => {
  const sales = useSales();
  const summary = useMemo(() => summarizeCustomer(sales.data ?? [], customer.id), [sales.data, customer.id]);

  return (
    <Dialog header={`Historial de ${customer.name}`} visible onHide={onHide} modal className="pos-dialog" style={{ width: 'min(40rem, 95vw)' }}>
      {sales.isLoading ? <LoadingState /> : null}
      {sales.error ? <ErrorState error={sales.error} onRetry={() => void sales.refetch()} /> : null}
      {sales.data ? (
        <>
          <dl className="pos__facts" aria-label="Resumen del cliente">
            <div><dt>Compras</dt><dd data-testid="hist-count">{summary.count}</dd></div>
            <div><dt>Total comprado</dt><dd><MoneyText value={summary.total} /></dd></div>
            <div><dt>Última compra</dt><dd>{summary.last ? formatSaleDate(summary.last) : '—'}</dd></div>
            <div><dt>A crédito</dt><dd><MoneyText value={summary.credit} /></dd></div>
            <div><dt>Saldo pendiente</dt><dd><MoneyText value={customer.outstandingBalance} /></dd></div>
          </dl>
          {summary.sales.length === 0 ? (
            <EmptyState title="Sin compras registradas" description="Cuando este cliente compre, sus ventas aparecerán aquí." />
          ) : (
            <table className="recon__table">
              <caption className="sr-only">Ventas del cliente, la más reciente primero</caption>
              <thead>
                <tr>
                  <th scope="col">Venta</th><th scope="col">Fecha</th><th scope="col">Pago</th>
                  <th scope="col" className="pos-detail__num">Total</th><th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {summary.sales.map((s) => (
                  <tr key={s.id}>
                    <th scope="row">{s.number}</th>
                    <td>{formatSaleDate(s.date)}</td>
                    <td>{paymentSummary(s)}</td>
                    <td className="pos-detail__num"><MoneyText value={s.total} /></td>
                    <td><StatusTag status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : null}
    </Dialog>
  );
};
