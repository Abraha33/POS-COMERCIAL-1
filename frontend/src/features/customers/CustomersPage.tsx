import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import type { Customer, Receivable } from '@/shared/contracts';
import { useCustomers, useReceivables } from '@/shared/api/queries';
import { DataTablePage, type ColumnDef } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { Can } from '@/app/guards/RouteGuard';
import { useSession } from '@/app/providers/SessionProvider';
import { CustomerFormDialog } from './CustomerFormDialog';
import { CustomerDetailDialog } from './CustomerDetailDialog';
import { accountOf } from './ledger';
import './ledger.css';

type ActiveFilter = 'todos' | 'activos' | 'inactivos';

type CustomerRow = Customer & {
  document: string;
  balance: number;
  overdue: number;
  statusText: string;
};

const buildRows = (customers: Customer[], receivables: Receivable[]): CustomerRow[] =>
  customers.map((c) => {
    const account = accountOf(receivables.filter((r) => r.customerId === c.id));
    return {
      ...c,
      document: `${c.documentType} ${c.taxId}`,
      balance: account.balance,
      overdue: account.overdue,
      statusText: c.active ? 'Activo' : 'Inactivo',
    };
  });

/** Clientes: lista con saldo pendiente y mora (BR-CLI-06), alta/edición y ficha con estado de cuenta. */
export const CustomersPage = () => {
  const customers = useCustomers();
  const receivables = useReceivables();
  const { can } = useSession();
  const [filter, setFilter] = useState<ActiveFilter>('activos');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const all = buildRows(customers.data ?? [], receivables.data ?? []);
    if (filter === 'activos') return all.filter((r) => r.active);
    if (filter === 'inactivos') return all.filter((r) => !r.active);
    return all;
  }, [customers.data, receivables.data, filter]);

  const detailCustomer = customers.data?.find((c) => c.id === detailId) ?? null;
  // PROPUESTA: no existe `customers.edit`; editar sigue a los roles de cartera (el servidor es la autoridad).
  const canEdit = can('receivables.view');

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (customer: Customer) => { setEditing(customer); setFormOpen(true); };

  const columns: ColumnDef<CustomerRow>[] = [
    {
      field: 'name', header: 'Nombre',
      body: (c) => (
        <button type="button" className="p-link ledger__link" onClick={() => setDetailId(c.id)}>
          {c.name}
        </button>
      ),
    },
    { field: 'document', header: 'Documento' },
    { field: 'taxResponsibility', header: 'Resp. tributaria' },
    { field: 'creditLimit', header: 'Cupo', body: (c) => <span className="ledger__num">{formatMoney(c.creditLimit)}</span> },
    { field: 'balance', header: 'Saldo pendiente', body: (c) => <span className="ledger__num">{formatMoney(c.balance)}</span> },
    {
      field: 'overdue', header: 'Mora',
      body: (c) => (c.overdue > 0
        ? <span className="ledger__tag ledger__tag--vencida">{formatMoney(c.overdue)}</span>
        : <span className="ledger__num">—</span>),
    },
    {
      field: 'statusText', header: 'Estado',
      body: (c) => <span className={`ledger__tag ${c.active ? 'ledger__tag--pagada' : 'ledger__tag--inactivo'}`}>{c.statusText}</span>,
    },
    {
      field: 'id', header: '', sortable: false,
      body: (c) => (
        <span className="flex gap-1">
          <Button icon="pi pi-eye" text rounded className="ledger__btn" aria-label={`Estado de cuenta de ${c.name}`} onClick={() => setDetailId(c.id)} />
          {canEdit ? (
            <Button icon="pi pi-pencil" text rounded className="ledger__btn" aria-label={`Editar ${c.name}`} onClick={() => openEdit(c)} />
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataTablePage
        title="Clientes"
        subtitle="Saldo pendiente y mora al 11/10/2026 · 30 días de plazo y 3 de gracia (BR-CLI-06)"
        actions={
          <>
            <select
              aria-label="Filtrar clientes por estado" className="p-inputtext" style={{ minHeight: 44 }} value={filter}
              onChange={(e) => setFilter(e.target.value as ActiveFilter)}
            >
              <option value="activos">Solo activos</option>
              <option value="inactivos">Solo inactivos</option>
              <option value="todos">Todos</option>
            </select>
            <Can permission="customers.view">
              <Button label="Nuevo cliente" icon="pi pi-plus" className="ledger__btn" onClick={openNew} />
            </Can>
          </>
        }
        rows={rows}
        isLoading={customers.isLoading || receivables.isLoading}
        error={customers.error ?? receivables.error}
        onRetry={() => { void customers.refetch(); void receivables.refetch(); }}
        columns={columns}
        searchPlaceholder="Buscar por nombre o documento…"
        emptyMessage="No hay clientes con este filtro. Crea uno con «Nuevo cliente»."
      />
      <CustomerFormDialog visible={formOpen} customer={editing} onHide={() => setFormOpen(false)} />
      <CustomerDetailDialog
        customer={detailCustomer}
        receivables={(receivables.data ?? []).filter((r) => r.customerId === detailId)}
        onHide={() => setDetailId(null)}
      />
    </>
  );
};
