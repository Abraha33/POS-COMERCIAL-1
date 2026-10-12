import { useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import type { ApprovalRequest, Payment, PaymentMethod, Product, SaleReceipt, Shift } from '@/shared/contracts';
import { useCreateSale } from '@/shared/api/pos';
import { useCustomers, useProducts } from '@/shared/api/queries';
import { useHotkey } from '@/shared/keyboard/useHotkey';
import { ConfirmAction, FormDialog, MoneyText, ScreenTemplate, ShortcutBar } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { uuid } from '@/shared/utils/uuid';
import { computeTotals } from '@/shared/utils/pricing';
import { CartLines, type PricedLine } from './CartLines';
import { ALL_CATEGORIES, CatalogPanel } from './CatalogPanel';
import { CashDialog } from './CashDialog';
import { DiscountDialog } from './DiscountDialog';
import { HeldSalesDialog } from './HeldSalesDialog';
import { PaymentDialog } from './PaymentDialog';
import { SalePanel } from './SalePanel';
import { SupervisorPinDialog } from './SupervisorPinDialog';
import { estimateIncludedVat, paymentsTotal, type CartLine, type DigitalChannel, type PayMode } from './cart';
import { describeCheckoutError, type CheckoutMessage } from './saleText';
import { useHeldSales, type HeldSale } from './useHeldSales';
import './pos.css';

type PinRequest = { action: ApprovalRequest['action']; reason: string };
type Confirm = 'clear' | 'cancel' | null;
type Pane = 'catalog' | 'cart';

const approvalActions: ApprovalRequest['action'][] = ['discount', 'negative_stock', 'below_cost'];
const asApprovalAction = (value: unknown): ApprovalRequest['action'] | null =>
  approvalActions.find((a) => a === value) ?? null;

const matches = (product: Product, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [product.name, product.sku, product.barcode ?? ''].some((field) => field.toLowerCase().includes(q));
};

/**
 * Venta rápida (maquetas ref-1/ref-2/ref-5): izquierda búsqueda + líneas, derecha cliente, resumen y cobro.
 * Teclado y lector primero; en móvil dos paneles (catálogo / carrito) con barra "Ver carrito". Reglas BR-VEN-01..14.
 * Los cambios de cantidad son relativos (seguros ante clics rápidos); cantidad ≤ 0 quita la línea.
 */
export const QuickSale = ({ shift, active = true }: { shift: Shift; active?: boolean }) => {
  const products = useProducts();
  const customers = useCustomers();
  const createSale = useCreateSale();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [mode, setMode] = useState<PayMode>('efectivo');
  const [receivedState, setReceivedState] = useState<{ total: number; amount: number } | null>(null);
  const [channel, setChannel] = useState<DigitalChannel>('transferencia');
  const [mixedRows, setMixedRows] = useState<Payment[]>([]);
  const [note, setNote] = useState('');
  const [operationId, setOperationId] = useState(() => uuid());
  const [approvalToken, setApprovalToken] = useState<string | undefined>();
  const [pinRequest, setPinRequest] = useState<PinRequest | null>(null);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [checkoutError, setCheckoutError] = useState<CheckoutMessage | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pane, setPane] = useState<Pane>('catalog');
  const heldSales = useHeldSales(shift.registerId);
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLSelectElement>(null);

  const catalog = useMemo(() => (products.data ?? []).filter((p) => p.active), [products.data]);
  const byId = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);
  const categories = useMemo(() => [...new Set(catalog.map((p) => p.category))].sort(), [catalog]);
  const filtered = useMemo(
    () => catalog.filter((p) => (category === ALL_CATEGORIES || p.category === category) && matches(p, query)),
    [catalog, category, query],
  );
  const results = filtered.slice(0, 24);
  const customerList = useMemo(() => (customers.data ?? []).filter((c) => c.active), [customers.data]);
  const customer = customerList.find((c) => c.id === customerId) ?? null;

  const priced: PricedLine[] = lines.flatMap((line) => {
    const product = byId.get(line.productId);
    return product ? [{ line, product }] : [];
  });
  const pricedForTotals = priced.map(({ line, product }) => ({
    unitPrice: product.price, quantity: line.quantity, discount: line.discount,
  }));
  const gross = pricedForTotals.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discountTotal = lines.reduce((sum, l) => sum + l.discount, 0);
  const units = lines.reduce((sum, l) => sum + l.quantity, 0);
  const vat = estimateIncludedVat(priced.map(({ line, product }) => ({ product, quantity: line.quantity, discount: line.discount })));

  const mixedHasCash = mixedRows.some((p) => p.method === 'efectivo');
  const hasCash = mode === 'mixto' ? mixedHasCash : mode === 'efectivo';
  const totals = computeTotals(pricedForTotals, hasCash);

  const received = receivedState && receivedState.total === totals.total ? receivedState.amount : null;
  const payments: Payment[] = (() => {
    const amount = totals.total;
    const single = (method: PaymentMethod): Payment[] => [{ method, amount }];
    switch (mode) {
      case 'efectivo': return [{ method: 'efectivo', amount: received ?? amount }];
      case 'tarjeta': return single('tarjeta');
      case 'transferencia': return single(channel);
      case 'credito': return single('credito');
      case 'mixto': return mixedRows.length > 0 ? mixedRows : single('efectivo');
    }
  })();
  const paid = paymentsTotal(payments);
  const cashPaid = payments.filter((p) => p.method === 'efectivo').reduce((sum, p) => sum + p.amount, 0);
  const missing = Math.max(0, totals.total - paid);
  const change = Math.max(0, paid - totals.total);
  const creditBlocked = mode === 'credito' && customerId === null;
  const canConfirm = lines.length > 0 && missing === 0 && change <= cashPaid && !creditBlocked && !createSale.isPending;

  const anyOverlay =
    payOpen || heldOpen || cashOpen || discountOpen || notesOpen || confirm !== null || pinRequest !== null || receipt !== null;

  const focusSearch = () => searchRef.current?.focus();

  const addProduct = (product: Product) => {
    setLines((current) => {
      const existing = current.find((l) => l.productId === product.id);
      if (existing) {
        return current.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...current, { productId: product.id, quantity: 1, discount: 0 }];
    });
    setQuery('');
    setSearchMessage(null);
    focusSearch();
  };

  const changeQuantity = (productId: string, delta: number) =>
    setLines((current) =>
      current.flatMap((l) => {
        if (l.productId !== productId) return [l];
        const quantity = l.quantity + delta;
        return quantity <= 0 ? [] : [{ ...l, quantity }];
      }),
    );
  const setQuantity = (productId: string, quantity: number) =>
    setLines((current) => current.map((l) => (l.productId === productId ? { ...l, quantity } : l)));
  const removeLine = (productId: string) => setLines((current) => current.filter((l) => l.productId !== productId));

  // El lector escribe el código y envía Enter: coincidencia exacta o único resultado agrega la línea.
  const runSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const exact = catalog.find((p) => p.barcode?.toLowerCase() === q || p.sku.toLowerCase() === q);
    const target = exact ?? (filtered.length === 1 ? filtered[0] : undefined);
    if (target) addProduct(target);
    else {
      setSearchMessage(
        filtered.length === 0
          ? `No hay productos con «${query.trim()}». Revisa el código o busca por nombre.`
          : 'Hay varias coincidencias: elige un producto de la lista.',
      );
    }
  };

  const reset = () => {
    setLines([]);
    setReceivedState(null);
    setMixedRows([]);
    setMode('efectivo');
    setCustomerId(null);
    setApprovalToken(undefined);
    setCheckoutError(null);
    setNote('');
    setOperationId(uuid());
    setQuery('');
    setSearchMessage(null);
    setPane('catalog');
    focusSearch();
  };

  const chooseMode = (next: PayMode) => {
    setMode(next);
    setCheckoutError(null);
    if (next === 'mixto' && mixedRows.length === 0) setMixedRows([{ method: 'efectivo', amount: totals.total }]);
  };

  const chooseCustomer = (id: string | null) => {
    setCustomerId(id);
    if (id === null && mode === 'credito') setMode('efectivo');
  };

  const submit = (token?: string) => {
    if (!canConfirm) return;
    setCheckoutError(null);
    createSale.mutate(
      {
        clientOperationId: operationId,
        shiftId: shift.id,
        customerId,
        lines,
        payments,
        ...((token ?? approvalToken) ? { approvalToken: token ?? approvalToken } : {}),
      },
      {
        onSuccess: (result) => {
          setPayOpen(false);
          setReceipt(result);
        },
        onError: (error) => {
          const detailAction = asApprovalAction(error.details?.action);
          const askPin = (request: PinRequest) => {
            setPayOpen(false);
            setPinRequest(request);
          };
          switch (error.code) {
            case 'STOCK_INSUFFICIENT':
              return askPin({ action: 'negative_stock', reason: 'No hay existencias suficientes. Un supervisor puede autorizar la venta.' });
            case 'APPROVAL_REQUIRED':
            case 'APPROVAL_INVALID':
              setApprovalToken(undefined);
              return askPin({ action: detailAction ?? 'discount', reason: error.message });
            case 'PRICE_BELOW_COST':
              return askPin({ action: 'below_cost', reason: 'El precio queda bajo el costo: solo el propietario puede autorizarlo.' });
            default:
              return setCheckoutError(describeCheckoutError(error));
          }
        },
      },
    );
  };

  const holdCurrent = () => {
    if (lines.length === 0) return;
    heldSales.hold(lines, customerId);
    reset();
  };
  const resume = (sale: HeldSale) => {
    setLines(sale.lines);
    setCustomerId(sale.customerId);
    setReceivedState(null);
    heldSales.remove(sale.id);
    setHeldOpen(false);
    focusSearch();
  };

  const openPay = () => {
    if (lines.length === 0 || creditBlocked) return;
    setCheckoutError(null);
    setPayOpen(true);
  };

  const applyDiscounts = (discounts: Record<string, number>) => {
    setLines((current) => current.map((l) => ({ ...l, discount: discounts[l.productId] ?? l.discount })));
    setApprovalToken(undefined);
    setDiscountOpen(false);
  };

  // Con la vista "Historial" activa la venta sigue montada pero sin atajos (evita cobrar un carrito oculto).
  const idle = active && !anyOverlay;
  useHotkey('F2', focusSearch, idle);
  useHotkey('F3', () => customerRef.current?.focus(), idle);
  useHotkey('F4', () => setDiscountOpen(true), idle && lines.length > 0);
  useHotkey('F6', () => setHeldOpen(true), idle);
  useHotkey('F8', () => (payOpen ? submit() : openPay()), active && lines.length > 0 && (payOpen || !anyOverlay));
  useHotkey('F9', holdCurrent, idle && lines.length > 0);
  useHotkey('F10', () => setCashOpen(true), idle);
  useHotkey('Escape', () => setConfirm('cancel'), idle && lines.length > 0);

  const closeReceipt = () => {
    setReceipt(null);
    reset();
  };

  return (
    <ScreenTemplate
      title="Punto de venta"
      subtitle={`Venta rápida · Turno ${shift.id} · Efectivo esperado ${formatMoney(shift.expectedCash)}`}
      actions={
        <span className="pos__actions">
          <Button
            type="button" icon="pi pi-clock" outlined
            label={`Suspendidas (${heldSales.held.length})`} aria-label={`Suspendidas, ${heldSales.held.length} (F6)`}
            onClick={() => setHeldOpen(true)}
          />
          <Button type="button" label="Caja (F10)" icon="pi pi-wallet" outlined onClick={() => setCashOpen(true)} />
        </span>
      }
    >
      <div className="pos" data-pane={pane}>
        <div className="pos__layout">
          <div className="pos__main">
            <CatalogPanel
              query={query}
              onQuery={(v) => {
                setQuery(v);
                setSearchMessage(null);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                runSearch();
              }}
              onSearch={runSearch}
              inputRef={searchRef}
              message={searchMessage}
              categories={categories}
              category={category}
              onCategory={setCategory}
              results={results}
              filtering={query.trim() !== '' || category !== ALL_CATEGORIES}
              onAdd={addProduct}
            />

            <section className="pos__cart-area" aria-label="Líneas de la venta">
              <div className="pos__cart-head">
                <Button
                  type="button" icon="pi pi-arrow-left" text label="Seguir agregando"
                  className="pos__back" onClick={() => setPane('catalog')}
                />
                <h2>Venta actual</h2>
              </div>
              {priced.length === 0 ? (
                <p className="pos__empty" data-testid="cart-empty">
                  <i className="pi pi-shopping-cart" aria-hidden="true" />
                  Escanea o elige un producto para empezar.
                </p>
              ) : (
                <>
                  <CartLines lines={priced} onDelta={changeQuantity} onSetQuantity={setQuantity} onRemove={removeLine} />
                  <div className="pos__line-actions">
                    <Button
                      type="button" label="Vaciar" icon="pi pi-trash" outlined severity="danger" className="pos__btn-danger"
                      onClick={() => setConfirm('clear')}
                    />
                    <Button type="button" label="Aplicar descuento (F4)" icon="pi pi-percentage" outlined onClick={() => setDiscountOpen(true)} />
                    <Button
                      type="button" label="Notas" icon="pi pi-file-edit" outlined
                      onClick={() => {
                        setNoteDraft(note);
                        setNotesOpen(true);
                      }}
                    />
                    <Button type="button" label="Guardar como pendiente" icon="pi pi-save" outlined onClick={holdCurrent} />
                  </div>
                  {note ? <p className="pos__hint">Nota: {note}</p> : null}
                </>
              )}
            </section>
          </div>

          <SalePanel
            customers={customerList}
            customer={customer}
            customerId={customerId}
            onCustomer={chooseCustomer}
            customerRef={customerRef}
            itemCount={lines.length}
            gross={gross}
            discount={discountTotal}
            vat={vat}
            roundingAdjustment={totals.roundingAdjustment}
            total={totals.total}
            mode={mode}
            onMode={chooseMode}
            hasLines={lines.length > 0}
            pending={createSale.isPending}
            onCharge={openPay}
            onHold={holdCurrent}
            onCancel={() => setConfirm('cancel')}
          />
        </div>

        {lines.length > 0 ? (
          <div className="pos__mobilebar">
            <Button
              type="button"
              className="pos__mobilebar-btn"
              onClick={() => setPane('cart')}
              aria-label={`Ver carrito, ${units} unidades, ${formatMoney(totals.total)}`}
            >
              <span className="pos__mobilebar-count">{units}</span>
              <span>Ver carrito</span>
              <MoneyText value={totals.total} strong />
            </Button>
          </div>
        ) : null}

        <ShortcutBar
          summary={`${lines.length} ${lines.length === 1 ? 'producto' : 'productos'} · ${units} ${units === 1 ? 'unidad' : 'unidades'}`}
          shortcuts={[
            { keys: 'F2', label: 'Buscar' },
            { keys: 'F3', label: 'Cliente' },
            { keys: 'F4', label: 'Descuento' },
            { keys: 'F8', label: 'Cobrar' },
            { keys: 'F9', label: 'Suspender' },
            { keys: 'Esc', label: 'Cancelar' },
          ]}
        />
      </div>

      <PaymentDialog
        visible={payOpen}
        mode={mode}
        total={totals.total}
        roundingAdjustment={totals.roundingAdjustment}
        customer={customer}
        received={received}
        onReceived={(value) => setReceivedState(value === null ? null : { total: totals.total, amount: value })}
        channel={channel}
        onChannel={setChannel}
        rows={mixedRows}
        onRows={setMixedRows}
        paid={paid}
        missing={missing}
        change={change}
        canConfirm={canConfirm}
        pending={createSale.isPending}
        error={checkoutError}
        onDismissError={() => setCheckoutError(null)}
        onConfirm={() => submit()}
        onHide={() => setPayOpen(false)}
      />

      <HeldSalesDialog
        visible={heldOpen}
        held={heldSales.held}
        products={byId}
        canResume={lines.length === 0}
        onResume={resume}
        onDiscard={(sale) => heldSales.remove(sale.id)}
        onHide={() => setHeldOpen(false)}
      />
      <CashDialog shift={shift} heldCount={heldSales.held.length} visible={cashOpen} onHide={() => setCashOpen(false)} />

      {discountOpen ? (
        <DiscountDialog lines={priced} onApply={applyDiscounts} onHide={() => setDiscountOpen(false)} />
      ) : null}

      <FormDialog
        visible={notesOpen}
        title="Notas de la venta"
        onHide={() => setNotesOpen(false)}
        onSubmit={() => {
          setNote(noteDraft.trim());
          setNotesOpen(false);
        }}
        submitLabel="Guardar nota"
      >
        <label htmlFor="sale-note" className="block mb-1 font-medium">Nota</label>
        <textarea
          id="sale-note"
          className="p-inputtext w-full"
          rows={3}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
        />
        <p className="pos__hint">
          PROPUESTA: la nota solo se ve en esta pantalla; el contrato de venta aún no tiene un campo de notas y no se envía al servidor.
        </p>
      </FormDialog>

      <ConfirmAction
        visible={confirm !== null}
        tone="danger"
        title={confirm === 'clear' ? 'Vaciar la venta' : 'Cancelar la venta'}
        message={
          confirm === 'clear'
            ? 'Se quitarán todos los productos de la venta actual.'
            : 'Se descarta la venta actual (productos, cliente y descuentos). Para conservarla, usa Suspender.'
        }
        confirmLabel={confirm === 'clear' ? 'Vaciar' : 'Cancelar venta'}
        cancelLabel="Volver"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === 'clear') {
            setLines([]);
            focusSearch();
          } else reset();
          setConfirm(null);
        }}
      />

      <SupervisorPinDialog
        action={pinRequest?.action ?? null}
        reason={pinRequest?.reason}
        onCancel={() => {
          setPinRequest(null);
          setPayOpen(true);
        }}
        onApproved={(token) => {
          setApprovalToken(token);
          setPinRequest(null);
          submit(token);
        }}
      />

      <Dialog
        header="Venta completada"
        visible={receipt !== null}
        onHide={closeReceipt}
        className="pos-dialog"
        style={{ width: 'min(26rem, 95vw)' }}
        modal
      >
        {receipt ? (
          <div className="pos__receipt pos-done">
            <span className="pos-done__icon" aria-hidden="true"><i className="pi pi-check" /></span>
            <p className="pos-done__title">¡Venta completada!</p>
            <p className="pos__hint">Número <strong data-testid="receipt-number">{receipt.number}</strong></p>
            <dl className="pos-done__facts">
              <div><dt>Total</dt><dd><MoneyText value={receipt.total} strong /></dd></div>
              <div><dt>Cambio</dt><dd className="pos__change"><MoneyText value={receipt.change} /></dd></div>
            </dl>
            {note ? <p className="pos__hint">Nota: {note}</p> : null}
            <div className="pos__print-hide pos-done__actions">
              <Button type="button" label="Nueva venta" icon="pi pi-plus" autoFocus onClick={closeReceipt} />
              <Button type="button" label="Imprimir" icon="pi pi-print" outlined onClick={() => window.print()} />
            </div>
          </div>
        ) : null}
      </Dialog>
    </ScreenTemplate>
  );
};
