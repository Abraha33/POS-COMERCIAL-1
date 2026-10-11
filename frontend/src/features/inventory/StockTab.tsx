import { useMemo, useState } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import type { StockLevel } from '@/shared/contracts';
import { useStockLevels } from '@/shared/api/queries';
import { EmptyState, FormField, StatusTag } from '@/shared/ui';
import { QueryState } from './QueryState';
import { formatQuantity, stockState, stockStatusMap, useBranchLabel, useProductLookup } from './lookups';
import { useIsMobile } from './useIsMobile';

type Row = StockLevel & { id: string; name: string; sku: string; branchName: string };

const stateTag = (r: StockLevel) => <StatusTag status={stockState(r.onHand, r.minimum)} map={stockStatusMap} />;

export const StockTab = () => {
  const levels = useStockLevels();
  const { nameOf, skuOf, isLoading: loadingProducts } = useProductLookup();
  const branchLabel = useBranchLabel();
  const isMobile = useIsMobile();
  const [branch, setBranch] = useState('');
  const [query, setQuery] = useState('');

  const rows = useMemo<Row[]>(
    () => (levels.data ?? []).map((l) => ({
      ...l, id: `${l.productId}:${l.branchId}`, name: nameOf(l.productId), sku: skuOf(l.productId), branchName: branchLabel(l.branchId),
    })),
    [levels.data, loadingProducts, branchLabel],
  );
  const branches = useMemo(() => [...new Set((levels.data ?? []).map((l) => l.branchId))].sort(), [levels.data]);
  const visible = rows.filter((r) => {
    if (branch && r.branchId !== branch) return false;
    const q = query.trim().toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q);
  });

  const cards = visible.length === 0
    ? <EmptyState message="Ninguna existencia coincide con la búsqueda." />
    : (
      <ul className="inv-cards" aria-label="Existencias por sede">
        {visible.map((r) => (
          <li key={r.id} className="inv-card">
            <div className="inv-card__head">
              <div>
                <h2 className="inv-card__name">{r.name}</h2>
                <p className="inv-card__meta">{r.sku} · {r.branchName}</p>
              </div>
              {stateTag(r)}
            </div>
            <dl className="inv-card__facts">
              <div><dt>Existencias</dt><dd>{formatQuantity(r.onHand)}</dd></div>
              <div><dt>En tránsito</dt><dd>{formatQuantity(r.inTransit)}</dd></div>
              <div><dt>Mínimo</dt><dd>{formatQuantity(r.minimum)}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
    );

  const table = (
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
        <Column header="Estado" body={stateTag} />
      </DataTable>
    </div>
  );

  return (
    <QueryState
      isLoading={levels.isLoading}
      error={levels.error}
      isEmpty={!levels.data || levels.data.length === 0}
      emptyMessage="Aún no hay existencias registradas."
      onRetry={() => void levels.refetch()}
    >
      <div className="inv-toolbar">
        <FormField id="stock-search" label="Buscar producto">
          <span className="p-input-icon-left">
            <i className="pi pi-search" aria-hidden="true" />
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
      {isMobile ? cards : table}
    </QueryState>
  );
};
