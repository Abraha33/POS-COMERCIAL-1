import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import type { LedgerPayment, Receivable } from '@/shared/contracts';
import { useCustomers, useReceivables } from '@/shared/api/queries';
import { usePayReceivable } from '@/shared/api/ledger';
import { ScreenTemplate, EmptyState, ErrorState, LoadingState } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useNotify } from '@/app/providers/ToastProvider';
import { PaymentDialog } from './PaymentDialog';
import { accountOf, balanceOf, daysPastDue, receivableStatus, statusLabels, type ReceivableStatus } from './ledger';
import './ledger.css';

type StatusFilter = 'abiertas' | 'todas' | ReceivableStatus;

type Row = Omit<Receivable, 'status' | 'balance'> & {
  customerName: string;
  balance: number;
  status: ReceivableStatus;
  lateDays: number;
};

/** Cuentas por cobrar: saldo, vencimiento y abonos que aplican a la factura indicada (BR-CAR-01, BR-CLI-05). */
export const ReceivablesPage = () => {
  const receivables = useReceivables();
  const customers = useCustomers();
  const pay = usePayReceivable();
  const notify = useNotify();
  const { can } = useSession();
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

  const loadError = receivables.error ?? customers.error;
  let content;
  if (receivables.isLoading || customers.isLoading) content = <LoadingState />;
  else if (loadError) {
    content = <ErrorState error={loadError} onRetry={() => { void receivables.refetch(); void customers.refetch(); }} />;
  } else if (allRows.length === 0) content = <EmptyState message="No hay cuentas por cobrar. Se generan con ventas a crédito." />;
  else {
    content = (
      <>
        <div className="ledger__filters">
          <div>
            <label htmlFor="rec-search">Buscar cliente</label>
            <InputText id="rec-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre del cliente…" />
          </div>
          <div>
            <label htmlFor="rec-status">Estado</label>
            <select id="rec-status" className="p-inputtext" value={filter} onChange={(e) => setFilter(e.target.value as StatusFilter)}>
              <option value="abiertas">Abiertas (con saldo)</option>
              <option value="todas">Todas</option>
              <option value="vigente">Vigentes</option>
              <option value="en-gracia">En gracia</option>
              <option value="vencida">Vencidas</option>
              <option value="pagada">Pagadas</option>
            </select>
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState message="Ninguna cuenta coincide con el filtro." />
        ) : (
          <div className="ledger__table">
            <DataTable value={rows} paginator rows={10} stripedRows size="small" dataKey="id">
              <Column field="customerName" header="Cliente" sortable />
              <Column field="issued" header="Emisión" sortable />
              <Column field="due" header="Vence" sortable />
              <Column field="amount" header="Valor" sortable body={(r: Row) => <span className="ledger__num">{formatMoney(r.amount)}</span>} />
              <Column field="paid" header="Pagado" sortable body={(r: Row) => <span className="ledger__num">{formatMoney(r.paid)}</span>} />
              <Column field="balance" header="Saldo" sortable body={(r: Row) => <span className="ledger__num">{formatMoney(r.balance)}</span>} />
              <Column
                field="status" header="Estado" sortable
                body={(r: Row) => (
                  <span className={`ledger__tag ledger__tag--${r.status}`}>
                    {statusLabels[r.status]}{r.status === 'vencida' || r.status === 'en-gracia' ? ` · ${r.lateDays} d` : ''}
                  </span>
                )}
              />
              <Column
                header="Acción"
                body={(r: Row) => (r.balance > 0 && canPay ? (
                  <Button
                    label="Abonar" icon="pi pi-dollar" size="small" className="ledger__btn"
                    aria-label={`Abonar a ${r.customerName}, saldo ${formatMoney(r.balance)}`}
                    onClick={() => openPay(r)}
                  />
                ) : null)}
              />
            </DataTable>
          </div>
        )}
      </>
    );
  }

  return (
    <ScreenTemplate
      title="Cuentas por cobrar"
      subtitle="Ordenadas por vencimiento: las más antiguas primero. Plazo 30 días, 3 de gracia (BR-CLI-05/06)."
    >
      <div className="ledger">
        <div className="ledger__summary">
          <div className="ledger__stat">
            <div className="ledger__stat-label">Total por cobrar</div>
            <div className="ledger__stat-value" data-testid="receivables-total">{formatMoney(totals.balance)}</div>
          </div>
          <div className={`ledger__stat${totals.overdue > 0 ? ' ledger__stat--alert' : ''}`}>
            <div className="ledger__stat-label">Vencido (fuera de gracia)</div>
            <div className="ledger__stat-value" data-testid="receivables-overdue">{formatMoney(totals.overdue)}</div>
          </div>
          <div className="ledger__stat">
            <div className="ledger__stat-label">Facturas abiertas</div>
            <div className="ledger__stat-value">{totals.openCount}</div>
          </div>
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
