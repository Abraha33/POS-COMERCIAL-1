import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addToCart, openShift, startAs } from './helpers';

const shots = path.resolve(import.meta.dirname, '../../docs/qa/audit/pos-proofs');
// PNG 1×1 válido: la evidencia real es una foto; aquí basta una imagen decodificable.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const axeBlocking = async (page: Page, scope: string) => {
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const blocking = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), `${scope}: axe`).toEqual([]);
};

test('transferencia: QR → teléfono envía foto → cajero verifica → venta confirmada', async ({ page, browser }) => {
  await startAs(page, 'cajero', '/pos');
  await openShift(page, 100000);
  await addToCart(page, 'Arroz 500 g');
  await page.getByRole('button', { name: 'Transferencia' }).click();
  await page.getByRole('button', { name: /Cobrar/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Cobrar venta' });
  await expect(dialog).toBeVisible();

  const confirm = dialog.getByRole('button', { name: /Confirmar pago/ });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/Número de referencia/).fill('E2E-REF-001');
  await dialog.getByRole('button', { name: /Solicitar comprobante/ }).click();
  await expect(dialog.getByTestId('proof-status')).toHaveText('Esperando comprobante');
  await page.waitForTimeout(450);
  await axeBlocking(page, 'cobro con QR');
  await page.screenshot({ path: path.join(shots, 'cobro-esperando.png'), fullPage: true });

  // Teléfono: otra página (otro contexto) abre el enlace del QR y manda la imagen.
  const link = await dialog.getByLabel('Enlace de captura').inputValue();
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
  const phone = await context.newPage();
  await phone.goto(link);
  await expect(phone.getByTestId('capture-amount')).toBeVisible();
  await expect(phone.getByRole('navigation')).toHaveCount(0);
  await phone.locator('input[aria-label="Elegir imagen del comprobante"]').setInputFiles({ name: 'comprobante.png', mimeType: 'image/png', buffer: PNG });
  await expect(phone.getByRole('img', { name: 'Vista previa del comprobante' })).toBeVisible();
  expect(await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await axeBlocking(phone, 'captura móvil');
  await phone.screenshot({ path: path.join(shots, 'captura-movil-375.png'), fullPage: true });
  await phone.getByRole('button', { name: 'Enviar comprobante' }).click();
  await expect(phone.getByTestId('capture-sent')).toBeVisible();
  await context.close();

  // Computador: la evidencia llegó sola, pero no confirma el pago.
  await expect(dialog.getByTestId('proof-status')).toHaveText('Comprobante recibido', { timeout: 10_000 });
  await expect(confirm).toBeDisabled();
  await page.screenshot({ path: path.join(shots, 'cobro-recibido.png'), fullPage: true });

  await dialog.getByRole('button', { name: 'Marcar pago como verificado' }).click();
  await expect(dialog.getByTestId('proof-status')).toHaveText('Pago confirmado');
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByTestId('receipt-number')).toBeVisible();
});
