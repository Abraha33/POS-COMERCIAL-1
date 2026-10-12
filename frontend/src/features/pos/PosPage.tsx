import { useState } from 'react';
import { useSession } from '@/app/providers/SessionProvider';
import { useCurrentShift } from '@/shared/api/pos';
import { ErrorState, LoadingState, ScreenTemplate } from '@/shared/ui';
import { OpenShiftCard } from './OpenShiftCard';
import { OrdersBoard } from './orders/OrdersBoard';
import { counts, withBalance, type Order } from './orders/orders';
import { useOrders } from './orders/useOrders';
import { PosNav, type PosView } from './PosNav';
import { QuickSale, type PreloadOrder } from './QuickSale';
import { SalesHistory } from './SalesHistory';
import { useHeldSales } from './useHeldSales';
import './pos.css';

/**
 * Pantalla del POS. La barra de navegación operativa conserva el carrito: la venta rápida queda montada (oculta) al
 * pasar a Pedidos o Historial, sin atajos. Sin turno abierto muestra la apertura (BR-VEN-01).
 */
export const PosPage = () => {
  const shift = useCurrentShift();
  const { session } = useSession();
  const [view, setView] = useState<PosView>('sell');
  const [heldToken, setHeldToken] = useState(0);
  const [boardFilter, setBoardFilter] = useState<'todos' | 'cobros'>('todos');
  const [preload, setPreload] = useState<PreloadOrder | null>(null);

  const registerId = shift.data?.registerId ?? session.register.id;
  const held = useHeldSales(registerId);
  const { orders } = useOrders(session.branch.id);
  const c = counts(orders);
  const openOrders = c.pendiente + c.proceso + c.problema + c.listo;
  const actor = { id: session.user.id, name: session.user.name };

  const collect = (order: Order) => {
    setPreload({ orderId: order.id, customerId: order.customerId, lines: order.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })) });
    setView('sell');
  };

  const sellContent = (() => {
    if (shift.isLoading) {
      return <ScreenTemplate title="Punto de venta"><LoadingState /></ScreenTemplate>;
    }
    if (shift.error) {
      return (
        <ScreenTemplate title="Punto de venta">
          <ErrorState error={shift.error} onRetry={() => void shift.refetch()} />
        </ScreenTemplate>
      );
    }
    if (!shift.data) return <OpenShiftCard />;
    return (
      <QuickSale
        shift={shift.data} active={view === 'sell'} preload={preload} onPreloadUsed={() => setPreload(null)}
        openHeldToken={heldToken}
      />
    );
  })();

  return (
    <div>
      <PosNav
        view={view}
        heldCount={held.held.length}
        openOrders={openOrders}
        collectCount={withBalance(orders).length}
        light={counts(orders)}
        onSell={() => setView('sell')}
        onHeld={() => { setView('sell'); setHeldToken((n) => n + 1); }}
        onCollections={() => { setBoardFilter('cobros'); setView('orders'); }}
        onOrders={() => { setBoardFilter('todos'); setView('orders'); }}
        onHistory={() => setView('history')}
      />
      <div hidden={view !== 'sell'}>{sellContent}</div>
      {view === 'orders' ? (
        <OrdersBoard key={boardFilter} branchId={session.branch.id} actor={actor} initialFilter={boardFilter} onCollect={collect} />
      ) : null}
      {view === 'history' ? <SalesHistory onNewSale={() => setView('sell')} /> : null}
    </div>
  );
};
