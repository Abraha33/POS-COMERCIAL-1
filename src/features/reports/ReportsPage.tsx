import { Card } from 'primereact/card';
import { useSales } from '@/shared/api/queries';
import { EmptyState, ErrorState, LoadingState, ScreenTemplate } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';

/** Pantalla ancla de Reportes (agente 6). */
export const ReportsPage = () => {
  const { data, isLoading, error, refetch } = useSales();

  let body;
  if (isLoading) body = <LoadingState />;
  else if (error) body = <ErrorState error={error} onRetry={() => void refetch()} />;
  else if (!data || data.length === 0) body = <EmptyState />;
  else {
    const valid = data.filter((s) => s.status !== 'anulada');
    const total = valid.reduce((sum, s) => sum + s.total, 0);
    body = (
      <div className="grid">
        <div className="col-12 md:col-6"><Card title="Ventas registradas">{valid.length}</Card></div>
        <div className="col-12 md:col-6"><Card title="Total vendido">{formatMoney(total)}</Card></div>
      </div>
    );
  }

  return <ScreenTemplate title="Reportes" subtitle="Vista del propietario">{body}</ScreenTemplate>;
};
