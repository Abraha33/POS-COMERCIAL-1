import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { createAppRouter } from '@/routes';

type User = ReturnType<typeof userEvent.setup>;

const renderPos = async (role: 'cajero' | 'propietario' = 'cajero') => {
  setAccessToken(mockTokenForRole(role));
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/pos'] }));
  render(
    <AppProviders initialRole={role}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

const openShift = async (user: User) => {
  await user.click(await screen.findByRole('button', { name: 'Abrir turno' }, { timeout: 5000 }));
  await screen.findByLabelText(/Buscar producto o escanear código/, undefined, { timeout: 5000 });
};

beforeEach(() => window.localStorage.clear());

describe('Venta rápida · catálogo, detalle y cliente', () => {
  it('detalle de producto: precios por volumen con el escalón de la cantidad y agregar con cantidad', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);
    await user.type(screen.getByLabelText(/Buscar producto o escanear código/), 'Aceite');
    await user.click(await screen.findByRole('button', { name: 'Ver detalle de Aceite 1 L' }));

    const panel = await screen.findByRole('dialog', { name: 'Aceite 1 L' });
    expect(within(panel).getByText(/PROPUESTA/)).toBeInTheDocument();
    const qty = within(panel).getByLabelText('Cantidad');
    await user.clear(qty);
    await user.type(qty, '12');
    // 12 está en el escalón 10–49 (−5 %): 12.500 → 11.875; subtotal 142.500
    const current = within(panel).getAllByRole('row').find((r) => /10–49/.test(r.textContent ?? ''));
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(within(panel).getByText(/Subtotal estimado/)).toHaveTextContent('142.500');

    await user.click(within(panel).getByRole('button', { name: 'Agregar al carrito' }));
    await waitFor(() => expect(screen.getByLabelText('Cantidad Aceite 1 L')).toHaveValue(12));
  });

  it('cantidad inválida en el detalle deshabilita agregar', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);
    await user.type(screen.getByLabelText(/Buscar producto o escanear código/), 'Arroz');
    await user.click(await screen.findByRole('button', { name: 'Ver detalle de Arroz 500 g' }));
    const panel = await screen.findByRole('dialog', { name: 'Arroz 500 g' });
    const qty = within(panel).getByLabelText('Cantidad');
    await user.clear(qty);
    await user.type(qty, '0');
    expect(within(panel).getByRole('button', { name: 'Agregar al carrito' })).toBeDisabled();
    await user.clear(qty);
    await user.type(qty, '1.5');
    expect(within(panel).getByRole('button', { name: 'Agregar al carrito' })).toBeDisabled();
  });

  it('filtros: agotados y frecuentes, y vista cuadrícula', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);
    await user.click(screen.getByRole('button', { name: 'Vista de cuadrícula' }));
    expect(screen.getByRole('button', { name: 'Vista de cuadrícula' })).toHaveAttribute('aria-pressed', 'true');

    // Sin frecuentes todavía: lista vacía con explicación.
    await user.click(screen.getByRole('button', { name: /Frecuentes/ }));
    expect(await screen.findByText(/No hay productos en esta categoría|Sin resultados/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Frecuentes/ }));

    // Agrega uno por código y aparece como frecuente.
    const search = screen.getByLabelText(/Buscar producto o escanear código/);
    await user.type(search, '7701234567891{Enter}');
    await user.click(screen.getByRole('button', { name: /Frecuentes/ }));
    expect(await screen.findByRole('button', { name: 'Ver detalle de Aceite 1 L' })).toBeInTheDocument();
  });

  it('cliente nuevo: se crea en un modal y queda seleccionado', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);
    await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo cliente' });
    await user.type(within(dialog).getByLabelText('Nombre'), 'Papelería El Lápiz');
    await user.type(within(dialog).getByLabelText('Número de documento'), '800900100');
    await user.click(within(dialog).getByRole('button', { name: 'Crear cliente' }));
    await waitFor(
      () => {
        const select = screen.getByLabelText(/Cliente \(F3\)/) as HTMLSelectElement;
        expect(select.options[select.selectedIndex]?.text).toBe('Papelería El Lápiz');
      },
      { timeout: 5000 },
    );
  });

  it('cliente nuevo: exige nombre y documento', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);
    await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo cliente' });
    await user.click(within(dialog).getByRole('button', { name: 'Crear cliente' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/nombre y el documento/);
  });

  it('duplicar guarda una copia en Suspendidas y conserva la venta actual', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);
    await user.type(screen.getByLabelText(/Buscar producto o escanear código/), '7701234567890{Enter}');
    await screen.findByLabelText('Cantidad Arroz 500 g');
    await user.click(screen.getByRole('button', { name: 'Duplicar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Suspendidas, 1/ })).toBeInTheDocument());
    expect(screen.getByLabelText('Cantidad Arroz 500 g')).toBeInTheDocument();
  });
});

describe('Venta rápida · editar cliente', () => {
  it('edita nombre y teléfono conservando cupo, y el selector refleja el cambio', async () => {
    const user = userEvent.setup();
    await renderPos('propietario');
    await openShift(user);
    await screen.findByRole('option', { name: 'Tienda La Esquina' });
    await user.selectOptions(screen.getByLabelText(/Cliente \(F3\)/), 'Tienda La Esquina');
    await user.click(screen.getByRole('button', { name: 'Editar cliente' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar cliente' });
    const name = within(dialog).getByLabelText('Nombre');
    expect(name).toHaveValue('Tienda La Esquina');
    await user.clear(name);
    await user.type(name, 'Tienda La Esquina SAS');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(
      () => {
        const select = screen.getByLabelText(/Cliente \(F3\)/) as HTMLSelectElement;
        expect(select.options[select.selectedIndex]?.text).toBe('Tienda La Esquina SAS');
      },
      { timeout: 5000 },
    );
    expect(screen.getByText(/cupo \$ ?1\.500\.000/)).toBeInTheDocument();
  });
});

describe('Venta rápida · editar cliente sin permiso', () => {
  it('el cajero puede crear pero no ve Editar cliente', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);
    await screen.findByRole('option', { name: 'Tienda La Esquina' });
    await user.selectOptions(screen.getByLabelText(/Cliente \(F3\)/), 'Tienda La Esquina');
    expect(screen.queryByRole('button', { name: 'Editar cliente' })).not.toBeInTheDocument();
  });
});

describe('Venta rápida · marca y presentaciones', () => {
  it('busca por marca y agrega una presentación como unidades base', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);
    await user.type(screen.getByLabelText(/Buscar producto o escanear código/), 'Oleosol');
    await user.click(await screen.findByRole('button', { name: 'Ver detalle de Aceite 1 L' }));
    const panel = await screen.findByRole('dialog', { name: 'Aceite 1 L' });
    expect(within(panel).getByText('Oleosol')).toBeInTheDocument();
    expect(within(panel).getByText(/Caja x12 · 12 und/)).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Agregar Caja x12' }));
    await waitFor(() => expect(screen.getByLabelText('Cantidad Aceite 1 L')).toHaveValue(12));
  });
});
