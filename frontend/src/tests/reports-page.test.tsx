import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';

const renderReports = async (role: 'propietario' | 'cajero' = 'propietario') => {
  setAccessToken(mockTokenForRole(role));
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/reports'] }));
  render(
    <AppProviders initialRole={role}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

describe('Reportes', () => {
  it('muestra cifras concretas y etiquetas legibles de los reportes agregados', async () => {
    await renderReports();
    const sales = await screen.findByRole('region', { name: 'Ventas' }, { timeout: 5000 });

    expect(within(sales).getByText('Total bruto').nextSibling).toHaveTextContent('453.600');
    expect(within(sales).getByText('Total neto').nextSibling).toHaveTextContent('453.600');
    expect(within(sales).getByText('Ticket promedio').nextSibling).toHaveTextContent('151.200');
    expect(screen.getAllByRole('figure')).toHaveLength(2);
    expect(screen.getByRole('figure', { name: /ventas por día/i })).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: /ventas por medio de pago/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Efectivo' })).toBeInTheDocument();
    expect(screen.getAllByText('Al día').length).toBeGreaterThan(0);
    expect(screen.queryByText('br-001')).not.toBeInTheDocument();
  });

  it('cambia las cifras al filtrar por sede y fecha', async () => {
    const user = userEvent.setup();
    await renderReports();
    await screen.findByRole('option', { name: 'Sede Norte' });

    await user.selectOptions(screen.getByLabelText('Sede'), 'br-002');
    expect(await screen.findByText('No hay ventas para los filtros elegidos.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /limpiar filtros/i }));
    await user.type(screen.getByLabelText('Desde'), '2026-10-02');
    const netTotal = await screen.findByText('Total neto');
    expect(netTotal.nextSibling).toHaveTextContent('48.000');
  });

  it('bloquea el carril cuando falta reports.view', async () => {
    await renderReports('cajero');
    expect(await screen.findByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByText('Antigüedad de cartera')).not.toBeInTheDocument();
  });
});
