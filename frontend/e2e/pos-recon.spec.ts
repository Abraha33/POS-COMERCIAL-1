import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { addToCart, openShift, startAs } from './helpers';

const shots = path.resolve(import.meta.dirname, '../../docs/qa/audit/pos-proofs');

for (const vp of [
  { name: 'caja-1366', width: 1366, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'movil-375', width: 375, height: 812 },
]) {
  test(`conciliación: cobro con datáfono aparece y se concilia a ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await startAs(page, 'cajero', '/pos');
    await openShift(page, 100000);
    await addToCart(page, 'Arroz 500 g');
    if (vp.width < 900) await page.getByRole('button', { name: /Ver carrito/ }).click();
    await page.getByRole('button', { name: 'Tarjeta' }).click();
    await page.getByRole('button', { name: /Cobrar/ }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Cobrar venta' });
    const confirm = dialog.getByRole('button', { name: /Confirmar pago/ });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(/Código de aprobación/).fill('AP-5521');
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page.getByTestId('receipt-number')).toBeVisible();
    await page.getByRole('button', { name: 'Nueva venta' }).click();

    await page.getByRole('button', { name: 'Más opciones del punto de venta' }).click();
    await page.getByRole('button', { name: 'Conciliación de cobros' }).click();
    await expect(page.getByRole('heading', { name: 'Conciliación de cobros' })).toBeVisible();
    await expect(page.getByTestId('recon-bank')).toContainText('2.800');
    await expect(page.getByTestId('recon-cash')).toContainText('0');

    const received = page.getByLabel(/Recibido Tarjeta/);
    await received.fill('2800');
    await received.press('Tab');
    await expect(page.getByText('Conciliado')).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
    await page.screenshot({ path: path.join(shots, `conciliacion-${vp.name}.png`), fullPage: true });
  });
}

test('cierre de turno: desglose por canal y aviso de cobro digital sin comprobante (excepción del propietario)', async ({ page }) => {
  await startAs(page, 'propietario', '/pos');
  await openShift(page, 100000);
  await addToCart(page, 'Arroz 500 g');
  await page.getByRole('button', { name: 'Transferencia' }).click();
  await page.getByRole('button', { name: /Cobrar/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Cobrar venta' });
  await dialog.getByLabel(/Número de referencia/).fill('CIERRE-1');
  await dialog.getByRole('button', { name: /Solicitar comprobante/ }).click();
  await dialog.getByText('Excepción autorizada').click();
  await dialog.getByLabel('Motivo de la excepción').fill('Cliente pagó, banco en mantenimiento');
  await dialog.getByRole('button', { name: 'Autorizar excepción' }).click();
  const confirm = dialog.getByRole('button', { name: /Confirmar pago/ });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByTestId('receipt-number')).toBeVisible();
  await page.getByRole('button', { name: 'Nueva venta' }).click();

  await page.getByRole('button', { name: /Caja \(F10\)/ }).click();
  await expect(page.getByTestId('close-bank')).toContainText('2.800');
  await expect(page.getByTestId('close-cash')).toContainText('0');
  await expect(page.getByTestId('close-unbacked')).toContainText('sin comprobante confirmado');
});

test('pedidos: el pedido creado se sincroniza con el servidor (capa 5) y la bandeja lo indica', async ({ page }) => {
  await startAs(page, 'cajero', '/pos');
  await openShift(page, 100000);
  await addToCart(page, 'Arroz 500 g');
  await page.getByRole('button', { name: 'Crear pedido' }).click();
  await page.getByRole('dialog', { name: 'Crear pedido' }).getByRole('button', { name: 'Crear pedido' }).click();
  await page.getByRole('button', { name: /Pedidos, 1 abiertos/ }).click();
  await expect(page.getByTestId('orders-sync')).toContainText('Sincronizado con el servidor', { timeout: 10_000 });
  // Está guardado en el servidor, no solo en el equipo.
  const saved = await page.evaluate(async () => {
    const res = await fetch('/api/v1/pos/orders?branchId=br-001', {
      headers: { Authorization: `Bearer mock-token-emp-001` },
    });
    return (await res.json()) as { number: string; version: number }[];
  });
  expect(saved.map((o) => o.number)).toContain('PED-0001');
  expect(saved[0]?.version).toBeGreaterThan(0);
});
