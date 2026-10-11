import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { modules } from '@/app/config/modules';
import { useSession } from '@/app/providers/SessionProvider';
import { useCustomers, useProducts, useSales } from '@/shared/api/queries';
import { formatMoney } from '@/shared/utils/format';
import {
  EmptyState, ErrorState, KpiCard, LoadingState, MiniBars, MoneyText, PageHeader,
} from '@/shared/ui';
import { buildDashboard } from './dashboard';
import './home.css';

const localDay = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

const weekday = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' });
const utcDate = (day: string): Date => new Date(`${day}T00:00:00Z`);

const firstName = (name: string): string => name.split(/\s+/)[0] ?? name;

/** Inicio (dashboard, maqueta ref-2 · 1). Datos de hooks existentes; los cálculos sin contrato van marcados PROPUESTA. */
export const HomePage = () => {
  const { session, can } = useSession();
  const sales = useSales();
  const products = useProducts();
  const customers = useCustomers();

  const dashboard = useMemo(
    () => (sales.data ? buildDashboard(sales.data, products.data ?? [], localDay()) : null),
    [sales.data, products.data],
  );
  const activeCustomers = customers.data?.filter((c) => c.active).length;
  const quickLinks = modules.filter((m) => can(m.permission));

  let body;
  if (sales.isPending) body = <LoadingState label="Cargando resumen…" />;
  else if (sales.error) body = <ErrorState error={sales.error} onRetry={() => void sales.refetch()} title="Resumen no disponible" />;
  else if (!dashboard || dashboard.referenceDay === null) {
    body = <EmptyState title="Aún no hay ventas" message="Cuando registres la primera venta verás aquí el resumen del día." icon="pi pi-chart-line" />;
  } else {
    const ref = dashboard.referenceDay;
    const chartData = dashboard.last7Days.map((d) => ({ label: weekday.format(utcDate(d.day)), value: d.total }));
    body = (
      <>
        <p className="app-home__period" data-testid="home-period">
          {dashboard.isToday ? 'Hoy' : 'Último día con ventas'}: {longDate.format(utcDate(ref))}
        </p>
        <div className="app-home__kpis">
          <KpiCard label="Ventas del día" icon="pi pi-dollar" value={<MoneyText value={dashboard.salesTotal} />} data-testid="kpi-sales" />
          <KpiCard label="Tickets" icon="pi pi-receipt" value={dashboard.tickets} data-testid="kpi-tickets" />
          <KpiCard label="Productos vendidos" icon="pi pi-box" value={dashboard.unitsSold} data-testid="kpi-units" />
          <KpiCard
            label="Clientes activos"
            icon="pi pi-users"
            value={activeCustomers ?? '—'}
            hint="Sin fecha de alta en el contrato: no se calculan clientes nuevos."
            proposal
            data-testid="kpi-customers"
          />
        </div>
        <div className="app-home__grid">
          <section className="app-home__card" aria-labelledby="home-chart">
            <h2 id="home-chart" className="app-home__card-title">Ventas de los últimos 7 días <span className="app-kpi__tag">PROPUESTA</span></h2>
            <MiniBars
              data={chartData}
              ariaLabel="Ventas de los últimos 7 días"
              formatValue={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} M` : v >= 1000 ? `${Math.round(v / 1000)} k` : String(v))}
              highlight={chartData.length - 1}
            />
          </section>
          <section className="app-home__card" aria-labelledby="home-top">
            <h2 id="home-top" className="app-home__card-title">Productos más vendidos (7 días) <span className="app-kpi__tag">PROPUESTA</span></h2>
            {dashboard.topProducts.length === 0 ? (
              <EmptyState message="Sin ventas en el periodo." />
            ) : (
              <div className="app-table-scroll">
                <DataTable value={dashboard.topProducts} size="small" dataKey="productId" aria-label="Productos más vendidos">
                  <Column field="name" header="Producto" />
                  <Column field="quantity" header="Cantidad" />
                  <Column header="Total" body={(row: { total: number }) => formatMoney(row.total)} />
                </DataTable>
              </div>
            )}
          </section>
        </div>
      </>
    );
  }

  return (
    <section aria-labelledby="screen-title" data-testid="home-page">
      <PageHeader title={`Hola, ${firstName(session.user.name)}`} subtitle="Aquí tienes un resumen de tu negocio." />
      {body}
      <nav className="app-home__quick" aria-label="Accesos rápidos">
        <h2 className="app-home__card-title">Accesos rápidos</h2>
        <ul>
          {quickLinks.map((m) => (
            <li key={m.id}>
              <Link to={m.path} data-testid={`quick-${m.id}`}>
                <i className={m.icon} aria-hidden="true" />
                <span>{m.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
};
