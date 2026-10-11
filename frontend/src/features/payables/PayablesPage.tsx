import { today as clockToday } from '@/shared/utils/clock';
import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import type { LedgerPayment, Payable } from '@/shared/contracts';
import { usePayables, useSuppliers } from '@/shared/api/queries';
import { usePayPayable } from '@/shared/api/ledger';
import { EmptyState, ErrorState, KpiCard, LoadingState, ScreenTemplate, SegmentedTabs } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useNotify } from '@/app/providers/ToastProvider';
import { PaymentDialog } from './PaymentDialog';
import { PayableStatusTag } from './PayableStatusTag';
import { useCompact } from './useCompact';
import {
  balanceOf, daysUntilDue, payableStatus, shortDate, totalsOf, weekEnd, weekStart,
  type PayableStatus,
} from './ledger';
import './ledger.css';

type ViewFilter = 'abiertas' | 'pagadas';

type Row = Omit<Payable, 'status' | 'balance'> & {
  supplierName: string;
  balance: number;
  status: PayableStatus;
  daysLeft: number;
};

type Group = { key: string; title: string; subtitle: string; urgent: boolean; rows: Row[]; total: number };

const OVERDUE_KEY = 'vencidas';

/** Agrupa por semana de vencimiento (lunes a domingo); las ya vencidas van primero en su propio grupo. */
const groupByWeek = (rows: Row[]): Group[] => {
  const groups = new Map<string, Group>();
  const thisWeek = weekStart(clockToday());
  for (const row of rows) {
    const overdue = row.status === 'vencida';
    const start = weekStart(row.due);
    const key = overdue ? OVERDUE_KEY : start;
    let group = groups.get(key);
    if (!group) {
      group = overdue
        ? { key, title: 'Vencidas', subtitle: 'Fecha de vencimiento ya pasada', urgent: true, rows: [], total: 0 }
        : {
            key,
            title: start === thisWeek ? 'Esta semana' : `Semana del ${shortDate(start)}`,
            subtitle: `${shortDate(start)} al ${shortDate(weekEnd(start))}`,
            urgent: start === thisWeek,
            rows: [],
            total: 0,
          };
      groups.set(key, group);
    }
    group.rows.push(row);
    group.total += row.balance;
  }
  return [...groups.values()].sort((a, b) =>
    a.key === OVERDUE_KEY ? -1 : b.key === OVERDUE_KEY ? 1 : a.key.localeCompare(b.key));
};

/** Cuentas por pagar: programación por semana de vencimiento y pagos que aplican a la factura indicada (BR-CAR-01). */
export const PayablesPage = () => {
  const payables = usePayables();
  const suppliers = useSuppliers();
  const pay = usePayPayable();
  const notify = useNotify();
  const { can } = useSession();
  const compact = useCompact();
  const [view, setView] = useState<ViewFilter>('abiertas');
  const [search, setSearch] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const allRows = useMemo<Row[]>(() => {
    const names = new Map((suppliers.data ?? []).map((s) => [s.id, s.name]));
    return [...(payables.data ?? [])]
      .sort((a, b) => a.due.localeCompare(b.due))
      .map((p) => ({
        ...p,
        supplierName: names.get(p.supplierId) ?? p.supplierId,
        balance: balanceOf(p),
        status: payableStatus(p),
        daysLeft: daysUntilDue(p.due),
      }));
  }, [payables.data, suppliers.data]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if ((view === 'abiertas') === (r.status === 'pagada')) return false;
      return term === '' || r.supplierName.toLowerCase().includes(term);
    });
  }, [allRows, view, search]);

  const groups = useMemo(() => (view === 'abiertas' ? groupByWeek(rows) : []), [rows, view]);
  const totals = totalsOf(payables.data ?? []);
  const canPay = can('payables.pay');
  const target = allRows.find((r) => r.id === targetId) ?? null;

  const openPay = (row: Row) => { setPayError(null); setTargetId(row.id); };

  const submitPay = (input: LedgerPayment) => {
    if (!target) return;
    pay.mutate(
      { payableId: target.id, input },
      {
        onSuccess: () => {
          notify({ severity: 'success', summary: 'Pago registrado', detail: `${target.supplierName}: ${formatMoney(input.amount)}` });
          setTargetId(null);
        },
        onError: (e) => {
          const balance = e.details?.balance;
          if (e.code === 'PAYMENT_EXCEEDS_BALANCE') {
            setPayError(
              typeof balance === 'number'
                ? `El pago supera el saldo actual (${formatMoney(balance)}). Revisa el valor.`
                : 'El pago supera el saldo de la factura.',
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
      label="Pagar" icon="pi pi-dollar" className="ledger__btn"
      aria-label={`Pagar a ${r.supplierName}, saldo ${formatMoney(r.balance)}`}
      onClick={() => openPay(r)}
    />
  ) : null);

  const tableFor = (list: Row[]) => (
    <div className="app-table-scroll">
      <DataTable value={list} stripedRows size="small" dataKey="id" aria-label="Cuentas por pagar">
        <Column field="supplierName" header="Proveedor" sortable />
        <Column field="issued" header="Emisión" sortable />
        <Column field="due" header="Vence" sortable />
        <Column field="amount" header="Valor" sortable body={(r: Row) => <span className="ledger__num">{formatMoney(r.amount)}</span>} />
        <Column field="paid" header="Pagado" sortable body={(r: Row) => <span className="ledger__num">{formatMoney(r.paid)}</span>} />
        <Column field="balance" header="Saldo" sortable body={(r: Row) => <span className="ledger__num">{formatMoney(r.balance)}</span>} />
        <Column field="status" header="Estado" sortable body={(r: Row) => <PayableStatusTag status={r.status} daysLeft={r.daysLeft} />} />
        <Column header="Acción" body={payButton} />
      </DataTable>
    </div>
  );

  const cardsFor = (list: Row[]) => (
    <ul className="ledger__cards" aria-label="Cuentas por pagar">
      {list.map((r) => (
        <li key={r.id} className="ledger__card">
          <div className="ledger__card-head">
            <p className="ledger__card-title">{r.supplierName}</p>
            <PayableStatusTag status={r.status} daysLeft={r.daysLeft} />
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

  const listFor = (list: Row[]) => (compact ? cardsFor(list) : tableFor(list));

  const loadError = payables.error ?? suppliers.error;
  let content;
  if (payables.isLoading || suppliers.isLoading) content = <LoadingState />;
  else if (loadError) {
    content = <ErrorState error={loadError} onRetry={() => { void payables.refetch(); void suppliers.refetch(); }} />;
  } else if (allRows.length === 0) content = <EmptyState message="No hay cuentas por pagar. Se generan al recibir compras." />;
  else {
    content = (
      <>
        <div className="ledger__toolbar">
          <span className="p-input-icon-left ledger__search">
            <i className="pi pi-search" aria-hidden="true" />
            <InputText
              id="pay-search" aria-label="Buscar proveedor" value={search}
              onChange={(e) => setSearch(e.target.value)} placeholder="Buscar proveedor…"
            />
          </span>
          <SegmentedTabs
            ariaLabel="Mostrar cuentas"
            value={view}
            onChange={setView}
            options={[
              { value: 'abiertas', label: 'Abiertas', count: allRows.filter((r) => r.status !== 'pagada').length },
              { value: 'pagadas', label: 'Pagadas', count: allRows.filter((r) => r.status === 'pagada').length },
            ]}
          />
        </div>
        {rows.length === 0 ? (
          <EmptyState message="Ninguna cuenta coincide con el filtro." />
        ) : view === 'pagadas' ? (
          listFor(rows)
        ) : (
          groups.map((g) => (
            <section key={g.key} className={`ledger__group${g.urgent ? ' ledger__group--soon' : ''}`} aria-label={g.title}>
              <div className="ledger__group-head">
                <h2>{g.title}</h2>
                <span className="ledger__note">{g.subtitle} · {g.rows.length} factura(s) · <strong>{formatMoney(g.total)}</strong></span>
              </div>
              {listFor(g.rows)}
            </section>
          ))
        )}
      </>
    );
  }

  return (
    <ScreenTemplate
      title="Cuentas por pagar"
      subtitle="Programación por semana de vencimiento. Los pagos se aplican a la factura indicada (BR-CAR-01)."
    >
      <div className="ledger">
        <div className="ledger__kpis">
          <KpiCard
            label="Total por pagar" icon="pi pi-wallet"
            value={<span className="app-money" data-testid="payables-total">{formatMoney(totals.balance)}</span>}
          />
          <KpiCard
            label="Vencido" icon="pi pi-exclamation-triangle"
            value={<span className="app-money" data-testid="payables-overdue">{formatMoney(totals.overdue)}</span>}
          />
          <KpiCard
            label="Vence en 7 días" icon="pi pi-calendar" proposal
            value={<span className="app-money" data-testid="payables-soon">{formatMoney(totals.dueSoon)}</span>}
          />
          <KpiCard label="Facturas abiertas" icon="pi pi-file" value={<span className="app-money">{totals.openCount}</span>} />
        </div>
        {content}
      </div>
      <PaymentDialog
        visible={target !== null}
        header="Pagar a proveedor"
        party={target?.supplierName ?? ''}
        reference={target ? `Vence ${target.due}` : ''}
        balance={target?.balance ?? 0}
        actionLabel="Registrar pago"
        saving={pay.isPending}
        error={payError}
        onSubmit={submitPay}
        onHide={() => setTargetId(null)}
      />
    </ScreenTemplate>
  );
};
