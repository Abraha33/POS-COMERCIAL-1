import type { Customer } from '@/shared/contracts';
import { useCustomers } from '@/shared/api/queries';
import { DataTablePage, type ColumnDef } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';

const columns: ColumnDef<Customer>[] = [
  { field: 'name', header: 'Nombre' },
  { field: 'taxId', header: 'NIT / CC' },
  { field: 'phone', header: 'Teléfono' },
  { field: 'creditLimit', header: 'Cupo', body: (c) => formatMoney(c.creditLimit) },
];

/** Pantalla ancla de Clientes (agente 4). */
export const CustomersPage = () => {
  const { data, isLoading, error, refetch } = useCustomers();
  return (
    <DataTablePage
      title="Clientes"
      rows={data}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      columns={columns}
      searchPlaceholder="Buscar cliente…"
    />
  );
};
