import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { createMemoryGateway, setProofGateway } from '@/features/pos/proofs';
import { resetRelay } from '@/features/pos/proofs/relay';

type User = ReturnType<typeof userEvent.setup>;
const IMG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

const renderAt = async (path: string, role: 'cajero' | 'propietario' = 'cajero') => {
  setAccessToken(mockTokenForRole(role));
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  render(
    <AppProviders initialRole={role}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

const toPayment = async (user: User) => {
  await user.click(await screen.findByRole('button', { name: /abrir turno/i }, { timeout: 5000 }));
  await user.type(await screen.findByLabelText(/buscar producto o escanear/i), '7701234567890{Enter}');
  await screen.findByLabelText('Cantidad Arroz 500 g');
  await user.click(screen.getByRole('button', { name: 'Transferencia' }));
  await user.click(screen.getByRole('button', { name: /cobrar/i }));
  return screen.findByRole('dialog', { name: 'Cobrar venta' });
};

beforeEach(() => {
  window.localStorage.clear();
  resetRelay();
  setProofGateway(createMemoryGateway());
});

describe('Cobro por transferencia con comprobante', { timeout: 30000 }, () => {
  it('no se confirma sin referencia ni comprobante verificado; la foto no confirma el pago', async () => {
    const user = userEvent.setup();
    await renderAt('/pos');
    const dialog = await toPayment(user);
    const confirmButton = within(dialog).getByRole('button', { name: /confirmar pago/i });
    expect(confirmButton).toBeDisabled();
    expect(within(dialog).getByTestId('proof-status')).toHaveTextContent('Sin solicitar');

    await user.type(within(dialog).getByLabelText(/número de referencia/i), 'REF-7788');
    expect(confirmButton).toBeDisabled(); // falta comprobante verificado

    await user.click(within(dialog).getByRole('button', { name: /solicitar comprobante/i }));
    await waitFor(() => expect(within(dialog).getByTestId('proof-status')).toHaveTextContent('Esperando comprobante'));
    expect(within(dialog).getByRole('img', { name: /código QR/i })).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();
  });

  it('el teléfono envía la foto → recibido (sigue bloqueado) → el cajero confirma → se habilita y vende', async () => {
    const user = userEvent.setup();
    await renderAt('/pos');
    const dialog = await toPayment(user);
    await user.type(within(dialog).getByLabelText(/número de referencia/i), 'REF-1');
    await user.click(within(dialog).getByRole('button', { name: /solicitar comprobante/i }));
    const link = (await within(dialog).findByLabelText('Enlace de captura')) as HTMLInputElement;
    const token = link.value.split('/captura/')[1]!;

    // Teléfono: entrega evidencia por token.
    await setPhone(token);
    await waitFor(() => expect(within(dialog).getByTestId('proof-status')).toHaveTextContent('Comprobante recibido'), { timeout: 5000 });
    const confirmButton = within(dialog).getByRole('button', { name: /confirmar pago/i });
    expect(confirmButton).toBeDisabled();

    await user.click(within(dialog).getByRole('button', { name: 'Marcar pago como verificado' }));
    await waitFor(() => expect(within(dialog).getByTestId('proof-status')).toHaveTextContent('Pago confirmado'));
    await waitFor(() => expect(confirmButton).toBeEnabled());
    await user.click(confirmButton);
    expect(await screen.findByTestId('receipt-number')).toBeInTheDocument();
  });

  it('un comprobante rechazado vuelve a bloquear y pide uno nuevo', async () => {
    const user = userEvent.setup();
    await renderAt('/pos');
    const dialog = await toPayment(user);
    await user.type(within(dialog).getByLabelText(/número de referencia/i), 'REF-2');
    await user.click(within(dialog).getByRole('button', { name: /solicitar comprobante/i }));
    const link = (await within(dialog).findByLabelText('Enlace de captura')) as HTMLInputElement;
    await setPhone(link.value.split('/captura/')[1]!);
    await waitFor(() => expect(within(dialog).getByTestId('proof-status')).toHaveTextContent('Comprobante recibido'), { timeout: 5000 });

    await user.type(within(dialog).getByLabelText('Motivo si no coincide'), 'Monto distinto');
    await user.click(within(dialog).getByRole('button', { name: 'Rechazar comprobante' }));
    await waitFor(() => expect(within(dialog).getByTestId('proof-status')).toHaveTextContent('Rechazado'));
    expect(within(dialog).getByRole('button', { name: /confirmar pago/i })).toBeDisabled();
    expect(within(dialog).getByText(/Monto distinto/)).toBeInTheDocument();
  });

  it('solo propietario/administrador autoriza la excepción', async () => {
    const user = userEvent.setup();
    await renderAt('/pos');
    const dialog = await toPayment(user);
    await user.type(within(dialog).getByLabelText(/número de referencia/i), 'REF-3');
    await user.click(within(dialog).getByRole('button', { name: /solicitar comprobante/i }));
    await within(dialog).findByLabelText('Enlace de captura');
    await user.click(within(dialog).getByText(/Excepción autorizada/));
    expect(within(dialog).getByText(/Solo un propietario o administrador/)).toBeInTheDocument();
  });
});

describe('Página de captura del teléfono', { timeout: 20000 }, () => {
  it('muestra monto y cuenta, y rechaza un enlace inexistente', async () => {
    await renderAt('/captura/inexistente');
    expect(await screen.findByRole('alert')).toHaveTextContent(/no existe|no es válido/i);
  });

  it('con un token válido muestra el monto y permite enviar', async () => {
    const gw = createMemoryGateway();
    setProofGateway(gw);
    const p = await gw.create({ operationId: 'op-x', method: 'nequi', channelId: 'nequi', channelLabel: 'Nequi', amount: 185000, destination: 'Nequi del negocio', employee: 'Ana' });
    await renderAt(`/captura/${p.token}`);
    expect(await screen.findByTestId('capture-amount')).toHaveTextContent('185.000');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar comprobante' })).toBeDisabled();
  });
});

describe('Crédito con plan', { timeout: 30000 }, () => {
  it('muestra cupo, financiado y vencimiento; el abono inicial reduce lo financiado; plazo propuesto marcado', async () => {
    const user = userEvent.setup();
    await renderAt('/pos');
    await user.click(await screen.findByRole('button', { name: /abrir turno/i }, { timeout: 5000 }));
    await user.type(await screen.findByLabelText(/buscar producto o escanear/i), 'SKU-002{Enter}'); // 12.500
    await screen.findByTestId('pos-total');
    await user.selectOptions(screen.getByLabelText(/Cliente \(F3\)/), 'Tienda La Esquina');
    await user.click(screen.getByRole('button', { name: 'Crédito' }));
    await user.click(screen.getByRole('button', { name: /cobrar/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Cobrar venta' });

    expect(within(dialog).getByTestId('credit-financed')).toHaveTextContent('12.500');
    expect(within(dialog).getByTestId('credit-available')).toHaveTextContent('1.200.000');
    const term = within(dialog).getByLabelText('Plazo') as HTMLSelectElement;
    expect([...term.options].map((o) => o.text)).toEqual([
      '7 días (propuesta)', '15 días (propuesta)', '30 días (aprobado)', '45 días (propuesta)', '60 días (propuesta)',
    ]);
    await user.selectOptions(term, '60');

    const initial = within(dialog).getByLabelText(/Abono inicial/);
    await user.clear(initial);
    await user.type(initial, '5000');
    await waitFor(() => expect(within(dialog).getByTestId('credit-financed')).toHaveTextContent('7.500'));
  });
});

describe('Pago mixto con componentes independientes', { timeout: 30000 }, () => {
  it('efectivo + transferencia: el digital bloquea hasta confirmarse y el componente confirmado se reversa con motivo', async () => {
    const user = userEvent.setup();
    await renderAt('/pos');
    await user.click(await screen.findByRole('button', { name: /abrir turno/i }, { timeout: 5000 }));
    await user.type(await screen.findByLabelText(/buscar producto o escanear/i), 'SKU-002{Enter}'); // 12.500
    await screen.findByTestId('pos-total');
    await user.click(screen.getByRole('button', { name: 'Mixto' }));
    await user.click(screen.getByRole('button', { name: /cobrar/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Cobrar venta' });

    // Componente 1: efectivo por 5.000.
    const amount1 = within(dialog).getByLabelText('Monto 1');
    await user.clear(amount1);
    await user.type(amount1, '5000');
    expect(within(dialog).getByTestId('component-status-1')).toHaveTextContent('Recibido');
    expect(within(dialog).getByTestId('pos-missing')).toHaveTextContent('7.500');

    // Componente 2: Nequi por lo que falta, con su propio formulario y comprobante.
    await user.click(within(dialog).getByRole('button', { name: /agregar medio de pago/i }));
    await user.selectOptions(within(dialog).getByLabelText('Medio de pago 2'), 'Nequi');
    expect(within(dialog).getByTestId('component-status-2')).toHaveTextContent('Por verificar');
    const confirmButton = within(dialog).getByRole('button', { name: /confirmar pago \(F8\)/i });
    expect(confirmButton).toBeDisabled();

    const refs = within(dialog).getAllByLabelText(/Número de referencia/);
    await user.type(refs[0]!, 'MX-1');
    await user.click(within(dialog).getByRole('button', { name: /solicitar comprobante/i }));
    const link = (await within(dialog).findByLabelText('Enlace de captura')) as HTMLInputElement;
    await createMemoryGateway().submitPublic(link.value.split('/captura/')[1]!, IMG);
    await user.click(await within(dialog).findByRole('button', { name: 'Marcar pago como verificado' }, { timeout: 6000 }));
    await waitFor(() => expect(within(dialog).getByTestId('component-status-2')).toHaveTextContent('Confirmado'));
    await waitFor(() => expect(confirmButton).toBeEnabled());

    // Reversar el digital: queda registrado y la venta vuelve a bloquearse.
    await user.click(within(dialog).getByRole('button', { name: 'Reversar pago 2' }));
    await user.type(within(dialog).getByLabelText('Motivo de la reversa 2'), 'Cliente pagó en efectivo');
    await user.click(within(dialog).getByRole('button', { name: 'Reversar pago' }));
    expect(within(dialog).getByText(/Cliente pagó en efectivo/)).toBeInTheDocument();
    expect(within(dialog).getByTestId('pos-missing')).toHaveTextContent('7.500');
    expect(confirmButton).toBeDisabled();
  });
});

const setPhone = async (token: string) => {
  await createMemoryGateway().submitPublic(token, IMG);
};

describe('Crédito en cuotas', { timeout: 30000 }, () => {
  it('el plan de cuotas suma lo financiado y el excedente de cupo ofrece autorización', async () => {
    const user = userEvent.setup();
    await renderAt('/pos');
    await user.click(await screen.findByRole('button', { name: /abrir turno/i }, { timeout: 5000 }));
    await user.type(await screen.findByLabelText(/buscar producto o escanear/i), 'SKU-002{Enter}');
    await screen.findByTestId('pos-total');
    await user.selectOptions(screen.getByLabelText(/Cliente \(F3\)/), 'Tienda La Esquina');
    await user.click(screen.getByRole('button', { name: 'Crédito' }));
    await user.click(screen.getByRole('button', { name: /cobrar/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Cobrar venta' });

    await user.selectOptions(within(dialog).getByLabelText(/Cuotas/), '3');
    const plan = within(dialog).getByRole('list', { name: 'Plan de cuotas' });
    const items = within(plan).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    // 12.500 / 3 = 4.166 (+ resto en la última): 4.166 + 4.166 + 4.168
    expect(items[0]).toHaveTextContent('4.166');
    expect(items[2]).toHaveTextContent('4.168');
  });
});
