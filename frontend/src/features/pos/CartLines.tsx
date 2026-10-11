import { useState } from 'react';
import { Button } from 'primereact/button';
import type { Product } from '@/shared/contracts';
import { MoneyText } from '@/shared/ui';
import type { CartLine } from './cart';

export type PricedLine = { line: CartLine; product: Product };

type QuantityFieldProps = { name: string; value: number; onSet: (quantity: number) => void };

/** Cantidad editable por teclado: acepta decimales; vacío o ≤ 0 no se aplica (se restaura al salir). */
const QuantityField = ({ name, value, onSet }: QuantityFieldProps) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="number"
      className="p-inputtext pos__qty-input"
      inputMode="decimal"
      min={0}
      step="any"
      aria-label={`Cantidad ${name}`}
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value);
        const parsed = Number(e.target.value);
        if (e.target.value !== '' && Number.isFinite(parsed) && parsed > 0) onSet(parsed);
      }}
      onBlur={() => setDraft(null)}
    />
  );
};

type Props = {
  lines: PricedLine[];
  onDelta: (productId: string, delta: number) => void;
  onSetQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
};

/** Líneas de la venta: tabla de maqueta en escritorio; tarjetas a ≤ 599 px (CSS). */
export const CartLines = ({ lines, onDelta, onSetQuantity, onRemove }: Props) => (
  <div className="pos__lines-wrap app-table-scroll">
    <table className="pos__lines">
      <caption className="sr-only">Líneas de la venta actual</caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Producto</th>
          <th scope="col">Presentación</th>
          <th scope="col">Cantidad</th>
          <th scope="col" className="pos__num">Precio unit.</th>
          <th scope="col" className="pos__num">Subtotal</th>
          <th scope="col"><span className="sr-only">Quitar</span></th>
        </tr>
      </thead>
      <tbody>
        {lines.map(({ line, product }, index) => (
          <tr key={line.productId} data-testid="cart-line">
            <td className="pos__c-index" data-label="#">{index + 1}</td>
            <td className="pos__c-name">
              <span className="pos__thumb" aria-hidden="true"><i className="pi pi-box" /></span>
              <span className="pos__name">
                <strong>{product.name}</strong>
                <span className="pos__hint">{product.sku}</span>
              </span>
            </td>
            <td className="pos__c-unit" data-label="Presentación">{product.unit}</td>
            <td className="pos__c-qty">
              <span className="pos__qty">
                <Button
                  type="button" icon="pi pi-minus" outlined severity="secondary"
                  aria-label={`Menos ${product.name}`}
                  onClick={() => onDelta(line.productId, -1)}
                />
                <QuantityField
                  name={product.name}
                  value={line.quantity}
                  onSet={(q) => onSetQuantity(line.productId, q)}
                />
                <Button
                  type="button" icon="pi pi-plus" outlined severity="secondary"
                  aria-label={`Más ${product.name}`}
                  onClick={() => onDelta(line.productId, 1)}
                />
              </span>
            </td>
            <td className="pos__num pos__c-price" data-label="Precio unit.">
              <MoneyText value={product.price} />
            </td>
            <td className="pos__num pos__c-total" data-label="Subtotal">
              <MoneyText value={product.price * line.quantity - line.discount} strong />
              {line.discount > 0 ? (
                <span className="pos__hint pos__line-discount">Desc. −<MoneyText value={line.discount} /></span>
              ) : null}
            </td>
            <td className="pos__c-remove">
              <Button
                type="button" icon="pi pi-trash" text severity="danger"
                aria-label={`Quitar ${product.name}`}
                onClick={() => onRemove(line.productId)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
