import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';

const router = createAppRouter();

const start = async () => {
  // Backend simulado hasta conectar Frappe/ERPNext.
  const { worker } = await import('@/mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
};

void start();
