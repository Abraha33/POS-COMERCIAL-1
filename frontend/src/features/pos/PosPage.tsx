import { useCurrentShift } from '@/shared/api/pos';
import { ErrorState, LoadingState, ScreenTemplate } from '@/shared/ui';
import { OpenShiftCard } from './OpenShiftCard';
import { QuickSale } from './QuickSale';

/** Pantalla del POS: sin turno abierto muestra la apertura; con turno, la venta rápida (BR-VEN-01). */
export const PosPage = () => {
  const shift = useCurrentShift();

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
  return <QuickSale shift={shift.data} />;
};
