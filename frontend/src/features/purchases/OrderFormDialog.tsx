import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { useCreatePurchaseOrder } from '@/shared/api/ledger';
import { FormDialog, MoneyInput, MoneyText } from '@/shared/ui';
import { useNotify } from '@/app/providers/ToastProvider';
import { explainError } from './labels';
import { useLookups } from './useLookups';

type Line = { key: number; productId: string; quantity: number | null; unitCost: number | null };

type Props = { visible: boolean; onHide: () => void; onCreated: (orderId: string) => void };

let nextKey = 1;
const emptyLine = (): Line => ({ key: nextKey++, productId: '', quantity: 1, unitCost: null });

export const OrderFormDialog = ({ visible, onHide, onCreated }: Props) => {
  const { products, suppliers, productById } = useLookups();
  const create = useCreatePurchaseOrder();
  const notify = useNotify();
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSupplierId('');
      setLines([emptyLine()]);
      setSubmitted(false);
      setServerError(null);
    }
  }, [visible]);

  const activeSuppliers = (suppliers.data ?? []).filter((s) => s.active);
  const activeProducts = (products.data ?? []).filter((p) => p.active);
  const total = useMemo(
    () => lines.reduce((sum, l) => sum + (l.quantity ?? 0) * (l.unitCost ?? 0), 0),
    [lines],
  );

  const patchLine = (key: number, patch: Partial<Line>) =>
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const chooseProduct = (key: number, productId: string) => {
    const suggested = productById.get(productId)?.cost ?? null;
    setLines((current) =>
      current.map((l) => (l.key === key ? { ...l, productId, unitCost: l.unitCost ?? suggested } : l)),
    );
  };

  const lineError = (line: Line, index: number): string | null => {
    if (!line.productId) return 'Elige un producto.';
    if (lines.some((other, i) => i < index && other.productId === line.productId)) {
      return 'Producto repetido: suma las cantidades en una sola línea.';
    }
    if (!line.quantity || line.quantity <= 0) return 'La cantidad debe ser mayor que 0.';
    if (line.unitCost === null || line.unitCost < 0) return 'Indica el costo unitario.';
    return null;
  };

  const supplierError = supplierId ? null : 'Elige un proveedor.';
  const formInvalid = Boolean(supplierError) || lines.some((l, i) => lineError(l, i));

  const submit = () => {
    setSubmitted(true);
    setServerError(null);
    if (formInvalid) return;
    create.mutate(
      {
        supplierId,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity ?? 0,
          unitCost: Math.round(l.unitCost ?? 0),
        })),
      },
      {
        onSuccess: (order) => {
          notify({ severity: 'success', summary: 'Orden creada en borrador', detail: order.number });
          onCreated(order.id);
        },
        onError: (e) => setServerError(explainError(e, 'crear')),
      },
    );
  };

  return (
    <FormDialog
      visible={visible}
      title="Nueva orden de compra"
      onHide={onHide}
      onSubmit={submit}
      submitLabel="Crear orden"
      submitIcon="pi pi-check"
      loading={create.isPending}
      error={serverError}
      width="min(52rem, 95vw)"
    >
      <div>
        <div className="purch__field">
          <label htmlFor="po-supplier">Proveedor</label>
          <select
            id="po-supplier" className="p-inputtext" value={supplierId}
            aria-invalid={submitted && Boolean(supplierError)}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">Selecciona un proveedor…</option>
            {activeSuppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {s.paymentTermsDays} días</option>
            ))}
          </select>
          {submitted && supplierError ? <small className="purch__error" role="alert">{supplierError}</small> : null}
        </div>

        <div className="purch__panel">
          <h3>Líneas</h3>
          <div className="purch__form-lines">
            {lines.map((line, index) => {
              const error = submitted ? lineError(line, index) : null;
              const n = index + 1;
              const subtotal = Math.round((line.quantity ?? 0) * (line.unitCost ?? 0));
              return (
                <div key={line.key}>
                  <div className="purch__form-line">
                    <div className="purch__field">
                      <label htmlFor={`po-product-${line.key}`}>Producto {n}</label>
                      <select
                        id={`po-product-${line.key}`} className="p-inputtext" value={line.productId}
                        onChange={(e) => chooseProduct(line.key, e.target.value)}
                      >
                        <option value="">Selecciona…</option>
                        {activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="purch__field">
                      <label htmlFor={`po-qty-${line.key}`}>Cantidad {n}</label>
                      <InputNumber
                        inputId={`po-qty-${line.key}`} value={line.quantity} min={0} maxFractionDigits={3}
                        onChange={(e) => e.originalEvent && patchLine(line.key, { quantity: e.value })}
                        inputStyle={{ width: '100%' }}
                      />
                    </div>
                    <div className="purch__field">
                      <label htmlFor={`po-cost-${line.key}`}>Costo unitario {n} (COP)</label>
                      <MoneyInput
                        id={`po-cost-${line.key}`} value={line.unitCost}
                        onChange={(value) => patchLine(line.key, { unitCost: value })}
                      />
                    </div>
                    <div className="purch__field">
                      <span className="purch__hint">Subtotal</span>
                      <span className="purch__subtotal"><MoneyText value={subtotal} /></span>
                    </div>
                    <Button
                      type="button" icon="pi pi-trash" severity="danger" text
                      aria-label={`Quitar línea ${n}`}
                      disabled={lines.length === 1}
                      onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                    />
                  </div>
                  {error ? <p className="purch__error" role="alert">Línea {n}: {error}</p> : null}
                </div>
              );
            })}
          </div>
          <div className="mt-3">
            <Button
              type="button" label="Agregar línea" icon="pi pi-plus" outlined
              onClick={() => setLines((current) => [...current, emptyLine()])}
            />
          </div>
        </div>

        <div className="flex justify-content-between align-items-center mt-3 gap-3 flex-wrap">
          <span>Total de la orden</span>
          <span className="purch__total" data-testid="po-total"><MoneyText value={Math.round(total)} strong /></span>
        </div>
        <p className="purch__hint">
          La orden se guarda en borrador y no mueve inventario hasta recibirla. El total final lo confirma el servidor.
        </p>
      </div>
    </FormDialog>
  );
};
