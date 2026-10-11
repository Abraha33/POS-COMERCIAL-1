import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui';

type Props = {
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
  emptyMessage: string;
  onRetry?: () => void;
  children: ReactNode;
};

/** Estados carga / error / vacío compartidos por las pestañas. */
export const QueryState = ({ isLoading, error, isEmpty, emptyMessage, onRetry, children }: Props) => {
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (isEmpty) return <EmptyState message={emptyMessage} />;
  return <>{children}</>;
};
