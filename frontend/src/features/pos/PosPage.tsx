import { useState } from 'react';
import { useCurrentShift } from '@/shared/api/pos';
import { ErrorState, LoadingState, ScreenTemplate } from '@/shared/ui';
import { OpenShiftCard } from './OpenShiftCard';
import { QuickSale } from './QuickSale';
import { SalesHistory } from './SalesHistory';
import './pos.css';

type View = 'sell' | 'history';

const views: { value: View; label: string; icon: string }[] = [
  { value: 'sell', label: 'Vender', icon: 'pi pi-shopping-cart' },
  { value: 'history', label: 'Historial', icon: 'pi pi-list' },
];

/**
 * Pantalla del POS: "Vender" (sin turno abierto muestra la apertura; con turno, la venta rápida, BR-VEN-01) e
 * "Historial". La venta rápida queda montada (oculta) al cambiar de vista para no perder el carrito, pero sin atajos.
 */
export const PosPage = () => {
  const shift = useCurrentShift();
  const [view, setView] = useState<View>('sell');

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
    return <QuickSale shift={shift.data} active={view === 'sell'} />;
  })();

  return (
    <div>
      <nav className="pos__views" aria-label="Vistas del punto de venta">
        {views.map((v) => (
          <button
            key={v.value}
            type="button"
            className="pos__view"
            aria-pressed={view === v.value}
            onClick={() => setView(v.value)}
          >
            <i className={v.icon} aria-hidden="true" /> {v.label}
          </button>
        ))}
      </nav>
      <div hidden={view !== 'sell'}>{sellContent}</div>
      {view === 'history' ? <SalesHistory /> : null}
    </div>
  );
};
