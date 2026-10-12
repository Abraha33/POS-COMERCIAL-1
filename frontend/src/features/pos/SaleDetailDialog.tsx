import { registerReprint, reprintCount } from './reprints';
import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import type { Product, Sale } from '@/shared/contracts';
import { MoneyText, SegmentedTabs, StatusTag } from '@/shared/ui';
import { formatSaleDate, methodLabels, paymentSummary } from './saleText';

type Tab = 'info' | 'products' | 'payments';

const tabs: { value: Tab; label: string }[] = [
  { value: 'info', label: 'Información' },
  { value: 'products', label: 'Productos' },
  { value: 'payments', label: 'Pagos' },
];

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

/**
 * Detalle de venta (maqueta ref-2 #5) con pestañas Información / Productos / Pagos. Los tres paneles se renderizan y
 * los inactivos se ocultan (`hidden`), así "Imprimir" saca la venta completa. `.pos__receipt` es lo que se imprime.
 */
export const SaleDetailDialog = ({
  sale, customerName, products, returnedInSession, canOperate, onReturn, onVoid, onHide,
}: Props) => {
  const [tab, setTab] = useState<Tab>('info');
  const [copies, setCopies] = useState(() => reprintCount(sale.number));
  const voided = sale.status === 'anulada';
  const gross = sale.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discount = sale.lines.reduce((sum, l) => sum + l.discount, 0);
  const paid = sale.payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Dialog
      header={
        <span className="pos-detail__title">
          Venta {sale.number} <StatusTag status={sale.status} />
        </span>
      }
      visible
      onHide={onHide}
      className="pos-dialog"
      style={{ width: 'min(42rem, 95vw)' }}
      modal
    >
      <div className="pos__receipt" data-testid="sale-detail">
        {copies > 0 ? (
          <p className="pos__hint" data-testid="reprint-note">
            COPIA {copies} — mismo documento {sale.number}; no es una venta nueva ni mueve stock o caja.
          </p>
        ) : null}
        <SegmentedTabs ariaLabel="Secciones de la venta" variant="tabs" options={tabs} value={tab} onChange={setTab} />

        <div className="pos-detail__panel" role="tabpanel" aria-label="Información" hidden={tab !== 'info'}>
          <dl className="pos__facts">
            <div><dt>Fecha</dt><dd>{formatSaleDate(sale.date)}</dd></div>
            <div><dt>Cliente</dt><dd>{customerName}</dd></div>
            <div><dt>Medio de pago</dt><dd>{paymentSummary(sale)}</dd></div>
          </dl>
          <div className="pos__totals">
            <div><span>Subtotal</span><MoneyText value={gross} /></div>
            <div><span>Descuento</span><MoneyText value={discount === 0 ? 0 : -discount} signed /></div>
            {sale.roundingAdjustment !== 0 ? (
              <div><span>Ajuste al peso</span><MoneyText value={sale.roundingAdjustment} signed /></div>
            ) : null}
            <div className="pos__total"><span>Total</span><MoneyText value={sale.total} strong /></div>
          </div>
        </div>

        <div className="pos-detail__panel" role="tabpanel" aria-label="Productos" hidden={tab !== 'products'}>
          <div className="pos__lines-wrap app-table-scroll">
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
                      <td className="pos__num"><MoneyText value={line.unitPrice} /></td>
                      <td className="pos__num"><MoneyText value={line.discount} /></td>
                      <td className="pos__num"><MoneyText value={line.unitPrice * line.quantity - line.discount} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pos-detail__panel" role="tabpanel" aria-label="Pagos" hidden={tab !== 'payments'}>
          <ul className="pos-detail__payments">
            {sale.payments.map((payment, index) => (
              <li key={`${payment.method}-${index}`}>
                <span>{methodLabels[payment.method]}</span>
                <MoneyText value={payment.amount} />
              </li>
            ))}
          </ul>
          <div className="pos__totals">
            <div className="pos__total"><span>Total pagado</span><MoneyText value={paid} strong /></div>
          </div>
        </div>
      </div>

      {voided ? <p className="pos__hint" role="status">Venta anulada: no admite devoluciones.</p> : null}
      <div className="app-dialog__footer">
        <Button
          type="button" label={copies > 0 ? `Reimprimir copia (${copies})` : 'Reimprimir copia'} icon="pi pi-print" outlined
          onClick={() => { setCopies(registerReprint(sale.number)); window.print(); }}
        />
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
