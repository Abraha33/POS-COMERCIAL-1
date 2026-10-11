import { useMemo, useState } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import type { StockMovement } from '@/shared/contracts';
import { useStockMovements } from '@/shared/api/queries';
import { EmptyState, FormField } from '@/shared/ui';
import { QueryState } from './QueryState';
import { formatDate, formatQuantity, movementTypeLabels, useBranchLabel, useProductLookup } from './lookups';
import { useIsMobile } from './useIsMobile';

type Row = StockMovement & { productName: string; branchName: string; typeLabel: string };

/** BR-INV-06: entradas y traslados suman o restan según el tipo; el ajuste se muestra tal como llega. */
const SIGN: Record<StockMovement['type'], string> = {
  entrada: '+', traslado_recepcion: '+', salida: '−', traslado_envio: '−', ajuste: '',
};

const signed = (r: Row): string => `${SIGN[r.type]}${formatQuantity(r.quantity)}`;

export const MovementsTab = () => {
  const movements = useStockMovements();
  const { products, nameOf } = useProductLookup();
  const branchLabel = useBranchLabel();
  const isMobile = useIsMobile();
  const [productId, setProductId] = useState('');
  const [type, setType] = useState('');

  const rows = useMemo<Row[]>(
    () => [...(movements.data ?? [])]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .map((m) => ({ ...m, productName: nameOf(m.productId), branchName: branchLabel(m.branchId), typeLabel: movementTypeLabels[m.type] })),
    [movements.data, products, branchLabel],
  );
  const visible = rows.filter((r) => (!productId || r.productId === productId) && (!type || r.type === type));

  const cards = visible.length === 0
    ? <EmptyState message="Ningún movimiento coincide con los filtros." />
    : (
      <ul className="inv-cards" aria-label="Movimientos de inventario">
        {visible.map((r) => (
          <li key={r.id} className="inv-card">
            <div className="inv-card__head">
              <div>
                <h2 className="inv-card__name">{r.productName}</h2>
                <p className="inv-card__meta">{formatDate(r.date)} · {r.branchName}</p>
              </div>
              <strong>{signed(r)}</strong>
            </div>
            <p className="inv-card__meta">{r.typeLabel}{r.reference ? ` · ${r.reference}` : ''}</p>
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
        emptyMessage="Ningún movimiento coincide con los filtros."
      >
        <Column field="date" header="Fecha" sortable body={(r: Row) => formatDate(r.date)} />
        <Column field="productName" header="Producto" sortable />
        <Column field="branchName" header="Sede" sortable />
        <Column field="typeLabel" header="Tipo" sortable />
        <Column field="quantity" header="Cantidad" sortable bodyClassName="text-right" body={signed} />
        <Column field="reference" header="Referencia" sortable />
      </DataTable>
    </div>
  );

  return (
    <QueryState
      isLoading={movements.isLoading}
      error={movements.error}
      isEmpty={!movements.data || movements.data.length === 0}
      emptyMessage="Aún no hay movimientos de inventario."
      onRetry={() => void movements.refetch()}
    >
      <div className="inv-toolbar">
        <FormField id="mov-product" label="Producto">
          <select id="mov-product" className="p-inputtext" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Todos los productos</option>
            {(products ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FormField>
        <FormField id="mov-type" label="Tipo de movimiento">
          <select id="mov-type" className="p-inputtext" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos los tipos</option>
            {(Object.keys(movementTypeLabels) as StockMovement['type'][]).map((t) => (
              <option key={t} value={t}>{movementTypeLabels[t]}</option>
            ))}
          </select>
        </FormField>
      </div>
      {isMobile ? cards : table}
    </QueryState>
  );
};
