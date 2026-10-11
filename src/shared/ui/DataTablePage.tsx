import { useState, type ReactNode } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
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
};

/** Plantilla de pantalla con tabla: búsqueda global, paginación y estados de carga/vacío/error. */
export const DataTablePage = <T extends object>({
  title, subtitle, actions, rows, isLoading, error, onRetry, columns, searchPlaceholder = 'Buscar…', emptyMessage,
}: Props<T>) => {
  const [filter, setFilter] = useState('');

  let content: ReactNode;
  if (isLoading) content = <LoadingState />;
  else if (error) content = <ErrorState error={error} onRetry={onRetry} />;
  else if (!rows || rows.length === 0) content = <EmptyState message={emptyMessage} />;
  else {
    content = (
      <>
        <span className="p-input-icon-left mb-3">
          <i className="pi pi-search" />
          <InputText
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Buscar en la tabla"
          />
        </span>
        <DataTable value={rows} globalFilter={filter} paginator rows={10} stripedRows size="small" dataKey="id">
          {columns.map((c) => (
            <Column key={c.field} field={c.field} header={c.header} body={c.body} sortable={c.sortable ?? true} />
          ))}
        </DataTable>
      </>
    );
  }

  return (
    <ScreenTemplate title={title} subtitle={subtitle} actions={actions}>
      {content}
    </ScreenTemplate>
  );
};
