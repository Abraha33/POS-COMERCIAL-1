import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import type { Role } from '@/shared/contracts';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { db } from '@/mocks/db';

type User = ReturnType<typeof userEvent.setup>;

const renderPos = async (role: Role) => {
  setAccessToken(mockTokenForRole(role));
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/pos'] }));
  render(
    <AppProviders initialRole={role}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

const goToHistory = async (user: User) => {
  await user.click(await screen.findByRole('button', { name: /historial/i }, { timeout: 5000 }));
  await screen.findByTestId('sales-history', undefined, { timeout: 5000 });
};

const openDetail = async (user: User, number: string) => {
  await user.click(await screen.findByRole('button', { name: `Ver detalle de ${number}` }));
  return screen.findByTestId('sale-detail');
};

const stockOf = (productId: string) =>
  db.stockLevels.find((l) => l.productId === productId && l.branchId === 'br-001')?.onHand ?? 0;

beforeEach(() => window.localStorage.clear());

describe('POS: historial de ventas', { timeout: 20000 }, () => {
  it('lista ventas con el nombre del cliente y filtra por estado y número', async () => {
    const user = userEvent.setup();
    await renderPos('cajero');
    await goToHistory(user);

    const rows = await screen.findAllByTestId('sale-row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1] as HTMLElement).getByText('Cliente mostrador')).toBeInTheDocument();
    expect(screen.queryByText('cus-003')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Estado'), 'credito');
    expect(screen.getAllByTestId('sale-row')).toHaveLength(1);
    expect(screen.getByText('Tienda La Esquina')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Estado'), 'todas');
    await user.type(screen.getByLabelText('Buscar por número'), 'POS-0003');
    expect(screen.getAllByTestId('sale-row')).toHaveLength(1);

    await user.clear(screen.getByLabelText('Buscar por número'));
    await user.type(screen.getByLabelText('Buscar por número'), 'ZZZ');
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
  });

  it('el detalle muestra las líneas con el nombre del producto', async () => {
    const user = userEvent.setup();
    await renderPos('cajero');
    await goToHistory(user);
    const detail = await openDetail(user, 'POS-0003');
    expect(within(detail).getByText('Azúcar 1 kg')).toBeInTheDocument();
    expect(within(detail).getByText('Restaurante El Sazón')).toBeInTheDocument();
  });
});

describe('POS: devolución parcial', { timeout: 20000 }, () => {
  it('reduce lo disponible, reingresa stock y muestra el valor devuelto', async () => {
    const user = userEvent.setup();
    await renderPos('cajero');
    await goToHistory(user);
    const before = stockOf('prd-001');
    await openDetail(user, 'POS-0001'); // 2 × Arroz a 2.800

    await user.click(screen.getByRole('button', { name: 'Devolver' }));
    await user.type(await screen.findByLabelText(/arroz 500 g/i), '1');
    await user.type(screen.getByLabelText('Motivo de la devolución'), 'Empaque dañado');
    await user.click(screen.getByRole('button', { name: /registrar devolución/i }));

    expect(await screen.findByTestId('return-total')).toHaveTextContent('2.800');
    expect(screen.getByText(/stock se reingresó/i)).toBeInTheDocument();
    expect(stockOf('prd-001')).toBe(before + 1);
    expect(db.saleReturns).toHaveLength(1);

    // Lo disponible baja de 2 a 1.
    await user.click(within(screen.getByTestId('return-result')).getByRole('button', { name: 'Cerrar' }));
    await user.click(await screen.findByRole('button', { name: 'Devolver' }));
    expect(await screen.findByText(/devuelto 1 · máx\. 1/)).toBeInTheDocument();
  });

  it('devolver más de lo vendido muestra RETURN_EXCEEDS_SOLD con lo que queda', async () => {
    const user = userEvent.setup();
    await renderPos('cajero');
    // Otra terminal ya devolvió 1 de las 2 unidades: la API no lo expone, el servidor lo rechaza.
    db.saleReturns.push({
      id: 'ret-x', number: 'DEV-0001', saleId: 'sal-001', date: '2026-10-02',
      lines: [{ productId: 'prd-001', quantity: 1, amount: 2800 }], total: 2800, reason: 'Otra terminal',
    });
    await goToHistory(user);
    await openDetail(user, 'POS-0001');

    await user.click(screen.getByRole('button', { name: 'Devolver' }));
    await user.type(await screen.findByLabelText(/arroz 500 g/i), '2');
    await user.type(screen.getByLabelText('Motivo de la devolución'), 'Cliente se arrepintió');
    await user.click(screen.getByRole('button', { name: /registrar devolución/i }));

    const error = await screen.findByTestId('return-error');
    expect(error).toHaveTextContent(/supera lo vendido/i);
    expect(error).toHaveTextContent(/solo quedan 1/i);
    expect(db.saleReturns).toHaveLength(1);
  });

  it('exige motivo antes de enviar', async () => {
    const user = userEvent.setup();
    await renderPos('cajero');
    await goToHistory(user);
    await openDetail(user, 'POS-0001');
    await user.click(screen.getByRole('button', { name: 'Devolver' }));
    await user.type(await screen.findByLabelText(/arroz 500 g/i), '1');
    await user.click(screen.getByRole('button', { name: /registrar devolución/i }));
    expect(await screen.findByText('El motivo es obligatorio.')).toBeInTheDocument();
    expect(db.saleReturns).toHaveLength(0);
  });
});

describe('POS: anulación', { timeout: 20000 }, () => {
  it('exige motivo; con motivo anula la venta y reingresa el stock', async () => {
    const user = userEvent.setup();
    await renderPos('admin');
    await goToHistory(user);
    const before = stockOf('prd-001');
    await openDetail(user, 'POS-0001');

    await user.click(screen.getByRole('button', { name: 'Anular' }));
    await user.click(await screen.findByRole('button', { name: 'Anular venta' }));
    expect(await screen.findByText('El motivo es obligatorio.')).toBeInTheDocument();
    expect(db.sales[0]?.status).toBe('pagada');

    await user.type(screen.getByLabelText('Motivo de la anulación'), 'Error de digitación');
    await user.click(screen.getByRole('button', { name: 'Anular venta' }));

    expect(await screen.findByText(/venta anulada: no admite devoluciones/i)).toBeInTheDocument();
    expect(db.sales[0]?.status).toBe('anulada');
    expect(stockOf('prd-001')).toBe(before + 2);
    expect(screen.getByRole('button', { name: 'Anular' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Devolver' })).toBeDisabled();
  });

  it('el cajero con el turno de la venta cerrado no puede anular (FORBIDDEN)', async () => {
    const user = userEvent.setup();
    await renderPos('cajero');
    await user.click(await screen.findByRole('button', { name: /abrir turno/i }, { timeout: 5000 }));
    await user.type(await screen.findByLabelText(/buscar producto o escanear/i), '7701234567890{Enter}');
    await user.click(await screen.findByRole('button', { name: /cobrar/i }));
    expect(await screen.findByTestId('receipt-number')).toHaveTextContent('POS-0004');
    await user.click(screen.getByRole('button', { name: /nueva venta/i }));

    // El turno de la venta se cierra (otra terminal o cierre de caja).
    for (const shift of db.shifts) shift.status = 'closed';

    await goToHistory(user);
    await openDetail(user, 'POS-0004');
    await user.click(screen.getByRole('button', { name: 'Anular' }));
    await user.type(await screen.findByLabelText('Motivo de la anulación'), 'Cobro duplicado');
    await user.click(screen.getByRole('button', { name: 'Anular venta' }));

    expect(await screen.findByTestId('void-error')).toHaveTextContent(/no puedes anular esta venta/i);
    expect(db.sales.at(-1)?.status).toBe('pagada');
  });

  it('el cajero con el turno abierto sí puede anular su venta', async () => {
    const user = userEvent.setup();
    await renderPos('cajero');
    await user.click(await screen.findByRole('button', { name: /abrir turno/i }, { timeout: 5000 }));
    await user.type(await screen.findByLabelText(/buscar producto o escanear/i), '7701234567890{Enter}');
    await user.click(await screen.findByRole('button', { name: /cobrar/i }));
    await screen.findByTestId('receipt-number');
    await user.click(screen.getByRole('button', { name: /nueva venta/i }));

    await goToHistory(user);
    await openDetail(user, 'POS-0004');
    await user.click(screen.getByRole('button', { name: 'Anular' }));
    await user.type(await screen.findByLabelText('Motivo de la anulación'), 'Cobro duplicado');
    await user.click(screen.getByRole('button', { name: 'Anular venta' }));

    expect(await screen.findByText(/venta anulada: no admite devoluciones/i)).toBeInTheDocument();
    expect(db.sales.at(-1)?.status).toBe('anulada');
  });
});
