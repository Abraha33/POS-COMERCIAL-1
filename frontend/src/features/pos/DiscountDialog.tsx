import { useState } from 'react';
import { Button } from 'primereact/button';
import { FormDialog, MoneyInput } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import type { PricedLine } from './CartLines';

type Props = {
  lines: PricedLine[];
  onApply: (discounts: Record<string, number>) => void;
  onHide: () => void;
};

/**
 * Descuento por línea (BR-VEN-04: cajero hasta 5 %; más exige PIN de supervisor al cobrar). El atajo "% a todas"
 * solo rellena los montos; nada se envía hasta cobrar. Se monta solo mientras está abierto.
 */
export const DiscountDialog = ({ lines, onApply, onHide }: Props) => {
  const [drafts, setDrafts] = useState<Record<string, number>>(() =>
    Object.fromEntries(lines.map(({ line }) => [line.productId, line.discount])),
  );
  const [percent, setPercent] = useState('');

  const gross = (productId: string): number => {
    const found = lines.find((l) => l.line.productId === productId);
    return found ? found.product.price * found.line.quantity : 0;
  };

  const applyPercent = () => {
    const pct = Math.min(100, Math.max(0, Number(percent.replace(',', '.'))));
    if (!Number.isFinite(pct)) return;
    setDrafts(Object.fromEntries(lines.map(({ line }) => [line.productId, Math.round((gross(line.productId) * pct) / 100)])));
  };

  const invalid = lines.some(({ line }) => (drafts[line.productId] ?? 0) > gross(line.productId));

  return (
    <FormDialog
      visible
      title="Aplicar descuento"
      onHide={onHide}
      onSubmit={() => onApply(drafts)}
      submitLabel="Aplicar descuento"
      submitIcon="pi pi-percentage"
      submitDisabled={invalid}
      width="min(34rem, 95vw)"
    >
      <p className="pos__hint mt-0">
        El cajero puede dar hasta 5 % por línea; un descuento mayor pide el PIN de un supervisor al cobrar.
      </p>
      <div className="pos-discount__bulk">
        <label htmlFor="discount-percent">Porcentaje para todas las líneas</label>
        <div className="flex gap-2">
          <input
            id="discount-percent"
            className="p-inputtext"
            inputMode="decimal"
            placeholder="Ej. 5"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyPercent();
              }
            }}
          />
          <Button type="button" label="Rellenar" outlined onClick={applyPercent} />
          <Button type="button" label="Quitar todos" text onClick={() => setDrafts(Object.fromEntries(lines.map(({ line }) => [line.productId, 0])))} />
        </div>
      </div>
      <ul className="pos-discount__list">
        {lines.map(({ line, product }) => {
          const id = `discount-${line.productId}`;
          const over = (drafts[line.productId] ?? 0) > gross(line.productId);
          return (
            <li key={line.productId}>
              <label htmlFor={id}>
                <strong>{product.name}</strong>
                <span className="pos__hint"> · {line.quantity} × {formatMoney(product.price)}</span>
              </label>
              <MoneyInput
                id={id}
                value={drafts[line.productId] ?? 0}
                invalid={over}
                max={gross(line.productId)}
                onChange={(v) => setDrafts((d) => ({ ...d, [line.productId]: v ?? 0 }))}
              />
            </li>
          );
        })}
      </ul>
    </FormDialog>
  );
};
