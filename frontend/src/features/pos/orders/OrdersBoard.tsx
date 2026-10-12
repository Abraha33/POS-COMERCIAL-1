import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { EmptyState, MoneyText, StatusTag } from '@/shared/ui';
import { OrderDetailDialog, orderStatusMap } from './OrderDetailDialog';
import {
  counts, fulfillmentLabels, isOpen, paymentLabels, semaphoreOf, slotLabels, withBalance,
  type Actor, type Order, type Semaphore,
} from './orders';
import { useOrders, type OrdersSyncState } from './useOrders';

type Filter = 'todos' | Semaphore | 'cobros' | 'cerrados';

const lights: { value: Semaphore; label: string; tone: string }[] = [
  { value: 'pendiente', label: 'Pendientes', tone: 'warning' },
  { value: 'proceso', label: 'En proceso', tone: 'info' },
  { value: 'problema', label: 'Con faltante', tone: 'danger' },
  { value: 'listo', label: 'Listos', tone: 'success' },
];

type Props = {
  branchId: string;
  actor: Actor;
  /** Filtro inicial (p. ej. "cobros" desde Cobros pendientes). */
  initialFilter?: Filter;
  onCollect: (order: Order) => void;
  /** Estado de sincronización con el servidor (PROPUESTA v0.6.0). */
  sync?: OrdersSyncState;
};

const syncText = (s: OrdersSyncState): string => {
  switch (s.status) {
    case 'sincronizado': return 'Sincronizado con el servidor.';
    case 'sincronizando': return 'Sincronizando…';
    case 'pendiente': return `${s.pending} cambio(s) por enviar al servidor.`;
    case 'sin-conexion': return `Sin conexión: ${s.pending} cambio(s) guardados en este equipo; se enviarán al reconectar.`;
    case 'conflicto': return `${s.report.conflicts} pedido(s) cambiaron en otra terminal; se muestra la versión del servidor.`;
  }
};

/** Bandeja de pedidos: semáforo por estado, búsqueda y "mis pedidos". Detalle en diálogo. */
export const OrdersBoard = ({ branchId, actor, initialFilter = 'todos', onCollect, sync }: Props) => {
  const { orders, replace } = useOrders(branchId);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const c = counts(orders);
  const collectable = withBalance(orders).length;
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (filter === 'cobros') return withBalance([o]).length > 0;
        if (filter === 'cerrados') return !isOpen(o) || o.status === 'despachado';
        if (filter === 'todos') return isOpen(o);
        return semaphoreOf(o) === filter;
      })
      .filter((o) => !mine || o.assigneeId === actor.id || o.createdById === actor.id)
      .filter((o) => q === '' || o.number.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q))
      .sort((a, b) => Number(b.priority === 'alta') - Number(a.priority === 'alta') || a.scheduledFor.localeCompare(b.scheduledFor));
  }, [orders, filter, query, mine, actor.id]);
  const open = orders.find((o) => o.id === openId) ?? null;

  return (
    <section className="ord" aria-labelledby="ord-title">
      <h2 id="ord-title" className="ord-heading">Gestión de pedidos</h2>
      {sync ? (
        <p className={`ord-sync ord-sync--${sync.status}`} role="status" data-testid="orders-sync">
          {syncText(sync)}
        </p>
      ) : null}

      <div className="ord-lights" role="group" aria-label="Estado de los pedidos">
        {lights.map((l) => (
          <button
            key={l.value} type="button" className={`ord-light ord-light--${l.tone}`} aria-pressed={filter === l.value}
            onClick={() => setFilter(filter === l.value ? 'todos' : l.value)}
          >
            <strong>{c[l.value]}</strong><span>{l.label}</span>
          </button>
        ))}
      </div>

      <div className="ord-tools">
        <label htmlFor="ord-q" className="sr-only">Buscar pedido por número o cliente</label>
        <input id="ord-q" className="p-inputtext" placeholder="Buscar por número o cliente…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="ord-tools__chips" role="group" aria-label="Vista">
          <button type="button" className="app-segmented__item" aria-pressed={filter === 'todos'} onClick={() => setFilter('todos')}>Abiertos</button>
          <button type="button" className="app-segmented__item" aria-pressed={filter === 'cobros'} onClick={() => setFilter('cobros')}>Por cobrar ({collectable})</button>
          <button type="button" className="app-segmented__item" aria-pressed={filter === 'cerrados'} onClick={() => setFilter('cerrados')}>Historial</button>
          <button type="button" className="app-segmented__item" aria-pressed={mine} onClick={() => setMine((v) => !v)}>Mis pedidos</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No hay pedidos aquí"
          description="Crea un pedido desde Venta rápida con «Crear pedido» o programa la entrega de una venta cobrada."
        />
      ) : (
        <ul className="ord-list" aria-label="Pedidos">
          {rows.map((o) => (
            <li key={o.id} className="ord-item" data-testid={`order-${o.number}`}>
              <div className="ord-item__main">
                <strong>{o.number}</strong> · {o.customerName}
                {o.priority === 'alta' ? <span className="ord-prio"> · Prioridad alta</span> : null}
                <div className="pos__hint">
                  {fulfillmentLabels[o.fulfillment]} · {o.scheduledFor} {slotLabels[o.slot]} · {paymentLabels[o.paymentState]}
                </div>
              </div>
              <div className="ord-item__side">
                <StatusTag status={o.status} map={orderStatusMap} />
                <MoneyText value={o.total} strong />
                <Button label="Abrir" size="small" outlined aria-label={`Abrir pedido ${o.number}`} onClick={() => setOpenId(o.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <OrderDetailDialog
          order={open} actor={actor} onClose={() => setOpenId(null)} onSave={replace}
          onCollect={(o) => { setOpenId(null); onCollect(o); }}
        />
      ) : null}
    </section>
  );
};

export { counts as orderCounts };
