import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import type { LedgerPayment, Payable } from '@/shared/contracts';
import { usePayables, useSuppliers } from '@/shared/api/queries';
import { usePayPayable } from '@/shared/api/ledger';
import { ScreenTemplate, EmptyState, ErrorState, LoadingState } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useNotify } from '@/app/providers/ToastProvider';
import { PaymentDialog } from './PaymentDialog';
import {
  balanceOf, daysUntilDue, payableStatus, shortDate, statusLabels, totalsOf, weekEnd, weekStart, LEDGER_REFERENCE_DATE,
  type PayableStatus,
} from './ledger';
import './ledger.css';

type ViewFilter = 'abiertas' | 'pagadas';

type Row = Payable & {
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
  const thisWeek = weekStart(LEDGER_REFERENCE_DATE);
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
  // PROPUESTA: no existe `payables.pay`; el pago sigue al permiso de ver cuentas por pagar y el servidor decide (403).
  const canPay = can('payables.view');
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

  const tableFor = (list: Row[]) => (
    <div className="ledger__table">
      <DataTable value={list} stripedRows size="small" dataKey="id" aria-label="Cuentas por pagar">
        <Column field="supplierName" header="Proveedor" sortable />
        <Column field="issued" header="Emisión" sortable />
        <Column field="due" header="Vence" sortable />
        <Column field="amount" header="Valor" sortable body={(r: Row) => <span className="ledger__num">{formatMoney(r.amount)}</span>} />
        <Column field="paid" header="Pagado" sortable body={(r: Row) => <span className="ledger__num">{formatMoney(r.paid)}</span>} />
        <Column field="balance" header="Saldo" sortable body={(r: Row) => <span className="ledger__num">{formatMoney(r.balance)}</span>} />
        <Column
          field="status" header="Estado" sortable
          body={(r: Row) => (
            <span className={`ledger__tag ledger__tag--${r.status}`}>
              {statusLabels[r.status]}
              {r.status === 'proxima' ? ` · ${r.daysLeft} d` : r.status === 'vencida' ? ` · ${-r.daysLeft} d` : ''}
            </span>
          )}
        />
        <Column
          header="Acción"
          body={(r: Row) => (r.balance > 0 && canPay ? (
            <Button
              label="Pagar" icon="pi pi-dollar" size="small" className="ledger__btn"
              aria-label={`Pagar a ${r.supplierName}, saldo ${formatMoney(r.balance)}`}
              onClick={() => openPay(r)}
            />
          ) : null)}
        />
      </DataTable>
    </div>
  );

  const loadError = payables.error ?? suppliers.error;
  let content;
  if (payables.isLoading || suppliers.isLoading) content = <LoadingState />;
  else if (loadError) {
    content = <ErrorState error={loadError} onRetry={() => { void payables.refetch(); void suppliers.refetch(); }} />;
  } else if (allRows.length === 0) content = <EmptyState message="No hay cuentas por pagar. Se generan al recibir compras." />;
  else {
    content = (
      <>
        <div className="ledger__filters">
          <div>
            <label htmlFor="pay-search">Buscar proveedor</label>
            <InputText id="pay-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre del proveedor…" />
          </div>
          <div>
            <label htmlFor="pay-view">Mostrar</label>
            <select id="pay-view" className="p-inputtext" value={view} onChange={(e) => setView(e.target.value as ViewFilter)}>
              <option value="abiertas">Abiertas (con saldo)</option>
              <option value="pagadas">Pagadas</option>
            </select>
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState message="Ninguna cuenta coincide con el filtro." />
        ) : view === 'pagadas' ? (
          tableFor(rows)
        ) : (
          groups.map((g) => (
            <section key={g.key} className={`ledger__group${g.urgent ? ' ledger__group--soon' : ''}`} aria-label={g.title}>
              <div className="ledger__group-head">
                <h2>{g.title}</h2>
                <span className="ledger__note">{g.subtitle} · {g.rows.length} factura(s) · <strong>{formatMoney(g.total)}</strong></span>
              </div>
              {tableFor(g.rows)}
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
        <div className="ledger__summary">
          <div className="ledger__stat">
            <div className="ledger__stat-label">Total por pagar</div>
            <div className="ledger__stat-value" data-testid="payables-total">{formatMoney(totals.balance)}</div>
          </div>
          <div className={`ledger__stat${totals.overdue > 0 ? ' ledger__stat--alert' : ''}`}>
            <div className="ledger__stat-label">Vencido</div>
            <div className="ledger__stat-value" data-testid="payables-overdue">{formatMoney(totals.overdue)}</div>
          </div>
          <div className="ledger__stat">
            <div className="ledger__stat-label">Vence en 7 días</div>
            <div className="ledger__stat-value" data-testid="payables-soon">{formatMoney(totals.dueSoon)}</div>
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
