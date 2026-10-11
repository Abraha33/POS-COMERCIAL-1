import { describe, expect, it, vi } from 'vitest';

// Flujos con diálogo y escritura: holgura para máquinas lentas o suites en paralelo.
vi.setConfig({ testTimeout: 20000 });
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { db } from '@/mocks/db';
import { accountOf, daysPastDue, receivableStatus } from '@/features/customers/ledger';

const renderCustomers = async () => {
  setAccessToken(mockTokenForRole('cartera'));
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/customers'] }));
  render(
    <AppProviders initialRole="cartera">
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

describe('Clientes: mora (BR-CLI-06)', () => {
  const base = { id: 'r', customerId: 'cus-001', saleId: null, issued: '2026-09-01', amount: 100000, paid: 0 };

  it('calcula días de atraso y estado con 3 días de gracia', () => {
    expect(daysPastDue('2026-10-08', '2026-10-11')).toBe(3);
    expect(receivableStatus({ ...base, due: '2026-10-20' }, '2026-10-11')).toBe('vigente');
    expect(receivableStatus({ ...base, due: '2026-10-11' }, '2026-10-11')).toBe('vigente');
    expect(receivableStatus({ ...base, due: '2026-10-09' }, '2026-10-11')).toBe('en-gracia');
    expect(receivableStatus({ ...base, due: '2026-10-08' }, '2026-10-11')).toBe('en-gracia');
    expect(receivableStatus({ ...base, due: '2026-10-07' }, '2026-10-11')).toBe('vencida');
    expect(receivableStatus({ ...base, due: '2026-10-01', paid: 100000 }, '2026-10-11')).toBe('pagada');
  });

  it('la mora suma solo el saldo de facturas fuera de gracia', () => {
    const account = accountOf([
      { ...base, id: 'a', due: '2026-10-05', paid: 20000 }, // vencida: saldo 80.000
      { ...base, id: 'b', due: '2026-10-09' }, // en gracia
      { ...base, id: 'c', due: '2026-10-30' }, // vigente
    ], '2026-10-11');
    expect(account.balance).toBe(280000);
    expect(account.overdue).toBe(80000);
    expect(account.overdueCount).toBe(1);
  });
});

describe('Clientes: pantalla', () => {
  it('lista el saldo pendiente y la mora del cliente', async () => {
    db.receivables.push({ id: 'rec-090', customerId: 'cus-001', saleId: null, issued: '2026-08-01', due: '2026-09-01', amount: 50000, paid: 0 });
    await renderCustomers();
    const row = (await screen.findByText('Tienda La Esquina', undefined, { timeout: 5000 })).closest('tr');
    expect(row).not.toBeNull();
    // 300.000 de rec-001 + 50.000 vencida = 350.000; mora 50.000.
    expect(within(row as HTMLElement).getAllByText(/350\.000/).length).toBeGreaterThan(0);
    expect(within(row as HTMLElement).getByText(/50\.000/, { selector: '.app-status' })).toBeInTheDocument();
  });

  it('da de alta un cliente con correo y rechaza el documento duplicado', async () => {
    const user = userEvent.setup();
    await renderCustomers();
    await screen.findByText('Tienda La Esquina', undefined, { timeout: 5000 });

    await user.click(screen.getByRole('button', { name: /nuevo cliente/i }));
    await user.type(await screen.findByLabelText('Nombre o razón social'), 'Ferretería El Tornillo');
    await user.type(screen.getByLabelText('Número de documento'), '901555777-4');
    // Correo obligatorio para clientes identificados (BR-CLI-07 / A3).
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    expect(await screen.findByText(/correo es obligatorio/i)).toBeInTheDocument();
    expect(db.customers).toHaveLength(3);

    await user.type(screen.getByLabelText('Correo electrónico'), 'compras@eltornillo.example');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    expect(await screen.findByText('Ferretería El Tornillo', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(db.customers).toHaveLength(4);

    // Mismo tipo y número de documento: CUSTOMER_DUPLICATED.
    await user.click(screen.getByRole('button', { name: /nuevo cliente/i }));
    await user.type(await screen.findByLabelText('Nombre o razón social'), 'Otro nombre');
    await user.type(screen.getByLabelText('Número de documento'), '901555777-4');
    await user.type(screen.getByLabelText('Correo electrónico'), 'otro@example.test');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    expect(await screen.findByText(/ya existe un cliente con ese tipo y número/i)).toBeInTheDocument();
    expect(db.customers).toHaveLength(4);
  });
});
