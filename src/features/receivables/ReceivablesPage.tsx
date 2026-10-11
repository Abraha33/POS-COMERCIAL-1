import type { Receivable } from '@/shared/contracts';
import { useReceivables } from '@/shared/api/queries';
import { DataTablePage, type ColumnDef } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';

const columns: ColumnDef<Receivable>[] = [
  { field: 'customerId', header: 'Cliente' },
  { field: 'issued', header: 'Emisión' },
  { field: 'due', header: 'Vence' },
  { field: 'amount', header: 'Valor', body: (r) => formatMoney(r.amount) },
  { field: 'paid', header: 'Pagado', body: (r) => formatMoney(r.paid) },
];

/** Pantalla ancla de Cuentas por cobrar (agente 4). */
export const ReceivablesPage = () => {
  const { data, isLoading, error, refetch } = useReceivables();
  return (
    <DataTablePage
      title="Cuentas por cobrar"
      rows={data}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      columns={columns}
    />
  );
};
