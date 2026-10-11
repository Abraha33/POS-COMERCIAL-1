import type { PurchaseOrder } from '@/shared/contracts';
import { usePurchaseOrders } from '@/shared/api/queries';
import { DataTablePage, type ColumnDef } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';

const columns: ColumnDef<PurchaseOrder>[] = [
  { field: 'number', header: 'Número' },
  { field: 'date', header: 'Fecha' },
  { field: 'supplierId', header: 'Proveedor' },
  { field: 'total', header: 'Total', body: (o) => formatMoney(o.total) },
  { field: 'status', header: 'Estado' },
];

/** Pantalla ancla de Compras (agente 3). */
export const PurchasesPage = () => {
  const { data, isLoading, error, refetch } = usePurchaseOrders();
  return (
    <DataTablePage
      title="Compras"
      subtitle="Órdenes de compra"
      rows={data}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      columns={columns}
    />
  );
};
