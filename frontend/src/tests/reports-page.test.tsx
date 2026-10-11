import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';

// jsdom no dibuja canvas: la tabla equivalente y el resumen textual son lo que se verifica.
vi.mock('primereact/chart', () => ({
  Chart: ({ ariaLabel }: { ariaLabel?: string }) => <canvas role="img" aria-label={ariaLabel} data-testid="chart-canvas" />,
}));

const renderReports = async () => {
  setAccessToken(mockTokenForRole('propietario'));
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/reports'] }));
  render(
    <AppProviders initialRole="propietario">
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

describe('Reportes', () => {
  it('muestra KPIs de ventas, cartera y la nota de cálculo en el navegador', async () => {
    await renderReports();
    const sales = await screen.findByRole('region', { name: 'Ventas' }, { timeout: 5000 });
    expect(within(sales).getByText('Total vendido').nextSibling).toHaveTextContent('453.600');
    expect(within(sales).getByText('Ticket promedio').nextSibling).toHaveTextContent('151.200');
    expect(screen.getAllByTestId('chart-canvas')).toHaveLength(2);
    expect(screen.getByRole('img', { name: /ventas por día/i })).toBeInTheDocument();

    const receivable = screen.getByRole('region', { name: 'Cuentas por cobrar' });
    expect(within(receivable).getByText('Saldo total').nextSibling).toHaveTextContent('300.000');
    expect(within(receivable).getByText('Vencido').nextSibling).toHaveTextContent('0');
    expect(screen.getByText(/calculado en el navegador/i)).toBeInTheDocument();
    expect(screen.getByText(/turnos de caja/i)).toBeInTheDocument();
  });

  it('filtrar por una sede sin ventas muestra el estado vacío y se puede limpiar', async () => {
    const user = userEvent.setup();
    await renderReports();
    await screen.findByRole('region', { name: 'Ventas' }, { timeout: 5000 });

    await user.selectOptions(screen.getByLabelText('Sede'), 'br-002');
    expect(await screen.findByText(/no hay ventas para el rango/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /limpiar filtros/i }));
    expect(screen.getByLabelText('Sede')).toHaveValue('all');
    expect(screen.queryByText(/no hay ventas para el rango/i)).not.toBeInTheDocument();
  });

  it('el rango de fechas excluye ventas fuera del rango', async () => {
    const user = userEvent.setup();
    await renderReports();
    await screen.findByRole('region', { name: 'Ventas' }, { timeout: 5000 });

    await user.type(screen.getByLabelText('Desde'), '2026-10-02');
    const sales = screen.getByRole('region', { name: 'Ventas' });
    expect(within(sales).getByText('Total vendido').nextSibling).toHaveTextContent('48.000');
  });
});
