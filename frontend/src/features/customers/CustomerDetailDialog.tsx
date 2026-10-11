import { Dialog } from 'primereact/dialog';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import type { Customer, Receivable } from '@/shared/contracts';
import { useSales } from '@/shared/api/queries';
import { formatMoney } from '@/shared/utils/format';
import { accountOf, balanceOf, receivableStatus, statusLabels } from './ledger';

type Props = {
  customer: Customer | null;
  receivables: Receivable[];
  onHide: () => void;
};

/** Ficha del cliente: datos, cupo disponible y estado de cuenta (facturas a crédito, más antigua primero: BR-CLI-05). */
export const CustomerDetailDialog = ({ customer, receivables, onHide }: Props) => {
  const sales = useSales();
  const numberOf = (saleId: string | null) =>
    (saleId ? sales.data?.find((s) => s.id === saleId)?.number : undefined) ?? saleId ?? '—';

  const sorted = [...receivables].sort((a, b) => a.due.localeCompare(b.due));
  const account = accountOf(receivables);
  const available = customer ? Math.max(0, customer.creditLimit - account.balance) : 0;

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
          <dl className="ledger__fields m-0">
            <div><dt className="ledger__note">Documento</dt><dd className="m-0">{customer.documentType} {customer.taxId}</dd></div>
            <div><dt className="ledger__note">Responsabilidad tributaria</dt><dd className="m-0">{customer.taxResponsibility}</dd></div>
            <div><dt className="ledger__note">Teléfono</dt><dd className="m-0">{customer.phone ?? '—'}</dd></div>
            <div><dt className="ledger__note">Correo</dt><dd className="m-0">{customer.email ?? '—'}</dd></div>
          </dl>
          <div className="ledger__summary">
            <div className="ledger__stat">
              <div className="ledger__stat-label">Cupo</div>
              <div className="ledger__stat-value">{formatMoney(customer.creditLimit)}</div>
            </div>
            <div className="ledger__stat">
              <div className="ledger__stat-label">Saldo pendiente</div>
              <div className="ledger__stat-value" data-testid="customer-balance">{formatMoney(account.balance)}</div>
            </div>
            <div className="ledger__stat">
              <div className="ledger__stat-label">Cupo disponible</div>
              <div className="ledger__stat-value">{formatMoney(available)}</div>
            </div>
            <div className={`ledger__stat${account.overdue > 0 ? ' ledger__stat--alert' : ''}`}>
              <div className="ledger__stat-label">Mora (fuera de gracia)</div>
              <div className="ledger__stat-value" data-testid="customer-overdue">{formatMoney(account.overdue)}</div>
            </div>
          </div>
          {account.overdueCount > 0 ? (
            <p className="m-0" role="status">
              Cliente bloqueado para nuevo crédito: {account.overdueCount} factura(s) vencida(s) fuera del periodo de gracia (BR-CLI-06).
            </p>
          ) : null}
          <h2 className="m-0 text-lg">Estado de cuenta</h2>
          {sorted.length === 0 ? (
            <p className="m-0 ledger__note" data-testid="empty-state">Este cliente no tiene cuentas por cobrar.</p>
          ) : (
            <div className="ledger__table">
              <DataTable value={sorted} size="small" dataKey="id" stripedRows>
                <Column header="Factura" body={(r: Receivable) => numberOf(r.saleId)} />
                <Column field="issued" header="Emisión" />
                <Column field="due" header="Vence" />
                <Column header="Valor" body={(r: Receivable) => <span className="ledger__num">{formatMoney(r.amount)}</span>} />
                <Column header="Pagado" body={(r: Receivable) => <span className="ledger__num">{formatMoney(r.paid)}</span>} />
                <Column header="Saldo" body={(r: Receivable) => <span className="ledger__num">{formatMoney(balanceOf(r))}</span>} />
                <Column
                  header="Estado"
                  body={(r: Receivable) => {
                    const status = receivableStatus(r);
                    return <span className={`ledger__tag ledger__tag--${status}`}>{statusLabels[status]}</span>;
                  }}
                />
              </DataTable>
            </div>
          )}
          <p className="ledger__note">Los abonos se registran en Cuentas por cobrar y aplican a la factura indicada.</p>
        </div>
      ) : null}
    </Dialog>
  );
};
