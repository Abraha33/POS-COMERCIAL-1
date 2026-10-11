import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import { AppProviders } from '@/app/providers/AppProviders';
import { setAccessToken } from '@/shared/api/client';
import type { Role } from '@/shared/contracts';
import { createAppRouter } from '@/routes';

const router = createAppRouter();

const start = async () => {
  // Backend simulado hasta conectar Frappe/ERPNext.
  const { worker } = await import('@/mocks/browser');
  const { mockTokenForRole } = await import('@/mocks/test-users');
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
  // El rol simulado del selector se traduce en el token del usuario de prueba equivalente.
  const onRoleChange = (role: Role) => setAccessToken(mockTokenForRole(role));

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders onRoleChange={onRoleChange}>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
};

void start();
