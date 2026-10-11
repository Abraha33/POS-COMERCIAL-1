import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { db } from '@/mocks/db';

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

const openShift = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: /abrir turno/i }));
  await screen.findByLabelText(/buscar producto o escanear/i);
};

describe('POS: venta rápida', () => {
  it('sin turno abierto pide la apertura; con turno permite vender y muestra el recibo', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);

    // El lector escribe el código y envía Enter.
    const search = screen.getByLabelText(/buscar producto o escanear/i);
    await user.type(search, '7701234567890{Enter}');
    expect(await screen.findByLabelText('Cantidad Arroz 500 g')).toHaveTextContent('1');
    expect(screen.getByTestId('pos-total')).toHaveTextContent('2.800');

    await user.click(screen.getByRole('button', { name: /más arroz 500 g/i }));
    expect(screen.getByTestId('pos-total')).toHaveTextContent('5.600');

    await user.click(screen.getByRole('button', { name: /cobrar/i }));
    expect(await screen.findByTestId('receipt-number')).toHaveTextContent('POS-0004');
    expect(db.sales.at(-1)?.total).toBe(5600);
  });

  it('pago mixto: muestra lo que falta hasta cubrir el total', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);

    await user.type(screen.getByLabelText(/buscar producto o escanear/i), 'SKU-002{Enter}'); // 12.500
    expect(await screen.findByTestId('pos-total')).toHaveTextContent('12.500');

    // Un segundo medio de pago nace con lo que falta (0 si ya está cubierto) y el cobro sigue habilitado.
    await user.click(screen.getByRole('button', { name: /agregar medio de pago/i }));
    expect(screen.getByLabelText('Medio de pago 2')).toBeInTheDocument();
    expect(screen.getByTestId('pos-change')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cobrar/i })).toBeEnabled();
  });
});
