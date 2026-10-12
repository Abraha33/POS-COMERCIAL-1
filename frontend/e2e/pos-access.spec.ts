import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { startAs } from './helpers';

const shots = path.resolve(import.meta.dirname, '../../docs/qa/audit/pos-access');
const viewports = [
  { name: 'caja-1366x768', width: 1366, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'movil-375', width: 375, height: 812 },
] as const;

/** Sin desborde, controles ≥ 44 px y axe sin violaciones serias/críticas en la vista actual. */
const check = async (page: Page, scope: string, screenshot: string) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow, `${scope}: desborde horizontal`).toBe(false);

  const small = await page.evaluate(() =>
    [...document.querySelectorAll('main button, main input, main textarea, main select, [role="dialog"] button, [role="dialog"] input')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0 && r.height < 43.5)
      .map(({ el }) => `${el.tagName}.${el.className}`.slice(0, 60)),
  );
  expect(small, `${scope}: controles menores de 44 px`).toEqual([]);

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const blocking = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), `${scope}: axe`).toEqual([]);

  await page.screenshot({ path: path.join(shots, `${screenshot}.png`), fullPage: true });
};

for (const vp of viewports) {
  test(`acceso, apertura y revisión a ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await startAs(page, 'cajero', '/pos/acceso');

    await expect(page.getByTestId('access-view')).toBeVisible();
    await check(page, 'acceso', `capa3-acceso-${vp.name}`);

    await page.getByRole('button', { name: 'Abrir caja' }).click();
    await expect(page.getByTestId('opening-view')).toBeVisible();
    await check(page, 'apertura', `capa3-apertura-${vp.name}`);

    await page.getByLabel('Cantidad de billete de 100000').fill('1');
    await page.getByLabel(/Motivo de la diferencia/).fill('Faltó el sencillo');
    await page.getByRole('button', { name: 'Revisar apertura' }).click();
    await expect(page.getByRole('dialog', { name: 'Revisión de apertura' })).toBeVisible();
    await page.waitForTimeout(500); // la animación de apertura de PrimeReact escala el diálogo; medir ya asentado
    await check(page, 'revisión', `capa3-revision-${vp.name}`);
  });
}

test('flujo completo en el navegador: base exacta, confirmación y continuar a /pos', async ({ page }) => {
  await startAs(page, 'cajero', '/pos/acceso');
  await page.getByRole('button', { name: 'Abrir caja' }).click();
  await page.getByLabel('Cantidad de billete de 100000').fill('2');
  await page.getByRole('button', { name: 'Revisar apertura' }).click();
  await page.getByRole('button', { name: 'Confirmar apertura' }).dblclick();
  await expect(page.getByTestId('opened-shift')).toBeVisible();
  await expect(page.getByTestId('confirm-count')).toHaveText('Confirmaciones enviadas: 1');
  await page.getByRole('button', { name: /Continuar a Venta rápida/ }).click();
  await expect(page).toHaveURL(/\/pos$/);
});
