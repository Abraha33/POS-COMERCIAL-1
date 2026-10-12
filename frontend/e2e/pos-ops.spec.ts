import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { startAs, switchRole } from './helpers';

const shots = path.resolve(import.meta.dirname, '../../docs/qa/audit/pos-ops');
const viewports = [
  { name: 'caja-1366x768', width: 1366, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'movil-375', width: 375, height: 812 },
] as const;

/** Abre el turno por la pantalla de acceso (flujo real: POST /pos/shifts) con base exacta. */
const openShiftReal = async (page: Page) => {
  // Mismo cuidado que `gotoModule`: se navega por la SPA, nunca con recarga, porque la base de mocks vive en memoria.
  await startAs(page, 'cajero', '/pos/acceso');
  await page.getByRole('button', { name: 'Abrir caja' }).click();
  await page.getByLabel('Cantidad de billete de 100000').fill('1');
  await page.getByRole('button', { name: 'Revisar apertura' }).click();
  await page.getByRole('button', { name: 'Confirmar apertura' }).dblclick();
  await expect(page.getByTestId('opened-shift')).toBeVisible();
  // Desde el acceso se continúa a Venta rápida; el turno del POS (/pos/turno) se abre desde ahí.
  await page.getByRole('button', { name: /Continuar a Venta rápida/ }).click();
  await expect(page).toHaveURL(/\/pos$/);
  // "Mi turno" está en la barra operativa del POS (PosNav): se navega por la SPA, sin recargar.
  await page.getByRole('button', { name: 'Mi turno' }).click();
  await expect(page).toHaveURL(/\/pos\/turno$/);
};

const check = async (page: Page, scope: string, file: string) => {
  await page.waitForTimeout(450); // deja asentar la animación de los diálogos de PrimeReact
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow, `${scope}: desborde horizontal`).toBe(false);

  const small = await page.evaluate(() =>
    [...document.querySelectorAll('main button, main input, main textarea, main select, [role="dialog"] button, [role="dialog"] input, [role="dialog"] select')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ el, r }) => r.width > 0 && r.height > 0 && r.height < 43.5 && !(el as HTMLInputElement).type?.match(/checkbox/))
      .map(({ el }) => `${el.tagName}.${String(el.className).slice(0, 50)}`),
  );
  expect(small, `${scope}: controles menores de 44 px`).toEqual([]);

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const blocking = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), `${scope}: axe`).toEqual([]);

  await page.screenshot({ path: path.join(shots, `${file}.png`), fullPage: true });
};

for (const vp of viewports) {
  test(`turno, autorizaciones, sincronización e historial a ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await startAs(page, 'cajero', '/pos/turno');

    await expect(page.getByText('No hay un turno activo en esta caja')).toBeVisible();
    await check(page, 'sin turno', `turno-vacio-${vp.name}`);

    await openShiftReal(page);
    await expect(page.getByRole('heading', { name: 'Turno', exact: true })).toBeVisible();
    await check(page, 'turno activo', `turno-activo-${vp.name}`);

    await page.getByRole('button', { name: 'Relevar' }).click();
    await expect(page.getByRole('dialog', { name: 'Relevar la caja' })).toBeVisible();
    await check(page, 'relevo', `turno-relevo-${vp.name}`);
    await page.keyboard.press('Escape');

    await page.getByRole('tab', { name: /Autorizaciones/ }).click();
    await page.getByRole('button', { name: 'Nueva solicitud' }).click();
    await expect(page.getByRole('dialog', { name: 'Solicitar autorización' })).toBeVisible();
    await check(page, 'solicitud', `auth-solicitud-${vp.name}`);
    await page.keyboard.press('Escape');

    await page.getByRole('tab', { name: /Sincronización/ }).click();
    await expect(page.getByText('Conexión y sincronización')).toBeVisible();
    await check(page, 'sincronización', `sync-${vp.name}`);

    await page.getByRole('tab', { name: 'Historial' }).click();
    await expect(page.getByText('Historial de turnos')).toBeVisible();
    await check(page, 'historial', `historial-${vp.name}`);
  });
}

test('flujo de autorización entre roles: cajero solicita, supervisor aprueba, cajero aplica una sola vez', async ({ page }) => {
  await startAs(page, 'cajero', '/pos/turno');
  await page.getByRole('tab', { name: /Autorizaciones/ }).click();
  await page.getByRole('button', { name: 'Nueva solicitud' }).click();
  const form = page.getByRole('dialog', { name: 'Solicitar autorización' });
  await form.getByLabel('Importe').pressSequentially('120000');
  await form.getByLabel('Motivo').fill('Cliente frecuente');
  await form.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(page.getByRole('cell', { name: 'Descuento extraordinario', exact: true })).toBeVisible();

  await switchRole(page, 'admin');
  await page.getByRole('tab', { name: /Autorizaciones/ }).click();
  await expect(page.getByText('Bandeja de autorizaciones')).toBeVisible();
  await page.getByRole('button', { name: /Abrir solicitud de Descuento extraordinario/ }).click();
  await page.getByRole('button', { name: 'Aprobar' }).click();

  await switchRole(page, 'cajero');
  await page.getByRole('tab', { name: /Autorizaciones/ }).click();
  await page.getByRole('button', { name: 'Aprobadas', exact: false }).click();
  await page.getByRole('button', { name: /Abrir solicitud de Descuento extraordinario/ }).click();
  await page.getByRole('button', { name: 'Aplicar autorización' }).click();

  await page.getByRole('button', { name: /Ejecutadas|Aprobadas/ }).first().click();
  await page.getByRole('button', { name: /Abrir solicitud de Descuento extraordinario/ }).click();
  await expect(page.getByText('Ejecutada').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aplicar autorización' })).toHaveCount(0);
});

test('relevo con cuadre exacto: el relevo se confirma en el servidor y la custodia cambia', async ({ page }) => {
  await startAs(page, 'cajero', '/pos/turno');
  await openShiftReal(page);
  await page.getByRole('button', { name: 'Relevar' }).click();
  const dlg = page.getByRole('dialog', { name: 'Relevar la caja' });
  await dlg.getByLabel('Recibe').selectOption({ index: 1 });
  await dlg.getByLabel('Efectivo contado').pressSequentially('0');
  const expected = await dlg.getByLabel('Efectivo esperado').inputValue();
  await dlg.getByLabel('Efectivo contado').fill('');
  await dlg.getByLabel('Efectivo contado').pressSequentially(expected.replace(/\D/g, '') || '0');
  await dlg.getByRole('button', { name: 'Confirmar relevo' }).click();
  await expect(page.getByRole('heading', { name: 'Entregas de custodia' })).toBeVisible();
  await expect(page.getByText('Relevo confirmado por el servidor.')).toBeVisible();
});
