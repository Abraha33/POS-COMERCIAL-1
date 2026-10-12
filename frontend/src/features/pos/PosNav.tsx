import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

export type PosView = 'sell' | 'orders' | 'history';

type Props = {
  view: PosView;
  heldCount: number;
  openOrders: number;
  collectCount: number;
  /** Semáforo de pedidos abiertos (resumen en el header). */
  light: { pendiente: number; proceso: number; problema: number; listo: number };
  onSell: () => void;
  onHeld: () => void;
  onCollections: () => void;
  onOrders: () => void;
  onHistory: () => void;
};

/**
 * Barra de navegación operativa (P2): conserva el carrito porque la venta rápida sigue montada.
 * Suspendidas y Cobros pendientes muestran su contador; "Más" agrupa lo administrativo.
 */
export const PosNav = ({ view, heldCount, openOrders, collectCount, light, onSell, onHeld, onCollections, onOrders, onHistory }: Props) => {
  const navigate = useNavigate();
  const [more, setMore] = useState(false);
  const item = (label: string, onClick: () => void, current: boolean, count?: number, aria?: string) => (
    <li>
      <button
        type="button" className="pos-nav__item" aria-current={current ? 'page' : undefined} aria-label={aria}
        onClick={() => { setMore(false); onClick(); }}
      >
        {label}
        {count !== undefined ? <span className="pos-nav__count" aria-hidden={aria ? 'true' : undefined}>{count}</span> : null}
      </button>
    </li>
  );

  return (
    <nav className="pos-nav" aria-label="Operación del punto de venta">
      <ul className="pos-nav__list">
        {item('Venta rápida', onSell, view === 'sell')}
        {item('Suspendidas', onHeld, false, heldCount, `Suspendidas, ${heldCount} (F6)`)}
        {item('Cobros pendientes', onCollections, false, collectCount, `Cobros pendientes, ${collectCount}`)}
        {item('Pedidos', onOrders, view === 'orders', openOrders, `Pedidos, ${openOrders} abiertos`)}
        <li className="pos-nav__light" aria-label={`Semáforo de pedidos: ${light.pendiente} pendientes, ${light.proceso} en proceso, ${light.problema} con faltante, ${light.listo} listos`}>
          <span className="pos-nav__dot pos-nav__dot--pendiente" title="Pendientes">{light.pendiente}</span>
          <span className="pos-nav__dot pos-nav__dot--proceso" title="En proceso">{light.proceso}</span>
          <span className="pos-nav__dot pos-nav__dot--problema" title="Con faltante">{light.problema}</span>
          <span className="pos-nav__dot pos-nav__dot--listo" title="Listos">{light.listo}</span>
        </li>
        {item('Mi turno', () => void navigate({ to: '/pos/turno' }), false)}
        <li className="pos-nav__more">
          <button type="button" className="pos-nav__item" aria-expanded={more} aria-haspopup="true" aria-label="Más opciones del punto de venta" onClick={() => setMore((v) => !v)}>
            Más
          </button>
          {more ? (
            <ul className="pos-nav__menu" aria-label="Opciones adicionales">
              <li><button type="button" onClick={() => { setMore(false); onHistory(); }}>Historial de ventas</button></li>
              <li><button type="button" onClick={() => { setMore(false); onHistory(); }}>Devoluciones y anulaciones</button></li>
              <li><button type="button" onClick={() => { setMore(false); void navigate({ to: '/pos/acceso' }); }}>Acceso y apertura de caja</button></li>
            </ul>
          ) : null}
        </li>
      </ul>
    </nav>
  );
};
