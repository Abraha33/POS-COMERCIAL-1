import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { db } from '@/mocks/db';

const renderPurchases = async (tokenRole: Parameters<typeof mockTokenForRole>[0] = 'comprador') => {
  setAccessToken(mockTokenForRole(tokenRole));
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/purchases'] }));
  render(
    <AppProviders initialRole="comprador">
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

const waitForOrders = async () => {
  await screen.findByRole('button', { name: /ver orden PO-0002/i }, { timeout: 5000 });
};

beforeEach(() => window.localStorage.clear());

// Los diálogos de PrimeReact y la tabla hacen lentos los flujos largos en jsdom.
vi.setConfig({ testTimeout: 30000 });

describe('Compras: órdenes', () => {
  it('lista con proveedor por nombre y filtra por estado', async () => {
    const user = userEvent.setup();
    await renderPurchases();
    await waitForOrders();
    expect(screen.getAllByText('Lácteos del Valle').length).toBeGreaterThan(0);
    expect(screen.queryByText('sup-002')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Estado'), 'recibida');
    expect(screen.getByRole('button', { name: /ver orden PO-0001/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ver orden PO-0002/i })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Estado'), 'cancelada');
    expect(await screen.findByTestId('orders-empty')).toBeInTheDocument();
  });

  it('crea una orden, la envía y la recibe mostrando el efecto', async () => {
    const user = userEvent.setup();
    await renderPurchases();
    await waitForOrders();
    const levelBefore = db.stockLevels.find((l) => l.productId === 'prd-004' && l.branchId === 'br-001')?.onHand ?? 0;

    await user.click(screen.getByRole('button', { name: /nueva orden/i }));
    // Validación: sin proveedor ni producto no crea.
    await user.click(await screen.findByRole('button', { name: /crear orden/i }));
    expect(await screen.findByText(/elige un proveedor/i)).toBeInTheDocument();
    expect(screen.getByText(/línea 1: elige un producto/i)).toBeInTheDocument();
    expect(db.purchaseOrders).toHaveLength(2);

    await user.selectOptions(screen.getByLabelText('Proveedor'), 'sup-002');
    await user.selectOptions(screen.getByLabelText('Producto 1'), 'prd-004');
    const qty = screen.getByLabelText('Cantidad 1');
    await user.clear(qty);
    await user.type(qty, '10');
    expect(screen.getByTestId('po-total')).toHaveTextContent('37.000');

    await user.click(screen.getByRole('button', { name: /crear orden/i }));
    expect(await screen.findByRole('button', { name: /enviar al proveedor/i })).toBeInTheDocument();
    expect(db.purchaseOrders.at(-1)?.status).toBe('borrador');
    expect(db.purchaseOrders.at(-1)?.total).toBe(37000);

    await user.click(screen.getByRole('button', { name: /enviar al proveedor/i }));
    const receiveButton = await screen.findByRole('button', { name: /recibir mercancía/i });
    expect(db.purchaseOrders.at(-1)?.status).toBe('enviada');

    await user.click(receiveButton);
    // Confirmación previa: no hay efecto hasta confirmar.
    expect(await screen.findByText(/es todo o nada/i)).toBeInTheDocument();
    expect(db.payables).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /confirmar recepción/i }));
    const effect = await screen.findByTestId('receive-effect', undefined, { timeout: 5000 });
    expect(within(effect).getByText(/stock \+10/i)).toBeInTheDocument();
    expect(await within(effect).findByText(/vencimiento/i, undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(db.purchaseOrders.at(-1)?.status).toBe('recibida');
    expect(db.stockLevels.find((l) => l.productId === 'prd-004' && l.branchId === 'br-001')?.onHand).toBe(levelBefore + 10);
    expect(db.payables).toHaveLength(2);
  });

  it('INVALID_STATE: avisa que la orden cambió y actualiza el estado', async () => {
    const user = userEvent.setup();
    await renderPurchases();
    await waitForOrders();
    await user.click(screen.getByRole('button', { name: /ver orden PO-0002/i }));
    const receiveButton = await screen.findByRole('button', { name: /recibir mercancía/i });

    // Otro usuario la recibe antes: el servidor responde 409.
    const other = db.purchaseOrders.find((o) => o.id === 'po-002');
    if (other) other.status = 'recibida';

    await user.click(receiveButton);
    await user.click(await screen.findByRole('button', { name: /confirmar recepción/i }));
    expect(await screen.findByText(/la orden cambió de estado/i, undefined, { timeout: 5000 })).toBeInTheDocument();
    // La lista se refresca: la orden pasa a "Recibida" y desaparece la acción de recibir.
    await waitFor(() => expect(screen.queryByRole('button', { name: /recibir mercancía/i })).not.toBeInTheDocument(), { timeout: 5000 });
    expect((await screen.findAllByText('Recibida')).length).toBeGreaterThan(0);
    expect(db.payables).toHaveLength(1); // nada se duplicó
  });

  it('FORBIDDEN: explica que el rol no puede recibir', async () => {
    const user = userEvent.setup();
    await renderPurchases('cajero'); // la sesión de UI es de comprador; el servidor rechaza al token de cajero
    await waitForOrders();
    await user.click(screen.getByRole('button', { name: /ver orden PO-0002/i }));
    await user.click(await screen.findByRole('button', { name: /recibir mercancía/i }));
    await user.click(await screen.findByRole('button', { name: /confirmar recepción/i }));
    expect(await screen.findByText(/tu rol no tiene permiso para recibir/i, undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(db.purchaseOrders.find((o) => o.id === 'po-002')?.status).toBe('enviada');
  });
});

describe('Compras: proveedores', () => {
  it('da de alta un proveedor y rechaza el documento duplicado', async () => {
    const user = userEvent.setup();
    await renderPurchases();
    await waitForOrders();
    await user.click(screen.getByRole('tab', { name: /proveedores/i }));
    await user.click(await screen.findByRole('button', { name: /nuevo proveedor/i }));

    await user.type(screen.getByLabelText('Nombre'), 'Granos del Sur');
    await user.type(screen.getByLabelText(/documento/i), '800765432-9'); // ya existe (Distribuidora Andina)
    await user.click(screen.getByRole('button', { name: /guardar proveedor/i }));
    expect((await screen.findAllByText(/ya existe un proveedor con ese documento/i)).length).toBeGreaterThan(0);
    expect(db.suppliers).toHaveLength(2);

    const taxId = screen.getByLabelText(/documento/i);
    await user.clear(taxId);
    await user.type(taxId, '900555111-0');
    await user.click(screen.getByRole('button', { name: /guardar proveedor/i }));

    expect(await screen.findByText('Granos del Sur', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(db.suppliers).toHaveLength(3);
    expect(db.suppliers.at(-1)).toMatchObject({ name: 'Granos del Sur', taxId: '900555111-0', paymentTermsDays: 30, active: true });
  });
});
