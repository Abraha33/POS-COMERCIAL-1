import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';

export const LoadingState = ({ label = 'Cargando…' }: { label?: string }) => (
  <div className="flex align-items-center gap-2 p-4" role="status">
    <ProgressSpinner style={{ width: 24, height: 24 }} strokeWidth="6" />
    <span>{label}</span>
  </div>
);

export const EmptyState = ({ message = 'No hay registros para mostrar.' }: { message?: string }) => (
  <div className="p-4 text-color-secondary" data-testid="empty-state">{message}</div>
);

export const ErrorState = ({ error, onRetry }: { error: Error; onRetry?: () => void }) => (
  <div className="p-4" role="alert">
    <p className="mt-0">No se pudo cargar la información: {error.message}</p>
    {onRetry ? <Button label="Reintentar" icon="pi pi-refresh" onClick={onRetry} /> : null}
  </div>
);
