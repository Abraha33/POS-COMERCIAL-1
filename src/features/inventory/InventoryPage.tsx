import type { StockLevel } from '@/shared/contracts';
import { useStockLevels } from '@/shared/api/queries';
import { DataTablePage, type ColumnDef } from '@/shared/ui';

const columns: ColumnDef<StockLevel & { id: string }>[] = [
  { field: 'productId', header: 'Producto' },
  { field: 'branchId', header: 'Sede' },
  { field: 'onHand', header: 'Existencias' },
  { field: 'minimum', header: 'Mínimo' },
];

/** Pantalla ancla de Inventarios (agente 2). */
export const InventoryPage = () => {
  const { data, isLoading, error, refetch } = useStockLevels();
  const rows = data?.map((level) => ({ ...level, id: `${level.productId}:${level.branchId}` }));
  return (
    <DataTablePage
      title="Inventarios"
      subtitle="Existencias por sede"
      rows={rows}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      columns={columns}
    />
  );
};
