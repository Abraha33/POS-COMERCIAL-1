import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addToCart, openShift, startAs } from './helpers';

const shots = path.resolve(import.meta.dirname, '../../docs/qa/audit/pos-sales');
const viewports = [
  { name: 'caja-1366x768', width: 1366, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'movil-375', width: 375, height: 812 },
] as const;

const check = async (page: Page, scope: string, file: string) => {
  await page.waitForTimeout(450); // deja asentar la animación de los diálogos de PrimeReact
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow, `${scope}: desborde horizontal`).toBe(false);

  const small = await page.evaluate(() =>
    [...document.querySelectorAll('main button, main input, main select, main textarea, [role="dialog"] button, [role="dialog"] input, [role="dialog"] select')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ el, r }) => r.width > 0 && r.height > 0 && r.height < 43.5 && (el as HTMLInputElement).type !== 'checkbox')
      .map(({ el }) => `${el.tagName}.${String(el.className).slice(0, 50)}[${(el.getAttribute('aria-label') ?? el.textContent ?? '').slice(0, 24)}]`),
  );
  expect(small, `${scope}: controles menores de 44 px`).toEqual([]);

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const blocking = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), `${scope}: axe`).toEqual([]);
  await page.screenshot({ path: path.join(shots, `${file}.png`), fullPage: true });
};

for (const vp of viewports) {
  test(`venta rápida, detalle, pedido y bandeja a ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await startAs(page, 'cajero', '/pos');
    await openShift(page, 100000);
    await expect(page.getByRole('navigation', { name: 'Operación del punto de venta' })).toBeVisible();
    await check(page, 'venta rápida', `venta-${vp.name}`);

    await page.locator('#pos-search').fill('Aceite');
    await page.getByRole('button', { name: 'Ver detalle de Aceite 1 L' }).click();
    await expect(page.getByRole('dialog', { name: 'Aceite 1 L' })).toBeVisible();
    await check(page, 'detalle de producto', `detalle-${vp.name}`);
    await page.keyboard.press('Escape');

    await page.locator('#pos-search').fill('');
    await addToCart(page, 'Arroz 500 g');
    if (vp.width < 900) await page.getByRole('button', { name: /Ver carrito/ }).click();
    await page.getByRole('button', { name: 'Crear pedido' }).click();
    await expect(page.getByRole('dialog', { name: 'Crear pedido' })).toBeVisible();
    await check(page, 'crear pedido', `crear-pedido-${vp.name}`);
    await page.getByRole('dialog', { name: 'Crear pedido' }).getByRole('button', { name: 'Crear pedido' }).click();

    await page.getByRole('button', { name: /Pedidos, 1 abiertos/ }).click();
    await expect(page.getByRole('heading', { name: 'Gestión de pedidos' })).toBeVisible();
    await check(page, 'bandeja de pedidos', `pedidos-${vp.name}`);

    await page.getByRole('button', { name: 'Abrir pedido PED-0001' }).click();
    await expect(page.getByRole('dialog', { name: 'Pedido PED-0001' })).toBeVisible();
    await check(page, 'detalle de pedido', `pedido-detalle-${vp.name}`);
  });
}

test('recorrido: crear pedido, prepararlo, cobrarlo en caja y verlo pagado', async ({ page }) => {
  await startAs(page, 'cajero', '/pos');
  await openShift(page, 100000);
  await addToCart(page, 'Arroz 500 g');
  await page.getByRole('button', { name: 'Crear pedido' }).click();
  await page.getByRole('dialog', { name: 'Crear pedido' }).getByRole('button', { name: 'Crear pedido' }).click();

  await page.getByRole('button', { name: /Cobros pendientes, 1/ }).click();
  await page.getByRole('button', { name: 'Abrir pedido PED-0001' }).click();
  await page.getByRole('button', { name: 'Cobrar en caja' }).click();

  // El pedido llenó el carrito: se cobra sin reconstruirlo.
  await expect(page.getByTestId('pos-total')).toBeVisible();
  await page.getByRole('button', { name: /Cobrar/ }).first().click();
  await page.getByRole('dialog', { name: 'Cobrar venta' }).getByRole('button', { name: /Confirmar pago/ }).click();
  await expect(page.getByTestId('receipt-number')).toBeVisible();
  await page.getByRole('button', { name: 'Nueva venta' }).click();

  await page.getByRole('button', { name: /Pedidos, 1 abiertos/ }).click();
  await expect(page.getByTestId('order-PED-0001')).toContainText('Pagado');
});
