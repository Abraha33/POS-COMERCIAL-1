import { expect, type Locator, type Page } from '@playwright/test';

export type Role = 'propietario' | 'admin' | 'cajero' | 'bodeguero' | 'comprador' | 'cartera';

export const ROUTES = [
  'pos', 'products', 'inventory', 'purchases', 'customers', 'receivables', 'payables', 'reports', 'administration',
] as const;

export type RouteId = (typeof ROUTES)[number];

/** Fija el rol simulado antes de que arranque la app (sessionStorage; la app lo lee al montar). */
export const startAs = async (page: Page, role: Role, path = '/pos') => {
  await page.addInitScript((r) => {
    try { window.sessionStorage.setItem('pos.simulatedRole', r); } catch { /* sin almacenamiento */ }
  }, role);
  await page.goto(path);
};

/** Cambia de rol SIN recargar (la base de mocks vive en memoria del navegador: recargar la reinicia). */
export const switchRole = async (page: Page, role: Role) => {
  await page.getByLabel('Rol simulado').selectOption(role);
  await expect(page.getByLabel('Rol simulado')).toHaveValue(role);
};

/** Navega por el menú (SPA) para conservar el estado de los mocks. En 375 px abre el drawer primero. */
export const gotoModule = async (page: Page, id: RouteId) => {
  const link = page.getByTestId(`nav-${id}`);
  if (!(await link.isVisible())) await page.getByRole('button', { name: 'Abrir menú de módulos' }).click();
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/${id}$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
};

/** Normaliza espacios duros del formato es-CO ("$ 2.800" usa U+00A0). */
export const norm = (text: string | null): string => (text ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

/** Extrae el entero COP de un texto como "$ 1.234.567". */
export const copValue = (text: string | null): number => Number(norm(text).replace(/[^\d-]/g, ''));

/** Formatea un entero con puntos de miles (es-CO) para buscarlo dentro de un texto. */
export const dots = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Abre turno con la base indicada (cajero ya en /pos sin turno). */
export const openShift = async (page: Page, base?: number) => {
  await expect(page.getByRole('heading', { name: 'Abrir turno de caja' })).toBeVisible();
  if (base !== undefined) await typeNumber(page.locator('#opening-cash'), String(base));
  await page.getByRole('button', { name: 'Abrir turno' }).click();
  await expect(page.locator('#pos-search')).toBeVisible();
};

/** Agrega un producto buscándolo por nombre y pulsando su botón de resultado. */
export const addToCart = async (page: Page, name: string) => {
  await page.locator('#pos-search').fill(name);
  await page.getByRole('list', { name: 'Resultados' }).getByRole('listitem').filter({ hasText: name }).first().click();
};

export const stockRow = (page: Page, productId: string, branchId: string) =>
  page.locator('tbody tr').filter({ hasText: productId }).filter({ hasText: branchId });

/**
 * PrimeReact InputNumber solo reacciona a teclas reales: `fill()` no actualiza su valor. Se escribe como una persona.
 */
export const typeNumber = async (field: Locator, value: string) => {
  await field.click();
  await field.press('Control+a');
  await field.pressSequentially(value);
  await field.blur();
};
