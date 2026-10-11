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
import { payableStatus, weekStart } from '@/features/payables/ledger';

const renderPayables = async () => {
  setAccessToken(mockTokenForRole('cartera'));
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/payables'] }));
  render(
    <AppProviders initialRole="cartera">
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

describe('Cuentas por pagar', () => {
  it('agrupa por semana de vencimiento (lunes a domingo)', () => {
    expect(weekStart('2026-10-11')).toBe('2026-10-05'); // domingo
    expect(weekStart('2026-10-12')).toBe('2026-10-12'); // lunes
    expect(weekStart('2026-10-28')).toBe('2026-10-26');
    const base = { id: 'p', supplierId: 's', purchaseOrderId: null, issued: '2026-10-01', amount: 100, paid: 0 };
    expect(payableStatus({ ...base, due: '2026-10-10' }, '2026-10-11')).toBe('vencida');
    expect(payableStatus({ ...base, due: '2026-10-15' }, '2026-10-11')).toBe('proxima');
    expect(payableStatus({ ...base, due: '2026-11-15' }, '2026-10-11')).toBe('vigente');
  });

  it('muestra el proveedor por nombre, la programación y registra un pago', async () => {
    const user = userEvent.setup();
    await renderPayables();
    expect(await screen.findByText('Distribuidora Andina', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /semana del 26 oct/i })).toBeInTheDocument();
    expect(screen.getByTestId('payables-total')).toHaveTextContent('210.000');

    await user.click(screen.getByRole('button', { name: /pagar a distribuidora andina/i }));
    await user.click(await screen.findByRole('button', { name: /saldar/i }));
    await user.click(screen.getByRole('button', { name: /registrar pago/i }));
    expect(await screen.findByText('Pago registrado')).toBeInTheDocument();
    expect(db.payables[0]?.paid).toBe(210000);
  });

  it('rechaza un pago que excede el saldo (PAYMENT_EXCEEDS_BALANCE)', async () => {
    const user = userEvent.setup();
    await renderPayables();
    await user.click(await screen.findByRole('button', { name: /pagar a distribuidora andina/i }, { timeout: 5000 }));
    await screen.findByTestId('payment-balance');
    const payable = db.payables[0];
    if (!payable) throw new Error('seed sin cuentas por pagar');
    payable.paid = 200000;
    await user.type(screen.getByLabelText('Valor (COP)'), '100000');
    await user.click(screen.getByRole('button', { name: /registrar pago/i }));
    expect(await screen.findByTestId('payment-error')).toHaveTextContent(/supera el saldo actual/i);
  });
});
