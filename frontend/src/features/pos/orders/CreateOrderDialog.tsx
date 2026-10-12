import { useState } from 'react';
import { useEmployees } from '@/shared/api/queries';
import { FormDialog, MoneyInput, MoneyText } from '@/shared/ui';
import {
  createOrder, fulfillmentLabels, linesTotal, slotLabels,
  type Actor, type Fulfillment, type NewOrder, type Order, type PaymentState, type Slot,
} from './orders';
import { useOrders } from './useOrders';

export type OrderCustomer = { id: string; name: string; creditLimit: number; outstandingBalance: number };

type Props = {
  visible: boolean;
  branchId: string;
  actor: Actor;
  lines: NewOrder['lines'];
  customer: OrderCustomer | null;
  /** Venta ya cobrada que se entrega después: el pedido nace pagado y no se cobra de nuevo. */
  saleId?: string | null;
  onHide: () => void;
  onCreated: (order: Order) => void;
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Crear pedido / programar entrega (PROPUESTA). Dos caminos que NO deben confundirse:
 * - con `saleId`: cobrar y entregar después (pedido de cumplimiento, ya pagado);
 * - sin `saleId`: crear pedido y cobrar después (sin venta ni factura simuladas).
 */
export const CreateOrderDialog = ({ visible, branchId, actor, lines, customer, saleId = null, onHide, onCreated }: Props) => {
  const employees = useEmployees();
  const { orders, add } = useOrders(branchId);
  const [fulfillment, setFulfillment] = useState<Fulfillment>('recogida');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(today());
  const [slot, setSlot] = useState<Slot>('manana');
  const [assignee, setAssignee] = useState('');
  const [shipping, setShipping] = useState<number | null>(0);
  const [payment, setPayment] = useState<PaymentState>('sin-pago');
  const [paid, setPaid] = useState<number | null>(0);
  const [notes, setNotes] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = linesTotal(lines) + (fulfillment === 'domicilio' || fulfillment === 'acordada' ? shipping ?? 0 : 0);
  const worker = (employees.data ?? []).find((e) => e.id === assignee);
  const effectivePayment: PaymentState = saleId ? 'pagado' : payment;

  const submit = () => {
    if (effectivePayment === 'credito' && customer && customer.creditLimit - customer.outstandingBalance < total) {
      setError('El cupo de crédito del cliente no alcanza para este pedido. Elige otra forma de pago o pide autorización.');
      return;
    }
    const result = createOrder(
      {
        customerId: customer?.id ?? null,
        customerName: customer?.name ?? 'Consumidor final',
        fulfillment, address, scheduledFor: date, slot,
        assigneeId: worker?.id ?? null, assigneeName: worker?.name ?? '',
        shippingCost: fulfillment === 'recogida' ? 0 : shipping ?? 0,
        notes, lines, paymentState: effectivePayment,
        paidAmount: effectivePayment === 'abono' ? paid ?? 0 : 0,
        saleId, priority: urgent ? 'alta' : 'normal',
      },
      orders, actor, new Date(),
    );
    if (!result.ok) return setError(result.message);
    if (!add(result.value)) return setError('No se pudo guardar el pedido en este dispositivo. No se creó.');
    setError(null);
    onCreated(result.value);
  };

  return (
    <FormDialog
      visible={visible} title={saleId ? 'Programar entrega de esta venta' : 'Crear pedido'} onHide={onHide} onSubmit={submit}
      submitLabel="Crear pedido" error={error} width="min(40rem, 96vw)"
    >
      <p className="pos__hint" role="note">
        {saleId
          ? 'La venta ya está cobrada: este pedido solo organiza la preparación y la entrega, sin cobrar de nuevo.'
          : 'Se guarda el pedido sin registrar una venta ni una factura: se cobra después, en caja.'}
      </p>
      <dl className="ord-facts">
        <div><dt>Cliente</dt><dd>{customer?.name ?? 'Consumidor final'}</dd></div>
        <div><dt>Productos</dt><dd>{lines.length} · <MoneyText value={linesTotal(lines)} /></dd></div>
      </dl>

      <div className="ord-grid">
        <div>
          <label htmlFor="co-ful" className="ord-label">Tipo de entrega</label>
          <select id="co-ful" className="p-inputtext w-full" value={fulfillment} onChange={(e) => setFulfillment(e.target.value as Fulfillment)}>
            {(Object.keys(fulfillmentLabels) as Fulfillment[]).map((k) => <option key={k} value={k}>{fulfillmentLabels[k]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="co-date" className="ord-label">Fecha</label>
          <input id="co-date" className="p-inputtext w-full" type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="co-slot" className="ord-label">Franja</label>
          <select id="co-slot" className="p-inputtext w-full" value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
            {(Object.keys(slotLabels) as Slot[]).map((k) => <option key={k} value={k}>{slotLabels[k]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="co-who" className="ord-label">Responsable</label>
          <select id="co-who" className="p-inputtext w-full" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Sin asignar</option>
            {(employees.data ?? []).filter((e) => e.active).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {fulfillment !== 'recogida' ? (
        <>
          <label htmlFor="co-addr" className="ord-label">Dirección de entrega</label>
          <input id="co-addr" className="p-inputtext w-full" value={address} onChange={(e) => setAddress(e.target.value)} />
          <label htmlFor="co-ship" className="ord-label">Costo de envío</label>
          <MoneyInput id="co-ship" value={shipping} onChange={setShipping} aria-label="Costo de envío" />
        </>
      ) : null}

      {!saleId ? (
        <>
          <label htmlFor="co-pay" className="ord-label">Pago</label>
          <select id="co-pay" className="p-inputtext w-full" value={payment} onChange={(e) => setPayment(e.target.value as PaymentState)}>
            <option value="sin-pago">Cobrar después (sin pago)</option>
            <option value="abono">Con abono</option>
            <option value="credito" disabled={!customer}>A crédito{customer ? '' : ' (necesita cliente)'}</option>
          </select>
          {payment === 'abono' ? (
            <>
              <label htmlFor="co-paid" className="ord-label">Valor del abono</label>
              <MoneyInput id="co-paid" value={paid} onChange={setPaid} aria-label="Valor del abono" max={total} />
            </>
          ) : null}
        </>
      ) : null}

      <label htmlFor="co-notes" className="ord-label">Observaciones</label>
      <textarea id="co-notes" className="p-inputtext w-full" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="ord-check">
        <input id="co-urgent" type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
        <label htmlFor="co-urgent">Prioridad alta</label>
      </div>
      <p className="ord-total">Total del pedido: <MoneyText value={total} strong /></p>
    </FormDialog>
  );
};
