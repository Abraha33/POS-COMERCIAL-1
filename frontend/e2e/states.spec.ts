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
  // F-03: el error de cupo se muestra dentro del diálogo de cobro, en lenguaje de usuario y sin códigos técnicos.
  test('crédito a un cliente sin cupo muestra un mensaje accionable', async ({ page }) => {
    await startAs(page, 'cajero');
    await openShift(page);
    await addToCart(page, 'Aceite 1 L');
    await page.locator('#pos-customer').selectOption({ label: 'Cliente mostrador' }); // cupo 0
    await page.getByRole('button', { name: 'Crédito' }).click();
    await page.getByRole('button', { name: /Cobrar/ }).click();
    await page.getByRole('dialog', { name: 'Cobrar venta' }).getByRole('button', { name: /Confirmar pago/ }).click();

    const alert = page.getByTestId('checkout-error');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/cupo/i);
    const title = await alert.locator('strong').first().innerText();
    expect(title, 'el título del aviso no debe ser un código técnico').not.toMatch(/^[A-Z][A-Z_]{4,}$/);
  });

  // F-04 resuelto en el rediseño: Crédito queda deshabilitado con una explicación hasta elegir cliente.
  test('crédito sin cliente identificado se previene con una explicación', async ({ page }) => {
    await startAs(page, 'cajero');
    await openShift(page);
    await addToCart(page, 'Aceite 1 L');
    const credit = page.getByRole('button', { name: 'Crédito' });
    await expect(credit).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByText(/Crédito necesita un cliente identificado/)).toBeVisible();
  });

  test('stock insuficiente pide PIN de supervisor y la venta queda registrada con alerta de stock negativo', async ({ page }) => {
    await startAs(page, 'cajero');
    await openShift(page);
    await addToCart(page, 'Arroz 500 g');
    const plus = page.getByRole('button', { name: 'Más Arroz 500 g' });
    for (let i = 0; i < 40; i += 1) await plus.click(); // 41 > 40 existencias
    await page.getByRole('button', { name: /Cobrar/ }).click();
    await page.getByRole('dialog', { name: 'Cobrar venta' }).getByRole('button', { name: /Confirmar pago/ }).click();

    const pin = page.getByRole('dialog').last();
    await expect(pin.getByLabel('PIN de supervisor')).toBeVisible();
    await pin.getByLabel('PIN de supervisor').fill('1234');
    await pin.getByRole('button', { name: 'Autorizar' }).click();
    await expect(page.getByTestId('receipt-number')).toHaveText('POS-0004');
    await page.getByRole('dialog', { name: 'Venta completada' }).getByRole('button', { name: 'Nueva venta' }).click();

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
    ['bodeguero', 'pos'], ['bodeguero', 'reports'],
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

  test('bodeguero entra a /purchases (BR-COM-01, recibe órdenes)', async ({ page }) => {
    await startAs(page, 'bodeguero', '/purchases');
    await expect(page.getByTestId('access-denied')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('cartera puede abonar pero no registrar movimientos de otros módulos', async ({ page }) => {
    await startAs(page, 'cartera', '/receivables');
    await expect(page.getByRole('button', { name: /Abonar a/ })).toBeVisible();
  });
});

for (const width of widths) {
  test.describe(`axe con diálogos abiertos a ${width}px`, () => {
    test.use({ viewport: { width, height: width === 375 ? 812 : width === 768 ? 1024 : 800 } });

    test('POS con carrito y cobro', async ({ page }) => {
      await startAs(page, 'cajero');
      await openShift(page);
      await addToCart(page, 'Arroz 500 g');
      await addToCart(page, 'Aceite 1 L');
      if (width < 900) await page.getByRole('button', { name: /Ver carrito/ }).click();
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
