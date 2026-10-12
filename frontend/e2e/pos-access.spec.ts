import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { startAs } from './helpers';

const shots = path.resolve(import.meta.dirname, '../../docs/qa/audit/pos-access');
const viewports = [
  { name: 'caja-1366x768', width: 1366, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'movil-375', width: 375, height: 812 },
] as const;

/** POS-F01/F02 · Capa 2: sin desborde, sin violaciones axe serias/críticas, controles ≥ 44 px. */
for (const vp of viewports) {
  test(`acceso y apertura a ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await startAs(page, 'cajero', '/pos/acceso');
    await expect(page.getByTestId('opening-view')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, 'desborde horizontal de la página').toBe(false);

    const small = await page.evaluate(() =>
      [...document.querySelectorAll('main button, main input, main textarea, main select')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0 && r.height < 43.5)
        .map(({ el }) => `${el.tagName}.${el.className}`.slice(0, 60)),
    );
    expect(small, 'controles menores de 44 px').toEqual([]);

    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const blocking = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);

    await page.screenshot({ path: path.join(shots, `capa2-${vp.name}.png`), fullPage: true });
  });
}
