import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import type { Product } from '@/shared/contracts';
import { EmptyState, MoneyText } from '@/shared/ui';
import type { HeldSale } from './useHeldSales';

type Props = {
  visible: boolean;
  held: HeldSale[];
  products: Map<string, Product>;
  /** La venta actual debe estar vacía para reanudar (evita perder líneas sin querer). */
  canResume: boolean;
  onResume: (sale: HeldSale) => void;
  onDiscard: (sale: HeldSale) => void;
  onHide: () => void;
};

const summarize = (sale: HeldSale, products: Map<string, Product>) => {
  const total = sale.lines.reduce((sum, l) => sum + (products.get(l.productId)?.price ?? 0) * l.quantity - l.discount, 0);
  const units = sale.lines.reduce((sum, l) => sum + l.quantity, 0);
  return { total, units };
};

/** Ventas suspendidas (PROPUESTA BR-SUS): carritos locales por caja, sin reserva de stock. */
export const HeldSalesDialog = ({ visible, held, products, canResume, onResume, onDiscard, onHide }: Props) => (
  <Dialog header="Ventas suspendidas" visible={visible} onHide={onHide} className="pos-dialog" style={{ width: 'min(32rem, 95vw)' }} modal>
    {held.length === 0 ? (
      <div data-testid="held-empty">
        <EmptyState
          icon="pi pi-pause-circle"
          message="No hay ventas suspendidas en esta caja."
          description="Usa «Suspender» para atender a otro cliente y retomar esta venta después."
        />
      </div>
    ) : (
      <>
        {!canResume ? (
          <p className="pos__hint">Termina o suspende la venta actual para poder reanudar otra.</p>
        ) : null}
        <ul className="pos-held">
          {held.map((sale, index) => {
            const { total, units } = summarize(sale, products);
            return (
              <li key={sale.id} className="pos-held__item" data-testid="held-item">
                <span className="pos-held__text">
                  <strong>Suspendida #{index + 1}</strong>
                  <span className="pos__hint">
                    {units} {units === 1 ? 'unidad' : 'unidades'} ·{' '}
                    {new Date(sale.heldAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
                <MoneyText value={total} strong />
                <span className="pos-held__actions">
                  <Button
                    type="button" label="Reanudar" icon="pi pi-play"
                    disabled={!canResume} onClick={() => onResume(sale)}
                  />
                  <Button
                    type="button" icon="pi pi-trash" severity="danger" text
                    aria-label={`Descartar suspendida ${index + 1}`} onClick={() => onDiscard(sale)}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      </>
    )}
  </Dialog>
);
