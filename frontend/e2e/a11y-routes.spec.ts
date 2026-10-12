import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ROUTES, startAs } from './helpers';

/**
 * axe en TODAS las rutas del router (src/routes/index.tsx: 9 módulos + "/" + 404) a 1280, 768 y 375 px.
 * Falla con violaciones serious/critical (WCAG 2.x A/AA) o desborde horizontal. Los resultados completos se
 * guardan en docs/qa/audit/final/data/ y las capturas en docs/qa/audit/final/.
 */

const outDir = path.resolve(import.meta.dirname, '../../docs/qa/audit/final');
const dataDir = path.join(outDir, 'data');
mkdirSync(dataDir, { recursive: true });

const widths = [
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'phone-375', width: 375, height: 812 },
] as const;

const targets = [...ROUTES.map((r) => ({ id: r, path: `/${r}` })), { id: 'not-found', path: '/ruta-inexistente' }];

/** Violaciones conocidas (ver docs/qa/FINDINGS.md): la prueba se marca test.fail para no ocultarlas. */
const KNOWN_FAILURES: Record<string, string> = {};

for (const viewport of widths) {
  test.describe(`axe a ${viewport.width}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const target of targets) {
      const key = `${target.id}@${viewport.name}`;
      test(`${target.path}`, async ({ page }) => {
        const known = KNOWN_FAILURES[key];
        if (known) test.fail(true, known);

        const consoleErrors: string[] = [];
        page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push(m.text()); });

        await startAs(page, 'propietario', target.path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        // Deja asentar las consultas (tablas, gráficos) antes de medir.
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        const metrics = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          widest: [...document.querySelectorAll('body *')]
            .map((el) => ({ el, r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.width > 0 && r.right > window.innerWidth + 1)
            .slice(0, 5)
            .map(({ el, r }) => `${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).slice(0, 40)} right=${Math.round(r.right)}`),
          smallTargets: [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select')]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44);
            }).length,
        }));

        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const blocking = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

        await page.screenshot({ path: path.join(outDir, `${target.id}-${viewport.name}.png`), fullPage: true });
        writeFileSync(
          path.join(dataDir, `${target.id}-${viewport.name}.json`),
          JSON.stringify({
            route: target.path, viewport: viewport.name, ...metrics,
            violations: axe.violations.map((v) => ({
              id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,
              targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')),
            })),
            consoleErrors,
          }, null, 2),
        );

        expect.soft(metrics.overflow, `desborde horizontal: ${metrics.widest.join(' | ')}`).toBe(false);
        expect(
          blocking.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`),
        ).toEqual([]);
      });
    }
  });
}
