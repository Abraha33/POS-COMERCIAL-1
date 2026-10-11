import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import type { Product, Sale } from '@/shared/contracts';
import { formatMoney } from '@/shared/utils/format';
import { formatSaleDate, methodLabels, statusLabels } from './saleText';

type Props = {
  sale: Sale;
  customerName: string;
  products: Map<string, Product>;
  returnedInSession: Record<string, number>;
  canOperate: boolean;
  onReturn: () => void;
  onVoid: () => void;
  onHide: () => void;
};

/** Detalle de una venta con sus líneas (nombre de producto), pagos y acciones. El bloque `.pos__receipt` es lo que se imprime. */
export const SaleDetailDialog = ({
  sale, customerName, products, returnedInSession, canOperate, onReturn, onVoid, onHide,
}: Props) => {
  const voided = sale.status === 'anulada';
  return (
    <Dialog
      header={`Venta ${sale.number}`}
      visible
      onHide={onHide}
      className="pos-dialog"
      style={{ width: 'min(40rem, 95vw)' }}
      modal
    >
      <div className="pos__receipt" data-testid="sale-detail">
        <dl className="pos__facts">
          <div><dt>Fecha</dt><dd>{formatSaleDate(sale.date)}</dd></div>
          <div><dt>Cliente</dt><dd>{customerName}</dd></div>
          <div>
            <dt>Estado</dt>
            <dd><span className={`pos__status pos__status--${sale.status}`}>{statusLabels[sale.status]}</span></dd>
          </div>
        </dl>

        <div className="pos__lines-wrap">
          <table className="pos__detail-lines">
            <caption className="sr-only">Líneas de la venta {sale.number}</caption>
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col" className="pos__num">Cant.</th>
                <th scope="col" className="pos__num">Precio</th>
                <th scope="col" className="pos__num">Desc.</th>
                <th scope="col" className="pos__num">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.lines.map((line) => {
                const returned = returnedInSession[line.productId] ?? 0;
                return (
                  <tr key={line.productId}>
                    <td>
                      {products.get(line.productId)?.name ?? line.productId}
                      {returned > 0 ? <div className="pos__hint">Devuelto: {returned}</div> : null}
                    </td>
                    <td className="pos__num">{line.quantity}</td>
                    <td className="pos__num">{formatMoney(line.unitPrice)}</td>
                    <td className="pos__num">{formatMoney(line.discount)}</td>
                    <td className="pos__num">{formatMoney(line.unitPrice * line.quantity - line.discount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pos__totals">
          {sale.roundingAdjustment !== 0 ? (
            <div><span>Ajuste al peso</span><span>{formatMoney(sale.roundingAdjustment)}</span></div>
          ) : null}
          <div className="pos__total"><span>Total</span><span>{formatMoney(sale.total)}</span></div>
          {sale.payments.map((payment, index) => (
            <div key={`${payment.method}-${index}`} className="pos__hint">
              <span>{methodLabels[payment.method]}</span><span>{formatMoney(payment.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {voided ? <p className="pos__hint" role="status">Venta anulada: no admite devoluciones.</p> : null}
      <div className="flex flex-wrap justify-content-end gap-2">
        <Button type="button" label="Imprimir" icon="pi pi-print" outlined onClick={() => window.print()} />
        {canOperate ? (
          <>
            <Button type="button" label="Devolver" icon="pi pi-replay" outlined disabled={voided} onClick={onReturn} />
            <Button type="button" label="Anular" icon="pi pi-ban" className="pos__danger-outlined" outlined disabled={voided} onClick={onVoid} />
          </>
        ) : null}
        <Button type="button" label="Cerrar" onClick={onHide} />
      </div>
    </Dialog>
  );
};
