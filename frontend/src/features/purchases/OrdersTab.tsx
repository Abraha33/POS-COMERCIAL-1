import { useMemo, useState, type ReactNode } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import type { PurchaseOrder } from '@/shared/contracts';
import { usePurchaseOrders } from '@/shared/api/queries';
import {
  EmptyState, ErrorState, KpiCard, LoadingState, MoneyText, SegmentedTabs, StatusTag, type SegmentOption,
} from '@/shared/ui';
import { Can } from '@/app/guards/RouteGuard';
import { ORDER_STATUS_MAP, STATUS_LABEL, STATUS_OPTIONS, type OrderStatus } from './labels';
import { useIsPhone } from './useIsPhone';
import { useLookups } from './useLookups';

type Filter = OrderStatus | 'todas';
type Props = { onOpen: (orderId: string) => void; onCreate: () => void };

export const OrdersTab = ({ onOpen, onCreate }: Props) => {
  const orders = usePurchaseOrders();
  const { supplierById } = useLookups();
  const phone = useIsPhone();
  const [filter, setFilter] = useState<Filter>('todas');
  const [query, setQuery] = useState('');

  const all = useMemo(() => orders.data ?? [], [orders.data]);
  const supplierName = (o: PurchaseOrder) => supplierById.get(o.supplierId)?.name ?? 'Proveedor desconocido';

  const kpis = useMemo(() => {
    const inTransit = all.filter((o) => o.status === 'enviada');
    return {
      toReceive: inTransit.length,
      transitValue: inTransit.reduce((sum, o) => sum + o.total, 0),
      drafts: all.filter((o) => o.status === 'borrador').length,
    };
  }, [all]);

  const options = useMemo<SegmentOption<Filter>[]>(
    () => [
      { value: 'todas', label: 'Todas', count: all.length },
      ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s], count: all.filter((o) => o.status === s).length })),
    ],
    [all],
  );

  const rows = useMemo(() => {
    const text = query.trim().toLowerCase();
    const nameOf = (o: PurchaseOrder) => (supplierById.get(o.supplierId)?.name ?? '').toLowerCase();
    return [...all]
      .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number))
      .filter((o) => filter === 'todas' || o.status === filter)
      .filter((o) => !text || o.number.toLowerCase().includes(text) || nameOf(o).includes(text));
  }, [all, filter, query, supplierById]);

  const viewButton = (o: PurchaseOrder) => (
    <Button
      type="button" label="Ver" icon="pi pi-eye" text
      aria-label={`Ver orden ${o.number}`} onClick={() => onOpen(o.id)}
    />
  );

  let content: ReactNode;
  if (orders.isLoading) content = <LoadingState label="Cargando órdenes…" />;
  else if (orders.error) content = <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />;
  else if (rows.length === 0) {
    const filtered = filter !== 'todas' || query.trim() !== '';
    content = (
      <div data-testid="orders-empty">
        <EmptyState
          icon="pi pi-shopping-bag"
          title={filtered ? 'Sin resultados' : 'Aún no hay órdenes de compra'}
          message={
            filtered
              ? 'Ninguna orden coincide con el filtro o la búsqueda. Cambia el estado o limpia el texto.'
              : 'Crea la primera orden para pedir mercancía a un proveedor.'
          }
          action={
            filtered ? (
              <Button type="button" label="Quitar filtros" outlined onClick={() => { setFilter('todas'); setQuery(''); }} />
            ) : (
              <Can permission="purchases.create">
                <Button type="button" label="Nueva orden" icon="pi pi-plus" onClick={onCreate} />
              </Can>
            )
          }
        />
      </div>
    );
  } else if (phone) {
    content = (
      <ul className="purch__cards" aria-label="Órdenes de compra">
        {rows.map((o) => (
          <li key={o.id} className="purch__card">
            <div className="purch__card-head">
              <strong>{o.number}</strong>
              <StatusTag status={o.status} map={ORDER_STATUS_MAP} />
            </div>
            <p className="purch__card-line">{supplierName(o)}</p>
            <p className="purch__card-line purch__hint">{o.date}</p>
            <div className="purch__card-foot">
              <MoneyText value={o.total} strong />
              {viewButton(o)}
            </div>
          </li>
        ))}
      </ul>
    );
  } else {
    content = (
      <div className="app-table-scroll">
        <DataTable value={rows} dataKey="id" paginator rows={10} stripedRows aria-label="Órdenes de compra">
          <Column field="number" header="Número" sortable />
          <Column field="date" header="Fecha" sortable />
          <Column header="Proveedor" body={supplierName} />
          <Column header="Estado" body={(o: PurchaseOrder) => <StatusTag status={o.status} map={ORDER_STATUS_MAP} />} />
          <Column
            field="total" header="Total" sortable
            body={(o: PurchaseOrder) => <MoneyText value={o.total} strong />}
          />
          <Column header="" body={viewButton} />
        </DataTable>
      </div>
    );
  }

  return (
    <>
      <div className="purch__kpis">
        <KpiCard label="Por recibir" icon="pi pi-inbox" value={kpis.toReceive} hint="Órdenes enviadas sin recibir" />
        <KpiCard
          label="Valor en tránsito" icon="pi pi-truck" proposal
          value={<MoneyText value={kpis.transitValue} />} hint="Suma de órdenes enviadas"
        />
        <KpiCard label="Borradores" icon="pi pi-pencil" value={kpis.drafts} hint="Aún no enviadas al proveedor" />
      </div>
      <div className="purch__bar">
        <SegmentedTabs options={options} value={filter} onChange={setFilter} ariaLabel="Filtrar por estado" />
        <div className="purch__search">
          <label htmlFor="order-search" className="sr-only">Buscar orden</label>
          <InputText
            id="order-search" type="search" value={query} placeholder="Buscar por número o proveedor"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {content}
      <p className="purch__proposal">
        PROPUESTA: el ciclo borrador, enviada, recibida y sus efectos (BR-COM-01 a 04) esperan aprobación del dueño.
        La recepción parcial no está soportada (todo o nada).
      </p>
    </>
  );
};
