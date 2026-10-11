import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import type { Product, Sale, SaleReturn } from '@/shared/contracts';
import { useReturnSale } from '@/shared/api/pos';
import { FormField, MoneyText } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { useNotify } from '@/app/providers/ToastProvider';
import { describeSaleError } from './saleText';

type Props = {
  sale: Sale;
  products: Map<string, Product>;
  /** Cantidades devueltas en esta sesión por producto: la API no expone lo ya devuelto (BR-DEV-01). */
  returnedInSession: Record<string, number>;
  onReturned: (saleReturn: SaleReturn) => void;
  onHide: () => void;
};

/**
 * Devolución parcial por línea (BR-DEV-01..05, PROPUESTA). El máximo mostrado es vendido − devuelto en esta sesión;
 * el servidor es la autoridad y responde `RETURN_EXCEEDS_SOLD` si se excede. Se monta solo mientras está abierto.
 */
export const ReturnDialog = ({ sale, products, returnedInSession, onReturned, onHide }: Props) => {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<SaleReturn | null>(null);
  const [touched, setTouched] = useState(false);
  const returnSale = useReturnSale();
  const notify = useNotify();

  const nameOf = (productId: string) => products.get(productId)?.name ?? productId;
  const maxFor = (productId: string, sold: number) => Math.max(0, sold - (returnedInSession[productId] ?? 0));
  const requested = sale.lines.flatMap((line) => {
    const quantity = Number(quantities[line.productId] ?? 0);
    return quantity > 0 ? [{ productId: line.productId, quantity }] : [];
  });
  const reasonMissing = reason.trim().length === 0;
  const overMax = sale.lines.some(
    (line) => Number(quantities[line.productId] ?? 0) > maxFor(line.productId, line.quantity),
  );
  // Estimación: precio unitario neto de descuento × cantidad. El valor real lo fija el servidor.
  const estimated = Math.round(
    sale.lines.reduce((sum, line) => {
      const quantity = Number(quantities[line.productId] ?? 0);
      return quantity > 0 ? sum + ((line.unitPrice * line.quantity - line.discount) / line.quantity) * quantity : sum;
    }, 0),
  );

  const submit = () => {
    setTouched(true);
    if (requested.length === 0 || reasonMissing || overMax) return;
    returnSale.mutate(
      { saleId: sale.id, input: { lines: requested, reason: reason.trim() } },
      {
        onSuccess: (saleReturn) => {
          setResult(saleReturn);
          onReturned(saleReturn);
          notify({
            severity: 'success',
            summary: 'Devolución registrada',
            detail: `${saleReturn.number}: ${formatMoney(saleReturn.total)}`,
          });
        },
      },
    );
  };

  return (
    <Dialog
      header={`Nueva devolución · ${sale.number}`}
      visible
      onHide={onHide}
      className="pos-dialog"
      style={{ width: 'min(38rem, 95vw)' }}
      modal
    >
      {result ? (
        <div data-testid="return-result">
          <p className="mt-0" role="status">
            Devolución <strong>{result.number}</strong> registrada. Valor devuelto:{' '}
            <strong data-testid="return-total">{formatMoney(result.total)}</strong>.
          </p>
          <ul className="pos__return-lines">
            {result.lines.map((line) => (
              <li key={line.productId}>
                {line.quantity} × {nameOf(line.productId)} — {formatMoney(line.amount)}
              </li>
            ))}
          </ul>
          <p className="pos__hint">
            El stock se reingresó a la sede de la venta (movimiento de entrada, referencia {result.number}). Si el
            turno sigue abierto, el efectivo devuelto sale de la caja esperada.
          </p>
          <div className="app-dialog__footer">
            <Button type="button" label="Cerrar" autoFocus onClick={onHide} />
          </div>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <p className="mt-0 pos__hint">
            Indica cuántas unidades devuelve el cliente. Deja en 0 las que no se devuelven.
          </p>
          <ul className="pos__return-grid">
            {sale.lines.map((line) => {
              const max = maxFor(line.productId, line.quantity);
              const already = returnedInSession[line.productId] ?? 0;
              const inputId = `return-qty-${line.productId}`;
              return (
                <li key={line.productId} className="pos__return-row">
                  <label htmlFor={inputId}>
                    <strong>{nameOf(line.productId)}</strong>
                    <span className="pos__hint">
                      {' '}· vendido {line.quantity}
                      {already > 0 ? ` · devuelto ${already}` : ''} · disponible {max}
                    </span>
                  </label>
                  <input
                    id={inputId}
                    className="p-inputtext pos__return-qty"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    disabled={max === 0}
                    value={quantities[line.productId] ?? ''}
                    placeholder="0"
                    onChange={(e) => setQuantities((current) => ({ ...current, [line.productId]: e.target.value }))}
                  />
                </li>
              );
            })}
          </ul>
          <div className="pos__totalbox pos__totalbox--compact">
            <span>Total a devolver (estimado)</span>
            <strong><MoneyText value={estimated} /></strong>
          </div>
          {touched && requested.length === 0 ? (
            <small className="p-error block mb-2" role="alert">Indica al menos una cantidad a devolver.</small>
          ) : null}
          {overMax ? (
            <small className="p-error block mb-2" role="alert">Una cantidad supera lo que queda por devolver.</small>
          ) : null}
          <FormField
            id="return-reason"
            label="Motivo de la devolución"
            {...(touched && reasonMissing ? { error: 'El motivo es obligatorio.' } : {})}
          >
            <input
              id="return-reason"
              className="p-inputtext w-full"
              value={reason}
              autoComplete="off"
              aria-required="true"
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>
          {returnSale.error ? (
            <p className="app-dialog__error" role="alert" data-testid="return-error">
              {describeSaleError(returnSale.error, 'return', nameOf)}
            </p>
          ) : null}
          <div className="app-dialog__footer">
            <Button type="button" label="Cancelar" outlined onClick={onHide} />
            <Button type="submit" label="Registrar devolución" icon="pi pi-replay" loading={returnSale.isPending} />
          </div>
        </form>
      )}
    </Dialog>
  );
};
