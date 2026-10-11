import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { db } from '@/mocks/db';
import { roleLabels } from '@/app/config/permissions';
import { roleSchema } from '@/shared/contracts';
import type { Role } from '@/shared/contracts';

/** `tokenRole` permite probar el 403 del servidor con una UI que sí muestra los controles. */
const renderAdmin = async (tokenRole: Role = 'admin', uiRole: Role = 'admin') => {
  setAccessToken(mockTokenForRole(tokenRole));
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/administration'] }));
  render(
    <AppProviders initialRole={uiRole}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

const TIMEOUT = { timeout: 5000 };
const TEST_TIMEOUT = 20000;

describe('Administración', () => {
  it('lista empleados con rol y NOMBRE de sede, y da de alta uno nuevo', async () => {
    const user = userEvent.setup();
    await renderAdmin();

    expect(await screen.findByText('Laura Gómez', undefined, TIMEOUT)).toBeInTheDocument();
    expect(screen.getAllByText('Sede Principal').length).toBeGreaterThan(0);
    expect(screen.queryByText('br-001')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /nuevo empleado/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Nuevo Cajero Prueba');
    await user.selectOptions(within(dialog).getByLabelText('Rol'), 'comprador');
    await user.click(within(dialog).getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('Nuevo Cajero Prueba', undefined, TIMEOUT)).toBeInTheDocument();
    expect(db.employees.some((e) => e.name === 'Nuevo Cajero Prueba' && e.role === 'comprador')).toBe(true);
  }, TEST_TIMEOUT);

  it('desactiva un empleado en lugar de borrarlo', async () => {
    const user = userEvent.setup();
    await renderAdmin();
    const before = db.employees.length;

    await user.click(await screen.findByRole('button', { name: 'Desactivar Ana Cartera' }, TIMEOUT));
    await screen.findByText(/¿Desactivar a Ana Cartera\?/, undefined, TIMEOUT);
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByRole('button', { name: 'Reactivar Ana Cartera' }, TIMEOUT)).toBeInTheDocument();
    expect(db.employees).toHaveLength(before);
    expect(db.employees.find((e) => e.name === 'Ana Cartera')?.active).toBe(false);
  }, TEST_TIMEOUT);

  it('muestra un mensaje útil cuando el servidor responde FORBIDDEN', async () => {
    const user = userEvent.setup();
    await renderAdmin('cajero', 'admin');

    await user.click(await screen.findByRole('button', { name: /nuevo empleado/i }, TIMEOUT));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Intruso');
    await user.click(within(dialog).getByRole('button', { name: /guardar/i }));

    expect(await within(dialog).findByTestId('employee-form-error', undefined, TIMEOUT)).toHaveTextContent(
      /solo administrador y propietario/i,
    );
    expect(db.employees.some((e) => e.name === 'Intruso')).toBe(false);
  }, TEST_TIMEOUT);

  it('la matriz de permisos incluye todos los roles y es de solo lectura', async () => {
    const user = userEvent.setup();
    await renderAdmin();

    await user.click(await screen.findByRole('tab', { name: 'Roles y permisos' }, TIMEOUT));
    const table = await screen.findByRole('table', { name: /permisos por rol/i });
    for (const role of roleSchema.options) {
      expect(within(table).getByRole('columnheader', { name: roleLabels[role] })).toBeInTheDocument();
    }
    expect(screen.getByText(/requiere un contrato de api/i)).toBeInTheDocument();
    // El cajero puede vender; no administrar.
    const sellRow = within(table).getByRole('row', { name: /vender en el punto de venta/i });
    expect(within(sellRow).getAllByText('Sí').length).toBeGreaterThan(0);
    expect(within(table).queryByRole('checkbox')).not.toBeInTheDocument();
  }, TEST_TIMEOUT);

  it('sedes/empresa y configuración muestran datos de solo lectura', async () => {
    const user = userEvent.setup();
    await renderAdmin();

    await user.click(await screen.findByRole('tab', { name: 'Sedes y empresa' }, TIMEOUT));
    const info = await screen.findByTestId('session-info', undefined, TIMEOUT);
    expect(within(info).getByText('Comercial Demo S.A.S.')).toBeInTheDocument();
    expect(within(info).getByText('Caja 1')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Configuración' }));
    expect(await screen.findByText(/múltiplos de \$50/i)).toBeInTheDocument();
    expect(screen.getByText('15 % (con PIN de supervisor)')).toBeInTheDocument();
  }, TEST_TIMEOUT);

  it('las pestañas tienen nombre accesible', async () => {
    await renderAdmin();
    await screen.findByText('Laura Gómez', undefined, TIMEOUT);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Usuarios', 'Roles y permisos', 'Sedes y empresa', 'Configuración',
    ]);
  }, TEST_TIMEOUT);
});
