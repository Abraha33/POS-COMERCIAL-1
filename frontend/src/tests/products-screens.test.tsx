import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 20000 });
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import type { Role } from '@/shared/contracts';
import { tokenForEmployee } from '@/mocks/test-users';
import { db } from '@/mocks/db';

const T = { timeout: 5000 };

const renderProducts = async (employeeId: string, role: Role) => {
  setAccessToken(tokenForEmployee(employeeId));
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/products'] }));
  render(
    <AppProviders initialRole={role}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

describe('Productos', () => {
  it('lista con categoría de IVA y tarifa; busca por SKU y filtra por estado', async () => {
    const user = userEvent.setup();
    await renderProducts('emp-003', 'admin');
    expect(await screen.findByText('Aceite 1 L', {}, T)).toBeInTheDocument();
    expect(screen.getAllByText('Gravado · 19 %').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Excluido · 0 %').length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText('Buscar'), 'SKU-003');
    expect(screen.getByText('Azúcar 1 kg')).toBeInTheDocument();
    expect(screen.queryByText('Aceite 1 L')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Buscar'));
    await user.selectOptions(screen.getByLabelText('Estado'), 'inactivos');
    expect(screen.getByText('Café molido 250 g')).toBeInTheDocument();
    expect(screen.queryByText('Aceite 1 L')).not.toBeInTheDocument();
  });

  it('desactiva un producto', async () => {
    const user = userEvent.setup();
    await renderProducts('emp-003', 'admin');
    await user.click(await screen.findByRole('button', { name: 'Desactivar Aceite 1 L' }, T));
    await waitFor(() => expect(db.products.find((p) => p.id === 'prd-002')?.active).toBe(false));
  });

  it('valida el formulario y rechaza un SKU duplicado', async () => {
    const user = userEvent.setup();
    await renderProducts('emp-003', 'admin');
    await user.click(await screen.findByRole('button', { name: /nuevo producto/i }, T));
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: /guardar/i }));
    expect(await within(dialog).findByText('El SKU es obligatorio')).toBeInTheDocument();
    expect(within(dialog).getByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(within(dialog).getByText('La categoría es obligatoria')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('SKU'), 'sku-001');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Otro arroz');
    await user.type(within(dialog).getByLabelText('Categoría'), 'Granos');
    await user.click(within(dialog).getByRole('button', { name: /guardar/i }));
    expect(await within(dialog).findByText('Ya existe un producto con este SKU')).toBeInTheDocument();
    expect(db.products).toHaveLength(6);
  });

  it('crea un producto exento con tarifa 0', async () => {
    const user = userEvent.setup();
    await renderProducts('emp-003', 'admin');
    await user.click(await screen.findByRole('button', { name: /nuevo producto/i }, T));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('SKU'), 'SKU-100');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Medicamento X');
    await user.type(within(dialog).getByLabelText('Categoría'), 'Salud');
    await user.selectOptions(within(dialog).getByLabelText('Categoría de IVA'), 'exento');
    expect(within(dialog).getByLabelText('Tarifa')).toHaveValue('0');
    await user.click(within(dialog).getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(db.products.some((p) => p.sku === 'SKU-100' && p.taxCategory === 'exento' && p.taxRate === 0)).toBe(true));
  });

  it('un rol sin products.edit no ve acciones de edición', async () => {
    await renderProducts('emp-001', 'cajero');
    expect(await screen.findByText('Aceite 1 L', {}, T)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nuevo producto/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
  });
});
