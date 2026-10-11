import { expect, test } from '@playwright/test';
import { startAs, type Role } from './helpers';

/**
 * Estado de error de cada pantalla de datos: todas las lecturas GET responden 500 (se intercepta `fetch` en la
 * página porque MSW ya atiende desde el service worker y `page.route` no lo ve). Se espera un mensaje útil
 * (role=alert) y un botón "Reintentar"; que la pantalla no quede en blanco ni cargando para siempre.
 */
const screens: { route: string; role: Role; key: string }[] = [
  { route: 'products', role: 'propietario', key: 'Productos' },
  { route: 'inventory', role: 'propietario', key: 'Inventarios' },
  { route: 'purchases', role: 'propietario', key: 'Compras' },
  { route: 'customers', role: 'propietario', key: 'Clientes' },
  { route: 'receivables', role: 'propietario', key: 'Cuentas por cobrar' },
  { route: 'payables', role: 'propietario', key: 'Cuentas por pagar' },
  { route: 'reports', role: 'propietario', key: 'Reportes' },
  { route: 'administration', role: 'propietario', key: 'Administración' },
];

for (const s of screens) {
  test(`${s.route}: estado de error con reintento`, async ({ page }) => {
    await page.addInitScript(() => {
      const original = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
        if (method === 'GET' && url.includes('/api/v1/')) {
          return Promise.resolve(new Response(JSON.stringify({ code: 'INTERNAL', message: 'Fallo simulado' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
          }));
        }
        return original(input, init);
      };
    });
    await startAs(page, s.role, `/${s.route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: /No se pudo cargar|Fallo simulado/ }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /Reintentar/ }).first()).toBeVisible();
  });
}
