import { useMemo, useState, type ReactNode } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Tag } from 'primereact/tag';
import type { PurchaseOrder } from '@/shared/contracts';
import { usePurchaseOrders } from '@/shared/api/queries';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { Can } from '@/app/guards/RouteGuard';
import { OrderDetailDialog } from './OrderDetailDialog';
import { OrderFormDialog } from './OrderFormDialog';
import { STATUS_LABEL, STATUS_OPTIONS, STATUS_SEVERITY, type OrderStatus } from './labels';
import { useLookups } from './useLookups';

export const OrdersTab = () => {
  const orders = usePurchaseOrders();
  const { supplierById } = useLookups();
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const all = [...(orders.data ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number));
    return status ? all.filter((o) => o.status === status) : all;
  }, [orders.data, status]);

  let content: ReactNode;
  if (orders.isLoading) content = <LoadingState label="Cargando órdenes…" />;
  else if (orders.error) content = <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />;
  else if (rows.length === 0) {
    content = (
      <div data-testid="orders-empty">
        <EmptyState
          message={
            status
              ? `No hay órdenes en estado "${STATUS_LABEL[status]}". Cambia el filtro para ver otras.`
              : 'Aún no hay órdenes de compra. Crea la primera con "Nueva orden".'
          }
        />
      </div>
    );
  } else {
    content = (
      <div className="app-table-scroll">
        <DataTable value={rows} dataKey="id" paginator rows={10} size="small" stripedRows aria-label="Órdenes de compra">
          <Column field="number" header="Número" sortable />
          <Column field="date" header="Fecha" sortable />
          <Column header="Proveedor" body={(o: PurchaseOrder) => supplierById.get(o.supplierId)?.name ?? 'Proveedor desconocido'} />
          <Column
            header="Estado"
            body={(o: PurchaseOrder) => <Tag value={STATUS_LABEL[o.status]} severity={STATUS_SEVERITY[o.status]} />}
          />
          <Column
            field="total" header="Total" sortable
            body={(o: PurchaseOrder) => <span className="purch__num">{formatMoney(o.total)}</span>}
          />
          <Column
            header=""
            body={(o: PurchaseOrder) => (
              <Button
                type="button" label="Ver" icon="pi pi-eye" text size="small"
                aria-label={`Ver orden ${o.number}`} onClick={() => setOpenId(o.id)}
              />
            )}
          />
        </DataTable>
      </div>
    );
  }

  return (
    <>
      <div className="purch__bar">
        <div className="purch__filter">
          <label htmlFor="order-status">Estado</label>
          <select
            id="order-status" className="p-inputtext" value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <Can permission="purchases.create">
          <Button type="button" label="Nueva orden" icon="pi pi-plus" onClick={() => setCreating(true)} />
        </Can>
      </div>
      {content}
      <p className="purch__proposal">
        PROPUESTA: el ciclo borrador, enviada, recibida y sus efectos (BR-COM-01 a 04) esperan aprobación del dueño.
        La recepción parcial no está soportada (todo o nada).
      </p>
      <OrderFormDialog
        visible={creating}
        onHide={() => setCreating(false)}
        onCreated={(id) => { setCreating(false); setOpenId(id); }}
      />
      <OrderDetailDialog orderId={openId} onHide={() => setOpenId(null)} />
    </>
  );
};
