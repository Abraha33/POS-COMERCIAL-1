import { useMemo } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Tag } from 'primereact/tag';
import type { InventoryAlert } from '@/shared/contracts';
import { useInventoryAlerts } from '@/shared/api/inventory';
import { QueryState } from './QueryState';
import { formatDate, useBranchLabel, useProductLookup } from './lookups';

type Row = InventoryAlert & { productName: string; branchName: string };

export const AlertsTab = () => {
  const alerts = useInventoryAlerts();
  const { nameOf, products } = useProductLookup();
  const branchLabel = useBranchLabel();

  const rows = useMemo<Row[]>(
    () => [...(alerts.data ?? [])]
      .sort((a, b) => Number(a.resolved) - Number(b.resolved) || b.createdAt.localeCompare(a.createdAt))
      .map((a) => ({ ...a, productName: nameOf(a.productId), branchName: branchLabel(a.branchId) })),
    [alerts.data, products],
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
        Un stock negativo (venta con PIN u offline) exige un ajuste de inventario. El módulo de ajustes aún no tiene contrato;
        mientras tanto las alertas son solo de consulta.
      </p>
      <div className="app-table-scroll">
        <DataTable value={rows} paginator rows={10} stripedRows size="small" dataKey="id">
          <Column field="productName" header="Producto" sortable />
          <Column field="branchName" header="Sede" sortable />
          <Column header="Alerta" body={() => <Tag icon="pi pi-exclamation-triangle" severity="danger" value="Ajuste de inventario requerido" />} />
          <Column field="createdAt" header="Fecha" sortable body={(r: Row) => formatDate(r.createdAt)} />
          <Column
            field="resolved"
            header="Estado"
            sortable
            body={(r: Row) => <Tag value={r.resolved ? 'Resuelta' : 'Pendiente'} severity={r.resolved ? 'success' : 'warning'} />}
          />
        </DataTable>
      </div>
    </QueryState>
  );
};
