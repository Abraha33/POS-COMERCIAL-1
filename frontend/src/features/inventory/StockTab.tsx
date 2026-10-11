import { useMemo, useState } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import type { StockLevel } from '@/shared/contracts';
import { useStockLevels } from '@/shared/api/queries';
import { FormField } from '@/shared/ui';
import { QueryState } from './QueryState';
import { formatQuantity, useBranchLabel, useProductLookup } from './lookups';

type Row = StockLevel & { id: string; name: string; sku: string; branchName: string };

const stockStatus = (row: StockLevel): 'negativo' | 'bajo' | 'ok' => {
  if (row.onHand < 0) return 'negativo';
  if (row.onHand < row.minimum) return 'bajo';
  return 'ok';
};

export const StockTab = () => {
  const levels = useStockLevels();
  const { nameOf, skuOf, isLoading: loadingProducts } = useProductLookup();
  const branchLabel = useBranchLabel();
  const [branch, setBranch] = useState('');
  const [query, setQuery] = useState('');

  const rows = useMemo<Row[]>(
    () => (levels.data ?? []).map((l) => ({
      ...l, id: `${l.productId}:${l.branchId}`, name: nameOf(l.productId), sku: skuOf(l.productId), branchName: branchLabel(l.branchId),
    })),
    [levels.data, loadingProducts],
  );
  const branches = useMemo(() => [...new Set((levels.data ?? []).map((l) => l.branchId))].sort(), [levels.data]);
  const visible = rows.filter((r) => {
    if (branch && r.branchId !== branch) return false;
    const q = query.trim().toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q);
  });

  return (
    <QueryState
      isLoading={levels.isLoading}
      error={levels.error}
      isEmpty={!levels.data || levels.data.length === 0}
      emptyMessage="Aún no hay existencias registradas."
      onRetry={() => void levels.refetch()}
    >
      <div className="app-row mb-3" style={{ alignItems: 'flex-end' }}>
        <FormField id="stock-search" label="Buscar producto">
          <span className="p-input-icon-left">
            <i className="pi pi-search" />
            <InputText id="stock-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre o SKU" />
          </span>
        </FormField>
        <FormField id="stock-branch" label="Sede">
          <select id="stock-branch" className="p-inputtext" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">Todas las sedes</option>
            {branches.map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
          </select>
        </FormField>
      </div>
      <div className="app-table-scroll">
        <DataTable
          value={visible}
          paginator
          rows={10}
          stripedRows
          size="small"
          dataKey="id"
          emptyMessage="Ninguna existencia coincide con la búsqueda."
        >
          <Column field="name" header="Producto" sortable body={(r: Row) => (
            <>
              <div>{r.name}</div>
              <small className="text-color-secondary">{r.sku}</small>
            </>
          )} />
          <Column field="branchName" header="Sede" sortable />
          <Column field="onHand" header="Existencias" sortable bodyClassName="text-right" body={(r: Row) => formatQuantity(r.onHand)} />
          <Column field="inTransit" header="En tránsito" sortable bodyClassName="text-right" body={(r: Row) => formatQuantity(r.inTransit)} />
          <Column field="minimum" header="Mínimo" sortable bodyClassName="text-right" body={(r: Row) => formatQuantity(r.minimum)} />
          <Column header="Estado" body={(r: Row) => {
            const status = stockStatus(r);
            if (status === 'negativo') return <Tag icon="pi pi-exclamation-triangle" severity="danger" value="Negativo" />;
            if (status === 'bajo') return <Tag icon="pi pi-arrow-down" severity="warning" value="Bajo mínimo" />;
            return <Tag severity="success" value="Normal" />;
          }} />
        </DataTable>
      </div>
    </QueryState>
  );
};
