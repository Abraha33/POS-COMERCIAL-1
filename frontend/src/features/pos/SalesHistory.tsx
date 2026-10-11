import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import type { Sale } from '@/shared/contracts';
import { useCustomers, useProducts, useSales } from '@/shared/api/queries';
import { EmptyState, ErrorState, LoadingState, MoneyText, ScreenTemplate, StatusTag } from '@/shared/ui';
import { useSession } from '@/app/providers/SessionProvider';
import { ReturnDialog } from './ReturnDialog';
import { SaleDetailDialog } from './SaleDetailDialog';
import { VoidSaleDialog } from './VoidSaleDialog';
import { formatSaleDate, paymentSummary, statusLabels } from './saleText';
import './pos.css';

type StatusFilter = 'todas' | Sale['status'];
type Overlay = 'return' | 'void' | null;

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'todas', label: 'Todos los estados' },
  { value: 'pagada', label: statusLabels.pagada },
  { value: 'credito', label: statusLabels.credito },
  { value: 'anulada', label: statusLabels.anulada },
];

/** Historial de ventas: filtros, detalle, devolución parcial (PROPUESTA BR-DEV) y anulación (BR-VEN-10). */
export const SalesHistory = ({ onNewSale }: { onNewSale?: () => void }) => {
  const sales = useSales();
  const customers = useCustomers();
  const products = useProducts();
  const { can } = useSession();

  const [status, setStatus] = useState<StatusFilter>('todas');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  // La API no expone lo ya devuelto por venta: se acumula lo devuelto en esta sesión (el servidor sigue siendo la autoridad).
  const [returned, setReturned] = useState<Record<string, Record<string, number>>>({});

  const productsById = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);
  const customerName = (id: string | null): string =>
    id === null ? 'Consumidor final' : (customers.data ?? []).find((c) => c.id === id)?.name ?? 'Cliente no disponible';

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(sales.data ?? [])]
      .filter((s) => (status === 'todas' ? true : s.status === status))
      .filter((s) => (q ? s.number.toLowerCase().includes(q) : true))
      .filter((s) => (from ? s.date.slice(0, 10) >= from : true))
      .filter((s) => (to ? s.date.slice(0, 10) <= to : true))
      .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number));
  }, [sales.data, status, query, from, to]);

  const selected = (sales.data ?? []).find((s) => s.id === selectedId) ?? null;
  const canOperate = can('pos.sell') || can('pos.refund');
  const closeAll = () => {
    setOverlay(null);
    setSelectedId(null);
  };
  const hasFilters = status !== 'todas' || query !== '' || from !== '' || to !== '';

  return (
    <ScreenTemplate
      title="Ventas"
      subtitle="Historial de ventas de la caja"
      actions={
        onNewSale ? <Button type="button" label="Nueva venta" icon="pi pi-plus" onClick={onNewSale} /> : undefined
      }
    >
      <div className="pos__panel">
        <div className="pos__filters">
          <div className="pos__field">
            <label htmlFor="history-from">Desde</label>
            <input id="history-from" className="p-inputtext" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="pos__field">
            <label htmlFor="history-to">Hasta</label>
            <input id="history-to" className="p-inputtext" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="pos__field">
            <label htmlFor="history-status">Estado</label>
            <select
              id="history-status"
              className="p-inputtext"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
            >
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="pos__field">
            <label htmlFor="history-search">Buscar por número</label>
            <input
              id="history-search"
              className="p-inputtext"
              type="search"
              placeholder="POS-0001"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {sales.isLoading ? <LoadingState label="Cargando ventas…" /> : null}
        {sales.error ? <ErrorState error={sales.error} onRetry={() => void sales.refetch()} /> : null}
        {sales.data && rows.length === 0 ? (
          <EmptyState
            icon="pi pi-receipt"
            message={sales.data.length === 0 ? 'Aún no hay ventas registradas.' : 'Ninguna venta coincide con los filtros.'}
            description={
              sales.data.length === 0
                ? 'Las ventas aparecerán aquí al cobrarlas.'
                : 'Cambia o quita los filtros para ver más ventas.'
            }
            action={
              hasFilters ? (
                <Button
                  type="button" label="Quitar filtros" outlined
                  onClick={() => {
                    setStatus('todas');
                    setQuery('');
                    setFrom('');
                    setTo('');
                  }}
                />
              ) : undefined
            }
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="app-table-scroll">
            <table className="pos__history" data-testid="sales-history">
              <caption className="sr-only">Ventas</caption>
              <thead>
                <tr>
                  <th scope="col">Número</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Medios de pago</th>
                  <th scope="col" className="pos__num">Total</th>
                  <th scope="col">Estado</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((sale) => (
                  <tr key={sale.id} data-testid="sale-row">
                    <td data-label="Número"><strong>{sale.number}</strong></td>
                    <td data-label="Fecha">{formatSaleDate(sale.date)}</td>
                    <td data-label="Cliente">{customerName(sale.customerId)}</td>
                    <td data-label="Pago">{paymentSummary(sale)}</td>
                    <td data-label="Total" className="pos__num"><MoneyText value={sale.total} strong /></td>
                    <td data-label="Estado"><StatusTag status={sale.status} /></td>
                    <td className="pos__row-action">
                      <Button
                        type="button" label="Ver detalle" icon="pi pi-eye" text
                        aria-label={`Ver detalle de ${sale.number}`}
                        onClick={() => setSelectedId(sale.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {selected ? (
        <SaleDetailDialog
          sale={selected}
          customerName={customerName(selected.customerId)}
          products={productsById}
          returnedInSession={returned[selected.id] ?? {}}
          canOperate={canOperate}
          onReturn={() => setOverlay('return')}
          onVoid={() => setOverlay('void')}
          onHide={closeAll}
        />
      ) : null}
      {selected && overlay === 'return' ? (
        <ReturnDialog
          sale={selected}
          products={productsById}
          returnedInSession={returned[selected.id] ?? {}}
          onReturned={(saleReturn) =>
            setReturned((current) => {
              const forSale = { ...(current[selected.id] ?? {}) };
              for (const line of saleReturn.lines) {
                forSale[line.productId] = (forSale[line.productId] ?? 0) + line.quantity;
              }
              return { ...current, [selected.id]: forSale };
            })
          }
          onHide={() => setOverlay(null)}
        />
      ) : null}
      {selected && overlay === 'void' ? (
        <VoidSaleDialog sale={selected} onVoided={() => setOverlay(null)} onHide={() => setOverlay(null)} />
      ) : null}
    </ScreenTemplate>
  );
};
