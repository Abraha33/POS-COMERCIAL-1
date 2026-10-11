import { useState, type ReactNode } from 'react';
import { PrimeReactProvider } from 'primereact/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmDialog } from 'primereact/confirmdialog';
import type { Role } from '@/shared/contracts';
import { SessionProvider } from './SessionProvider';
import { ToastProvider } from './ToastProvider';

export const AppProviders = ({
  children, initialRole, onRoleChange,
}: { children: ReactNode; initialRole?: Role; onRoleChange?: (role: Role) => void }) => {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }),
  );
  return (
    <PrimeReactProvider value={{ ripple: true }}>
      <QueryClientProvider client={client}>
        <SessionProvider initialRole={initialRole} onRoleChange={onRoleChange}>
          <ToastProvider>
            <ConfirmDialog />
            {children}
          </ToastProvider>
        </SessionProvider>
      </QueryClientProvider>
    </PrimeReactProvider>
  );
};
