import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import type { Role } from '@/shared/contracts';

type User = ReturnType<typeof userEvent.setup>;

const renderOps = async (role: Role = 'cajero') => {
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/pos/turno'] }));
  render(
    <AppProviders initialRole={role}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
  await screen.findByRole('heading', { level: 1, name: 'Turno y operación' });
};

const tab = (user: User, name: RegExp) => user.click(screen.getByRole('tab', { name }));
const startShift = async (user: User) => {
  await user.click(await screen.findByRole('button', { name: /Crear turno simulado/ }));
  await screen.findByRole('heading', { name: 'Turno' });
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('POS-F03 · turno en la interfaz', () => {
  it('sin turno: explica y ofrece abrir; con turno simulado muestra responsable, base y estado', async () => {
    const user = userEvent.setup();
    await renderOps();
    expect(await screen.findByText('No hay un turno activo en esta caja')).toBeInTheDocument();
    await startShift(user);
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('$ 200.000')).toBeInTheDocument();
  });

  it('pausar bloquea la terminal y conserva el turno; reanudar exige código', async () => {
    const user = userEvent.setup();
    await renderOps();
    await startShift(user);
    await user.click(screen.getByRole('button', { name: 'Pausar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Terminal bloqueada' });
    expect(within(dialog).getByText(/El turno sigue abierto/)).toBeInTheDocument();
    const resume = within(dialog).getByRole('button', { name: 'Reanudar turno' });
    expect(resume).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/Código de/), '4321');
    await user.click(resume);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Terminal bloqueada' })).not.toBeInTheDocument());
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('incidencia: se registra y se resuelve', async () => {
    const user = userEvent.setup();
    await renderOps();
    await startShift(user);
    await user.click(screen.getByRole('button', { name: 'Registrar incidencia' }));
    const dialog = await screen.findByRole('dialog', { name: 'Registrar incidencia' });
    await user.type(within(dialog).getByLabelText('Qué pasó'), 'Lector desconectado');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText(/Lector desconectado/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resolver' }));
    expect(await screen.findByText('Resuelta')).toBeInTheDocument();
  });

  it('finalizar: lo pendiente se conserva y se pasa al flujo de cierre, sin cerrar aquí', async () => {
    const user = userEvent.setup();
    await renderOps();
    await startShift(user);
    await user.click(screen.getByRole('button', { name: 'Finalizar turno' }));
    const dialog = await screen.findByRole('dialog', { name: 'Finalizar turno' });
    expect(within(dialog).getByText(/arqueo y el cierre de caja se hacen en el flujo de cierre/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Solicitar finalización' }));
    expect(await within(dialog).findByRole('button', { name: 'Ir a arqueo y cierre' })).toBeInTheDocument();
    expect(screen.getAllByText('Finalizando').length).toBeGreaterThan(0);
  });

  it('el turno sobrevive a una recarga (nuevo montaje, mismo almacenamiento)', async () => {
    const user = userEvent.setup();
    await renderOps();
    await startShift(user);
    const { unmount } = render(<span />);
    unmount();
    document.body.innerHTML = '';
    await renderOps();
    expect(await screen.findByRole('heading', { name: 'Turno' })).toBeInTheDocument();
    expect(screen.queryByText('No hay un turno activo en esta caja')).not.toBeInTheDocument();
  });
});

describe('POS-F12 · autorizaciones en la interfaz', () => {
  it('el cajero solicita y la solicitud queda pendiente sin ejecutarse', async () => {
    const user = userEvent.setup();
    await renderOps();
    await tab(user, /Autorizaciones/);
    await user.click(await screen.findByRole('button', { name: 'Nueva solicitud' }));
    const dialog = await screen.findByRole('dialog', { name: 'Solicitar autorización' });
    await user.type(within(dialog).getByLabelText('Importe'), '120000');
    await user.type(within(dialog).getByLabelText('Motivo'), 'Cliente frecuente');
    await user.click(within(dialog).getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('Descuento extraordinario')).toBeInTheDocument();
    expect(screen.getByText('Pendiente', { selector: 'span *, span' })).toBeInTheDocument();
  });

  it('el supervisor no decide su propia solicitud', async () => {
    const user = userEvent.setup();
    await renderOps('admin');
    await tab(user, /Autorizaciones/);
    expect(await screen.findByText('Bandeja de autorizaciones')).toBeInTheDocument();
    expect(screen.getByText('Sin solicitudes aquí')).toBeInTheDocument();
  });
});

describe('POS-F13 · sincronización en la interfaz', () => {
  it('sin conexión bloquea lo no permitido con motivo y permite lo local', async () => {
    const user = userEvent.setup();
    await renderOps();
    await tab(user, /Sincronización/);
    await user.click(await screen.findByLabelText('Simular que no hay conexión'));
    expect((await screen.findAllByText('Sin conexión')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Cobro con tarjeta' }));
    expect(await screen.findByTestId('ops-error')).toHaveTextContent(/Cobrar con tarjeta/);
    expect(screen.getByText('Nada por sincronizar')).toBeInTheDocument();
  });

  it('con turno y política habilitada la venta en efectivo queda pendiente y se sincroniza sin duplicar', async () => {
    const user = userEvent.setup();
    await renderOps();
    await startShift(user);
    await tab(user, /Sincronización/);
    await user.click(await screen.findByLabelText('Simular que no hay conexión'));
    await user.click(screen.getByLabelText(/Habilitar venta en efectivo offline/));
    await user.click(screen.getByRole('button', { name: 'Venta en efectivo' }));
    expect(await screen.findByText('Venta en efectivo', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByTestId('connectivity')).toHaveAttribute('data-state', 'sin-conexion');

    await user.click(screen.getByLabelText('Simular que no hay conexión'));
    await waitFor(() => expect(screen.getByTestId('connectivity')).toHaveAttribute('data-state', 'pendientes'));
    await user.click(screen.getByRole('button', { name: 'Sincronizar ahora' }));
    await waitFor(() => expect(screen.getByTestId('connectivity')).toHaveAttribute('data-state', 'sincronizado'));
    expect(screen.getAllByText('Confirmada').length).toBeGreaterThan(0);
  });

  it('respuesta perdida: queda incierta y se resuelve sin crear otra venta', async () => {
    const user = userEvent.setup();
    await renderOps();
    await startShift(user);
    await tab(user, /Sincronización/);
    await user.click(await screen.findByLabelText(/Habilitar venta en efectivo offline/));
    await user.click(screen.getByRole('button', { name: 'Venta en efectivo' }));
    await user.selectOptions(screen.getByLabelText('Próxima respuesta del servidor'), 'lost');
    await user.click(screen.getByRole('button', { name: 'Sincronizar ahora' }));
    await waitFor(() => expect(screen.getByTestId('connectivity')).toHaveAttribute('data-state', 'incierto'));
    await user.click(screen.getByRole('button', { name: 'Sincronizar ahora' }));
    await waitFor(() => expect(screen.getByTestId('connectivity')).toHaveAttribute('data-state', 'sincronizado'));
    expect(screen.getAllByRole('row')).toHaveLength(2); // encabezado + 1 operación: no hay duplicado
  });
});
