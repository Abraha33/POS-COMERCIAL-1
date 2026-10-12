import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';

type User = ReturnType<typeof userEvent.setup>;

/** Escenarios de prueba (v0.7.0): `?escenario=<id>` fija el escenario simulado; sin él la pantalla usa datos reales. */
const renderAccess = async (escenario?: string) => {
  // La API de mocks exige token: el datos reales necesita el del cajero (los escenarios no llaman a la API).
  setAccessToken(mockTokenForRole('cajero'));
  const url = escenario ? `/pos/acceso?escenario=${escenario}` : '/pos/acceso';
  const router = createAppRouter(createMemoryHistory({ initialEntries: [url] }));
  render(
    <AppProviders initialRole="cajero">
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
  // Espera a salir de la carga: la vista de acceso, o un estado de error/vacío si el escenario lo pide.
  await screen.findByTestId('access-view').catch(() => screen.findByRole('button', { name: /Reintentar/ }).catch(() => screen.findByText(/no tiene una caja/)));
};

const pick = (user: User, label: string, option: RegExp) =>
  user.selectOptions(screen.getByLabelText(label), screen.getByRole('option', { name: option }));

/** Cambia de escenario y espera a que termine la carga simulada. */
const scenario = async (user: User, name: RegExp) => {
  await pick(user, 'Escenario', name);
  await waitFor(() => expect(screen.queryByText('Cargando acceso…')).not.toBeInTheDocument(), { timeout: 5000 });
};

const openCounting = async (user: User) => {
  await user.click(await screen.findByRole('button', { name: 'Abrir caja' }));
  await screen.findByTestId('opening-view');
};

const qty = (value: number, kind: 'billete' | 'moneda' = 'billete') => screen.getByLabelText(`Cantidad de ${kind} de ${value}`);
const review = (user: User) => user.click(screen.getByRole('button', { name: 'Revisar apertura' }));
const confirm = async () => screen.findByRole('button', { name: 'Confirmar apertura' });

describe('POS-F01 · acceso (escenarios 1–4 y 12)', () => {
  it('1 cajero válido con caja cerrada: puede abrir, no continuar', async () => {
    await renderAccess('caja-cerrada');
    expect(screen.getByRole('button', { name: 'Abrir caja' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Continuar a Venta rápida/ })).toBeDisabled();
  });

  it('2 turno propio activo: puede continuar y no abrir', async () => {
    const user = userEvent.setup();
    await renderAccess('turno-propio');
    await scenario(user, /turno propio/);
    expect(await screen.findByText('Turno activo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar a Venta rápida/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Abrir caja' })).toBeDisabled();
  });

  it('3 caja ocupada: bloquea y el relevo simulado la libera con autorización', async () => {
    const user = userEvent.setup();
    await renderAccess('caja-ocupada');
    await scenario(user, /ocupada/);
    expect(await screen.findByText('Caja ocupada')).toBeInTheDocument();
    expect(screen.getByText('Andrés Rojas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir caja' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Solicitar relevo' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Código del supervisor'), '1234');
    await user.click(within(dialog).getByRole('button', { name: 'Autorizar' }));
    expect(await screen.findByText('Caja cerrada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir caja' })).toBeEnabled();
  });

  it('4 usuario sin permiso: nada operativo disponible', async () => {
    const user = userEvent.setup();
    await renderAccess('sin-permiso');
    await scenario(user, /sin permiso/);
    expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
    for (const name of ['Abrir caja', 'Solicitar relevo']) expect(screen.getByRole('button', { name })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Continuar a Venta rápida/ })).toBeDisabled();
  });

  it('12 sin conexión: estado no verificable, no deja abrir ni continuar', async () => {
    const user = userEvent.setup();
    await renderAccess('sin-conexion');
    await scenario(user, /Sin conexión/);
    expect(await screen.findByText('No verificable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir caja' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Continuar a Venta rápida/ })).toBeDisabled();
  });

  it('estados vacío y error de carga con reintento', async () => {
    const user = userEvent.setup();
    // El error de carga no llega a la vista de acceso: se comprueba el estado de error y el reintento.
    await renderAccess('error-carga');
    expect(await screen.findByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
    // Sin caja asignada es un estado de vista (no de error): se comprueba cambiando de escenario.
    await renderAccess('sin-caja');
    expect(await screen.findByText(/no tiene una caja o terminal asignada/)).toBeInTheDocument();
    void user;
  });
});

describe('POS-F02 · apertura (escenarios 5–11)', () => {
  it('5 base exacta: sin motivo ni autorización, abre y habilita continuar', async () => {
    const user = userEvent.setup();
    await renderAccess('caja-cerrada');
    await openCounting(user);
    await user.type(qty(100000), '2');
    expect(screen.getByTestId('opening-total')).toHaveTextContent('200.000');
    expect(screen.getByTestId('opening-difference')).toHaveTextContent('Base exacta');
    expect(screen.getByTestId('opening-auth')).toHaveTextContent('No requerida');
    await review(user);
    await user.click(await confirm());
    expect(await screen.findByTestId('opened-shift', undefined, { timeout: 5000 })).toHaveTextContent('200.000');
    expect(screen.getByRole('button', { name: /Continuar a Venta rápida/ })).toBeEnabled();
  });

  it('6 faltante y 7 sobrante: piden motivo y muestran el signo', async () => {
    const user = userEvent.setup();
    await renderAccess('caja-cerrada');
    await openCounting(user);
    await user.type(qty(100000), '1');
    expect(screen.getByTestId('opening-difference')).toHaveTextContent('Faltante');
    expect(screen.getByRole('button', { name: 'Revisar apertura' })).toBeDisabled();
    expect(screen.getByTestId('opening-blocked')).toHaveTextContent(/motivo/i);
    await user.type(screen.getByLabelText(/Motivo de la diferencia/), 'Faltó el sencillo');
    expect(screen.getByRole('button', { name: 'Revisar apertura' })).toBeEnabled();
    await user.clear(qty(100000));
    await user.type(qty(100000), '3');
    expect(screen.getByTestId('opening-difference')).toHaveTextContent('Sobrante');
  });

  it('8 base cero: exige motivo', async () => {
    const user = userEvent.setup();
    await renderAccess('caja-cerrada');
    await openCounting(user);
    expect(screen.getByTestId('opening-total')).toHaveTextContent('$ 0');
    expect(screen.getByLabelText(/Motivo de la diferencia|Motivo de la base en cero/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revisar apertura' })).toBeDisabled();
  });

  it('9 cantidad inválida: marca el campo y bloquea la revisión', async () => {
    const user = userEvent.setup();
    await renderAccess('caja-cerrada');
    await openCounting(user);
    await user.type(qty(50000), '1.5');
    expect(await screen.findByRole('alert')).toHaveTextContent(/enteros/);
    expect(qty(50000)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Revisar apertura' })).toBeDisabled();
    await user.clear(qty(50000));
    await user.type(qty(50000), '-2');
    expect(qty(50000)).toHaveAttribute('aria-invalid', 'true');
  });

  it('con diferencia pide autorización antes de confirmar', async () => {
    const user = userEvent.setup();
    await renderAccess('caja-cerrada');
    await openCounting(user);
    await user.type(qty(100000), '1');
    await user.type(screen.getByLabelText(/Motivo de la diferencia/), 'Faltó el sencillo');
    await review(user);
    await user.click(await confirm());
    await user.type(await screen.findByLabelText('Código del supervisor'), '4321');
    await user.click(screen.getByRole('button', { name: 'Autorizar' }));
    expect(await screen.findByTestId('opened-shift', undefined, { timeout: 5000 })).toHaveTextContent('100.000');
  });

  it('10 error de confirmación: informa, no abre y permite reintentar', async () => {
    const user = userEvent.setup();
    await renderAccess('caja-cerrada');
    await pick(user, 'Resultado al confirmar', /Error del servidor/);
    await openCounting(user);
    await user.type(qty(100000), '2');
    await review(user);
    await user.click(await confirm());
    expect(await screen.findByTestId('confirm-error', undefined, { timeout: 5000 })).toHaveTextContent(/No se pudo abrir/);
    expect(screen.queryByTestId('opened-shift')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar apertura' })).toBeEnabled();
  });

  it('11 doble confirmación: solo se envía una vez', async () => {
    const user = userEvent.setup();
    await renderAccess('caja-cerrada');
    await openCounting(user);
    await user.type(qty(100000), '2');
    await review(user);
    const button = await confirm();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByTestId('confirm-count')).toHaveTextContent('Confirmaciones enviadas: 1');
    expect(await screen.findByTestId('opened-shift', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByTestId('confirm-count')).toHaveTextContent('Confirmaciones enviadas: 1');
  });

  it('12 pérdida de conexión al confirmar: no asume la apertura', async () => {
    const user = userEvent.setup();
    await renderAccess('caja-cerrada');
    await pick(user, 'Resultado al confirmar', /Pérdida de conexión/);
    await openCounting(user);
    await user.type(qty(100000), '2');
    await review(user);
    await user.click(await confirm());
    expect(await screen.findByTestId('confirm-error', undefined, { timeout: 5000 })).toHaveTextContent(/No se asumió abierta/);
    expect(screen.queryByTestId('opened-shift')).not.toBeInTheDocument();
  });
});

describe('POS-F01/F02 · datos reales (v0.7.0): caja y turno del servidor', () => {
  it('sin escenario: la caja y su base vienen de GET /pos/registers y la apertura se envía a POST /pos/shifts', async () => {
    const user = userEvent.setup();
    await renderAccess();
    const view = await screen.findByTestId('access-view');
    expect(within(view).getByText('Terminal 1')).toBeInTheDocument();
    expect(within(view).getByText('Caja 1')).toBeInTheDocument();
    // Sin escenario no hay controles de prueba.
    expect(screen.queryByLabelText('Escenario')).not.toBeInTheDocument();

    await openCounting(user);
    expect(screen.getByLabelText('Cantidad de billete de 100000')).toBeInTheDocument();
    await user.type(qty(100000), '1');
    expect(screen.getByTestId('opening-difference')).toHaveTextContent('Base exacta');
    await review(user);
    await user.click(await confirm());
    expect(await screen.findByTestId('opened-shift')).toHaveTextContent('Turno abierto en Caja 1');
    expect(screen.queryByText(/escenario de prueba/)).not.toBeInTheDocument();
  });
});
