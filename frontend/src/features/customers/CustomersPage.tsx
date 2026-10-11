import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import type { Customer, Receivable } from '@/shared/contracts';
import { useCustomers, useReceivables } from '@/shared/api/queries';
import {
  EmptyState, ErrorState, KpiCard, LoadingState, ScreenTemplate, SegmentedTabs, StatusTag,
} from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { Can } from '@/app/guards/RouteGuard';
import { useSession } from '@/app/providers/SessionProvider';
import { CustomerFormDialog } from './CustomerFormDialog';
import { CustomerDetailDialog } from './CustomerDetailDialog';
import { useCompact } from './useCompact';
import { accountOf } from './ledger';
import './ledger.css';

type ActiveFilter = 'todos' | 'activos' | 'inactivos';

type CustomerRow = Customer & {
  document: string;
  balance: number;
  overdue: number;
};

const buildRows = (customers: Customer[], receivables: Receivable[]): CustomerRow[] =>
  customers.map((c) => {
    const account = accountOf(receivables.filter((r) => r.customerId === c.id));
    return { ...c, document: `${c.documentType} ${c.taxId}`, balance: account.balance, overdue: account.overdue };
  });

const ActiveTag = ({ active }: { active: boolean }) => <StatusTag status={active ? 'active' : 'inactive'} />;

const OverdueCell = ({ value }: { value: number }) => (value > 0
  ? <StatusTag status="overdue" label={formatMoney(value)} />
  : <span className="ledger__num">—</span>);

/** Clientes: lista con saldo pendiente y mora (BR-CLI-06), alta/edición y ficha con estado de cuenta. */
export const CustomersPage = () => {
  const customers = useCustomers();
  const receivables = useReceivables();
  const { can } = useSession();
  const compact = useCompact();
  const [filter, setFilter] = useState<ActiveFilter>('activos');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const all = useMemo(() => buildRows(customers.data ?? [], receivables.data ?? []), [customers.data, receivables.data]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((r) => {
      if (filter === 'activos' && !r.active) return false;
      if (filter === 'inactivos' && r.active) return false;
      return term === '' || r.name.toLowerCase().includes(term) || r.document.toLowerCase().includes(term);
    });
  }, [all, filter, search]);

  const activeRows = all.filter((r) => r.active);
  const totalBalance = activeRows.reduce((sum, r) => sum + r.balance, 0);
  const totalOverdue = activeRows.reduce((sum, r) => sum + r.overdue, 0);
  const withOverdue = activeRows.filter((r) => r.overdue > 0).length;

  const detailCustomer = customers.data?.find((c) => c.id === detailId) ?? null;
  const canEdit = can('customers.edit');

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (customer: Customer) => { setEditing(customer); setFormOpen(true); };

  const actions = (c: CustomerRow) => (
    <span className="flex gap-1">
      <Button
        icon="pi pi-eye" label={compact ? 'Estado de cuenta' : undefined} text={!compact} outlined={compact}
        rounded={!compact} className="ledger__btn" aria-label={`Estado de cuenta de ${c.name}`} onClick={() => setDetailId(c.id)}
      />
      {canEdit ? (
        <Button
          icon="pi pi-pencil" label={compact ? 'Editar' : undefined} text={!compact} outlined={compact}
          rounded={!compact} className="ledger__btn" aria-label={`Editar ${c.name}`} onClick={() => openEdit(c)}
        />
      ) : null}
    </span>
  );

  const nameLink = (c: CustomerRow) => (
    <button type="button" className="p-link ledger__link" onClick={() => setDetailId(c.id)}>{c.name}</button>
  );

  const table = (
    <div className="app-table-scroll">
      <DataTable value={rows} paginator rows={10} stripedRows size="small" dataKey="id" aria-label="Clientes">
        <Column field="name" header="Nombre" sortable body={nameLink} />
        <Column field="document" header="Documento" sortable />
        <Column field="taxResponsibility" header="Resp. tributaria" sortable />
        <Column field="creditLimit" header="Cupo" sortable body={(c: CustomerRow) => <span className="ledger__num">{formatMoney(c.creditLimit)}</span>} />
        <Column field="balance" header="Saldo pendiente" sortable body={(c: CustomerRow) => <span className="ledger__num">{formatMoney(c.balance)}</span>} />
        <Column field="overdue" header="Mora" sortable body={(c: CustomerRow) => <OverdueCell value={c.overdue} />} />
        <Column field="active" header="Estado" sortable body={(c: CustomerRow) => <ActiveTag active={c.active} />} />
        <Column header="Acciones" body={actions} />
      </DataTable>
    </div>
  );

  const cards = (
    <ul className="ledger__cards" aria-label="Clientes">
      {rows.map((c) => (
        <li key={c.id} className="ledger__card">
          <div className="ledger__card-head">
            <p className="ledger__card-title">{nameLink(c)}</p>
            <ActiveTag active={c.active} />
          </div>
          <dl className="ledger__card-meta">
            <div><dt>Documento</dt><dd>{c.document}</dd></div>
            <div><dt>Cupo</dt><dd>{formatMoney(c.creditLimit)}</dd></div>
            <div><dt>Saldo pendiente</dt><dd><strong>{formatMoney(c.balance)}</strong></dd></div>
            <div><dt>Mora</dt><dd><OverdueCell value={c.overdue} /></dd></div>
          </dl>
          <div className="ledger__card-actions">{actions(c)}</div>
        </li>
      ))}
    </ul>
  );

  const loadError = customers.error ?? receivables.error;
  let content;
  if (customers.isLoading || receivables.isLoading) content = <LoadingState />;
  else if (loadError) {
    content = <ErrorState error={loadError} onRetry={() => { void customers.refetch(); void receivables.refetch(); }} />;
  } else if (all.length === 0) content = <EmptyState message="No hay clientes con este filtro. Crea uno con «Nuevo cliente»." />;
  else {
    content = (
      <>
        <div className="ledger__toolbar">
          <span className="p-input-icon-left ledger__search">
            <i className="pi pi-search" aria-hidden="true" />
            <InputText
              aria-label="Buscar cliente" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o documento…"
            />
          </span>
          <SegmentedTabs
            ariaLabel="Filtrar clientes por estado"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'activos', label: 'Activos', count: activeRows.length },
              { value: 'inactivos', label: 'Inactivos', count: all.length - activeRows.length },
              { value: 'todos', label: 'Todos', count: all.length },
            ]}
          />
        </div>
        {rows.length === 0
          ? <EmptyState message="No hay clientes con este filtro. Crea uno con «Nuevo cliente»." />
          : compact ? cards : table}
      </>
    );
  }

  return (
    <ScreenTemplate
      title="Clientes"
      subtitle="Saldo pendiente y mora al 11/10/2026 · 30 días de plazo y 3 de gracia (BR-CLI-06)"
      actions={
        <Can permission="customers.view">
          <Button label="Nuevo cliente" icon="pi pi-plus" className="ledger__btn" onClick={openNew} />
        </Can>
      }
    >
      <div className="ledger">
        <div className="ledger__kpis">
          <KpiCard label="Clientes activos" icon="pi pi-users" value={<span className="app-money">{activeRows.length}</span>} />
          <KpiCard
            label="Saldo por cobrar" icon="pi pi-wallet"
            value={<span className="app-money" data-testid="customers-balance">{formatMoney(totalBalance)}</span>}
          />
          <KpiCard
            label="En mora" icon="pi pi-exclamation-triangle"
            value={<span className="app-money" data-testid="customers-overdue">{formatMoney(totalOverdue)}</span>}
            hint={withOverdue > 0 ? `${withOverdue} cliente(s)` : undefined}
          />
        </div>
        {content}
      </div>
      <CustomerFormDialog visible={formOpen} customer={editing} onHide={() => setFormOpen(false)} />
      <CustomerDetailDialog
        customer={detailCustomer}
        receivables={(receivables.data ?? []).filter((r) => r.customerId === detailId)}
        onHide={() => setDetailId(null)}
      />
    </ScreenTemplate>
  );
};
