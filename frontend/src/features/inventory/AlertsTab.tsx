import { useMemo } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import type { InventoryAlert } from '@/shared/contracts';
import { useInventoryAlerts } from '@/shared/api/inventory';
import { StatusTag } from '@/shared/ui';
import { QueryState } from './QueryState';
import { flowStatusMap, formatDate, useBranchLabel, useProductLookup } from './lookups';
import { useIsMobile } from './useIsMobile';

type Row = InventoryAlert & { productName: string; branchName: string };

const statusOf = (r: Row) => <StatusTag status={r.resolved ? 'resolved' : 'pendiente'} map={flowStatusMap} />;

export const AlertsTab = () => {
  const alerts = useInventoryAlerts();
  const { nameOf, products } = useProductLookup();
  const branchLabel = useBranchLabel();
  const isMobile = useIsMobile();

  const rows = useMemo<Row[]>(
    () => [...(alerts.data ?? [])]
      .sort((a, b) => Number(a.resolved) - Number(b.resolved) || b.createdAt.localeCompare(a.createdAt))
      .map((a) => ({ ...a, productName: nameOf(a.productId), branchName: branchLabel(a.branchId) })),
    [alerts.data, products, branchLabel],
  );

  const cards = (
    <ul className="inv-cards" aria-label="Alertas de inventario">
      {rows.map((r) => (
        <li key={r.id} className="inv-card">
          <div className="inv-card__head">
            <div>
              <h2 className="inv-card__name">{r.productName}</h2>
              <p className="inv-card__meta">{r.branchName} · {formatDate(r.createdAt)}</p>
            </div>
            {statusOf(r)}
          </div>
          <p className="inv-card__meta"><i className="pi pi-exclamation-triangle" aria-hidden="true" /> Ajuste de inventario requerido</p>
        </li>
      ))}
    </ul>
  );

  const table = (
    <div className="app-table-scroll">
      <DataTable value={rows} paginator rows={10} stripedRows size="small" dataKey="id">
        <Column field="productName" header="Producto" sortable />
        <Column field="branchName" header="Sede" sortable />
        <Column
          header="Alerta"
          body={() => <StatusTag status="negative" map={{ negative: { label: 'Ajuste de inventario requerido', tone: 'danger', icon: 'pi pi-exclamation-triangle' } }} />}
        />
        <Column field="createdAt" header="Fecha" sortable body={(r: Row) => formatDate(r.createdAt)} />
        <Column field="resolved" header="Estado" sortable body={statusOf} />
      </DataTable>
    </div>
  );

  return (
    <QueryState
      isLoading={alerts.isLoading}
      error={alerts.error}
      isEmpty={rows.length === 0}
      emptyMessage="No hay alertas de inventario. Todo en orden."
      onRetry={() => void alerts.refetch()}
    >
      <p className="mt-0 text-color-secondary">
        Un stock negativo (venta con PIN u offline) exige un ajuste de inventario. <strong>PROPUESTA:</strong> el ajuste
        se podrá registrar desde aquí al integrar el contrato v0.5.0; mientras tanto las alertas son solo de consulta.
      </p>
      {isMobile ? cards : table}
    </QueryState>
  );
};
