import { describe, expect, it, vi } from 'vitest';

// Flujos con diálogo y escritura: holgura para máquinas lentas o suites en paralelo.
vi.setConfig({ testTimeout: 20000 });
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { db } from '@/mocks/db';

const renderRoute = async (path: string) => {
  setAccessToken(mockTokenForRole('cartera'));
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  render(
    <AppProviders initialRole="cartera">
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

describe('Cuentas por cobrar', () => {
  it('muestra el cliente por nombre y el saldo; un abono parcial lo reduce', async () => {
    const user = userEvent.setup();
    await renderRoute('/receivables');
    expect(await screen.findByText('Tienda La Esquina', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByTestId('receivables-total')).toHaveTextContent('300.000');

    await user.click(screen.getByRole('button', { name: /abonar a tienda la esquina/i }));
    expect(await screen.findByTestId('payment-balance')).toHaveTextContent('300.000');
    await user.type(screen.getByLabelText('Valor (COP)'), '100000');
    await user.click(screen.getByRole('button', { name: /registrar abono/i }));

    expect(await screen.findByText('Abono registrado')).toBeInTheDocument();
    expect(db.receivables[0]?.paid).toBe(200000);
    await screen.findByText(/200\.000/, { selector: '[data-testid="receivables-total"]' }, { timeout: 5000 });
  });

  it('"Saldar" completa el saldo y la factura queda pagada', async () => {
    const user = userEvent.setup();
    await renderRoute('/receivables');
    await user.click(await screen.findByRole('button', { name: /abonar a tienda la esquina/i }, { timeout: 5000 }));
    await user.click(await screen.findByRole('button', { name: /saldar/i }));
    await user.click(screen.getByRole('button', { name: /registrar abono/i }));
    expect(await screen.findByText('Abono registrado')).toBeInTheDocument();
    expect(db.receivables[0]?.paid).toBe(400000);
  });

  it('el servidor rechaza un abono que excede el saldo (PAYMENT_EXCEEDS_BALANCE)', async () => {
    const user = userEvent.setup();
    await renderRoute('/receivables');
    await user.click(await screen.findByRole('button', { name: /abonar a tienda la esquina/i }, { timeout: 5000 }));
    await screen.findByTestId('payment-balance');
    // Otro cajero abonó mientras el diálogo estaba abierto: el saldo mostrado quedó viejo.
    const receivable = db.receivables[0];
    if (!receivable) throw new Error('seed sin cuentas por cobrar');
    receivable.paid = 350000;
    await user.type(screen.getByLabelText('Valor (COP)'), '300000');
    await user.click(screen.getByRole('button', { name: /registrar abono/i }));
    const error = await screen.findByTestId('payment-error');
    expect(error).toHaveTextContent(/supera el saldo actual/i);
    expect(error).toHaveTextContent('50.000');
    expect(receivable.paid).toBe(350000);
  });

  it('no deja registrar un valor mayor al saldo mostrado', async () => {
    const user = userEvent.setup();
    await renderRoute('/receivables');
    await user.click(await screen.findByRole('button', { name: /abonar a tienda la esquina/i }, { timeout: 5000 }));
    await user.type(await screen.findByLabelText('Valor (COP)'), '999999');
    expect(await screen.findByText(/supera el saldo pendiente/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar abono/i })).toBeDisabled();
  });
});
