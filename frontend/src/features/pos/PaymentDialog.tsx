import type { ReactNode } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import type { Customer } from '@/shared/contracts';
import { MoneyInput } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { CREDIT_TERMS, suggestCashAmounts, type CreditTerm, type PayMode } from './cart';
import type { CheckoutMessage } from './saleText';

type Props = {
  visible: boolean;
  mode: PayMode;
  total: number;
  roundingAdjustment: number;
  customer: Customer | null;
  /** Efectivo recibido (modo efectivo); null = exacto. */
  received: number | null;
  onReceived: (value: number | null) => void;
  /** Formulario dinámico del canal (transferencia o datáfono) y selector de documento. */
  digital: ReactNode;
  documentSlot: ReactNode;
  creditTerm: CreditTerm;
  onCreditTerm: (value: CreditTerm) => void;
  creditInitial: number;
  onCreditInitial: (value: number) => void;
  mixedSlot: ReactNode;
  paid: number;
  missing: number;
  change: number;
  canConfirm: boolean;
  pending: boolean;
  error: CheckoutMessage | null;
  onDismissError: () => void;
  onConfirm: () => void;
  onHide: () => void;
};

/** Cobro: importes sugeridos y cambio con ajuste al peso (BR-GEN-05, BR-VEN-06/08). El servidor confirma el total. */
export const PaymentDialog = (props: Props) => {
  const {
    visible, mode, total, roundingAdjustment, customer, received, onReceived, digital, documentSlot, creditTerm, onCreditTerm, creditInitial, onCreditInitial, mixedSlot,
    missing, change, canConfirm, pending, error, onDismissError, onConfirm, onHide,
  } = props;

  return (
    <Dialog
      header="Cobrar venta"
      visible={visible}
      onHide={onHide}
      className="pos-dialog"
      style={{ width: 'min(30rem, 95vw)' }}
      modal
    >
      <form
        className="pos-pay"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
        noValidate
      >
        <div className="pos-pay__total">
          <span>Total a pagar</span>
          <strong data-testid="pay-total">{formatMoney(total)}</strong>
        </div>
        {roundingAdjustment !== 0 ? (
          <p className="pos__hint pos-pay__note">
            Ajuste al peso incluido: {formatMoney(roundingAdjustment)} (el efectivo se aproxima a $ 50).
          </p>
        ) : null}

        {documentSlot}

        {error ? (
          <div className="pos-alert" role="alert" data-testid="checkout-error">
            <i className="pi pi-exclamation-triangle" aria-hidden="true" />
            <div>
              <strong>{error.title}</strong>
              <p>{error.detail}</p>
            </div>
            <Button type="button" icon="pi pi-times" text rounded aria-label="Cerrar aviso" onClick={onDismissError} />
          </div>
        ) : null}

        {mode === 'efectivo' ? (
          <section aria-label="Pago en efectivo">
            <label htmlFor="pay-received" className="pos-pay__label">Recibido (COP)</label>
            <MoneyInput
              id="pay-received"
              value={received ?? total}
              onChange={onReceived}
              onEnter={onConfirm}
              autoFocus
              invalid={missing > 0}
            />
            <div className="pos-pay__chips" role="group" aria-label="Importes sugeridos">
              {suggestCashAmounts(total).map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  outlined={(received ?? total) !== amount}
                  label={formatMoney(amount)}
                  aria-pressed={(received ?? total) === amount}
                  onClick={() => onReceived(amount)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {mode === 'tarjeta' || mode === 'transferencia' ? digital : null}

        {mode === 'credito' ? (() => {
          const limit = customer?.creditLimit ?? 0;
          const used = customer?.outstandingBalance ?? 0;
          const initial = Math.min(Math.max(0, creditInitial), total);
          const financed = total - initial;
          const available = limit - used;
          const excess = Math.max(0, financed - available);
          const due = new Date();
          due.setDate(due.getDate() + creditTerm);
          return (
            <section aria-label="Crédito" className="pos-credit">
              <p className="pos-pay__instruction">
                A nombre de <strong>{customer?.name ?? 'cliente'}</strong>. El servidor valida cupo y facturas vencidas.
              </p>
              <dl className="pos-credit__facts">
                <div><dt>Cupo aprobado</dt><dd>{formatMoney(limit)}</dd></div>
                <div><dt>Utilizado</dt><dd>{formatMoney(used)}</dd></div>
                <div><dt>Disponible</dt><dd data-testid="credit-available">{formatMoney(available)}</dd></div>
                <div><dt>A financiar</dt><dd data-testid="credit-financed">{formatMoney(financed)}</dd></div>
              </dl>
              {excess > 0 ? (
                <p className="proof__note" role="alert" data-testid="credit-excess">
                  Excede el cupo en {formatMoney(excess)}. Reduce el saldo con un abono inicial o pide autorización.
                </p>
              ) : null}
              <label htmlFor="credit-initial" className="pos-pay__label">Abono inicial en efectivo (opcional)</label>
              <MoneyInput id="credit-initial" value={initial} onChange={(v) => onCreditInitial(v ?? 0)} />
              <label htmlFor="credit-term" className="pos-pay__label">Plazo</label>
              <select
                id="credit-term" className="p-inputtext w-full" value={creditTerm}
                onChange={(e) => onCreditTerm(Number(e.target.value) as CreditTerm)}
              >
                {CREDIT_TERMS.map((d) => <option key={d} value={d}>{d} días{d === 30 ? ' (aprobado)' : ' (propuesta)'}</option>)}
              </select>
              <p className="pos__hint">Vence el {due.toLocaleDateString('es-CO')}. El saldo pasa a Cuentas por cobrar.</p>
            </section>
          );
        })() : null}

        {mode === 'mixto' ? mixedSlot : null}

        <div className="pos-pay__result" aria-live="polite">
          {missing > 0 ? (
            <div className="pos__missing"><span>Falta</span><strong data-testid="pos-missing">{formatMoney(missing)}</strong></div>
          ) : (
            <div className="pos__change"><span>Cambio a entregar</span><strong data-testid="pos-change">{formatMoney(change)}</strong></div>
          )}
        </div>

        <div className="app-dialog__footer">
          <Button type="button" label="Volver" outlined onClick={onHide} disabled={pending} />
          <Button
            type="submit"
            className="app-charge-button"
            icon="pi pi-check"
            label="Confirmar pago (F8)"
            loading={pending}
            disabled={!canConfirm}
          />
        </div>
      </form>
    </Dialog>
  );
};
