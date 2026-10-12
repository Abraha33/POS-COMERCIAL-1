import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import type { Product, StockLevel } from '@/shared/contracts';
import { MoneyText } from '@/shared/ui';
import { tierFor, tiersFor } from './priceTiers';

type Props = {
  product: Product;
  /** Existencias por sede (de /stock/levels). */
  stock: StockLevel[];
  branchNames: Record<string, string>;
  currentBranchId: string;
  onAdd: (product: Product, quantity: number) => void;
  onHide: () => void;
};

/** Detalle del producto bajo demanda (P3): identificación, existencias por sede y precios por volumen (PROPUESTA). */
export const ProductDetailPanel = ({ product, stock, branchNames, currentBranchId, onAdd, onHide }: Props) => {
  const [qty, setQty] = useState('1');
  const quantity = Number(qty);
  const valid = Number.isInteger(quantity) && quantity > 0;
  const tiers = tiersFor(product);
  const tier = valid ? tierFor(tiers, quantity) : null;
  const unit = tier?.unitPrice ?? product.price;
  const here = stock.find((s) => s.branchId === currentBranchId)?.onHand ?? 0;

  return (
    <Dialog header={product.name} visible onHide={onHide} position="right" modal className="pos-dialog pos-detail" style={{ width: 'min(26rem, 100vw)' }}>
      <dl className="pos__facts">
        <div><dt>SKU</dt><dd>{product.sku}</dd></div>
        <div><dt>Código de barras</dt><dd>{product.barcode ?? '—'}</dd></div>
        <div><dt>Marca</dt><dd>{product.brand ?? '—'}</dd></div>
        <div><dt>Categoría</dt><dd>{product.category}</dd></div>
        <div><dt>Unidad</dt><dd>{product.unit}</dd></div>
        <div><dt>Precio</dt><dd><MoneyText value={product.price} strong /></dd></div>
        <div><dt>En esta sede</dt><dd data-testid="detail-stock">{here}</dd></div>
      </dl>

      {stock.length > 1 ? (
        <>
          <h3 className="pos-detail__title">Existencias por sede</h3>
          <ul className="pos__hint pos-detail__list">
            {stock.map((s) => <li key={s.branchId}>{branchNames[s.branchId] ?? s.branchId}: {s.onHand}</li>)}
          </ul>
        </>
      ) : null}

      {product.presentations && product.presentations.length > 0 ? (
        <>
          <h3 className="pos-detail__title">Presentaciones</h3>
          <ul className="pos-detail__presentations" aria-label="Presentaciones">
            {product.presentations.map((pr) => (
              <li key={pr.name}>
                <span>
                  {pr.name} · {pr.factor} {product.unit}
                  {pr.price !== undefined ? <> · <MoneyText value={pr.price} /></> : null}
                </span>
                <Button
                  type="button" size="small" outlined label="Agregar" aria-label={`Agregar ${pr.name}`}
                  onClick={() => onAdd(product, pr.factor)}
                />
              </li>
            ))}
          </ul>
          <p className="pos__hint" role="note">El cobro se calcula por unidad base; el precio de la presentación es informativo.</p>
        </>
      ) : null}

      <h3 className="pos-detail__title">Precios por volumen</h3>
      <p className="pos__hint" role="note">Ejemplo (PROPUESTA): informativo, el servidor decide el precio de la venta.</p>
      <table className="pos-detail__tiers">
        <thead><tr><th scope="col">Cantidad</th><th scope="col" className="pos-detail__num">Precio unitario</th></tr></thead>
        <tbody>
          {tiers.map((t) => (
            <tr key={t.min} aria-current={tier?.min === t.min ? 'true' : undefined} className={tier?.min === t.min ? 'is-current' : undefined}>
              <td>{t.max === null ? `${t.min}+` : `${t.min}–${t.max}`}</td>
              <td className="pos-detail__num"><MoneyText value={t.unitPrice} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <label htmlFor="pos-detail-qty" className="pos-detail__title">Cantidad</label>
      <input
        id="pos-detail-qty" className="p-inputtext w-full" inputMode="numeric" value={qty} autoComplete="off"
        aria-invalid={!valid || undefined} onChange={(e) => setQty(e.target.value)}
      />
      {valid && quantity > here ? <p className="pos__hint" role="status">Hay {here} en esta sede: el resto necesitará autorización.</p> : null}
      <p className="pos-detail__total" aria-live="polite">
        Subtotal estimado: <MoneyText value={valid ? unit * quantity : 0} strong />
      </p>
      <div className="pos-detail__actions">
        <Button label="Cerrar" outlined onClick={onHide} />
        <Button
          label="Agregar al carrito" icon="pi pi-plus" disabled={!valid}
          onClick={() => { onAdd(product, quantity); onHide(); }}
        />
      </div>
    </Dialog>
  );
};
