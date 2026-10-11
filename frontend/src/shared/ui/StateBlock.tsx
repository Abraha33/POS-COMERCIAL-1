import type { ReactNode } from 'react';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';

export const LoadingState = ({ label = 'Cargando…' }: { label?: string }) => (
  <div className="flex align-items-center gap-2 p-4" role="status">
    <ProgressSpinner style={{ width: 24, height: 24 }} strokeWidth="6" />
    <span>{label}</span>
  </div>
);

export type EmptyStateProps = {
  /** Texto principal (compatibilidad con el uso anterior). */
  message?: string;
  title?: string;
  /** Qué hacer a continuación. */
  description?: string;
  icon?: string;
  /** Acción sugerida, p. ej. `<Button label="Nuevo producto" />`. */
  action?: ReactNode;
};

export const EmptyState = ({
  message = 'No hay registros para mostrar.', title, description, icon = 'pi pi-inbox', action,
}: EmptyStateProps) => (
  <div className="app-state" data-testid="empty-state">
    <span className="app-state__icon" aria-hidden="true"><i className={icon} /></span>
    {title ? <h2 className="app-state__title">{title}</h2> : null}
    <p className="app-state__text">{message}</p>
    {description ? <p className="app-state__text">{description}</p> : null}
    {action ?? null}
  </div>
);

export type ErrorStateProps = {
  error: Error;
  onRetry?: () => void;
  title?: string;
};

export const ErrorState = ({ error, onRetry, title }: ErrorStateProps) => (
  <div className="app-state app-state--error" role="alert">
    <span className="app-state__icon" aria-hidden="true"><i className="pi pi-exclamation-circle" /></span>
    {title ? <h2 className="app-state__title">{title}</h2> : null}
    <p className="app-state__text">No se pudo cargar la información: {error.message}</p>
    {onRetry ? <Button label="Reintentar" icon="pi pi-refresh" onClick={onRetry} /> : null}
  </div>
);
