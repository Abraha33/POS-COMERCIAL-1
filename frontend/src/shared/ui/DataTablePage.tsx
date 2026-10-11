import { useState, type ReactNode } from 'react';
import { Column } from 'primereact/column';
import { DataTable, type DataTableStateEvent } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { ScreenTemplate } from './ScreenTemplate';
import { EmptyState, ErrorState, LoadingState } from './StateBlock';

export type ColumnDef<T> = {
  field: string;
  header: string;
  body?: (row: T) => ReactNode;
  sortable?: boolean;
};

type Props<T extends object> = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  rows: T[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Resumen (KPIs, totales) sobre la tabla; se muestra también en vacío para dar contexto. */
  summary?: ReactNode;
  /** Controles de filtro extra (selects, fechas) junto a la búsqueda. */
  filters?: ReactNode;
  /** Orden inicial de la tabla (`order`: 1 ascendente, -1 descendente). */
  initialSort?: { field: string; order: 1 | -1 };
};

/** Plantilla de pantalla con tabla: búsqueda global, paginación y estados de carga/vacío/error. */
export const DataTablePage = <T extends object>({
  title, subtitle, actions, rows, isLoading, error, onRetry, columns, searchPlaceholder = 'Buscar…', emptyMessage,
  summary, filters, initialSort,
}: Props<T>) => {
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<{ field?: string; order?: 0 | 1 | -1 | null }>(
    initialSort ? { field: initialSort.field, order: initialSort.order } : {},
  );

  let content: ReactNode;
  if (isLoading) content = <LoadingState />;
  else if (error) content = <ErrorState error={error} onRetry={onRetry} />;
  else if (!rows || rows.length === 0) content = <EmptyState message={emptyMessage} />;
  else {
    content = (
      <>
        <div className="flex flex-wrap align-items-center gap-2 mb-3">
          <span className="p-input-icon-left">
            <i className="pi pi-search" />
            <InputText
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Buscar en la tabla"
            />
          </span>
          {filters}
        </div>
        <DataTable
          value={rows} globalFilter={filter} paginator rows={10} stripedRows size="small" dataKey="id"
          sortField={sort.field} sortOrder={sort.order}
          onSort={(e: DataTableStateEvent) => setSort({ field: e.sortField, order: e.sortOrder })}
        >
          {columns.map((c) => (
            <Column key={c.field} field={c.field} header={c.header} body={c.body} sortable={c.sortable ?? true} />
          ))}
        </DataTable>
      </>
    );
  }

  return (
    <ScreenTemplate title={title} subtitle={subtitle} actions={actions}>
      {summary}
      {content}
    </ScreenTemplate>
  );
};
