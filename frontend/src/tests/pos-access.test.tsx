import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';

const renderAccess = async () => {
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/pos/acceso'] }));
  render(
    <AppProviders initialRole="cajero">
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

describe('POS-F01/F02 · Capa 1 (esqueleto)', () => {
  it('la ruta /pos/acceso renderiza acceso y apertura', async () => {
    await renderAccess();
    expect(await screen.findByTestId('access-view')).toBeInTheDocument();
    expect(screen.getByTestId('opening-view')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir caja' })).toBeInTheDocument();
  });
});
