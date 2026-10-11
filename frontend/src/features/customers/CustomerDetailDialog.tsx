import { Dialog } from 'primereact/dialog';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import type { Customer, Receivable } from '@/shared/contracts';
import { useSales } from '@/shared/api/queries';
import { KpiCard } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { ReceivableStatusTag } from './ReceivableStatusTag';
import { useCompact } from './useCompact';
import { accountOf, balanceOf, daysPastDue, receivableStatus } from './ledger';

type Props = {
  customer: Customer | null;
  receivables: Receivable[];
  onHide: () => void;
};

/** Ficha del cliente: datos, cupo disponible y estado de cuenta (facturas a crédito, más antigua primero: BR-CLI-05). */
export const CustomerDetailDialog = ({ customer, receivables, onHide }: Props) => {
  const sales = useSales();
  const compact = useCompact();
  const numberOf = (saleId: string | null) =>
    (saleId ? sales.data?.find((s) => s.id === saleId)?.number : undefined) ?? saleId ?? '—';

  const sorted = [...receivables].sort((a, b) => a.due.localeCompare(b.due));
  const account = accountOf(receivables);
  const available = customer ? Math.max(0, customer.creditLimit - account.balance) : 0;
  const statusOf = (r: Receivable) => (
    <ReceivableStatusTag status={receivableStatus(r)} lateDays={daysPastDue(r.due)} />
  );

  return (
    <Dialog
      header={customer ? `Ficha de ${customer.name}` : 'Cliente'}
      visible={customer !== null}
      onHide={onHide}
      style={{ width: 'min(52rem, 96vw)' }}
      modal
    >
      {customer ? (
        <div className="ledger">
          <dl className="ledger__fields">
            <div><dt className="ledger__note">Documento</dt><dd>{customer.documentType} {customer.taxId}</dd></div>
            <div><dt className="ledger__note">Responsabilidad tributaria</dt><dd>{customer.taxResponsibility}</dd></div>
            <div><dt className="ledger__note">Teléfono</dt><dd>{customer.phone ?? '—'}</dd></div>
            <div><dt className="ledger__note">Correo</dt><dd>{customer.email ?? '—'}</dd></div>
          </dl>
          <div className="ledger__kpis">
            <KpiCard label="Cupo" icon="pi pi-credit-card" value={<span className="app-money">{formatMoney(customer.creditLimit)}</span>} />
            <KpiCard
              label="Saldo pendiente" icon="pi pi-wallet"
              value={<span className="app-money" data-testid="customer-balance">{formatMoney(account.balance)}</span>}
            />
            <KpiCard label="Cupo disponible" icon="pi pi-check-circle" value={<span className="app-money">{formatMoney(available)}</span>} />
            <KpiCard
              label="Mora (fuera de gracia)" icon="pi pi-exclamation-triangle"
              value={<span className="app-money" data-testid="customer-overdue">{formatMoney(account.overdue)}</span>}
            />
          </div>
          {account.overdueCount > 0 ? (
            <p className="app-dialog__error" role="status">
              Cliente bloqueado para nuevo crédito: {account.overdueCount} factura(s) vencida(s) fuera del periodo de gracia (BR-CLI-06).
            </p>
          ) : null}
          <h2 className="m-0 text-lg">Estado de cuenta</h2>
          {sorted.length === 0 ? (
            <p className="m-0 ledger__note" data-testid="empty-state">Este cliente no tiene cuentas por cobrar.</p>
          ) : compact ? (
            <ul className="ledger__cards" aria-label="Estado de cuenta">
              {sorted.map((r) => (
                <li key={r.id} className="ledger__card">
                  <div className="ledger__card-head">
                    <p className="ledger__card-title">Factura {numberOf(r.saleId)}</p>
                    {statusOf(r)}
                  </div>
                  <dl className="ledger__card-meta">
                    <div><dt>Emisión</dt><dd>{r.issued}</dd></div>
                    <div><dt>Vence</dt><dd>{r.due}</dd></div>
                    <div><dt>Valor</dt><dd>{formatMoney(r.amount)}</dd></div>
                    <div><dt>Pagado</dt><dd>{formatMoney(r.paid)}</dd></div>
                    <div><dt>Saldo</dt><dd><strong>{formatMoney(balanceOf(r))}</strong></dd></div>
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <div className="app-table-scroll">
              <DataTable value={sorted} size="small" dataKey="id" stripedRows aria-label="Estado de cuenta">
                <Column header="Factura" body={(r: Receivable) => numberOf(r.saleId)} />
                <Column field="issued" header="Emisión" />
                <Column field="due" header="Vence" />
                <Column header="Valor" body={(r: Receivable) => <span className="ledger__num">{formatMoney(r.amount)}</span>} />
                <Column header="Pagado" body={(r: Receivable) => <span className="ledger__num">{formatMoney(r.paid)}</span>} />
                <Column header="Saldo" body={(r: Receivable) => <span className="ledger__num">{formatMoney(balanceOf(r))}</span>} />
                <Column header="Estado" body={statusOf} />
              </DataTable>
            </div>
          )}
          <p className="ledger__note">Los abonos se registran en Cuentas por cobrar y aplican a la factura indicada.</p>
        </div>
      ) : null}
    </Dialog>
  );
};
