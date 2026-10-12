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
