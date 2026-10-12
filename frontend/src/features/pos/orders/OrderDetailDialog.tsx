import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { MoneyInput, MoneyText, StatusTag, type StatusDef } from '@/shared/ui';
import {
  balanceOf, cancelOrder, deliver, dispatch, fulfillmentLabels, isOpen, paymentLabels, registerPayment, reportMissing,
  resolveMissing, setPacked, slotLabels, statusLabels, takeOrder, verify,
  type Actor, type Order, type OrderStatus, type Res,
} from './orders';

export const orderStatusMap: Record<OrderStatus, StatusDef> = {
  pendiente: { label: statusLabels.pendiente, tone: 'warning', icon: 'pi pi-clock' },
  'en-proceso': { label: statusLabels['en-proceso'], tone: 'info', icon: 'pi pi-box' },
  problema: { label: statusLabels.problema, tone: 'danger', icon: 'pi pi-exclamation-triangle' },
  listo: { label: statusLabels.listo, tone: 'success', icon: 'pi pi-check-circle' },
  despachado: { label: statusLabels.despachado, tone: 'info', icon: 'pi pi-truck' },
  entregado: { label: statusLabels.entregado, tone: 'neutral', icon: 'pi pi-check' },
  cancelado: { label: statusLabels.cancelado, tone: 'neutral', icon: 'pi pi-ban' },
};

const fmt = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

type Props = {
  order: Order;
  actor: Actor;
  onClose: () => void;
  /** Guarda el pedido modificado. Devuelve false si no se pudo guardar. */
  onSave: (order: Order) => boolean;
  /** Pasa el pedido al cobro de caja sin reconstruir el carrito. */
  onCollect: (order: Order) => void;
};

/** Detalle y preparación de un pedido: empaque, faltantes, calidad, pago y despacho. */
export const OrderDetailDialog = ({ order, actor, onClose, onSave, onCollect }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const [missingFor, setMissingFor] = useState<string | null>(null);
  const [missingQty, setMissingQty] = useState('1');
  const [missingNote, setMissingNote] = useState('');
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const run = (fn: () => Res<Order>): boolean => {
    const r = fn();
    if (!r.ok) {
      setError(r.message);
      return false;
    }
    if (!onSave(r.value)) {
      setError('No se pudo guardar en este dispositivo. La acción no se realizó.');
      return false;
    }
    setError(null);
    return true;
  };

  const now = () => new Date();
  const open = isOpen(order);
  const working = order.status === 'en-proceso' || order.status === 'problema';
  const balance = balanceOf(order);

  return (
    <Dialog header={`Pedido ${order.number}`} visible onHide={onClose} modal className="pos-dialog" style={{ width: 'min(46rem, 96vw)' }}>
      <div className="ord-head">
        <StatusTag status={order.status} map={orderStatusMap} />
        <span className="pos__hint">{paymentLabels[order.paymentState]} · {order.priority === 'alta' ? 'Prioridad alta' : 'Prioridad normal'}</span>
      </div>

      <dl className="ord-facts">
        <div><dt>Cliente</dt><dd>{order.customerName}</dd></div>
        <div><dt>Entrega</dt><dd>{fulfillmentLabels[order.fulfillment]}</dd></div>
        <div><dt>Fecha y franja</dt><dd>{order.scheduledFor} · {slotLabels[order.slot]}</dd></div>
        <div><dt>Responsable</dt><dd>{order.assigneeName || 'Sin asignar'}</dd></div>
        {order.address ? <div className="ord-facts__wide"><dt>Dirección</dt><dd>{order.address}</dd></div> : null}
        {order.notes ? <div className="ord-facts__wide"><dt>Observaciones</dt><dd>{order.notes}</dd></div> : null}
      </dl>

      <h3 className="ord-title">Productos</h3>
      <div className="app-table-scroll" role="region" aria-label="Productos del pedido" tabIndex={0}>
        <table className="ord-table">
          <thead>
            <tr>
              <th scope="col">Producto</th><th scope="col" className="ord-num">Pedido</th>
              <th scope="col" className="ord-num">Empacado</th><th scope="col" className="ord-num">Faltante</th>
              <th scope="col"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l) => (
              <tr key={l.productId}>
                <td><strong>{l.name}</strong><br /><span className="pos__hint">{l.sku} · <MoneyText value={l.unitPrice} /></span></td>
                <td className="ord-num">{l.quantity}</td>
                <td className="ord-num">
                  {working ? (
                    <input
                      className="p-inputtext ord-qty" type="text" inputMode="numeric" aria-label={`Empacado de ${l.name}`}
                      defaultValue={String(l.packed)} key={`${l.productId}-${l.packed}`}
                      onBlur={(e) => {
                        const n = Number(e.target.value);
                        if (Number.isInteger(n) && n !== l.packed) run(() => setPacked(order, l.productId, n, actor, now()));
                        else if (!Number.isInteger(n)) setError('Escribe un número entero.');
                      }}
                    />
                  ) : l.packed}
                </td>
                <td className="ord-num">{l.missing > 0 ? <strong className="ord-missing">{l.missing}</strong> : '—'}</td>
                <td className="ord-row-actions">
                  {working && l.missing === 0 ? (
                    <Button label="Faltante" size="small" outlined aria-label={`Reportar faltante de ${l.name}`} onClick={() => setMissingFor(l.productId)} />
                  ) : null}
                  {order.status === 'problema' && l.missing > 0 ? (
                    <Button label="Resolver" size="small" aria-label={`Resolver faltante de ${l.name}`} onClick={() => run(() => resolveMissing(order, l.productId, actor, now()))} />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {missingFor ? (
        <form
          className="ord-missing-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (run(() => reportMissing(order, missingFor, Number(missingQty), missingNote, actor, now()))) {
              setMissingFor(null);
              setMissingQty('1');
              setMissingNote('');
            }
          }}
        >
          <label htmlFor="ord-mq">Unidades que faltan</label>
          <input id="ord-mq" className="p-inputtext" inputMode="numeric" value={missingQty} onChange={(e) => setMissingQty(e.target.value)} />
          <label htmlFor="ord-mn">Qué pasó</label>
          <input id="ord-mn" className="p-inputtext" value={missingNote} onChange={(e) => setMissingNote(e.target.value)} />
          <div className="ord-actions">
            <Button type="button" label="Cancelar" outlined onClick={() => setMissingFor(null)} />
            <Button type="submit" label="Reportar faltante" />
          </div>
        </form>
      ) : null}

      <h3 className="ord-title">Pago</h3>
      <dl className="ord-facts">
        <div><dt>Total</dt><dd><MoneyText value={order.total} strong /></dd></div>
        <div><dt>Pagado</dt><dd><MoneyText value={order.paidAmount} /></dd></div>
        <div><dt>Saldo</dt><dd data-testid="order-balance"><MoneyText value={balance} strong /></dd></div>
        {order.saleId ? <div><dt>Venta vinculada</dt><dd>{order.saleId}</dd></div> : null}
      </dl>
      {open && balance > 0 && order.paymentState !== 'credito' ? (
        <div className="ord-pay">
          <MoneyInput value={payAmount} onChange={setPayAmount} aria-label="Valor a registrar" max={balance} />
          <Button
            label="Registrar pago" outlined disabled={!payAmount}
            onClick={() => { if (run(() => registerPayment(order, payAmount ?? 0, actor, now()))) setPayAmount(null); }}
          />
          <Button label="Cobrar en caja" icon="pi pi-wallet" onClick={() => onCollect(order)} />
        </div>
      ) : null}

      {error ? <p className="ord-error" role="alert" data-testid="order-error">{error}</p> : null}

      <div className="ord-actions">
        {order.status === 'pendiente' ? <Button label="Tomar pedido" icon="pi pi-play" onClick={() => run(() => takeOrder(order, actor, now()))} /> : null}
        {order.status === 'en-proceso' ? <Button label="Verificar y marcar listo" icon="pi pi-check-circle" onClick={() => run(() => verify(order, actor, now()))} /> : null}
        {order.status === 'listo' ? <Button label="Despachar" icon="pi pi-truck" onClick={() => run(() => dispatch(order, actor, now()))} /> : null}
        {order.status === 'despachado' ? <Button label="Confirmar entrega" icon="pi pi-check" onClick={() => run(() => deliver(order, actor, now()))} /> : null}
        {open && order.status !== 'despachado' ? (
          <Button label="Cancelar pedido" severity="danger" outlined onClick={() => setCancelling((v) => !v)} />
        ) : null}
      </div>

      {cancelling ? (
        <form
          className="ord-missing-form"
          onSubmit={(e) => { e.preventDefault(); if (run(() => cancelOrder(order, cancelReason, actor, now()))) onClose(); }}
        >
          <label htmlFor="ord-cr">Motivo de la cancelación</label>
          <input id="ord-cr" className="p-inputtext" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          <div className="ord-actions"><Button type="submit" label="Confirmar cancelación" severity="danger" /></div>
        </form>
      ) : null}

      <h3 className="ord-title">Historial</h3>
      <ul className="ord-history" aria-label="Historial del pedido">
        {order.history.map((h, i) => (
          <li key={`${h.at}-${i}`}>{fmt(h.at)} · <strong>{h.event}</strong> · {h.actorName}{h.detail ? ` · ${h.detail}` : ''}</li>
        ))}
      </ul>
    </Dialog>
  );
};
