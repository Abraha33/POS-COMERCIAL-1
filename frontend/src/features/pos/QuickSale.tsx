import { useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import type { ApprovalRequest, Payment, PaymentMethod, Product, SaleReceipt, Shift } from '@/shared/contracts';
import { useCreateSale } from '@/shared/api/pos';
import { useCustomers, useProducts } from '@/shared/api/queries';
import { useHotkey } from '@/shared/keyboard/useHotkey';
import { ScreenTemplate } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { computeTotals } from '@/shared/utils/pricing';
import { useNotify } from '@/app/providers/ToastProvider';
import { SupervisorPinDialog } from './SupervisorPinDialog';
import './pos.css';

type CartLine = { productId: string; quantity: number; discount: number };
type PinRequest = { action: ApprovalRequest['action']; reason: string };

const methods: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'credito', label: 'Crédito' },
];

const approvalActions: ApprovalRequest['action'][] = ['discount', 'negative_stock', 'below_cost'];

const asApprovalAction = (value: unknown): ApprovalRequest['action'] | null =>
  approvalActions.find((a) => a === value) ?? null;

const matches = (product: Product, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [product.name, product.sku, product.barcode ?? ''].some((field) => field.toLowerCase().includes(q));
};

/**
 * Nota PrimeReact: `InputNumber` dispara `onChange` con `originalEvent: null` cuando cambia el `value` por código;
 * por eso solo se atienden los cambios con `originalEvent` (acción del usuario).
 *
 * Venta rápida: teclado y lector primero; táctil en tableta. Reglas: BR-VEN-01..14. */
export const QuickSale = ({ shift }: { shift: Shift }) => {
  const products = useProducts();
  const customers = useCustomers();
  const createSale = useCreateSale();
  const notify = useNotify();

  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null); // null = pago por defecto (efectivo exacto)
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [approvalToken, setApprovalToken] = useState<string | undefined>();
  const [pinRequest, setPinRequest] = useState<PinRequest | null>(null);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const catalog = useMemo(() => (products.data ?? []).filter((p) => p.active), [products.data]);
  const byId = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);
  const results = useMemo(() => catalog.filter((p) => matches(p, query)).slice(0, 12), [catalog, query]);

  const priced = lines.flatMap((line) => {
    const product = byId.get(line.productId);
    return product ? [{ line, product, unitPrice: product.price, quantity: line.quantity, discount: line.discount }] : [];
  });
  const hasCashInPayment = (payments ?? [{ method: 'efectivo' as const, amount: 0 }]).some((p) => p.method === 'efectivo');
  const totals = computeTotals(priced, hasCashInPayment);

  const effectivePayments: Payment[] = payments ?? [{ method: 'efectivo', amount: totals.total }];
  const paid = effectivePayments.reduce((sum, p) => sum + p.amount, 0);
  const cashPaid = effectivePayments.filter((p) => p.method === 'efectivo').reduce((sum, p) => sum + p.amount, 0);
  const missing = Math.max(0, totals.total - paid);
  const change = Math.max(0, paid - totals.total);
  const canConfirm = lines.length > 0 && missing === 0 && change <= cashPaid && !createSale.isPending;

  const addProduct = (product: Product) => {
    setLines((current) => {
      const existing = current.find((l) => l.productId === product.id);
      if (existing) {
        return current.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...current, { productId: product.id, quantity: 1, discount: 0 }];
    });
    setQuery('');
    searchRef.current?.focus();
  };

  /** Cambio relativo: seguro ante clics rápidos (no depende del render anterior). Cantidad <= 0 quita la línea. */
  const changeQuantity = (productId: string, delta: number) =>
    setLines((current) =>
      current.flatMap((l) => {
        if (l.productId !== productId) return [l];
        const quantity = l.quantity + delta;
        return quantity <= 0 ? [] : [{ ...l, quantity }];
      }),
    );
  const setDiscount = (productId: string, discount: number) =>
    setLines((current) => current.map((l) => (l.productId === productId ? { ...l, discount } : l)));

  // El lector escribe el código y envía Enter: coincidencia exacta o único resultado agrega la línea.
  const onSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const exact = catalog.find((p) => p.barcode?.toLowerCase() === q || p.sku.toLowerCase() === q);
    const target = exact ?? (results.length === 1 ? results[0] : undefined);
    if (target) addProduct(target);
    else notify({ severity: 'warn', summary: 'Sin coincidencia única', detail: 'Elige un producto de la lista.' });
  };

  const reset = () => {
    setLines([]);
    setPayments(null);
    setCustomerId(null);
    setApprovalToken(undefined);
    setOperationId(crypto.randomUUID());
    setQuery('');
    searchRef.current?.focus();
  };

  const submit = (token?: string) => {
    if (!canConfirm) return;
    createSale.mutate(
      {
        clientOperationId: operationId,
        shiftId: shift.id,
        customerId,
        lines,
        payments: effectivePayments,
        ...((token ?? approvalToken) ? { approvalToken: token ?? approvalToken } : {}),
      },
      {
        onSuccess: (result) => setReceipt(result),
        onError: (error) => {
          const detailAction = asApprovalAction(error.details?.action);
          switch (error.code) {
            case 'STOCK_INSUFFICIENT':
              return setPinRequest({ action: 'negative_stock', reason: 'No hay existencias suficientes. Un supervisor puede autorizar la venta.' });
            case 'APPROVAL_REQUIRED':
            case 'APPROVAL_INVALID':
              setApprovalToken(undefined);
              return setPinRequest({ action: detailAction ?? 'discount', reason: error.message });
            case 'PRICE_BELOW_COST':
              return setPinRequest({ action: 'below_cost', reason: 'El precio queda bajo el costo: solo el propietario puede autorizarlo.' });
            case 'SHIFT_NOT_OPEN':
              return notify({ severity: 'error', summary: 'Turno cerrado', detail: 'Abre el turno para vender.' });
            default:
              return notify({ severity: 'error', summary: error.code, detail: error.message });
          }
        },
      },
    );
  };

  useHotkey('F2', () => searchRef.current?.focus());
  useHotkey('F9', () => submit(), canConfirm);

  const updatePayment = (index: number, patch: Partial<Payment>) =>
    setPayments(effectivePayments.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  const addPayment = () => setPayments([...effectivePayments, { method: 'tarjeta', amount: missing }]);
  const removePayment = (index: number) => {
    const next = effectivePayments.filter((_, i) => i !== index);
    setPayments(next.length > 0 ? next : null);
  };

  return (
    <ScreenTemplate
      title="Punto de venta"
      subtitle="Venta rápida"
      actions={
        <span className="pos__shift">
          <span>Turno {shift.id}</span>
          <span>Caja esperada {formatMoney(shift.expectedCash)}</span>
        </span>
      }
    >
      <div className="pos">
        <div className="pos__layout">
          <section className="pos__panel" aria-label="Productos y líneas">
            <label htmlFor="pos-search" className="pos__hint">Buscar producto o escanear código (F2)</label>
            <InputText
              id="pos-search"
              ref={searchRef}
              className="pos__search"
              placeholder="Nombre, SKU o código de barras"
              autoFocus
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
            />
            <div className="pos__products" role="list" aria-label="Resultados">
              {results.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  role="listitem"
                  className="pos__product"
                  onClick={() => addProduct(product)}
                >
                  <strong>{product.name}</strong>
                  <span className="pos__product-price">{formatMoney(product.price)}</span>
                </button>
              ))}
              {results.length === 0 ? <p className="pos__hint">Sin resultados para “{query}”.</p> : null}
            </div>

            <h2 className="mt-4">Venta actual</h2>
            {priced.length === 0 ? (
              <p className="pos__hint" data-testid="cart-empty">Escanea o elige un producto para empezar.</p>
            ) : (
              <div className="pos__lines-wrap">
                <table className="pos__lines">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th className="pos__num">Desc.</th>
                      <th className="pos__num">Total</th>
                      <th><span className="sr-only">Quitar</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {priced.map(({ line, product, unitPrice }) => (
                      <tr key={line.productId}>
                        <td>
                          {product.name}
                          <div className="pos__hint">{formatMoney(unitPrice)} c/u</div>
                        </td>
                        <td>
                          <span className="pos__qty">
                            <Button
                              type="button" icon="pi pi-minus" rounded text severity="secondary"
                              aria-label={`Menos ${product.name}`}
                              onClick={() => changeQuantity(line.productId, -1)}
                            />
                            <span aria-label={`Cantidad ${product.name}`}>{line.quantity}</span>
                            <Button
                              type="button" icon="pi pi-plus" rounded text severity="secondary"
                              aria-label={`Más ${product.name}`}
                              onClick={() => changeQuantity(line.productId, 1)}
                            />
                          </span>
                        </td>
                        <td className="pos__num">
                          <InputNumber
                            inputId={`discount-${line.productId}`}
                            aria-label={`Descuento ${product.name}`}
                            value={line.discount}
                            onChange={(e) => e.originalEvent && setDiscount(line.productId, e.value ?? 0)}
                            min={0}
                            mode="currency" currency="COP" locale="es-CO" minFractionDigits={0}
                            inputStyle={{ width: '7rem' }}
                          />
                        </td>
                        <td className="pos__num">{formatMoney(unitPrice * line.quantity - line.discount)}</td>
                        <td>
                          <Button
                            type="button" icon="pi pi-trash" rounded text severity="danger"
                            aria-label={`Quitar ${product.name}`}
                            onClick={() => changeQuantity(line.productId, -line.quantity)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="pos__panel" aria-label="Cobro">
            <h2>Cobro</h2>
            <div className="pos__field">
              <label htmlFor="pos-customer">Cliente</label>
              <select
                id="pos-customer"
                className="p-inputtext"
                value={customerId ?? ''}
                onChange={(e) => setCustomerId(e.target.value || null)}
              >
                <option value="">Consumidor final</option>
                {(customers.data ?? []).filter((c) => c.active).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="pos__totals">
              <div><span>Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
              {totals.roundingAdjustment !== 0 ? (
                <div><span>Ajuste al peso</span><span>{formatMoney(totals.roundingAdjustment)}</span></div>
              ) : null}
              <div className="pos__total"><span>Total</span><span data-testid="pos-total">{formatMoney(totals.total)}</span></div>
            </div>

            {effectivePayments.map((payment, index) => (
              <div className="pos__payment" key={`${payment.method}-${index}`}>
                <select
                  className="p-inputtext"
                  aria-label={`Medio de pago ${index + 1}`}
                  value={payment.method}
                  onChange={(e) => updatePayment(index, { method: e.target.value as PaymentMethod })}
                >
                  {methods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <InputNumber
                  aria-label={`Monto ${index + 1}`}
                  value={payment.amount}
                  onChange={(e) => e.originalEvent && updatePayment(index, { amount: e.value ?? 0 })}
                  min={0}
                  mode="currency" currency="COP" locale="es-CO" minFractionDigits={0}
                  inputStyle={{ width: '100%' }}
                />
                {effectivePayments.length > 1 ? (
                  <Button
                    type="button" icon="pi pi-times" rounded text severity="secondary"
                    aria-label={`Quitar pago ${index + 1}`} onClick={() => removePayment(index)}
                  />
                ) : <span />}
              </div>
            ))}
            <Button type="button" label="Agregar medio de pago" icon="pi pi-plus" text onClick={addPayment} />

            <div className="pos__totals" aria-live="polite">
              {missing > 0 ? (
                <div className="pos__missing"><span>Falta</span><span data-testid="pos-missing">{formatMoney(missing)}</span></div>
              ) : (
                <div className="pos__change"><span>Cambio</span><span data-testid="pos-change">{formatMoney(change)}</span></div>
              )}
            </div>

            <Button
              type="button"
              className="pos__confirm"
              label="Cobrar (F9)"
              icon="pi pi-check"
              loading={createSale.isPending}
              disabled={!canConfirm}
              onClick={() => submit()}
            />
          </section>
        </div>
      </div>

      <SupervisorPinDialog
        action={pinRequest?.action ?? null}
        reason={pinRequest?.reason}
        onCancel={() => setPinRequest(null)}
        onApproved={(token) => {
          setApprovalToken(token);
          setPinRequest(null);
          submit(token);
        }}
      />

      <Dialog
        header="Venta registrada"
        visible={receipt !== null}
        onHide={() => { setReceipt(null); reset(); }}
        style={{ width: 'min(24rem, 95vw)' }}
        modal
      >
        {receipt ? (
          <div className="pos__totals">
            <div><span>Número</span><strong data-testid="receipt-number">{receipt.number}</strong></div>
            <div><span>Total</span><span>{formatMoney(receipt.total)}</span></div>
            <div><span>Cambio</span><span className="pos__change">{formatMoney(receipt.change)}</span></div>
            <Button
              type="button" label="Nueva venta" icon="pi pi-plus" autoFocus className="mt-3"
              onClick={() => { setReceipt(null); reset(); }}
            />
          </div>
        ) : null}
      </Dialog>
    </ScreenTemplate>
  );
};
