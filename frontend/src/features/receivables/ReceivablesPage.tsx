import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import type { LedgerPayment, Receivable } from '@/shared/contracts';
import { useCustomers, useReceivables } from '@/shared/api/queries';
import { usePayReceivable } from '@/shared/api/ledger';
import {
  EmptyState, ErrorState, KpiCard, LoadingState, ScreenTemplate, SegmentedTabs,
} from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useNotify } from '@/app/providers/ToastProvider';
import { PaymentDialog } from './PaymentDialog';
import { ReceivableStatusTag } from './ReceivableStatusTag';
import { useCompact } from './useCompact';
import { accountOf, balanceOf, daysPastDue, receivableStatus, type ReceivableStatus } from './ledger';
import './ledger.css';

type StatusFilter = 'abiertas' | 'todas' | ReceivableStatus;

type Row = Omit<Receivable, 'status' | 'balance'> & {
  customerName: string;
  balance: number;
  status: ReceivableStatus;
  lateDays: number;
};

const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'abiertas', label: 'Abiertas' },
  { value: 'vencida', label: 'Vencidas' },
  { value: 'en-gracia', label: 'En gracia' },
  { value: 'vigente', label: 'Vigentes' },
  { value: 'pagada', label: 'Pagadas' },
  { value: 'todas', label: 'Todas' },
];

/** Cuentas por cobrar: saldo, vencimiento y abonos que aplican a la factura indicada (BR-CAR-01, BR-CLI-05). */
export const ReceivablesPage = () => {
  const receivables = useReceivables();
  const customers = useCustomers();
  const pay = usePayReceivable();
  const notify = useNotify();
  const { can } = useSession();
  const compact = useCompact();
  const [filter, setFilter] = useState<StatusFilter>('abiertas');
  const [search, setSearch] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const allRows = useMemo<Row[]>(() => {
    const names = new Map((customers.data ?? []).map((c) => [c.id, c.name]));
    // Más antigua primero (BR-CLI-05): orden por vencimiento ascendente.
    return [...(receivables.data ?? [])]
      .sort((a, b) => a.due.localeCompare(b.due))
      .map((r) => ({
        ...r,
        customerName: names.get(r.customerId) ?? r.customerId,
        balance: balanceOf(r),
        status: receivableStatus(r),
        lateDays: daysPastDue(r.due),
      }));
  }, [receivables.data, customers.data]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (filter === 'abiertas' && r.status === 'pagada') return false;
      if (filter !== 'abiertas' && filter !== 'todas' && r.status !== filter) return false;
      return term === '' || r.customerName.toLowerCase().includes(term);
    });
  }, [allRows, filter, search]);

  const counts = useMemo(() => {
    const by = (s: ReceivableStatus) => allRows.filter((r) => r.status === s).length;
    return {
      abiertas: allRows.filter((r) => r.status !== 'pagada').length,
      vencida: by('vencida'), 'en-gracia': by('en-gracia'), vigente: by('vigente'), pagada: by('pagada'),
      todas: allRows.length,
    } satisfies Record<StatusFilter, number>;
  }, [allRows]);

  const totals = accountOf(receivables.data ?? []);
  const canPay = can('receivables.pay');
  const target = allRows.find((r) => r.id === targetId) ?? null;

  const openPay = (row: Row) => { setPayError(null); setTargetId(row.id); };

  const submitPay = (input: LedgerPayment) => {
    if (!target) return;
    pay.mutate(
      { receivableId: target.id, input },
      {
        onSuccess: () => {
          notify({ severity: 'success', summary: 'Abono registrado', detail: `${target.customerName}: ${formatMoney(input.amount)}` });
          setTargetId(null);
        },
        onError: (e) => {
          const balance = e.details?.balance;
          if (e.code === 'PAYMENT_EXCEEDS_BALANCE') {
            setPayError(
              typeof balance === 'number'
                ? `El abono supera el saldo actual (${formatMoney(balance)}). Revisa el valor.`
                : 'El abono supera el saldo de la factura.',
            );
            return;
          }
          setPayError(e.message);
        },
      },
    );
  };

  const payButton = (r: Row) => (r.balance > 0 && canPay ? (
    <Button
      label="Abonar" icon="pi pi-dollar" className="ledger__btn"
      aria-label={`Abonar a ${r.customerName}, saldo ${formatMoney(r.balance)}`}
      onClick={() => openPay(r)}
    />
  ) : null);

  const table = (
    <div className="app-table-scroll">
      <DataTable value={rows} paginator rows={10} stripedRows size="small" dataKey="id" aria-label="Cuentas por cobrar">
        <Column field="customerName" header="Cliente" sortable />
        <Column field="issued" header="Emisión" sortable />
        <Column field="due" header="Vence" sortable />
        <Column field="amount" header="Valor" sortable body={(r: Row) => <span className="ledger__num">{formatMoney(r.amount)}</span>} />
        <Column field="paid" header="Pagado" sortable body={(r: Row) => <span className="ledger__num">{formatMoney(r.paid)}</span>} />
        <Column field="balance" header="Saldo" sortable body={(r: Row) => <span className="ledger__num">{formatMoney(r.balance)}</span>} />
        <Column field="status" header="Estado" sortable body={(r: Row) => <ReceivableStatusTag status={r.status} lateDays={r.lateDays} />} />
        <Column header="Acción" body={payButton} />
      </DataTable>
    </div>
  );

  const cards = (
    <ul className="ledger__cards" aria-label="Cuentas por cobrar">
      {rows.map((r) => (
        <li key={r.id} className="ledger__card">
          <div className="ledger__card-head">
            <p className="ledger__card-title">{r.customerName}</p>
            <ReceivableStatusTag status={r.status} lateDays={r.lateDays} />
          </div>
          <dl className="ledger__card-meta">
            <div><dt>Emisión</dt><dd>{r.issued}</dd></div>
            <div><dt>Vence</dt><dd>{r.due}</dd></div>
            <div><dt>Valor</dt><dd>{formatMoney(r.amount)}</dd></div>
            <div><dt>Pagado</dt><dd>{formatMoney(r.paid)}</dd></div>
            <div><dt>Saldo</dt><dd><strong>{formatMoney(r.balance)}</strong></dd></div>
          </dl>
          <div className="ledger__card-actions">{payButton(r)}</div>
        </li>
      ))}
    </ul>
  );

  const loadError = receivables.error ?? customers.error;
  let content;
  if (receivables.isLoading || customers.isLoading) content = <LoadingState />;
  else if (loadError) {
    content = <ErrorState error={loadError} onRetry={() => { void receivables.refetch(); void customers.refetch(); }} />;
  } else if (allRows.length === 0) content = <EmptyState message="No hay cuentas por cobrar. Se generan con ventas a crédito." />;
  else {
    content = (
      <>
        <div className="ledger__toolbar">
          <span className="p-input-icon-left ledger__search">
            <i className="pi pi-search" aria-hidden="true" />
            <InputText
              id="rec-search" aria-label="Buscar cliente" value={search}
              onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente…"
            />
          </span>
          <SegmentedTabs
            ariaLabel="Filtrar por estado"
            value={filter}
            onChange={setFilter}
            options={filterOptions.map((o) => ({ ...o, count: counts[o.value] }))}
          />
        </div>
        {rows.length === 0 ? <EmptyState message="Ninguna cuenta coincide con el filtro." /> : compact ? cards : table}
      </>
    );
  }

  return (
    <ScreenTemplate
      title="Cuentas por cobrar"
      subtitle="Ordenadas por vencimiento: las más antiguas primero. Plazo 30 días, 3 de gracia (BR-CLI-05/06)."
    >
      <div className="ledger">
        <div className="ledger__kpis">
          <KpiCard
            label="Total por cobrar" icon="pi pi-wallet"
            value={<span className="app-money" data-testid="receivables-total">{formatMoney(totals.balance)}</span>}
          />
          <KpiCard
            label="Vencido (fuera de gracia)" icon="pi pi-exclamation-triangle"
            value={<span className="app-money" data-testid="receivables-overdue">{formatMoney(totals.overdue)}</span>}
            hint={totals.overdueCount > 0 ? `${totals.overdueCount} factura(s)` : undefined}
          />
          <KpiCard label="Facturas abiertas" icon="pi pi-file" value={<span className="app-money">{totals.openCount}</span>} />
        </div>
        {content}
      </div>
      <PaymentDialog
        visible={target !== null}
        header="Abonar a cuenta por cobrar"
        party={target?.customerName ?? ''}
        reference={target ? `Vence ${target.due}` : ''}
        balance={target?.balance ?? 0}
        actionLabel="Registrar abono"
        saving={pay.isPending}
        error={payError}
        onSubmit={submitPay}
        onHide={() => setTargetId(null)}
      />
    </ScreenTemplate>
  );
};
