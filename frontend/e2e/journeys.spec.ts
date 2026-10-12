import { expect, test } from '@playwright/test';
import { addToCart, copValue, dots, gotoModule, norm, openShift, startAs, stockRow, switchRole, typeNumber } from './helpers';

/**
 * Recorridos multi-módulo contra MSW. La base de mocks vive en memoria del navegador: cada `page` nueva parte
 * del seed. Para conservar el estado entre módulos se navega por el menú (SPA) y se cambia de rol sin recargar.
 */

test.describe('Recorridos E2E multi-módulo', () => {
  test('(a) cajero abre turno, vende en efectivo, ve el recibo; bodeguero ve bajar el stock', async ({ page }) => {
    await startAs(page, 'cajero');
    await openShift(page, 100000);

    await addToCart(page, 'Arroz 500 g');
    await expect(page.getByTestId('pos-total')).toContainText('2.800');
    await page.getByRole('button', { name: /Cobrar/ }).click();
    await page.getByRole('dialog', { name: 'Cobrar venta' }).getByRole('button', { name: /Confirmar pago/ }).click();

    const receipt = page.getByRole('dialog', { name: 'Venta completada' });
    await expect(receipt).toBeVisible();
    await expect(page.getByTestId('receipt-number')).toHaveText('POS-0004');
    await expect(receipt).toContainText('2.800');
    await receipt.getByRole('button', { name: 'Nueva venta' }).click();

    // Otro rol, mismo estado de mocks (sin recargar).
    await switchRole(page, 'bodeguero');
    await gotoModule(page, 'inventory');
    const row = stockRow(page, 'Arroz 500 g', 'Sede Principal');
    await expect(row).toBeVisible();
    // Seed: 40 unidades. Tras vender 1 deben quedar 39.
    await expect(row).toContainText('39');
  });

  test('(b) venta a crédito aparece en cuentas por cobrar y en reportes', async ({ page }) => {
    await startAs(page, 'cajero');
    await openShift(page);

    await addToCart(page, 'Aceite 1 L');
    await page.locator('#pos-customer').selectOption({ label: 'Tienda La Esquina' });
    await page.getByRole('button', { name: 'Crédito' }).click();
    const total = copValue(await page.getByTestId('pos-total').textContent());
    expect(total).toBeGreaterThan(0);
    await page.getByRole('button', { name: /Cobrar/ }).click();
    await page.getByRole('dialog', { name: 'Cobrar venta' }).getByRole('button', { name: /Confirmar pago/ }).click();
    await expect(page.getByTestId('receipt-number')).toHaveText('POS-0004');
    await page.getByRole('dialog', { name: 'Venta completada' }).getByRole('button', { name: 'Nueva venta' }).click();

    await switchRole(page, 'cartera');
    await gotoModule(page, 'receivables');
    // Seed: saldo abierto 300.000 (400.000 - 100.000 abonado). Debe sumar el crédito nuevo.
    await expect(page.getByTestId('receivables-total')).toContainText(dots(300000 + total));
    await expect(page.locator('tbody tr').filter({ hasText: 'Tienda La Esquina' })).toHaveCount(2);

    await gotoModule(page, 'reports');
    await expect(page.getByRole('heading', { name: 'Detalle de ventas' })).toBeVisible();
    const sale = page.locator('tbody tr').filter({ hasText: 'POS-0004' });
    await expect(sale).toBeVisible();
    await expect(sale).toContainText('A crédito');
  });

  test('(c) un abono en cuentas por cobrar reduce el saldo', async ({ page }) => {
    await startAs(page, 'cartera', '/receivables');
    const totalEl = page.getByTestId('receivables-total');
    await expect(totalEl).toContainText('300.000');

    await page.getByRole('button', { name: /Abonar a Tienda La Esquina/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Abonar a cuenta por cobrar' });
    await expect(dialog.getByTestId('payment-balance')).toContainText('300.000');
    await typeNumber(dialog.locator('#pay-amount'), '50000');
    await dialog.getByRole('button', { name: 'Registrar abono' }).click();

    await expect(dialog).toBeHidden();
    await expect(totalEl).toContainText('250.000');
    await expect(page.locator('tbody tr').filter({ hasText: 'Tienda La Esquina' })).toContainText('250.000');
  });

  test('(c2) un abono mayor al saldo se bloquea', async ({ page }) => {
    await startAs(page, 'cartera', '/receivables');
    await page.getByRole('button', { name: /Abonar a Tienda La Esquina/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Abonar a cuenta por cobrar' });
    await typeNumber(dialog.locator('#pay-amount'), '999999');
    await expect(dialog.getByRole('button', { name: 'Registrar abono' })).toBeDisabled();
    await expect(dialog).toContainText('Supera el saldo pendiente');
  });

  test('(d) orden de compra: crear, enviar, recibir sube stock y crea cuenta por pagar', async ({ page }) => {
    await startAs(page, 'comprador', '/purchases');
    await page.getByRole('button', { name: 'Nueva orden' }).click();
    const form = page.getByRole('dialog', { name: 'Nueva orden de compra' });
    await form.getByLabel('Proveedor').selectOption({ label: 'Distribuidora Andina · 30 días' });
    await form.getByLabel(/^Producto 1/).selectOption({ label: 'Arroz 500 g' });
    await typeNumber(form.getByLabel(/^Cantidad 1/), '10');
    await form.getByRole('button', { name: 'Crear orden' }).click();

    const detail = page.getByRole('dialog', { name: /Orden PO-0003/ });
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('Borrador');
    await detail.getByRole('button', { name: 'Enviar al proveedor' }).click();
    await expect(detail).toContainText('Enviada');
    await detail.getByRole('button', { name: 'Recibir mercancía' }).click();
    await page.getByRole('dialog', { name: 'Confirmar recepción' }).getByRole('button', { name: 'Confirmar recepción' }).click();

    const effect = detail.getByTestId('receive-effect');
    await expect(effect).toBeVisible();
    await expect(effect).toContainText('stock +10');
    await expect(effect).toContainText('40 a 50');
    await expect(effect).toContainText('Cuenta por pagar');
    await detail.getByRole('button', { name: 'Cerrar' }).first().click();

    await gotoModule(page, 'inventory');
    await expect(stockRow(page, 'Arroz 500 g', 'Sede Principal')).toContainText('50');

    await gotoModule(page, 'payables');
    await expect(page.locator('tbody tr').filter({ hasText: 'Distribuidora Andina' })).toHaveCount(2);
  });

  test('(e) cierre de caja con diferencia exige nota', async ({ page }) => {
    await startAs(page, 'cajero');
    await openShift(page, 100000);
    await page.getByRole('button', { name: /Caja \(F10\)/ }).click();
    const cash = page.getByRole('dialog', { name: 'Caja' });
    await expect(cash.getByTestId('expected-cash')).toContainText('100.000');

    await typeNumber(cash.locator('#counted-cash'), '90000');
    await expect(cash.getByTestId('cash-difference')).toContainText('faltante');
    const close = cash.getByRole('button', { name: 'Cerrar turno' });
    await expect(close).toBeDisabled();

    await cash.getByLabel('Nota de justificación (obligatoria)').fill('Sencillo entregado a proveedor sin registrar');
    await expect(close).toBeEnabled();
    await close.click();
    // Sin turno abierto, el POS vuelve a pedir apertura (BR-CAJ-01).
    await expect(page.getByRole('heading', { name: 'Apertura de caja' })).toBeVisible();
  });

  test('(e2) el servidor rechaza cerrar con diferencia sin nota (422 CASH_NOTE_REQUIRED)', async ({ page }) => {
    await startAs(page, 'cajero');
    await openShift(page, 100000);
    const result = await page.evaluate(async () => {
      const headers = { Authorization: 'Bearer mock-token-emp-001', 'Content-Type': 'application/json' };
      const current = await (await fetch('/api/v1/pos/shifts/current', { headers })).json();
      const res = await fetch(`/api/v1/pos/shifts/${current.id}/close`, {
        method: 'POST', headers, body: JSON.stringify({ countedCash: 90000 }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(result.status).toBe(422);
    expect(norm(JSON.stringify(result.body))).toContain('CASH_NOTE_REQUIRED');
  });

  test('(e3) cierre sin diferencia no pide nota', async ({ page }) => {
    await startAs(page, 'cajero');
    await openShift(page, 100000);
    await page.getByRole('button', { name: /Caja \(F10\)/ }).click();
    const cash = page.getByRole('dialog', { name: 'Caja' });
    await typeNumber(cash.locator('#counted-cash'), '100000');
    await expect(cash.getByTestId('cash-difference')).toContainText('cuadra');
    await expect(cash.getByLabel('Nota de justificación (obligatoria)')).toHaveCount(0);
    await cash.getByRole('button', { name: 'Cerrar turno' }).click();
    await expect(page.getByRole('heading', { name: 'Apertura de caja' })).toBeVisible();
  });
});

test.describe('POS por teclado y lector', () => {
  test('lector: código de barras + Enter agrega la línea y F9 cobra', async ({ page }) => {
    await startAs(page, 'cajero');
    await openShift(page);
    const search = page.locator('#pos-search');
    await expect(search).toBeFocused();
    await search.pressSequentially('7701234567891'); // Aceite 1 L
    await search.press('Enter');
    await expect(page.getByTestId('pos-total')).not.toHaveText(/\$\s?0$/);
    await expect(page.getByLabel('Cantidad Aceite 1 L')).toHaveValue('1');
    // Segundo escaneo del mismo código suma cantidad.
    await search.pressSequentially('7701234567891');
    await search.press('Enter');
    await expect(page.getByLabel('Cantidad Aceite 1 L')).toHaveValue('2');
    await page.keyboard.press('F8');
    await page.getByRole('dialog', { name: 'Cobrar venta' }).getByRole('button', { name: /Confirmar pago/ }).click();
    await expect(page.getByTestId('receipt-number')).toHaveText('POS-0004');
  });

  test('un código inexistente avisa y no agrega líneas', async ({ page }) => {
    await startAs(page, 'cajero');
    await openShift(page);
    const search = page.locator('#pos-search');
    await search.pressSequentially('0000000000000');
    await search.press('Enter');
    await expect(page.getByTestId('cart-empty')).toBeVisible();
    await expect(page.getByText(/No hay productos con/)).toBeVisible();
  });
});
