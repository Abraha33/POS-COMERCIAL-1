import { expect, test, type Page } from '@playwright/test';
import { addToCart, gotoModule, openShift, startAs } from './helpers';

/**
 * Venta rápida: el carrito vive en el estado de QuickSale. Si la pantalla se desmonta al cambiar de módulo,
 * la venta en curso se pierde. Esta prueba fija el comportamiento actual (SPA, sin recargar).
 */
const cart = (page: Page) => page.getByRole('region', { name: 'Líneas de la venta' }).getByText('Arroz 500 g');

test('el carrito sobrevive a cambiar de módulo y volver a Punto de venta', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await startAs(page, 'cajero', '/pos');
  await openShift(page, 100000);

  await addToCart(page, 'Arroz 500 g');
  await expect(cart(page)).toBeVisible();

  await gotoModule(page, 'products');
  await gotoModule(page, 'pos');

  await expect(page.getByRole('list', { name: 'Resultados' })).toHaveCount(0);
  await expect(page.locator('#pos-search')).toBeVisible();
  await expect(cart(page)).toBeVisible();
});
