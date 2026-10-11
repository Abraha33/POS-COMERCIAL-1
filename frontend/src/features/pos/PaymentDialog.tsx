import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import type { Customer, Payment, PaymentMethod } from '@/shared/contracts';
import { MoneyInput, MoneyText } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { allMethods, digitalChannels, suggestCashAmounts, type DigitalChannel, type PayMode } from './cart';
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
  channel: DigitalChannel;
  onChannel: (value: DigitalChannel) => void;
  rows: Payment[];
  onRows: (rows: Payment[]) => void;
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
    visible, mode, total, roundingAdjustment, customer, received, onReceived, channel, onChannel, rows, onRows,
    paid, missing, change, canConfirm, pending, error, onDismissError, onConfirm, onHide,
  } = props;

  const updateRow = (index: number, patch: Partial<Payment>) =>
    onRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

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

        {mode === 'tarjeta' ? (
          <p className="pos-pay__instruction">
            Cobra {formatMoney(total)} en el datáfono y confirma cuando el pago esté aprobado.
          </p>
        ) : null}

        {mode === 'transferencia' ? (
          <section aria-label="Pago digital">
            <label htmlFor="pay-channel" className="pos-pay__label">Canal</label>
            <select
              id="pay-channel"
              className="p-inputtext w-full"
              value={channel}
              onChange={(e) => onChannel(e.target.value as DigitalChannel)}
            >
              {digitalChannels.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <p className="pos-pay__instruction">Confirma cuando veas la transferencia recibida por {formatMoney(total)}.</p>
          </section>
        ) : null}

        {mode === 'credito' ? (
          <p className="pos-pay__instruction">
            Se registra a crédito por {formatMoney(total)} a nombre de <strong>{customer?.name ?? 'cliente'}</strong>
            {customer ? <> (cupo aprobado {formatMoney(customer.creditLimit)})</> : null}. El servidor valida cupo y
            facturas vencidas.
          </p>
        ) : null}

        {mode === 'mixto' ? (
          <section aria-label="Pago mixto">
            {rows.map((payment, index) => (
              <div className="pos__payment" key={`${payment.method}-${index}`}>
                <select
                  className="p-inputtext"
                  aria-label={`Medio de pago ${index + 1}`}
                  value={payment.method}
                  onChange={(e) => updateRow(index, { method: e.target.value as PaymentMethod })}
                >
                  {allMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <MoneyInput
                  aria-label={`Monto ${index + 1}`}
                  value={payment.amount}
                  onChange={(v) => updateRow(index, { amount: v ?? 0 })}
                  onEnter={onConfirm}
                />
                {rows.length > 1 ? (
                  <Button
                    type="button" icon="pi pi-times" rounded text severity="secondary"
                    aria-label={`Quitar pago ${index + 1}`}
                    onClick={() => onRows(rows.filter((_, i) => i !== index))}
                  />
                ) : <span />}
              </div>
            ))}
            <Button
              type="button" label="Agregar medio de pago" icon="pi pi-plus" text
              onClick={() => onRows([...rows, { method: 'tarjeta', amount: missing }])}
            />
            <p className="pos__hint">Pagado: <MoneyText value={paid} /></p>
          </section>
        ) : null}

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
