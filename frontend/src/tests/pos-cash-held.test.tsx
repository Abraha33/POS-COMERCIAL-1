import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { db } from '@/mocks/db';

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

const openShiftAndScan = async (user: User, code: string) => {
  await user.click(await screen.findByRole('button', { name: /abrir turno/i }, { timeout: 5000 }));
  await user.type(await screen.findByLabelText(/buscar producto o escanear/i), `${code}{Enter}`);
};

beforeEach(() => window.localStorage.clear());

describe('POS: ventas suspendidas', () => {
  it('suspende la venta, queda en la lista y se reanuda sin perder las líneas', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShiftAndScan(user, '7701234567890'); // Arroz 2.800
    await user.click(await screen.findByRole('button', { name: /más arroz 500 g/i }));
    expect(screen.getByTestId('pos-total')).toHaveTextContent('5.600');

    await user.click(screen.getByRole('button', { name: /suspender/i }));
    expect(await screen.findByTestId('cart-empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /suspendidas, 1/i })).toBeInTheDocument();
    expect(db.sales).toHaveLength(3); // no se cobró nada

    await user.click(screen.getByRole('button', { name: /suspendidas, 1/i }));
    await user.click(await screen.findByRole('button', { name: /reanudar/i }));
    expect(await screen.findByLabelText('Cantidad Arroz 500 g')).toHaveTextContent('2');
    expect(screen.getByTestId('pos-total')).toHaveTextContent('5.600');
    expect(screen.getByRole('button', { name: /suspendidas, 0/i })).toBeInTheDocument();
  });
});

describe('POS: caja', () => {
  it('un egreso reduce el efectivo esperado', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShiftAndScan(user, '7701234567890');

    await user.click(screen.getByRole('button', { name: /^caja/i }));
    expect(await screen.findByTestId('expected-cash')).toHaveTextContent('100.000');

    await user.type(screen.getByLabelText('Valor (COP)'), '15000');
    await user.click(screen.getByRole('button', { name: /registrar movimiento/i }));
    await user.click(screen.getByLabelText('Concepto'));
    expect(await screen.findByText(/movimiento registrado/i)).toBeInTheDocument();
    expect(screen.getByTestId('expected-cash')).toHaveTextContent('85.000');
  });

  it('cerrar con diferencia exige nota y vuelve a pedir la apertura', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShiftAndScan(user, '7701234567890');

    await user.click(screen.getByRole('button', { name: /^caja/i }));
    await user.type(await screen.findByLabelText('Efectivo contado (COP)'), '99000');
    expect(await screen.findByTestId('cash-difference')).toHaveTextContent(/faltante/i);

    const close = screen.getByRole('button', { name: /cerrar turno/i });
    expect(close).toBeDisabled(); // falta la nota de justificación

    await user.type(screen.getByLabelText(/nota de justificación/i), 'Faltante por cambio');
    expect(close).toBeEnabled();
    await user.click(close);

    expect(await screen.findByRole('button', { name: /abrir turno/i })).toBeInTheDocument();
    const closed = db.shifts.at(-1);
    expect(closed?.status).toBe('closed');
    expect(closed?.difference).toBe(-1000);
    expect(closed?.closingNote).toBe('Faltante por cambio');
  });

  it('cierre sin diferencia no pide nota', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShiftAndScan(user, '7701234567890');
    await user.click(screen.getByRole('button', { name: /^caja/i }));
    await user.type(await screen.findByLabelText('Efectivo contado (COP)'), '100000');
    expect(await screen.findByTestId('cash-difference')).toHaveTextContent(/cuadra/i);
    expect(screen.queryByLabelText(/nota de justificación/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cerrar turno/i })).toBeEnabled();
  });
});
