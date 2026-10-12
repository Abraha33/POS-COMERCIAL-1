import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import type { ApprovalRequest, Payment, PaymentMethod, Product, SaleReceipt, Shift } from '@/shared/contracts';
import { useSession } from '@/app/providers/SessionProvider';
import { useNotify } from '@/app/providers/ToastProvider';
import { useCreateSale } from '@/shared/api/pos';
import { useCountryPack } from '@/shared/api/countryPack';
import { useBranches, useCustomers, useProducts, useStockLevels } from '@/shared/api/queries';
import { useHotkey } from '@/shared/keyboard/useHotkey';
import { ConfirmAction, FormDialog, MoneyText, ScreenTemplate, ShortcutBar } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { uuid } from '@/shared/utils/uuid';
import { computeTotals } from '@/shared/utils/pricing';
import { CartLines, type PricedLine } from './CartLines';
import { revalidateHeld } from './heldRevalidate';
import { CustomerHistoryDialog } from './CustomerHistoryDialog';
import { NewCustomerDialog } from './NewCustomerDialog';
import { ProductDetailPanel } from './ProductDetailPanel';
import { ALL_CATEGORIES, CatalogPanel, type Availability } from './CatalogPanel';
import { CashDialog } from './CashDialog';
import { DiscountDialog } from './DiscountDialog';
import { HeldSalesDialog } from './HeldSalesDialog';
import { PaymentDialog } from './PaymentDialog';
import { MixedPayments } from './mixed/MixedPayments';
import { componentReady, type MixedComponent } from './mixed/mixed';
import { SalePanel } from './SalePanel';
import { SupervisorPinDialog } from './SupervisorPinDialog';
import { estimateIncludedVat, paymentsTotal, type CartLine, type CreditTerm, type PayMode } from './cart';
import { loadSaleDraft, saveSaleDraft, updateSaleDraft, type SaleDraft } from './sale-draft';
import {
  canCloseSale, channelById, ChannelSection, isDuplicateReference,
  channelsFromCountryPack, loadReferences, missingFields, rememberReference, type ChannelState, type ProofRequest,
} from './proofs';
import { CreateOrderDialog } from './orders/CreateOrderDialog';
import { markCharged } from './orders/orders';
import { useOrders } from './orders/useOrders';
import { describeCheckoutError, isUnknownOutcome, UNKNOWN_CHECKOUT_MESSAGE, type CheckoutMessage } from './saleText';
import { newPaymentSession } from './payment-session/newPaymentSession';
import {
  canStartNewSale, completePaymentSession, markUnknown, rejectSubmission, retryUnknown, startSubmission,
} from './payment-session/paymentSession';
import { useHeldSales, type HeldSale } from './useHeldSales';
import './pos.css';
import './catalog-extras.css';

type PinRequest = { action: ApprovalRequest['action']; reason: string };
type Confirm = 'clear' | 'cancel' | null;
type Pane = 'catalog' | 'cart';

/** Pedido que se pasa a cobro en caja: sus líneas llenan el carrito sin reconstruirlo a mano. */
export type PreloadOrder = { orderId: string; customerId: string | null; lines: { productId: string; quantity: number }[] };

type QuickSaleProps = {
  shift: Shift;
  active?: boolean;
  preload?: PreloadOrder | null;
  onPreloadUsed?: () => void;
  /** Cambia para pedir que se abra el diálogo de suspendidas desde la barra de navegación. */
  openHeldToken?: number;
};

const approvalActions: ApprovalRequest['action'][] = ['discount', 'negative_stock', 'below_cost', 'credit_exception'];
const asApprovalAction = (value: unknown): ApprovalRequest['action'] | null =>
  approvalActions.find((a) => a === value) ?? null;

const matches = (product: Product, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [product.name, product.sku, product.barcode ?? '', product.brand ?? ''].some((field) => field.toLowerCase().includes(q));
};

/**
 * Venta rápida (maquetas ref-1/ref-2/ref-5): izquierda búsqueda + líneas, derecha cliente, resumen y cobro.
 * Teclado y lector primero; en móvil dos paneles (catálogo / carrito) con barra "Ver carrito". Reglas BR-VEN-01..14.
 * Los cambios de cantidad son relativos (seguros ante clics rápidos); cantidad ≤ 0 quita la línea.
 */
export const QuickSale = ({ shift, active = true, preload = null, onPreloadUsed, openHeldToken = 0 }: QuickSaleProps) => {
  const products = useProducts();
  const customers = useCustomers();
  const stockLevels = useStockLevels();
  const branches = useBranches();
  const createSale = useCreateSale();
  const { session, can } = useSession();
  const countryPack = useCountryPack(session.regional?.countryCode);
  const draftContext = useMemo(() => ({ registerId: shift.registerId, shiftId: shift.id }), [shift.id, shift.registerId]);
  const [saleDraft, setSaleDraft] = useState<SaleDraft>(() => loadSaleDraft(draftContext));
  const lines = saleDraft.lines;
  const customerId = saleDraft.customerId;
  const note = saleDraft.note;
  const updateDraft = useCallback((update: Parameters<typeof updateSaleDraft>[1]) => {
    setSaleDraft((current) => updateSaleDraft(current, update));
  }, []);
  const setLines = useCallback((next: SetStateAction<CartLine[]>) => {
    setSaleDraft((current) => updateSaleDraft(current, {
      lines: typeof next === 'function' ? next(current.lines) : next,
    }));
  }, []);
  const setCustomerId = useCallback((customerId: string | null) => updateDraft({ customerId }), [updateDraft]);
  const setNote = useCallback((note: string) => updateDraft({ note }), [updateDraft]);
  useEffect(() => {
    setSaleDraft(loadSaleDraft(draftContext));
  }, [draftContext]);
  useEffect(() => {
    saveSaleDraft(saleDraft);
  }, [saleDraft]);

  const channels = useMemo(() => channelsFromCountryPack(countryPack.data), [countryPack.data]);
  const documentOptions = countryPack.data?.documentTypes ?? [];
  const countryPackReady = countryPack.isSuccess && channels.length > 0 && documentOptions.length > 0;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<PayMode>('efectivo');
  const [receivedState, setReceivedState] = useState<{ total: number; amount: number } | null>(null);
  const [chan, setChan] = useState<ChannelState>({ channelId: '', destinationId: '', values: {}, proofId: null });
  const [proof, setProof] = useState<ProofRequest | null>(null);
  const [creditTerm, setCreditTerm] = useState<CreditTerm>(30);
  const [creditInitial, setCreditInitial] = useState(0);
  const [creditInstallments, setCreditInstallments] = useState(1);
  const [creditDueDate, setCreditDueDate] = useState('');
  const [creditExcess, setCreditExcess] = useState(false);
  const [docType, setDocType] = useState('');
  const [usedRefs, setUsedRefs] = useState<string[]>(loadReferences);
  const [mixed, setMixed] = useState<MixedComponent[]>([]);
  const [mixedProofs, setMixedProofs] = useState<Record<string, ProofRequest | null>>({});
  const onMixedProof = useCallback((id: string, p: ProofRequest | null) => {
    setMixedProofs((prev) => (prev[id] === p ? prev : { ...prev, [id]: p }));
  }, []);
  // La sesión de cobro es dueña de la clave idempotente y del estado (UNKNOWN, envío, completado).
  const [paymentSession, setPaymentSession] = useState(() => newPaymentSession({
    registerId: shift.registerId, shiftId: shift.id, documentType: '', mode: 'efectivo', now: new Date().toISOString(),
  }));
  const operationId = paymentSession.clientOperationId;
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
  const [availability, setAvailability] = useState<Availability>('todos');
  const [quick, setQuick] = useState<'todos' | 'frecuentes'>('todos');
  const [view, setView] = useState<'lista' | 'cuadricula'>('lista');
  const [detail, setDetail] = useState<Product | null>(null);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const notify = useNotify();
  const actor = { id: session.user.id, name: session.user.name };
  const orderStore = useOrders(session.branch.id);
  const [orderLink, setOrderLink] = useState<string | null>(null);
  const [orderDialog, setOrderDialog] = useState<'new' | 'deliver' | null>(null);
  const [deliverLines, setDeliverLines] = useState<{ productId: string; name: string; sku: string; quantity: number; unitPrice: number }[]>([]);
  const [deliverSale, setDeliverSale] = useState<string | null>(null);

  const heldSales = useHeldSales(shift.registerId);
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLSelectElement>(null);

  const catalog = useMemo(() => (products.data ?? []).filter((p) => p.active), [products.data]);
  const byId = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);
  const categories = useMemo(() => [...new Set(catalog.map((p) => p.category))].sort(), [catalog]);
  const branchId = session.branch.id;
  const onHandHere = useMemo(() => {
    const m = new Map<string, number>();
    for (const level of stockLevels.data ?? []) if (level.branchId === branchId) m.set(level.productId, level.onHand);
    return m;
  }, [stockLevels.data, branchId]);
  const stockOf = (productId: string) => onHandHere.get(productId) ?? 0;
  const freqKey = `pos.freq.${shift.registerId}`;
  const [frequent, setFrequent] = useState<Record<string, number>>(() => {
    try {
      const raw: unknown = JSON.parse(window.localStorage.getItem(freqKey) ?? '{}');
      return raw && typeof raw === 'object' ? (raw as Record<string, number>) : {};
    } catch {
      return {};
    }
  });
  const filtered = useMemo(
    () =>
      catalog
        .filter((p) => (category === ALL_CATEGORIES || p.category === category) && matches(p, query))
        .filter((p) => availability === 'todos' || (availability === 'disponibles') === ((onHandHere.get(p.id) ?? 0) > 0))
        .filter((p) => quick === 'todos' || (frequent[p.id] ?? 0) > 0)
        .sort((a, b) => (quick === 'frecuentes' ? (frequent[b.id] ?? 0) - (frequent[a.id] ?? 0) : 0)),
    [catalog, category, query, availability, quick, onHandHere, frequent],
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

  const mixedActive = mixed.filter((c) => c.reversed === null);
  const mixedHasCash = mixedActive.some((c) => channelById(channels, c.state.channelId)?.method === 'efectivo');
  const initialPayment = mode === 'credito' ? creditInitial : 0;
  const hasCash = mode === 'mixto' ? mixedHasCash : mode === 'efectivo' || initialPayment > 0;
  const totals = computeTotals(pricedForTotals, hasCash);

  const received = receivedState && receivedState.total === totals.total ? receivedState.amount : null;
  const channelsForMode = channels.filter((c) =>
    mode === 'tarjeta' ? c.kind === 'datafono' : mode === 'transferencia' ? ['cuenta', 'billetera', 'llave', 'qr', 'pasarela'].includes(c.kind) : false,
  );
  const activeChannel = mode === 'tarjeta' || mode === 'transferencia'
    ? (channelById(channelsForMode, chan.channelId) ?? channelsForMode[0])
    : undefined;
  const digitalFieldsMissing = activeChannel ? missingFields(activeChannel, chan.values) : [];
  const digitalDuplicate = activeChannel ? isDuplicateReference(usedRefs, chan.values.reference ?? '') : false;
  const mixedOk = mode !== 'mixto' || (mixedActive.length > 0 && mixedActive.every((c) => {
    const ch = channelById(channels, c.state.channelId);
    if (!ch) return false;
    const dup = isDuplicateReference(usedRefs, c.state.values.reference ?? '');
    return componentReady(ch, c.state.values, mixedProofs[c.id] ?? null, dup) && (ch.kind !== 'credito' || customerId !== null);
  }));
  const proofMatches = proof !== null && proof.operationId === operationId && proof.amount === totals.total;
  const digitalOk = mixedOk && (!activeChannel || (
    digitalFieldsMissing.length === 0 &&
    (!digitalDuplicate || (proofMatches && proof.exception !== null)) &&
    (!activeChannel.requiresProof || (proofMatches && canCloseSale(proof)))
  ));
  const payments: Payment[] = (() => {
    const amount = totals.total;
    const single = (method: PaymentMethod): Payment[] => [{ method, amount }];
    switch (mode) {
      case 'efectivo': return [{ method: 'efectivo', amount: received ?? amount }];
      case 'tarjeta':
      case 'transferencia': {
        const fallback: PaymentMethod = mode === 'tarjeta' ? 'tarjeta' : 'transferencia';
        const destination = activeChannel?.destinations.find((d) => d.id === chan.destinationId) ?? activeChannel?.destinations[0];
        return [{
          method: activeChannel?.method ?? fallback, amount,
          ...(activeChannel ? { channel: activeChannel.id } : {}),
          ...(chan.values.reference ? { reference: chan.values.reference.trim() } : chan.values.authCode ? { reference: chan.values.authCode.trim() } : {}),
          ...(destination ? { destination: destination.label } : {}),
          // proofId solo respalda un pago CONFIRMADO; una excepción autorizada no es verificación.
          ...(proofMatches && proof?.status === 'confirmado' ? { proofId: proof.id } : {}),
        }];
      }
      case 'credito': {
        const initial = Math.min(Math.max(0, creditInitial), amount);
        return initial > 0
          ? [{ method: 'efectivo', amount: initial }, { method: 'credito', amount: amount - initial }]
          : single('credito');
      }
      case 'mixto':
        return mixedActive.map((c): Payment => {
          const ch = channelById(channels, c.state.channelId) ?? channels[0]!;
          const dest = ch.destinations.find((d) => d.id === c.state.destinationId) ?? ch.destinations[0];
          const ref = c.state.values.reference ?? c.state.values.authCode;
          const prf = mixedProofs[c.id];
          return {
            method: ch.method, amount: c.amount,
            ...(ch.kind === 'efectivo' || ch.kind === 'credito' ? {} : { channel: ch.id }),
            ...(ref ? { reference: ref.trim() } : {}),
            ...(dest ? { destination: dest.label } : {}),
            ...(prf?.status === 'confirmado' ? { proofId: prf.id } : {}),
          };
        });
    }
  })();
  const paid = paymentsTotal(payments);
  const cashPaid = payments.filter((p) => p.method === 'efectivo').reduce((sum, p) => sum + p.amount, 0);
  const missing = Math.max(0, totals.total - paid);
  const change = Math.max(0, paid - totals.total);
  const creditBlocked = mode === 'credito' && customerId === null;
  const canConfirm = countryPackReady && docType !== '' && lines.length > 0 && missing === 0 && change <= cashPaid && !creditBlocked && digitalOk && !createSale.isPending;

  const anyOverlay =
    payOpen || heldOpen || cashOpen || discountOpen || notesOpen || confirm !== null || pinRequest !== null || receipt !== null;

  const focusSearch = () => searchRef.current?.focus();

  const addProduct = (product: Product, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((l) => l.productId === product.id);
      if (existing) {
        return current.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...current, { productId: product.id, quantity, discount: 0 }];
    });
    setFrequent((current) => {
      const next = { ...current, [product.id]: (current[product.id] ?? 0) + 1 };
      try {
        window.localStorage.setItem(freqKey, JSON.stringify(next));
      } catch {
        /* sin almacenamiento: los frecuentes viven en memoria */
      }
      return next;
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
    // Un cobro desconocido conserva su clave: vaciar generaría otra y podría duplicar el cobro.
    if (!canStartNewSale(paymentSession)) return;
    setLines([]);
    setReceivedState(null);
    setMixed([]);
    setMixedProofs({});
    setMode('efectivo');
    setCreditTerm(30);
    setCreditInitial(0);
    setCreditInstallments(1);
    setCreditDueDate('');
    setCreditExcess(false);
    setCustomerId(null);
    setApprovalToken(undefined);
    setCheckoutError(null);
    setNote('');
    setPaymentSession(newPaymentSession({
      registerId: shift.registerId, shiftId: shift.id, documentType: docType, mode: 'efectivo', now: new Date().toISOString(),
    }));
    setChan((c) => ({ ...c, values: {}, proofId: null }));
    setProof(null);
    setQuery('');
    setSearchMessage(null);
    setPane('catalog');
    focusSearch();
  };

  const chooseMode = (next: PayMode) => {
    setMode(next);
    setCheckoutError(null);
    if (next === 'mixto' && mixedActive.length === 0) {
      setMixed((cur) => [...cur, { id: uuid().slice(0, 8), state: { channelId: channels.find((channel) => channel.kind === 'efectivo')?.id ?? '', destinationId: '', values: {}, proofId: null }, amount: totals.total, reversed: null }]);
    }
  };

  const chooseCustomer = (id: string | null) => {
    setCustomerId(id);
    if (id === null && mode === 'credito') setMode('efectivo');
  };

  const submit = (token?: string) => {
    if (!canConfirm || paymentSession.state === 'completed') return;
    setCheckoutError(null);
    // Reintentar un cobro desconocido usa la misma clave; cualquier otro envío pasa la sesión a "enviando".
    const now = new Date().toISOString();
    setPaymentSession(paymentSession.state === 'unknown' ? retryUnknown(paymentSession, now) : startSubmission(paymentSession, now));
    createSale.mutate(
      {
        clientOperationId: operationId,
        shiftId: shift.id,
        customerId,
        documentType: docType,
        lines,
        payments,
        ...(mode === 'credito' && creditTerm !== 30 ? { creditTermDays: creditTerm } : {}),
        ...(mode === 'credito' && creditInstallments > 1 ? { creditInstallments } : {}),
        ...(mode === 'credito' && creditDueDate !== '' ? { creditDueDate } : {}),
        ...((token ?? approvalToken) ? { approvalToken: token ?? approvalToken } : {}),
      },
      {
        onSuccess: (result) => {
          setPaymentSession((current) => completePaymentSession(current, new Date().toISOString()));
          setPayOpen(false);
          setReceipt(result);
          if (activeChannel && chan.values.reference) setUsedRefs(rememberReference(chan.values.reference));
          setChan((c) => ({ ...c, values: {}, proofId: null }));
          setProof(null);
          // Pedido cobrado en caja: se vincula la venta y se registra lo cobrado, sin cobrar de nuevo.
          const linked = orderLink ? orderStore.orders.find((o) => o.id === orderLink) : undefined;
          if (linked) {
            const charged = markCharged(linked, result.number, Math.min(result.total, linked.total), actor, new Date());
            if (charged.ok) orderStore.replace(charged.value);
            setOrderLink(null);
          }
        },
        onError: (error) => {
          const detailAction = asApprovalAction(error.details?.action);
          const askPin = (request: PinRequest) => {
            setPayOpen(false);
            setPinRequest(request);
          };
          // Rechazo definitivo: el cobro no se registró, así que la sesión vuelve a editar con la misma clave.
          setPaymentSession((current) => rejectSubmission(current, new Date().toISOString()));
          // Sin respuesta (red caída) o 5xx: el servidor pudo registrar el cobro. No es un rechazo.
          if (isUnknownOutcome(error)) {
            setPaymentSession((current) => markUnknown(current, new Date().toISOString()));
            return setCheckoutError(UNKNOWN_CHECKOUT_MESSAGE);
          }
          switch (error.code) {
            case 'STOCK_INSUFFICIENT':
              return askPin({ action: 'negative_stock', reason: 'No hay existencias suficientes. Un supervisor puede autorizar la venta.' });
            case 'APPROVAL_REQUIRED':
            case 'APPROVAL_INVALID':
              setApprovalToken(undefined);
              return askPin({ action: detailAction ?? 'discount', reason: error.message });
            case 'PRICE_BELOW_COST':
              return askPin({ action: 'below_cost', reason: 'El precio queda bajo el costo: solo el propietario puede autorizarlo.' });
            case 'CREDIT_LIMIT_EXCEEDED':
              setCreditExcess(true);
              return setCheckoutError(describeCheckoutError(error));
            default:
              return setCheckoutError(describeCheckoutError(error));
          }
        },
      },
    );
  };

  const priceSnapshot = (): Record<string, number> =>
    Object.fromEntries(lines.flatMap((l) => { const p = byId.get(l.productId); return p ? [[p.id, p.price]] : []; }));
  const holdCurrent = () => {
    if (lines.length === 0) return;
    heldSales.hold(lines, customerId, priceSnapshot());
    reset();
  };
  const resume = (sale: HeldSale) => {
    const check = revalidateHeld(sale, products.data ?? []);
    if (check.dropped.length > 0 || check.changes.length > 0) {
      const name = (id: string) => byId.get(id)?.name ?? id;
      const parts = [
        ...check.changes.map((c) => `${name(c.productId)}: ${formatMoney(c.from)} → ${formatMoney(c.to)}`),
        ...check.dropped.map((id) => `${id}: ya no está disponible y se quitó`),
      ];
      notify({ severity: 'warn', summary: 'Revisa la venta reanudada', detail: parts.join(' · ') });
    }
    setLines(check.lines);
    setCustomerId(sale.customerId);
    setReceivedState(null);
    heldSales.remove(sale.id);
    setHeldOpen(false);
    focusSearch();
  };

  const openPay = () => {
    if (lines.length === 0 || creditBlocked || !countryPackReady) return;
    setCheckoutError(null);
    setPayOpen(true);
  };

  const applyDiscounts = (discounts: Record<string, number>) => {
    setLines((current) => current.map((l) => ({ ...l, discount: discounts[l.productId] ?? l.discount })));
    setApprovalToken(undefined);
    setDiscountOpen(false);
  };

  // Pasar un pedido a cobro: si hay un carrito en curso se suspende (no se pierde) y se cargan las líneas del pedido.
  useEffect(() => {
    if (!preload || products.isLoading) return;
    if (lines.length > 0) heldSales.hold(lines, customerId);
    setLines(preload.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, discount: 0 })));
    setCustomerId(preload.customerId);
    setOrderLink(preload.orderId);
    setReceivedState(null);
    setPane('cart');
    onPreloadUsed?.();
  }, [preload?.orderId, products.isLoading]);

  useEffect(() => {
    if (!countryPackReady) return;
    setDocType((current) => {
      if (documentOptions.some((option) => option.id === current)) return current;
      return documentOptions.find((option) => option.isDefault)?.id ?? documentOptions[0]?.id ?? '';
    });
  }, [countryPackReady, documentOptions]);

  useEffect(() => {
    if (openHeldToken > 0) setHeldOpen(true);
  }, [openHeldToken]);

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
          <Button type="button" label="Caja (F10)" icon="pi pi-wallet" outlined onClick={() => setCashOpen(true)} />
        </span>
      }
    >
      <div className="pos" data-pane={pane}>
        {countryPack.isError ? (
          <section className="pos__hint" role="alert">
            <p>No se pudo cargar la configuración de cobro. Reintentá antes de cobrar.</p>
            <Button type="button" label="Reintentar configuración de cobro" outlined onClick={() => void countryPack.refetch()} />
          </section>
        ) : countryPack.isLoading ? (
          <p className="pos__hint" role="status">Cargando configuración de cobro…</p>
        ) : null}
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
              filtering={query.trim() !== '' || category !== ALL_CATEGORIES || availability !== 'todos' || quick !== 'todos'}
              onAdd={(p) => addProduct(p)}
              onDetail={setDetail}
              stockOf={stockOf}
              availability={availability}
              onAvailability={setAvailability}
              quick={quick}
              onQuick={setQuick}
              view={view}
              onView={setView}
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
                    <Button
                      type="button" label="Duplicar" icon="pi pi-copy" outlined
                      onClick={() => {
                        heldSales.hold(lines, customerId, priceSnapshot());
                        notify({ severity: 'info', summary: 'Copia guardada', detail: 'Está en Suspendidas; la venta actual sigue abierta.' });
                      }}
                    />
                    <Button
                      type="button" label="Crear pedido" icon="pi pi-truck" outlined
                      onClick={() => {
                        setDeliverSale(null);
                        setDeliverLines(priced.map(({ line, product }) => ({
                          productId: product.id, name: product.name, sku: product.sku, quantity: line.quantity, unitPrice: product.price,
                        })));
                        setOrderDialog('new');
                      }}
                    />
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
            onNewCustomer={() => setNewCustomerOpen(true)}
            onEditCustomer={can('customers.edit') ? () => setEditCustomerOpen(true) : undefined}
            onHistory={() => setHistoryOpen(true)}
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
        documentSlot={
          <div>
            <label htmlFor="pay-document" className="pos-pay__label">Documento a emitir</label>
            <select
              id="pay-document" className="p-inputtext w-full" value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              {documentOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <p className="pos__hint">
              {documentOptions.find((option) => option.id === docType)?.hint} Es una selección: la emisión depende del servidor.
              {mode === 'credito' ? ' En crédito el documento se expide aunque el dinero aún no se haya recibido.' : ''}
            </p>
          </div>
        }
        digital={
          activeChannel ? (
            <ChannelSection
              channels={channelsForMode}
              state={{ ...chan, channelId: activeChannel.id }}
              onState={setChan}
              amount={totals.total}
              operationId={operationId}
              actor={session.user.name}
              canAuthorizeException={can('admin.manage')}
              usedReferences={usedRefs}
              onProof={setProof}
            />
          ) : null
        }
        creditTerm={creditTerm}
        onCreditTerm={setCreditTerm}
        creditInstallments={creditInstallments}
        onCreditInstallments={setCreditInstallments}
        creditDueDate={creditDueDate}
        onCreditDueDate={setCreditDueDate}
        creditExcess={creditExcess}
        onAuthorizeCreditExcess={() => {
          setCreditExcess(false);
          setCheckoutError(null);
          setPayOpen(false);
          setPinRequest({ action: 'credit_exception', reason: 'El saldo supera el cupo del cliente. Autoriza el propietario o un administrador.' });
        }}
        creditInitial={creditInitial}
        onCreditInitial={setCreditInitial}
        mixedSlot={
          <MixedPayments
            components={mixed}
            channels={channels}
            onChange={setMixed}
            proofs={mixedProofs}
            onProof={onMixedProof}
            operationId={operationId}
            actor={session.user.name}
            canAuthorizeException={can('admin.manage')}
            usedReferences={usedRefs}
            missing={missing}
            paid={paid}
          />
        }
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
              <Button
                type="button" label="Programar entrega" icon="pi pi-truck" outlined
                onClick={() => {
                  setDeliverSale(receipt.number);
                  setDeliverLines(priced.map(({ line, product }) => ({
                    productId: product.id, name: product.name, sku: product.sku, quantity: line.quantity, unitPrice: product.price,
                  })));
                  setOrderDialog('deliver');
                }}
              />
              <Button type="button" label="Imprimir" icon="pi pi-print" outlined onClick={() => window.print()} />
            </div>
          </div>
        ) : null}
      </Dialog>

      {detail ? (
        <ProductDetailPanel
          product={detail}
          stock={(stockLevels.data ?? []).filter((l) => l.productId === detail.id)}
          branchNames={Object.fromEntries((branches.data ?? []).map((b) => [b.id, b.name]))}
          currentBranchId={branchId}
          onAdd={(p, q) => addProduct(p, q)}
          onHide={() => setDetail(null)}
        />
      ) : null}
      {customer && historyOpen ? <CustomerHistoryDialog customer={customer} onHide={() => setHistoryOpen(false)} /> : null}
      {customer ? (
        <NewCustomerDialog
          key={customer.id}
          editing={customer}
          visible={editCustomerOpen}
          onHide={() => setEditCustomerOpen(false)}
          onCreated={(c) => {
            setEditCustomerOpen(false);
            notify({ severity: 'success', summary: 'Cliente actualizado', detail: c.name });
          }}
        />
      ) : null}
      <NewCustomerDialog
        visible={newCustomerOpen}
        onHide={() => setNewCustomerOpen(false)}
        onCreated={(c) => {
          setNewCustomerOpen(false);
          chooseCustomer(c.id);
          notify({ severity: 'success', summary: 'Cliente creado', detail: c.name });
        }}
      />

      <CreateOrderDialog
        visible={orderDialog !== null}
        branchId={session.branch.id}
        actor={actor}
        lines={deliverLines}
        saleId={deliverSale}
        customer={customer ? { id: customer.id, name: customer.name, creditLimit: customer.creditLimit, outstandingBalance: customer.outstandingBalance } : null}
        onHide={() => setOrderDialog(null)}
        onCreated={(order) => {
          const fromReceipt = orderDialog === 'deliver';
          setOrderDialog(null);
          notify({ severity: 'success', summary: `Pedido ${order.number} creado`, detail: fromReceipt ? 'La entrega quedó programada.' : 'Cóbralo después desde Pedidos.' });
          if (fromReceipt) closeReceipt();
          else reset();
        }}
      />
    </ScreenTemplate>
  );
};
