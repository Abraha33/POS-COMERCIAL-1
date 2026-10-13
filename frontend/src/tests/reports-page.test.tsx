import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';

const renderReports = async (role: 'propietario' | 'cajero' = 'propietario') => {
  setAccessToken(mockTokenForRole(role));
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/reports'] }));
  render(<AppProviders initialRole={role}><RouterProvider router={router} /></AppProviders>);
  await router.load();
};

describe('Reportes', () => {
  it('consume los tres endpoints aprobados y muestra sus estados de datos', async () => {
    await renderReports();
    expect(await screen.findByRole('region', { name: 'Ventas' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Antigüedad de cartera')).toBeInTheDocument();
    expect(screen.getByText('Valorización de inventario')).toBeInTheDocument();
    expect(screen.getByText(/datos de los tres endpoints agregados/i)).toBeInTheDocument();
    expect(screen.getByText(/costo vigente del producto \(mock\)/i)).toBeInTheDocument();
  });

  it('envía sede y corte al cambiar filtros, y permite limpiarlos', async () => {
    const user = userEvent.setup();
    await renderReports();
    await screen.findByRole('region', { name: 'Ventas' }, { timeout: 5000 });
    await user.selectOptions(screen.getByLabelText('Sede'), 'br-002');
    expect(screen.getByLabelText('Sede')).toHaveValue('br-002');
    await user.type(screen.getByLabelText('Hasta'), '2026-10-02');
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-10-02');
    await user.click(screen.getByRole('button', { name: /limpiar filtros/i }));
    expect(screen.getByLabelText('Sede')).toHaveValue('all');
    expect(screen.getByLabelText('Hasta')).toHaveValue('');
  });

  it('bloquea el carril cuando falta reports.view', async () => {
    await renderReports('cajero');
    expect(await screen.findByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByText('Antigüedad de cartera')).not.toBeInTheDocument();
  });
});
