#!/usr/bin/env node
/**
 * Auditoría de pantallas: recorre cada ruta a 3 anchos y reporta desbordes, h1, controles sin nombre
 * y violaciones axe; guarda capturas en docs/qa/audit/. Uso: AUDIT_URL=http://localhost:5188 node scripts/audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.AUDIT_URL ?? 'http://localhost:5188';
const outDir = path.resolve(import.meta.dirname, '../../docs/qa/audit');
mkdirSync(outDir, { recursive: true });

const routes = ['pos', 'products', 'inventory', 'purchases', 'customers', 'receivables', 'payables', 'reports', 'administration'];
const widths = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'phone', width: 375, height: 812 },
];

const browser = await chromium.launch();
const results = [];
for (const viewport of widths) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  for (const route of routes) {
    await page.goto(`${base}/${route}`);
    await page.waitForSelector('h1', { timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    const metrics = await page.evaluate(() => {
      const nav = document.querySelector('nav');
      const navRect = nav?.getBoundingClientRect();
      const small = [...document.querySelectorAll('button, a, input, select')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.height < 36;
      }).length;
      return {
        h1: document.querySelector('h1')?.textContent ?? null,
        hOverflow: document.documentElement.scrollWidth > window.innerWidth,
        navHeight: navRect ? Math.round(navRect.height) : null,
        mainRowCount: document.querySelectorAll('tbody tr').length,
        smallTargets: small,
        buttons: document.querySelectorAll('button').length,
      };
    });
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    await page.screenshot({ path: path.join(outDir, `${route}-${viewport.name}.png`), fullPage: false });
    results.push({
      route, viewport: viewport.name, ...metrics,
      axe: axe.violations.map((v) => `${v.id}(${v.impact},${v.nodes.length})`),
    });
  }
  await context.close();
}
await browser.close();

writeFileSync(path.join(outDir, 'audit-results.json'), `${JSON.stringify(results, null, 2)}\n`);
for (const r of results) {
  console.log(
    `${r.viewport.padEnd(8)} /${r.route.padEnd(15)} h1=${String(r.h1).padEnd(20)} overflowX=${r.hOverflow} ` +
      `navH=${r.navHeight} rows=${r.mainRowCount} smallTargets=${r.smallTargets} axe=[${r.axe.join(', ')}]`,
  );
}
