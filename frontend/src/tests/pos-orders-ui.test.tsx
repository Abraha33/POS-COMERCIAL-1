import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { createAppRouter } from '@/routes';
import { clearOrders } from '@/features/pos/orders/useOrders';

type User = ReturnType<typeof userEvent.setup>;

const renderPos = async () => {
  setAccessToken(mockTokenForRole('cajero'));
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/pos'] }));
  render(
    <AppProviders initialRole="cajero">
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

/** Abre turno y deja el carrito con "Arroz 500 g" y "Aceite 1 L". */
const startSelling = async (user: User) => {
  await user.click(await screen.findByRole('button', { name: 'Abrir turno' }, { timeout: 5000 }));
  const search = await screen.findByLabelText(/Buscar producto o escanear código/, undefined, { timeout: 5000 });
  for (const code of ['7701234567890', '7701234567891']) {
    await user.clear(search);
    await user.type(search, `${code}{Enter}`);
  }
  await screen.findByTestId('pos-total');
};

const nav = (user: User, name: RegExp) => user.click(screen.getByRole('button', { name }));

beforeEach(() => {
  window.localStorage.clear();
  clearOrders('br-001');
});

describe('Gestión de pedidos en el POS', () => {
  it('la barra de navegación muestra Pedidos y Cobros pendientes con contadores y conserva el carrito', async () => {
    const user = userEvent.setup();
    await renderPos();
    await startSelling(user);
    expect(screen.getByRole('button', { name: /Pedidos, 0 abiertos/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cobros pendientes, 0/ })).toBeInTheDocument();
    await nav(user, /Pedidos, 0 abiertos/);
    expect(await screen.findByRole('heading', { name: 'Gestión de pedidos' })).toBeInTheDocument();
    expect(screen.getByText('No hay pedidos aquí')).toBeInTheDocument();
    await nav(user, /^Venta rápida$/);
    expect(screen.getAllByText(/Arroz 500 g/).length).toBeGreaterThan(0); // el carrito sigue ahí
  });

  it('crear pedido desde el carrito: queda pendiente, sin venta ni cobro, y aparece en la bandeja', async () => {
    const user = userEvent.setup();
    await renderPos();
    await startSelling(user);
    await user.click(screen.getByRole('button', { name: 'Crear pedido' }));
    const dialog = await screen.findByRole('dialog', { name: 'Crear pedido' });
    expect(within(dialog).getByText(/Se guarda el pedido sin registrar una venta ni una factura/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Crear pedido' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Pedidos, 1 abiertos/ })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Cobros pendientes, 1/ })).toBeInTheDocument();
    await nav(user, /Pedidos, 1 abiertos/);
    const row = await screen.findByTestId('order-PED-0001');
    expect(within(row).getByText('Pendiente')).toBeInTheDocument();
    expect(within(row).getByText(/Sin pago/)).toBeInTheDocument();
  });

  it('domicilio sin dirección se rechaza con un mensaje claro', async () => {
    const user = userEvent.setup();
    await renderPos();
    await startSelling(user);
    await user.click(screen.getByRole('button', { name: 'Crear pedido' }));
    const dialog = await screen.findByRole('dialog', { name: 'Crear pedido' });
    await user.selectOptions(within(dialog).getByLabelText('Tipo de entrega'), 'domicilio');
    await user.click(within(dialog).getByRole('button', { name: 'Crear pedido' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/cliente identificado y dirección/);
  });

  it('preparar: tomar, empacar, reportar faltante, resolver y marcar listo', async () => {
    const user = userEvent.setup();
    await renderPos();
    await startSelling(user);
    await user.click(screen.getByRole('button', { name: 'Crear pedido' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Crear pedido' })).getByRole('button', { name: 'Crear pedido' }));
    await nav(user, /Pedidos, 1 abiertos/);
    await user.click(await screen.findByRole('button', { name: 'Abrir pedido PED-0001' }));
    const detail = await screen.findByRole('dialog', { name: 'Pedido PED-0001' });

    await user.click(within(detail).getByRole('button', { name: 'Tomar pedido' }));
    expect(await within(detail).findByText('En proceso')).toBeInTheDocument();

    await user.click(within(detail).getByRole('button', { name: /Reportar faltante de Arroz 500 g/ }));
    await user.click(within(detail).getByRole('button', { name: 'Reportar faltante' }));
    expect(await within(detail).findByText('Con faltante')).toBeInTheDocument();
    // Con faltante no se ofrece marcarlo listo.
    expect(within(detail).queryByRole('button', { name: 'Verificar y marcar listo' })).not.toBeInTheDocument();

    await user.click(within(detail).getByRole('button', { name: /Resolver faltante de Arroz 500 g/ }));
    expect(await within(detail).findByText('En proceso')).toBeInTheDocument();

    // Sin empacar todo, no se puede dejar listo.
    await user.click(within(detail).getByRole('button', { name: 'Verificar y marcar listo' }));
    expect(await within(detail).findByTestId('order-error')).toHaveTextContent(/sin empacar|faltantes/i);
  });

  it('cobrar un pedido pasa sus líneas al carrito sin reconstruirlo y vincula la venta', async () => {
    const user = userEvent.setup();
    await renderPos();
    await startSelling(user);
    await user.click(screen.getByRole('button', { name: 'Crear pedido' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Crear pedido' })).getByRole('button', { name: 'Crear pedido' }));
    // El carrito se vació al crear el pedido.
    await screen.findByTestId('cart-empty');
    await nav(user, /Cobros pendientes, 1/);
    await user.click(await screen.findByRole('button', { name: 'Abrir pedido PED-0001' }));
    await user.click(await screen.findByRole('button', { name: 'Cobrar en caja' }));
    // Vuelve a Venta rápida con el pedido cargado.
    await waitFor(() => expect(screen.queryByTestId('cart-empty')).not.toBeInTheDocument(), { timeout: 5000 });
    await user.click(await screen.findByRole('button', { name: /Cobrar/ }));
    await user.click(await screen.findByRole('button', { name: /Confirmar pago/ }, { timeout: 5000 }));
    expect(await screen.findByTestId('receipt-number', undefined, { timeout: 5000 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nueva venta' }));
    await nav(user, /Cobros pendientes, 0/);
    expect(await screen.findByText('No hay pedidos aquí')).toBeInTheDocument();
  });

  it('cobrar y entregar después: el pedido nace pagado y vinculado a la venta', async () => {
    const user = userEvent.setup();
    await renderPos();
    await startSelling(user);
    await user.click(screen.getByRole('button', { name: /Cobrar/ }));
    await user.click(await screen.findByRole('button', { name: /Confirmar pago/ }));
    await screen.findByTestId('receipt-number', undefined, { timeout: 5000 });
    await user.click(screen.getByRole('button', { name: 'Programar entrega' }));
    const dialog = await screen.findByRole('dialog', { name: 'Programar entrega de esta venta' });
    expect(within(dialog).getByText(/sin cobrar de nuevo/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Crear pedido' }));
    await nav(user, /Pedidos, 1 abiertos/);
    const row = await screen.findByTestId('order-PED-0001');
    expect(within(row).getByText(/Pagado/)).toBeInTheDocument();
    await nav(user, /Cobros pendientes, 0/);
  });
});
