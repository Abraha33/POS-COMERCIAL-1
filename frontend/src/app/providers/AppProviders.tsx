import { useState, type ReactNode } from 'react';
import { PrimeReactProvider } from 'primereact/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmDialog } from 'primereact/confirmdialog';
import type { Role, Session } from '@/shared/contracts';
import { SessionProvider } from './SessionProvider';
import { ToastProvider } from './ToastProvider';
import { configurePrimeLocale } from '@/app/config/primeLocale';
import { I18nProvider } from '@/app/i18n/I18nProvider';

// Arranque: textos de PrimeReact en español (idempotente).
configurePrimeLocale();

export const AppProviders = ({
  children, initialRole, onRoleChange, sessionFor,
}: {
  children: ReactNode;
  initialRole?: Role;
  onRoleChange?: (role: Role) => void;
  sessionFor?: (role: Role) => Session | null;
}) => {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }),
  );
  return (
    <PrimeReactProvider value={{ ripple: true }}>
      <QueryClientProvider client={client}>
        <I18nProvider>
          <SessionProvider initialRole={initialRole} onRoleChange={onRoleChange} sessionFor={sessionFor}>
            <ToastProvider>
              <ConfirmDialog />
              {children}
            </ToastProvider>
          </SessionProvider>
        </I18nProvider>
      </QueryClientProvider>
    </PrimeReactProvider>
  );
};
