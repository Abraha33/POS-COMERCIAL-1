import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const moduleIds = ['pos', 'products', 'inventory', 'purchases', 'customers', 'receivables', 'payables', 'reports', 'administration'];

test('la app arranca y navega a cada módulo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('nav-pos')).toBeVisible();
  for (const id of moduleIds) {
    await page.getByTestId(`nav-${id}`).click();
    await expect(page).toHaveURL(new RegExp(`/${id}$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});

test('un rol sin permiso no ve el módulo y la ruta directa queda denegada', async ({ page }) => {
  await page.goto('/pos');
  await page.getByLabel('Rol simulado').selectOption('cajero');
  await expect(page.getByTestId('nav-administration')).toHaveCount(0);
  await page.goto('/administration');
  await expect(page.getByTestId('access-denied')).toBeVisible();
});

test('productos: tabla con datos y sin violaciones críticas de accesibilidad', async ({ page }) => {
  await page.goto('/products');
  await expect(page.getByText('Arroz 500 g')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a']).analyze();
  const critical = results.violations.filter((v) => v.impact === 'critical');
  expect(critical, JSON.stringify(critical.map((v) => v.id))).toEqual([]);
});
