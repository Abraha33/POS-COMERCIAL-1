import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import type { PurchaseOrder } from '@/shared/contracts';
import { useReceivePurchaseOrder, useSendPurchaseOrder } from '@/shared/api/ledger';
import { usePayables, usePurchaseOrders, useStockLevels } from '@/shared/api/queries';
import { formatMoney } from '@/shared/utils/format';
import { Can } from '@/app/guards/RouteGuard';
import { useSession } from '@/app/providers/SessionProvider';
import { useNotify } from '@/app/providers/ToastProvider';
import { STATUS_LABEL, STATUS_SEVERITY, explainError } from './labels';
import { useLookups } from './useLookups';

type Props = { orderId: string | null; onHide: () => void };

/** Foto previa a recibir: permite mostrar "antes -> después" cuando el servidor responde. */
type ReceiveSnapshot = {
  orderId: string;
  lines: { productId: string; quantity: number; costBefore: number; onHandBefore: number }[];
};

export const OrderDetailDialog = ({ orderId, onHide }: Props) => {
  const orders = usePurchaseOrders();
  const { products, productById, supplierById } = useLookups();
  const levels = useStockLevels();
  const payables = usePayables();
  const send = useSendPurchaseOrder();
  const receive = useReceivePurchaseOrder();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const { session } = useSession();
  const branchId = session.branch.id;

  const [confirming, setConfirming] = useState(false);
  const [snapshot, setSnapshot] = useState<ReceiveSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConfirming(false);
    setError(null);
    setSnapshot((current) => (current && current.orderId === orderId ? current : null));
  }, [orderId]);

  const order: PurchaseOrder | undefined = orders.data?.find((o) => o.id === orderId);
  const supplier = order ? supplierById.get(order.supplierId) : undefined;
  const supplierName = supplier?.name ?? 'Proveedor desconocido';
  const onHandOf = (productId: string) =>
    (levels.data ?? []).find((l) => l.productId === productId && l.branchId === branchId)?.onHand ?? 0;

  const refreshOrders = () => void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });

  const handleSend = () => {
    if (!order) return;
    setError(null);
    send.mutate(
      { orderId: order.id },
      {
        onSuccess: (sent) => notify({ severity: 'success', summary: 'Orden enviada', detail: sent.number }),
        onError: (e) => {
          setError(explainError(e, 'enviar'));
          if (e.code === 'INVALID_STATE') refreshOrders();
        },
      },
    );
  };

  const askReceive = () => {
    setError(null);
    setConfirming(true);
  };

  const handleReceive = () => {
    if (!order) return;
    const before: ReceiveSnapshot = {
      orderId: order.id,
      lines: order.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        costBefore: productById.get(l.productId)?.cost ?? 0,
        onHandBefore: onHandOf(l.productId),
      })),
    };
    receive.mutate(
      { orderId: order.id },
      {
        onSuccess: (received) => {
          setConfirming(false);
          setSnapshot(before);
          notify({ severity: 'success', summary: 'Orden recibida', detail: received.number });
        },
        onError: (e) => {
          setConfirming(false);
          setError(explainError(e, 'recibir'));
          if (e.code === 'INVALID_STATE') refreshOrders();
        },
      },
    );
  };

  const refreshing = products.isFetching || levels.isFetching || payables.isFetching;
  const payable = order ? payables.data?.find((p) => p.purchaseOrderId === order.id) : undefined;
  const showEffect = Boolean(order && snapshot && snapshot.orderId === order.id && order.status === 'recibida');

  return (
    <>
      <Dialog
        header={order ? `Orden ${order.number}` : 'Orden de compra'}
        visible={orderId !== null}
        onHide={onHide}
        style={{ width: 'min(48rem, 95vw)' }}
        modal
      >
        {!order ? (
          <p role="status">{orders.isLoading ? 'Cargando orden…' : 'La orden ya no está disponible.'}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 align-items-center justify-content-between">
              <span>
                <strong>{supplierName}</strong>
                <span className="purch__hint"> · {order.date}</span>
              </span>
              <Tag value={STATUS_LABEL[order.status]} severity={STATUS_SEVERITY[order.status]} />
            </div>

            <div className="app-table-scroll mt-3" role="region" aria-label={`Líneas de la orden ${order.number}`} tabIndex={0}>
              <table className="purch__lines">
                <caption className="sr-only">Líneas de la orden {order.number}</caption>
                <thead>
                  <tr>
                    <th scope="col">Producto</th>
                    <th scope="col" className="purch__num">Cantidad</th>
                    <th scope="col" className="purch__num">Costo unitario</th>
                    <th scope="col" className="purch__num">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((l) => (
                    <tr key={l.productId}>
                      <td>{productById.get(l.productId)?.name ?? 'Producto desconocido'}</td>
                      <td className="purch__num">{l.quantity}</td>
                      <td className="purch__num">{formatMoney(l.unitCost)}</td>
                      <td className="purch__num">{formatMoney(Math.round(l.quantity * l.unitCost))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="purch__num mt-3 mb-0">
              Total: <span className="purch__total" data-testid="order-total">{formatMoney(order.total)}</span>
            </p>

            {error ? <p className="purch__error" role="alert">{error}</p> : null}

            {showEffect && snapshot ? (
              <div className="purch__panel purch__effect" data-testid="receive-effect" role="status">
                <h3>Recepción registrada</h3>
                <ul className="m-0 pl-3">
                  {snapshot.lines.map((l) => {
                    const product = productById.get(l.productId);
                    return (
                      <li key={l.productId}>
                        <strong>{product?.name ?? 'Producto'}</strong>: stock +{l.quantity} (
                        {l.onHandBefore} a {refreshing ? '…' : onHandOf(l.productId)}); costo promedio{' '}
                        {formatMoney(l.costBefore)} a {refreshing ? '…' : formatMoney(product?.cost ?? 0)}.
                      </li>
                    );
                  })}
                </ul>
                <p className="mb-0 mt-2">
                  Cuenta por pagar:{' '}
                  {payable ? (
                    <strong>{formatMoney(payable.amount)} con vencimiento {payable.due}</strong>
                  ) : (
                    <span>actualizando…</span>
                  )}
                </p>
              </div>
            ) : null}

            <div className="purch__actions">
              {order.status === 'borrador' ? (
                <Can permission="purchases.create">
                  <Button
                    type="button" label="Enviar al proveedor" icon="pi pi-send"
                    loading={send.isPending} onClick={handleSend}
                  />
                </Can>
              ) : null}
              {order.status === 'enviada' ? (
                <Can permission="purchases.receive">
                  <Button type="button" label="Recibir mercancía" icon="pi pi-inbox" onClick={askReceive} />
                </Can>
              ) : null}
              <Button type="button" label="Cerrar" severity="secondary" outlined onClick={onHide} />
            </div>
          </>
        )}
      </Dialog>

      <Dialog
        header="Confirmar recepción"
        visible={confirming && Boolean(order)}
        onHide={() => setConfirming(false)}
        style={{ width: 'min(32rem, 95vw)' }}
        modal
      >
        {order ? (
          <>
            <p className="mt-0">
              Vas a recibir la orden <strong>{order.number}</strong> de <strong>{supplierName}</strong>. Es todo o nada:
              no hay recepción parcial.
            </p>
            <ul className="pl-3">
              <li>Suma {order.lines.reduce((sum, l) => sum + l.quantity, 0)} unidades al stock de {session.branch.name}.</li>
              <li>Recalcula el costo promedio ponderado de cada producto.</li>
              <li>
                Crea una cuenta por pagar por {formatMoney(order.total)}
                {supplier ? `, a ${supplier.paymentTermsDays} días` : ''}.
              </li>
            </ul>
            <p className="purch__hint">Esta acción no se puede deshacer desde esta pantalla.</p>
            <div className="purch__actions">
              <Button type="button" label="Cancelar" severity="secondary" outlined onClick={() => setConfirming(false)} />
              <Button
                type="button" label="Confirmar recepción" icon="pi pi-check"
                loading={receive.isPending} onClick={handleReceive}
              />
            </div>
          </>
        ) : null}
      </Dialog>
    </>
  );
};
