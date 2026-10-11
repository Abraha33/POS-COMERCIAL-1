import type { Payable } from '@/shared/contracts';
import { usePayables } from '@/shared/api/queries';
import { DataTablePage, type ColumnDef } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';

const columns: ColumnDef<Payable>[] = [
  { field: 'supplierId', header: 'Proveedor' },
  { field: 'issued', header: 'Emisión' },
  { field: 'due', header: 'Vence' },
  { field: 'amount', header: 'Valor', body: (p) => formatMoney(p.amount) },
  { field: 'paid', header: 'Pagado', body: (p) => formatMoney(p.paid) },
];

/** Pantalla ancla de Cuentas por pagar (agente 4). */
export const PayablesPage = () => {
  const { data, isLoading, error, refetch } = usePayables();
  return (
    <DataTablePage
      title="Cuentas por pagar"
      rows={data}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      columns={columns}
    />
  );
};
