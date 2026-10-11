import type { Sale } from '@/shared/contracts';
import { useSales } from '@/shared/api/queries';
import { DataTablePage, type ColumnDef } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';

const columns: ColumnDef<Sale>[] = [
  { field: 'number', header: 'Número' },
  { field: 'date', header: 'Fecha' },
  { field: 'paymentMethod', header: 'Pago' },
  { field: 'total', header: 'Total', body: (s) => formatMoney(s.total) },
  { field: 'status', header: 'Estado' },
];

/** Pantalla ancla del POS (agente 1). Hoy solo lista ventas: la venta real se construye en la fase paralela. */
export const PosPage = () => {
  const { data, isLoading, error, refetch } = useSales();
  return (
    <DataTablePage
      title="Punto de venta"
      subtitle="Ventas recientes"
      rows={data}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      columns={columns}
    />
  );
};
