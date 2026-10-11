import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 20000 });
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import type { Role } from '@/shared/contracts';
import { tokenForEmployee } from '@/mocks/test-users';
import { db } from '@/mocks/db';

const T = { timeout: 5000 };

const renderInventory = async (employeeId: string, role: Role) => {
  setAccessToken(tokenForEmployee(employeeId));
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/inventory'] }));
  render(
    <AppProviders initialRole={role}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

describe('Inventario: existencias', () => {
  it('muestra el nombre del producto, no el id, y marca negativo y bajo mínimo', async () => {
    db.stockLevels.find((l) => l.productId === 'prd-001' && l.branchId === 'br-001')!.onHand = -3;
    db.stockLevels.find((l) => l.productId === 'prd-002' && l.branchId === 'br-001')!.onHand = 4; // mínimo 20
    await renderInventory('emp-002', 'bodeguero');

    expect((await screen.findAllByText('Arroz 500 g', {}, T)).length).toBe(2); // una fila por sede
    expect(screen.queryByText('prd-001')).not.toBeInTheDocument();
    expect(screen.getByText('Negativo')).toBeInTheDocument();
    expect(screen.getByText('Bajo stock')).toBeInTheDocument();
  });

  it('filtra por sede y por búsqueda', async () => {
    const user = userEvent.setup();
    await renderInventory('emp-002', 'bodeguero');
    await screen.findAllByText('Arroz 500 g', {}, T);
    expect(screen.getByText('Azúcar 1 kg')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Sede'), 'br-002');
    expect(screen.getByText('Arroz 500 g')).toBeInTheDocument();
    expect(screen.queryByText('Azúcar 1 kg')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Sede'), '');
    await user.type(screen.getByLabelText('Buscar producto'), 'aceite');
    expect(screen.getAllByText('Aceite 1 L')).toHaveLength(2);
    expect(screen.queryByText('Arroz 500 g')).not.toBeInTheDocument();
  });
});

describe('Inventario: movimientos y alertas', () => {
  it('kardex con nombre de producto y filtro por tipo', async () => {
    const user = userEvent.setup();
    await renderInventory('emp-002', 'bodeguero');
    await user.click(await screen.findByRole('tab', { name: /movimientos/i }, T));
    expect(await screen.findByText('PO-0001', {}, T)).toBeInTheDocument();
    expect(screen.getByText('POS-0003')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Tipo de movimiento'), 'entrada');
    expect(screen.getByText('PO-0001')).toBeInTheDocument();
    expect(screen.queryByText('POS-0003')).not.toBeInTheDocument();
  });

  it('alertas: stock negativo pide ajuste de inventario', async () => {
    db.alerts.push({
      id: 'alt-001', type: 'STOCK_NEGATIVE', productId: 'prd-001', branchId: 'br-001', createdAt: '2026-10-10T10:00:00Z', resolved: false,
    });
    const user = userEvent.setup();
    await renderInventory('emp-002', 'bodeguero');
    await user.click(await screen.findByRole('tab', { name: /alertas/i }, T));
    expect(await screen.findByText('Ajuste de inventario requerido', {}, T)).toBeInTheDocument();
    expect(screen.getByText('Arroz 500 g')).toBeInTheDocument();
  });
});

describe('Inventario: traslados', () => {
  const openTransfers = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole('tab', { name: /traslados/i }, T));
  };

  it('crea un traslado y queda en estado enviado', async () => {
    const user = userEvent.setup();
    await renderInventory('emp-003', 'admin');
    await openTransfers(user);
    await user.click(await screen.findByRole('button', { name: /nuevo traslado/i }, T));

    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Sede de destino'), 'br-002');
    await user.selectOptions(within(dialog).getByLabelText('Producto 1'), 'prd-001');
    await user.clear(within(dialog).getByLabelText('Cantidad 1'));
    await user.type(within(dialog).getByLabelText('Cantidad 1'), '7');
    await user.click(within(dialog).getByRole('button', { name: /enviar traslado/i }));

    expect(await screen.findByText('TRF-0001', {}, T)).toBeInTheDocument();
    expect(screen.getByText('Enviado', { selector: '.app-status' })).toBeInTheDocument();
    expect(db.transfers).toHaveLength(1);
    expect(db.transfers[0]?.lines[0]).toEqual({ productId: 'prd-001', quantity: 7 });
  });

  it('valida cantidades antes de enviar', async () => {
    const user = userEvent.setup();
    await renderInventory('emp-003', 'admin');
    await openTransfers(user);
    await user.click(await screen.findByRole('button', { name: /nuevo traslado/i }, T));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /enviar traslado/i }));
    expect(await within(dialog).findByText(/elige la sede de destino/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/agrega al menos un producto/i)).toBeInTheDocument();
    expect(db.transfers).toHaveLength(0);
  });

  const seedTransfer = () => {
    db.transfers.push({
      id: 'trf-001', number: 'TRF-0001', fromBranchId: 'br-001', toBranchId: 'br-002',
      lines: [{ productId: 'prd-001', quantity: 4 }], status: 'enviado', sentAt: '2026-10-10T10:00:00Z', receivedAt: null,
    });
    const target = db.stockLevels.find((l) => l.productId === 'prd-001' && l.branchId === 'br-002')!;
    target.inTransit = 4;
  };

  it('la sede destino recibe el traslado (BR-INV-03)', async () => {
    seedTransfer();
    const user = userEvent.setup();
    await renderInventory('emp-005', 'bodeguero'); // Sofía Ruiz, br-002
    await openTransfers(user);
    await user.click(await screen.findByRole('button', { name: /recibir trf-0001/i }, T));
    expect(await screen.findByText('Recibido', { selector: '.app-status' }, T)).toBeInTheDocument();
    expect(db.transfers[0]?.status).toBe('recibido');
  });

  it('otra sede no puede recibir: muestra el motivo (BR-INV-04)', async () => {
    seedTransfer();
    const user = userEvent.setup();
    await renderInventory('emp-002', 'bodeguero'); // Andrés, br-001
    await openTransfers(user);
    await user.click(await screen.findByRole('button', { name: /recibir trf-0001/i }, T));
    expect(await screen.findByText(/solo el encargado de la sede destino/i, {}, T)).toBeInTheDocument();
    expect(db.transfers[0]?.status).toBe('enviado');
  });
});
