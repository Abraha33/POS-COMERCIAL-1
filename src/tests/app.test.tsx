import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from '@tanstack/react-router';
import { createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { modules } from '@/app/config/modules';
import type { Role } from '@/shared/contracts';

const renderAt = async (path: string, role: Role = 'propietario') => {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  render(
    <AppProviders initialRole={role}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

describe('app shell y navegación', () => {
  it('el menú muestra todos los módulos al propietario', async () => {
    await renderAt('/products');
    for (const m of modules) {
      expect(await screen.findByTestId(`nav-${m.id}`)).toBeInTheDocument();
    }
  });

  it('un rol sin permiso ve acceso denegado en la ruta', async () => {
    await renderAt('/administration', 'cajero');
    expect(await screen.findByTestId('access-denied')).toBeInTheDocument();
  });

  it('el menú oculta módulos sin permiso', async () => {
    await renderAt('/pos', 'cajero');
    await screen.findByTestId('nav-pos');
    expect(screen.queryByTestId('nav-administration')).not.toBeInTheDocument();
  });

  it('productos lista datos simulados y permite crear uno (slice de referencia)', async () => {
    const user = userEvent.setup();
    await renderAt('/products');
    expect(await screen.findByText('Arroz 500 g')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /nuevo producto/i }));
    await user.type(await screen.findByLabelText('SKU'), 'SKU-900');
    await user.type(screen.getByLabelText('Nombre'), 'Producto de prueba');
    await user.type(screen.getByLabelText('Categoría'), 'Pruebas');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByRole('cell', { name: 'Producto de prueba' })).toBeInTheDocument();
  });
});
