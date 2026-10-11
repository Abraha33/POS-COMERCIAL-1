import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { buildDashboard } from '@/app/pages/dashboard';
import { createAppRouter } from '@/routes';
import type { Product, Role, Sale } from '@/shared/contracts';

const renderAt = async (path: string, role: Role = 'propietario') => {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  render(
    <AppProviders initialRole={role}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

const sale = (id: string, date: string, productId: string, quantity: number, status: Sale['status'] = 'pagada'): Sale => ({
  id, number: id, date, customerId: null, cashierId: 'emp-001', branchId: 'br-001',
  lines: [{ productId, quantity, unitPrice: 1000, discount: 0, returnedQuantity: 0 }],
  payments: [{ method: 'efectivo', amount: quantity * 1000 }], roundingAdjustment: 0, total: quantity * 1000, status, shiftId: null,
});

describe('inicio (dashboard)', () => {
  it('buildDashboard: día de referencia, anuladas excluidas y top por cantidad', () => {
    const products = [{ id: 'p1', name: 'Arroz' }, { id: 'p2', name: 'Sal' }] as Product[];
    const d = buildDashboard(
      [
        sale('a', '2026-10-01T10:00:00Z', 'p1', 3), sale('b', '2026-10-01T11:00:00Z', 'p2', 1),
        sale('c', '2026-10-01T12:00:00Z', 'p2', 9, 'anulada'), sale('d', '2026-09-30T12:00:00Z', 'p2', 2),
      ],
      products, '2026-10-05',
    );
    expect(d.referenceDay).toBe('2026-10-01');
    expect(d.isToday).toBe(false);
    expect(d.tickets).toBe(2);
    expect(d.salesTotal).toBe(4000);
    expect(d.unitsSold).toBe(4);
    expect(d.last7Days).toHaveLength(7);
    expect(d.topProducts[0]).toMatchObject({ name: 'Arroz', quantity: 3 });
  });

  it('la ruta / muestra KPI y accesos rápidos según permisos', async () => {
    await renderAt('/');
    expect(await screen.findByTestId('kpi-sales')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-tickets')).toBeInTheDocument();
    expect(screen.getByTestId('quick-pos')).toBeInTheDocument();
  });

  it('un cajero no ve accesos a administración', async () => {
    await renderAt('/', 'cajero');
    await screen.findByTestId('home-page');
    expect(screen.queryByTestId('quick-administration')).not.toBeInTheDocument();
  });
});

describe('shell', () => {
  it('barra superior: módulo actual, búsqueda global y estado de conexión', async () => {
    await renderAt('/products');
    expect(await screen.findByTestId('current-module')).toHaveTextContent('Productos');
    expect(screen.getByLabelText('Búsqueda global')).toBeInTheDocument();
    expect(screen.getByTestId('online-indicator')).toHaveTextContent('En línea');
  });

  it('el atajo "/" enfoca la búsqueda global', async () => {
    const user = userEvent.setup();
    await renderAt('/products');
    await screen.findByTestId('current-module');
    await user.keyboard('/');
    expect(screen.getByLabelText('Búsqueda global')).toHaveFocus();
  });

  it('menú lateral agrupa módulos', async () => {
    await renderAt('/products');
    const nav = await screen.findByRole('navigation', { name: 'Módulos' });
    expect(within(nav).getByText('Catálogo')).toBeInTheDocument();
    expect(within(nav).getByText('Clientes y cartera')).toBeInTheDocument();
  });
});

describe('login', () => {
  it('PIN: el teclado táctil llena los puntos y se puede borrar', async () => {
    const user = userEvent.setup();
    await renderAt('/login');
    await screen.findByRole('heading', { name: /PIN/ });
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByRole('img', { name: 'PIN: 2 de 4 dígitos' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Borrar último dígito' }));
    expect(screen.getByRole('img', { name: 'PIN: 1 de 4 dígitos' })).toBeInTheDocument();
    expect(screen.queryByTestId('nav-pos')).not.toBeInTheDocument();
  });

  it('usuario y contraseña inicia sesión con useLogin y lleva al inicio', async () => {
    const user = userEvent.setup();
    await renderAt('/login');
    await user.click(await screen.findByRole('tab', { name: 'Usuario y contraseña' }));
    await user.type(screen.getByLabelText('Usuario'), 'laura.gomez');
    await user.type(screen.getByLabelText('Contraseña'), 'cambiar-en-desarrollo');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('heading', { name: /Hola, Laura/ })).toBeInTheDocument();
  });

  it('credenciales incorrectas muestran el error', async () => {
    const user = userEvent.setup();
    await renderAt('/login');
    await user.click(await screen.findByRole('tab', { name: 'Usuario y contraseña' }));
    await user.type(screen.getByLabelText('Usuario'), 'laura.gomez');
    await user.type(screen.getByLabelText('Contraseña'), 'mala');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByTestId('login-error')).toBeInTheDocument();
  });
});
