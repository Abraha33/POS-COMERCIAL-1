import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addToCart, gotoModule, openShift, startAs, switchRole, typeNumber, type Role } from './helpers';

/**
 * Estados que el barrido por ruta no ve: diálogos abiertos, carrito con líneas, errores de negocio y permisos.
 * Capturas y datos de axe en docs/qa/audit/final/states/.
 */
const outDir = path.resolve(import.meta.dirname, '../../docs/qa/audit/final/states');
mkdirSync(outDir, { recursive: true });

const axeBlocking = async (page: Page, label: string) => {
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const summary = axe.violations.map((v) => ({
    id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[0]?.target.join(' '),
    detail: v.nodes[0]?.failureSummary?.slice(0, 200),
  }));
  writeFileSync(path.join(outDir, `${label}.json`), JSON.stringify(summary, null, 2));
  await page.screenshot({ path: path.join(outDir, `${label}.png`) });
  return summary.filter((v) => v.impact === 'serious' || v.impact === 'critical');
};

const widths = [1280, 768, 375] as const;

test.describe('Errores de negocio visibles para el usuario', () => {
  // FINDING F-03: el toast usa error.code como título ("CREDIT_LIMIT_EXCEEDED"). Se deja marcado como fallo conocido.
  test('crédito a un cliente sin cupo muestra un mensaje accionable', async ({ page }) => {
    test.fail(true, 'F-03: PosPage notifica summary=error.code (texto técnico)');
    await startAs(page, 'cajero');
    await openShift(page);
    await addToCart(page, 'Aceite 1 L');
    await page.getByLabel('Cliente').selectOption({ label: 'Cliente mostrador' }); // cupo 0
    await page.getByLabel('Medio de pago 1').selectOption('credito');
    await page.getByRole('button', { name: /Cobrar/ }).click();
    // Debe quedar claro POR QUÉ no se vendió y qué hacer, sin códigos técnicos como título.
    await expect(page.locator('.p-toast').getByText(/supera el cupo/i)).toBeVisible();
    const summary = await page.locator('.p-toast-summary').first().innerText();
    expect(summary, 'el título del aviso no debe ser un código técnico').not.toMatch(/^[A-Z][A-Z_]{4,}$/);
  });

  // FINDING F-04: Cobrar queda habilitado con crédito sin cliente y el error llega como "VALIDATION_ERROR".
  test('crédito sin cliente identificado se previene o se explica en lenguaje de usuario', async ({ page }) => {
    test.fail(true, 'F-04: sin guard de cliente para crédito; toast con código técnico');
    await startAs(page, 'cajero');
    await openShift(page);
    await addToCart(page, 'Aceite 1 L');
    await page.getByLabel('Medio de pago 1').selectOption('credito');
    const confirm = page.getByRole('button', { name: /Cobrar/ });
    // Lo esperable: botón deshabilitado, o mensaje claro sin códigos técnicos.
    await expect(confirm).toBeDisabled();
  });

  test('stock insuficiente pide PIN de supervisor y la venta queda registrada con alerta de stock negativo', async ({ page }) => {
    await startAs(page, 'cajero');
    await openShift(page);
    await addToCart(page, 'Arroz 500 g');
    const plus = page.getByRole('button', { name: 'Más Arroz 500 g' });
    for (let i = 0; i < 40; i += 1) await plus.click(); // 41 > 40 existencias
    await page.getByRole('button', { name: /Cobrar/ }).click();

    const pin = page.getByRole('dialog');
    await expect(pin.getByLabel('PIN de supervisor')).toBeVisible();
    await pin.getByLabel('PIN de supervisor').fill('1234');
    await pin.getByRole('button', { name: 'Autorizar' }).click();
    await expect(page.getByTestId('receipt-number')).toHaveText('POS-0004');
    await page.getByRole('dialog', { name: 'Venta registrada' }).getByRole('button', { name: 'Nueva venta' }).click();

    await switchRole(page, 'propietario');
    await gotoModule(page, 'reports');
    await expect(page.getByRole('heading', { name: 'Inventario' })).toBeVisible();
    await expect(page.getByText('Stock negativo').first()).toBeVisible();
    // Arroz quedó en -1 en Sede Principal: debe listarse en la tabla de stock negativo.
    await expect(page.getByRole('table', { name: 'Stock negativo' }).getByText('Arroz 500 g')).toBeVisible();
  });
});

test.describe('Permisos por rol (RouteGuard)', () => {
  const denied: [Role, string][] = [
    ['cajero', 'receivables'], ['cajero', 'reports'], ['cajero', 'administration'],
    ['bodeguero', 'pos'], ['bodeguero', 'purchases'], ['bodeguero', 'reports'],
    ['comprador', 'pos'], ['comprador', 'receivables'], ['comprador', 'administration'],
    ['cartera', 'pos'], ['cartera', 'purchases'], ['cartera', 'administration'],
  ];
  for (const [role, route] of denied) {
    test(`${role} no entra a /${route}`, async ({ page }) => {
      await startAs(page, role, `/${route}`);
      await expect(page.getByTestId('access-denied')).toBeVisible();
      await expect(page.getByTestId(`nav-${route}`)).toHaveCount(0);
    });
  }

  test('cartera puede abonar pero no registrar movimientos de otros módulos', async ({ page }) => {
    await startAs(page, 'cartera', '/receivables');
    await expect(page.getByRole('button', { name: /Abonar a/ })).toBeVisible();
  });
});

for (const width of widths) {
  test.describe(`axe con diálogos abiertos a ${width}px`, () => {
    test.use({ viewport: { width, height: width === 375 ? 812 : width === 768 ? 1024 : 800 } });

    test('POS con carrito y cobro', async ({ page }) => {
      test.fail(width === 375, 'F-02: la tabla de líneas/cobro desborda la página a 375 px');
      await startAs(page, 'cajero');
      await openShift(page);
      await addToCart(page, 'Arroz 500 g');
      await addToCart(page, 'Aceite 1 L');
      await expect(page.getByTestId('pos-total')).toBeVisible();
      expect(await axeBlocking(page, `pos-cart-${width}`)).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect.soft(overflow, 'desborde horizontal en POS con carrito').toBe(false);
    });

    test('POS: diálogo de caja', async ({ page }) => {
      await startAs(page, 'cajero');
      await openShift(page, 100000);
      await page.getByRole('button', { name: /Caja \(F10\)/ }).click();
      const cash = page.getByRole('dialog', { name: 'Caja' });
      await typeNumber(cash.locator('#counted-cash'), '90000');
      await expect(cash.getByLabel('Nota de justificación (obligatoria)')).toBeVisible();
      expect(await axeBlocking(page, `pos-cash-${width}`)).toEqual([]);
    });

    test('Cuentas por cobrar: diálogo de abono', async ({ page }) => {
      await startAs(page, 'cartera', '/receivables');
      await page.getByRole('button', { name: /Abonar a Tienda La Esquina/ }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(await axeBlocking(page, `receivables-pay-${width}`)).toEqual([]);
    });

    test('Compras: nueva orden', async ({ page }) => {
      await startAs(page, 'comprador', '/purchases');
      await page.getByRole('button', { name: 'Nueva orden' }).click();
      await expect(page.getByRole('dialog', { name: 'Nueva orden de compra' })).toBeVisible();
      expect(await axeBlocking(page, `purchases-new-${width}`)).toEqual([]);
    });

    test('Compras: detalle de orden enviada', async ({ page }) => {
      await startAs(page, 'comprador', '/purchases');
      await page.getByRole('button', { name: /Ver orden PO-0002/ }).click();
      await expect(page.getByRole('dialog', { name: /Orden PO-0002/ })).toBeVisible();
      expect(await axeBlocking(page, `purchases-detail-${width}`)).toEqual([]);
    });

    test('Administración: pestañas', async ({ page }) => {
      await startAs(page, 'admin', '/administration');
      for (const tab of ['Roles y permisos', 'Sedes', 'Parámetros']) {
        const t = page.getByRole('tab', { name: new RegExp(tab) });
        if (await t.count()) {
          await t.first().click();
          expect(await axeBlocking(page, `admin-${tab.split(' ')[0]}-${width}`)).toEqual([]);
        }
      }
    });
  });
}
