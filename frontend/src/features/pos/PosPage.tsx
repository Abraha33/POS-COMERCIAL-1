import { useState } from 'react';
import { useCurrentShift } from '@/shared/api/pos';
import { ErrorState, LoadingState, ScreenTemplate, SegmentedTabs } from '@/shared/ui';
import { OpenShiftCard } from './OpenShiftCard';
import { QuickSale } from './QuickSale';
import { SalesHistory } from './SalesHistory';
import './pos.css';

type View = 'sell' | 'history';

const views: { value: View; label: string }[] = [
  { value: 'sell', label: 'Vender' },
  { value: 'history', label: 'Historial' },
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
      <div className="pos__views">
        <SegmentedTabs ariaLabel="Vistas del punto de venta" variant="chips" options={views} value={view} onChange={setView} />
      </div>
      <div hidden={view !== 'sell'}>{sellContent}</div>
      {view === 'history' ? <SalesHistory onNewSale={() => setView('sell')} /> : null}
    </div>
  );
};
