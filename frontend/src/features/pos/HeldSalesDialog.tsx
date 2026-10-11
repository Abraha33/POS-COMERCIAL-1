import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import type { Product } from '@/shared/contracts';
import { formatMoney } from '@/shared/utils/format';
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

export const HeldSalesDialog = ({ visible, held, products, canResume, onResume, onDiscard, onHide }: Props) => (
  <Dialog header="Ventas suspendidas" visible={visible} onHide={onHide} style={{ width: 'min(32rem, 95vw)' }} modal>
    {held.length === 0 ? (
      <p className="pos__hint" data-testid="held-empty">No hay ventas suspendidas en esta caja.</p>
    ) : (
      <>
        {!canResume ? (
          <p className="pos__hint">Termina o suspende la venta actual para poder reanudar otra.</p>
        ) : null}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
          {held.map((sale, index) => {
            const { total, units } = summarize(sale, products);
            return (
              <li key={sale.id} className="pos__panel" data-testid="held-item">
                <div className="flex justify-content-between align-items-center gap-2 flex-wrap">
                  <span>
                    <strong>Suspendida #{index + 1}</strong>
                    <span className="pos__hint"> · {units} uds · {formatMoney(total)}</span>
                    <div className="pos__hint">
                      {new Date(sale.heldAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </span>
                  <span className="flex gap-2">
                    <Button
                      type="button" label="Reanudar" icon="pi pi-play" size="small"
                      disabled={!canResume} onClick={() => onResume(sale)}
                    />
                    <Button
                      type="button" icon="pi pi-trash" severity="danger" text size="small"
                      aria-label={`Descartar suspendida ${index + 1}`} onClick={() => onDiscard(sale)}
                    />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </>
    )}
  </Dialog>
);
