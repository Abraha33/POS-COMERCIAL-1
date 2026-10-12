import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/routes';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { db } from '@/mocks/db';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

const renderPos = async () => {
  setAccessToken(mockTokenForRole('cajero'));
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/pos'] }));
  render(
    <AppProviders initialRole="cajero">
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await router.load();
};

const openShift = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: /abrir turno/i }, { timeout: 5000 }));
  await screen.findByLabelText(/buscar producto o escanear/i);
};

describe('POS: venta rápida', { timeout: 20000 }, () => {
  it('sin turno abierto pide la apertura; con turno permite vender y muestra el recibo', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);

    // El lector escribe el código y envía Enter.
    const search = screen.getByLabelText(/buscar producto o escanear/i);
    await user.type(search, '7701234567890{Enter}');
    expect(await screen.findByLabelText('Cantidad Arroz 500 g')).toHaveValue(1);
    expect(screen.getByTestId('pos-total')).toHaveTextContent('2.800');

    await user.click(screen.getByRole('button', { name: /más arroz 500 g/i }));
    expect(screen.getByTestId('pos-total')).toHaveTextContent('5.600');

    await user.click(screen.getByRole('button', { name: /cobrar/i }));
    await user.click(await screen.findByRole('button', { name: /confirmar pago/i }));
    expect(await screen.findByTestId('receipt-number')).toHaveTextContent('POS-0004');
    expect(db.sales.at(-1)?.total).toBe(5600);
  });

  it('consume canales y documentos exclusivamente desde CountryPack', async () => {
    const originalChannels = db.countryPack.paymentChannels;
    const originalDocuments = db.countryPack.documentTypes;
    db.countryPack.paymentChannels = [{
      id: 'canal-prueba', label: 'Canal de configuración', type: 'wallet', method: 'nequi', requiresProof: false,
      fields: [], destinations: [{ id: 'destino-prueba', label: 'Destino configurado' }],
    }];
    db.countryPack.documentTypes = [{ id: 'documento-prueba', label: 'Documento configurado', hint: 'Viene de CountryPack.', isDefault: true }];
    try {
      const user = userEvent.setup();
      await renderPos();
      await openShift(user);
      await user.type(screen.getByLabelText(/buscar producto o escanear/i), 'SKU-002{Enter}');
      await user.click(screen.getByRole('button', { name: 'Transferencia' }));
      await user.click(screen.getByRole('button', { name: /cobrar/i }));

      expect(await screen.findByRole('option', { name: 'Documento configurado' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /factura electrónica de venta/i })).not.toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Canal de configuración' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Nequi' })).not.toBeInTheDocument();
    } finally {
      db.countryPack.paymentChannels = originalChannels;
      db.countryPack.documentTypes = originalDocuments;
    }
  });

  it('muestra un error recuperable cuando CountryPack no es válido', async () => {
    const originalChannels = db.countryPack.paymentChannels;
    db.countryPack.paymentChannels = [];
    try {
      const user = userEvent.setup();
      await renderPos();
      await openShift(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo cargar la configuración de cobro/i);
      expect(screen.getByRole('button', { name: /reintentar configuración de cobro/i })).toBeInTheDocument();
    } finally {
      db.countryPack.paymentChannels = originalChannels;
    }
  });

  it('pago mixto: muestra lo que falta hasta cubrir el total', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);

    await user.type(screen.getByLabelText(/buscar producto o escanear/i), 'SKU-002{Enter}'); // 12.500
    expect(await screen.findByTestId('pos-total')).toHaveTextContent('12.500');

    // Mixto: un segundo medio de pago nace con lo que falta (0 si ya está cubierto) y el cobro sigue habilitado.
    await user.click(screen.getByRole('button', { name: 'Mixto' }));
    await user.click(screen.getByRole('button', { name: /cobrar/i }));
    await user.click(await screen.findByRole('button', { name: /agregar medio de pago/i }));
    expect(screen.getByLabelText('Medio de pago 2')).toBeInTheDocument();
    expect(screen.getByTestId('pos-change')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar pago/i })).toBeEnabled();
  });

  it('crédito sin cliente queda deshabilitado con explicación (F-04)', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);
    await user.type(screen.getByLabelText(/buscar producto o escanear/i), 'SKU-002{Enter}');
    const credit = await screen.findByRole('button', { name: 'Crédito' });
    expect(credit).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/crédito necesita un cliente/i)).toBeInTheDocument();
    await user.click(credit);
    expect(credit).toHaveAttribute('aria-pressed', 'false');
  });

  it('un error de negocio al cobrar se muestra en línea, sin el código como título (F-03/F-14)', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);
    await user.type(screen.getByLabelText(/buscar producto o escanear/i), 'SKU-002{Enter}');
    await user.selectOptions(screen.getByLabelText('Cliente (F3)'), 'cus-003');
    await user.click(screen.getByRole('button', { name: 'Crédito' }));
    await user.click(screen.getByRole('button', { name: /cobrar/i }));
    await user.click(await screen.findByRole('button', { name: /confirmar pago/i }));
    const alert = await screen.findByTestId('checkout-error');
    expect(alert).not.toHaveTextContent(/CREDIT_LIMIT_EXCEEDED|VALIDATION_ERROR/);
    expect(alert).toHaveTextContent(/cupo de crédito/i);
  });

  it('sin respuesta del servidor el cobro queda desconocido: reintenta con la misma clave y no duplica la venta', async () => {
    const user = userEvent.setup();
    await renderPos();
    await openShift(user);
    const salesBefore = db.sales.length;
    server.use(http.post('/api/v1/pos/sales', () => HttpResponse.error(), { once: true }));

    await user.type(screen.getByLabelText(/buscar producto o escanear/i), '7701234567890{Enter}');
    await user.click(screen.getByRole('button', { name: /cobrar/i }));
    await user.click(await screen.findByRole('button', { name: /confirmar pago/i }));

    const alert = await screen.findByTestId('checkout-error');
    expect(alert).toHaveTextContent(/no sabemos si el cobro se registró/i);
    expect(db.sales.length).toBe(salesBefore);

    await user.click(screen.getByRole('button', { name: /confirmar pago/i }));
    expect(await screen.findByTestId('receipt-number')).toBeInTheDocument();
    expect(db.sales.length).toBe(salesBefore + 1);
  });
});
