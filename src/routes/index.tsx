import { lazy, Suspense, type ComponentType } from 'react';
import { createRootRoute, createRoute, createRouter, Navigate } from '@tanstack/react-router';
import { modules, type ModuleId } from '@/app/config/modules';
import { RouteGuard } from '@/app/guards/RouteGuard';
import { AppShell } from '@/app/layouts/AppShell';
import { useSession } from '@/app/providers/SessionProvider';
import { LoadingState } from '@/shared/ui';

/**
 * Un ancla por módulo. Cada agente solo toca su feature; añadir sub-rutas
 * (p. ej. /products/$id) se hace aquí, con revisión del integrador.
 */
const pages: Record<ModuleId, ComponentType> = {
  pos: lazy(() => import('@/features/pos').then((m) => ({ default: m.PosPage }))),
  products: lazy(() => import('@/features/products').then((m) => ({ default: m.ProductsPage }))),
  inventory: lazy(() => import('@/features/inventory').then((m) => ({ default: m.InventoryPage }))),
  purchases: lazy(() => import('@/features/purchases').then((m) => ({ default: m.PurchasesPage }))),
  customers: lazy(() => import('@/features/customers').then((m) => ({ default: m.CustomersPage }))),
  receivables: lazy(() => import('@/features/receivables').then((m) => ({ default: m.ReceivablesPage }))),
  payables: lazy(() => import('@/features/payables').then((m) => ({ default: m.PayablesPage }))),
  reports: lazy(() => import('@/features/reports').then((m) => ({ default: m.ReportsPage }))),
  administration: lazy(() => import('@/features/administration').then((m) => ({ default: m.AdministrationPage }))),
};

const Home = () => {
  const { can } = useSession();
  const first = modules.find((m) => can(m.permission));
  return first ? <Navigate to={first.path} replace /> : <p className="p-4">Sin módulos disponibles para tu rol.</p>;
};

const NotFound = () => (
  <section className="p-4" data-testid="not-found">
    <h1 className="text-2xl m-0 mb-2">Página no encontrada</h1>
  </section>
);

const rootRoute = createRootRoute({ component: AppShell, notFoundComponent: NotFound });
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home });

const moduleRoutes = modules.map((m) => {
  const Page = pages[m.id];
  return createRoute({
    getParentRoute: () => rootRoute,
    path: m.path,
    component: () => (
      <RouteGuard permission={m.permission}>
        <Suspense fallback={<LoadingState />}>
          <Page />
        </Suspense>
      </RouteGuard>
    ),
  });
});

const routeTree = rootRoute.addChildren([homeRoute, ...moduleRoutes]);

export const createAppRouter = (history?: Parameters<typeof createRouter>[0]['history']) =>
  createRouter({ routeTree, history });
