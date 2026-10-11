import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import '@/shared/ui/tokens.css';
import { AppProviders } from '@/app/providers/AppProviders';
import { setAccessToken } from '@/shared/api/client';
import type { Role, Session } from '@/shared/contracts';
import { createAppRouter } from '@/routes';

const router = createAppRouter();

const start = async () => {
  // Backend simulado hasta conectar Frappe/ERPNext.
  const { worker } = await import('@/mocks/browser');
  const { mockTokenForRole, testUsers } = await import('@/mocks/test-users');
  const { sessionFor: mockSessionFor } = await import('@/mocks/handlers/auth');
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
  // El rol simulado del selector se traduce en el token del usuario de prueba equivalente.
  const onRoleChange = (role: Role) => setAccessToken(mockTokenForRole(role));
  // Sesión con la sede real del empleado de prueba de ese rol (Session.branch).
  const sessionFor = (role: Role): Session | null => {
    const user = testUsers.find((u) => u.role === role);
    return user ? mockSessionFor(user.employeeId) : null;
  };

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders onRoleChange={onRoleChange} sessionFor={sessionFor}>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
};

void start();
