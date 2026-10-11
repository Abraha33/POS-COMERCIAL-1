#!/usr/bin/env node
/** Capturas del rediseño del núcleo (shell, login, inicio, un módulo) a 1280/768/375 + axe. Uso: AUDIT_URL=http://localhost:5199 node scripts/redesign-shots.mjs */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.AUDIT_URL ?? 'http://localhost:5199';
const outDir = path.resolve(import.meta.dirname, '../../docs/qa/audit/redesign/core');
mkdirSync(outDir, { recursive: true });

const screens = [
  { name: 'login', route: '/login' },
  { name: 'inicio', route: '/' },
  { name: 'productos', route: '/products' },
  { name: 'pos', route: '/pos' },
];
const widths = [
  { name: '1280', width: 1280, height: 800 },
  { name: '768', width: 768, height: 1024 },
  { name: '375', width: 375, height: 812 },
];

const browser = await chromium.launch();
for (const viewport of widths) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  for (const screen of screens) {
    await page.goto(`${base}${screen.route}`);
    await page.waitForSelector('h1', { timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = axe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    console.log(`${screen.name}@${viewport.name} overflow=${overflow} axe(crit/serious)=${serious.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`).join(',') || 'ok'}`);
    await page.screenshot({ path: path.join(outDir, `${screen.name}-${viewport.name}.png`), fullPage: false });
  }
  if (viewport.name === '375') {
    await page.goto(`${base}/`);
    await page.waitForSelector('h1');
    await page.getByRole('button', { name: 'Más' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, 'drawer-375.png') });
  }
  await context.close();
}
await browser.close();
