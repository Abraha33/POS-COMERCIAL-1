import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import type { Product, StockLevel, TransferCreate } from '@/shared/contracts';
import { FormDialog, FormField } from '@/shared/ui';

type Line = { key: number; productId: string; quantity: string };

type Props = {
  visible: boolean;
  branches: readonly string[];
  products: readonly Product[];
  levels: readonly StockLevel[];
  branchLabel: (branchId: string) => string;
  defaultFrom: string;
  saving: boolean;
  /** Error de servidor ya traducido a un mensaje útil. */
  serverError: string | null;
  onSubmit: (input: TransferCreate) => void;
  onHide: () => void;
};

let lineKey = 0;
const newLine = (): Line => ({ key: ++lineKey, productId: '', quantity: '1' });

export const TransferDialog = ({
  visible, branches, products, levels, branchLabel, defaultFrom, saving, serverError, onSubmit, onHide,
}: Props) => {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setFrom(defaultFrom);
      setTo('');
      setLines([newLine()]);
      setErrors([]);
    }
  }, [visible, defaultFrom]);

  const available = (productId: string): number | null =>
    levels.find((l) => l.productId === productId && l.branchId === from)?.onHand ?? (productId ? 0 : null);

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const submit = () => {
    const problems: string[] = [];
    if (!from) problems.push('Elige la sede de origen.');
    if (!to) problems.push('Elige la sede de destino.');
    if (from && to && from === to) problems.push('El origen y el destino deben ser distintos.');
    const filled = lines.filter((l) => l.productId);
    if (filled.length === 0) problems.push('Agrega al menos un producto.');
    const ids = filled.map((l) => l.productId);
    if (new Set(ids).size !== ids.length) problems.push('Un producto aparece más de una vez; une las cantidades en una sola línea.');
    for (const l of filled) {
      const q = Number(l.quantity);
      const name = products.find((p) => p.id === l.productId)?.name ?? l.productId;
      if (!Number.isFinite(q) || q <= 0) problems.push(`La cantidad de ${name} debe ser mayor que cero.`);
      else if (q > (available(l.productId) ?? 0)) {
        problems.push(`${name}: pides ${q} y solo hay ${available(l.productId)} en ${branchLabel(from)}.`);
      }
    }
    setErrors(problems);
    if (problems.length > 0) return;
    onSubmit({ fromBranchId: from, toBranchId: to, lines: filled.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })) });
  };

  return (
    <FormDialog
      title="Nuevo traslado"
      visible={visible}
      onHide={onHide}
      onSubmit={submit}
      submitLabel="Enviar traslado"
      submitIcon="pi pi-send"
      loading={saving}
      error={serverError}
      width="min(40rem, 95vw)"
    >
      <p className="mt-0 text-color-secondary">
        El traslado se envía ahora: descuenta de la sede origen y queda en tránsito hasta que la sede destino lo reciba.
      </p>
      <div className="grid">
        <div className="col-12 md:col-6">
          <FormField id="trf-from" label="Sede de origen">
            <select id="trf-from" className="p-inputtext w-full" value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="">Seleccionar…</option>
              {branches.map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
            </select>
          </FormField>
        </div>
        <div className="col-12 md:col-6">
          <FormField id="trf-to" label="Sede de destino">
            <select id="trf-to" className="p-inputtext w-full" value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Seleccionar…</option>
              {branches.filter((b) => b !== from).map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
            </select>
          </FormField>
        </div>
      </div>

      <fieldset className="border-none p-0 m-0 mb-3">
        <legend className="font-medium mb-2 p-0">Productos</legend>
        {lines.map((line, index) => {
          const stock = available(line.productId);
          return (
            <div key={line.key} className="app-row mb-2" style={{ alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 14rem' }}>
                <label htmlFor={`trf-product-${line.key}`} className="block mb-1">Producto {index + 1}</label>
                <select
                  id={`trf-product-${line.key}`}
                  className="p-inputtext w-full"
                  value={line.productId}
                  onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                >
                  <option value="">Seleccionar…</option>
                  {products.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ flex: '0 0 7rem' }}>
                <label htmlFor={`trf-qty-${line.key}`} className="block mb-1">Cantidad {index + 1}</label>
                <input
                  id={`trf-qty-${line.key}`}
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  className="p-inputtext w-full"
                  value={line.quantity}
                  onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                />
              </div>
              <Button
                type="button"
                icon="pi pi-trash"
                text
                rounded
                severity="danger"
                aria-label={`Quitar línea ${index + 1}`}
                disabled={lines.length === 1}
                onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
              />
              {stock !== null ? (
                <small className="text-color-secondary" style={{ flexBasis: '100%' }}>
                  Disponible en origen: {stock}
                </small>
              ) : null}
            </div>
          );
        })}
        <Button type="button" label="Agregar producto" icon="pi pi-plus" text onClick={() => setLines((c) => [...c, newLine()])} />
      </fieldset>

      {errors.length > 0 ? (
        <div role="alert" className="p-error mb-3">
          <ul className="m-0 pl-3">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      ) : null}
    </FormDialog>
  );
};
