import type { RefObject } from 'react';
import { Button } from 'primereact/button';
import type { Customer } from '@/shared/contracts';
import { MoneyText } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { payModeOptions, type PayMode } from './cart';

type Props = {
  customers: Customer[];
  customer: Customer | null;
  customerId: string | null;
  onCustomer: (id: string | null) => void;
  customerRef: RefObject<HTMLSelectElement | null>;
  itemCount: number;
  gross: number;
  discount: number;
  vat: number;
  roundingAdjustment: number;
  total: number;
  mode: PayMode;
  onMode: (mode: PayMode) => void;
  hasLines: boolean;
  pending: boolean;
  onCharge: () => void;
  onHold: () => void;
  onCancel: () => void;
};

/** Columna derecha: cliente, resumen con total grande, método de pago y acciones (maqueta ref-1). */
export const SalePanel = ({
  customers, customer, customerId, onCustomer, customerRef, itemCount, gross, discount, vat, roundingAdjustment, total,
  mode, onMode, hasLines, pending, onCharge, onHold, onCancel,
}: Props) => {
  const creditNeedsCustomer = customerId === null;
  return (
    <aside className="pos__side" aria-label="Cobro">
      <section className="pos__panel" aria-label="Cliente">
        <div className="pos__panel-head">
          <h2>Cliente</h2>
          <kbd className="pos__kbd">F3</kbd>
        </div>
        <label htmlFor="pos-customer" className="sr-only">Cliente (F3)</label>
        <select
          id="pos-customer"
          ref={customerRef}
          className="p-inputtext w-full"
          value={customerId ?? ''}
          onChange={(e) => onCustomer(e.target.value || null)}
        >
          <option value="">Consumidor final</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="pos__customer-card">
          <span className="pos__avatar" aria-hidden="true"><i className="pi pi-user" /></span>
          <span>
            <strong>{customer ? customer.name : 'Consumidor final'}</strong>
            <span className="pos__hint block">
              {customer ? `${customer.documentType} ${customer.taxId} · cupo ${formatMoney(customer.creditLimit)}` : 'Cliente de mostrador'}
            </span>
          </span>
        </div>
      </section>

      <section className="pos__panel" aria-label="Resumen de venta">
        <h2>Resumen de venta</h2>
        <dl className="pos__summary">
          <div><dt>Subtotal ({itemCount} {itemCount === 1 ? 'ítem' : 'ítems'})</dt><dd><MoneyText value={gross} /></dd></div>
          <div><dt>Descuento</dt><dd><MoneyText value={discount === 0 ? 0 : -discount} signed /></dd></div>
          <div><dt>IVA incluido (est.)</dt><dd><MoneyText value={vat} /></dd></div>
          {roundingAdjustment !== 0 ? (
            <div><dt>Ajuste al peso</dt><dd><MoneyText value={roundingAdjustment} signed /></dd></div>
          ) : null}
        </dl>
        <div className="pos__totalbox">
          <span>Total a pagar</span>
          <strong data-testid="pos-total">{formatMoney(total)}</strong>
        </div>
      </section>

      <section className="pos__panel" aria-label="Método de pago">
        <h2 id="pos-pay-methods">Método de pago</h2>
        <div className="pos__modes" role="group" aria-labelledby="pos-pay-methods">
          {payModeOptions.map((option) => {
            const unavailable = option.value === 'credito' && creditNeedsCustomer;
            return (
              <button
                key={option.value}
                type="button"
                className="app-segmented__item pos__mode"
                aria-pressed={mode === option.value}
                aria-disabled={unavailable || undefined}
                aria-describedby={unavailable ? 'pos-credit-hint' : undefined}
                onClick={() => {
                  if (!unavailable) onMode(option.value);
                }}
              >
                <i className={option.icon} aria-hidden="true" /> {option.label}
              </button>
            );
          })}
        </div>
        {creditNeedsCustomer ? (
          <p id="pos-credit-hint" className="pos__hint pos__mode-hint">
            Crédito necesita un cliente identificado: elígelo en «Cliente» (F3).
          </p>
        ) : null}

        <Button
          type="button"
          className="app-charge-button pos__charge"
          icon="pi pi-wallet"
          label="Cobrar (F8)"
          disabled={!hasLines || pending}
          onClick={onCharge}
        >
          <span className="pos__charge-total">{formatMoney(total)}</span>
        </Button>
        <div className="pos__side-actions">
          <Button
            type="button" label="Suspender (F9)" icon="pi pi-pause" outlined className="pos__btn-warn"
            disabled={!hasLines} onClick={onHold}
          />
          <Button
            type="button" label="Cancelar" icon="pi pi-times" outlined severity="danger" className="pos__btn-danger"
            disabled={!hasLines} onClick={onCancel}
          />
        </div>
      </section>
    </aside>
  );
};
