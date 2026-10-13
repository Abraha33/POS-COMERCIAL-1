import { useMemo, useState, type ReactNode } from 'react';
import { Button } from 'primereact/button';
import type { AgingReport, InventoryValuation, SalesSummary } from '@/shared/contracts';
import { useAgingReport, useInventoryValuation, useSalesSummary } from '@/shared/api/reports';
import { useBranches, useProducts } from '@/shared/api/queries';
import { useSession } from '@/app/providers/SessionProvider';
import { AccessDenied } from '@/app/guards/RouteGuard';
import { EmptyState, ErrorState, KpiCard, LoadingState, MiniBars, MoneyText, ScreenTemplate } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { useToday } from '@/shared/utils/clock';
import { BRANCH_ALL, paymentLabels } from './aggregate';
import './reports.css';

const AGING_LABELS: Record<string, string> = {
  current: 'Al día',
  d1_30: '1–30 días',
  d31_60: '31–60 días',
  d61_90: '61–90 días',
  d90_plus: 'Más de 90 días',
};

const Section = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section className="reports__section" aria-labelledby={`${id}-heading`} id={id}>
    <h2 id={`${id}-heading`}>{title}</h2>
    {children}
  </section>
);

const ReportTable = ({ children, caption }: { children: ReactNode; caption: string }) => (
  <div className="app-table-scroll">
    <table className="reports__table">
      <caption>{caption}</caption>
      {children}
    </table>
  </div>
);

const ChartCard = ({ title, data }: { title: string; data: { label: string; value: number }[] }) => (
  <div className="reports__chart">
    <h3>{title}</h3>
    <MiniBars
      data={data}
      ariaLabel={`${title}. ${data.map((entry) => `${entry.label}: ${formatMoney(entry.value)}`).join('; ')}`}
      formatValue={formatMoney}
      height={200}
    />
  </div>
);

const SalesReport = ({ report }: { report: SalesSummary }) => {
  const paymentRows = report.byPaymentMethod.map((row) => ({
    ...row,
    label: paymentLabels[row.method],
  }));

  return (
    <Section id="rep-sales" title="Ventas">
      <div className="reports__kpis">
        <KpiCard label="Ventas" value={String(report.salesCount)} />
        <KpiCard label="Total bruto" value={<MoneyText value={report.grossTotal} />} />
        <KpiCard label="Total neto" value={<MoneyText value={report.netTotal} />} />
        <KpiCard label="Ticket promedio" value={<MoneyText value={report.averageTicket} />} />
      </div>
      {report.salesCount === 0 && report.voidedCount === 0 ? (
        <EmptyState message="No hay ventas para los filtros elegidos." />
      ) : (
        <>
          <div className="reports__charts">
            <ChartCard
              title="Ventas por día (COP)"
              data={report.byDay.map((row) => ({
                label: row.date,
                value: row.total,
              }))}
            />
            <ChartCard
              title="Ventas por medio de pago (COP)"
              data={paymentRows.map((row) => ({
                label: row.label,
                value: row.amount,
              }))}
            />
          </div>
          <div className="reports__split">
            <ReportTable caption="Ventas por día">
              <thead>
                <tr>
                  <th scope="col">Día</th>
                  <th scope="col">Ventas</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {report.byDay.length === 0 ? (
                  <tr>
                    <td colSpan={3}>Sin ventas no anuladas.</td>
                  </tr>
                ) : (
                  report.byDay.map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>{row.count}</td>
                      <td className="reports__num">{formatMoney(row.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ReportTable>
            <ReportTable caption="Ventas por medio de pago">
              <thead>
                <tr>
                  <th scope="col">Medio</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.map((row) => (
                  <tr key={row.method}>
                    <td>{row.label}</td>
                    <td className="reports__num">{formatMoney(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </ReportTable>
          </div>
        </>
      )}
    </Section>
  );
};

const AgingSide = ({ title, side }: { title: string; side: AgingReport['receivables'] }) => (
  <div className="reports__ledger">
    <h3>{title}</h3>
    <div className="reports__kpis">
      <KpiCard label="Saldo abierto" value={<MoneyText value={side.total} />} />
      <KpiCard label="Vencido" value={<MoneyText value={side.overdueTotal} />} />
    </div>
    <ReportTable caption={`${title}: tramos de antigüedad`}>
      <thead>
        <tr>
          <th scope="col">Tramo</th>
          <th scope="col">Documentos</th>
          <th scope="col">Monto</th>
        </tr>
      </thead>
      <tbody>
        {side.buckets.map((bucket) => (
          <tr key={bucket.key}>
            <td>{AGING_LABELS[bucket.key] ?? 'Tramo no disponible'}</td>
            <td>{bucket.count}</td>
            <td className="reports__num">{formatMoney(bucket.amount)}</td>
          </tr>
        ))}
      </tbody>
    </ReportTable>
  </div>
);

const AgingReportView = ({ report }: { report: AgingReport }) => (
  <Section id="rep-aging" title="Antigüedad de cartera">
    <p className="reports__note">
      Corte: {report.asOf}. El contrato devuelve totales agregados; no se descargan documentos completos.
    </p>
    <div className="reports__split">
      <AgingSide title="Cuentas por cobrar" side={report.receivables} />
      <AgingSide title="Cuentas por pagar" side={report.payables} />
    </div>
  </Section>
);

const InventoryReport = ({
  report,
  productNames,
  branchNames,
}: {
  report: InventoryValuation;
  productNames: Map<string, string>;
  branchNames: Map<string, string>;
}) => (
  <Section id="rep-inventory" title="Valorización de inventario">
    <div className="reports__kpis">
      <KpiCard label="Valor total" value={<MoneyText value={report.totalValue} />} />
      <KpiCard
        label="Unidades"
        value={String(report.items.reduce((total, item) => total + Math.max(item.onHand, 0), 0))}
      />
      <KpiCard label="Ítems" value={String(report.items.length)} />
    </div>
    <p className="reports__note">
      Base de costo:{' '}
      {report.costBasis === 'product_cost' ? 'costo vigente del producto (mock)' : 'promedio ponderado por sede'}.
    </p>
    {report.items.length === 0 ? (
      <EmptyState message="No hay existencias para los filtros elegidos." />
    ) : (
      <ReportTable caption="Detalle de valorización">
        <thead>
          <tr>
            <th scope="col">Producto</th>
            <th scope="col">Sede</th>
            <th scope="col">Existencia</th>
            <th scope="col">Costo unitario</th>
            <th scope="col">Valor</th>
          </tr>
        </thead>
        <tbody>
          {report.items.map((item) => (
            <tr key={`${item.productId}:${item.branchId}`}>
              <td>{productNames.get(item.productId) ?? 'Producto desconocido'}</td>
              <td>{branchNames.get(item.branchId) ?? 'Sede desconocida'}</td>
              <td className="reports__num">{item.onHand}</td>
              <td className="reports__num">{formatMoney(item.unitCost)}</td>
              <td className="reports__num">{formatMoney(item.value)}</td>
            </tr>
          ))}
        </tbody>
      </ReportTable>
    )}
  </Section>
);

export const ReportsPage = () => {
  const { can } = useSession();
  const referenceDate = useToday();
  const branches = useBranches();
  const products = useProducts();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [branchId, setBranchId] = useState(BRANCH_ALL);
  const selectedBranch = branchId === BRANCH_ALL ? undefined : branchId;
  const sales = useSalesSummary({
    from: from || undefined,
    to: to || undefined,
    branchId: selectedBranch,
  });
  const aging = useAgingReport({
    asOf: to || referenceDate,
    branchId: selectedBranch,
  });
  const inventory = useInventoryValuation({ branchId: selectedBranch });
  const queries = [sales, aging, inventory, branches, products];
  const failed = queries.find((query) => query.error);
  const retryAll = () => queries.forEach((query) => void query.refetch());
  const branchNames = useMemo(
    () => new Map((branches.data ?? []).map((branch) => [branch.id, branch.name])),
    [branches.data],
  );
  const productNames = useMemo(
    () => new Map((products.data ?? []).map((product) => [product.id, product.name])),
    [products.data],
  );

  if (!can('reports.view')) {
    return <AccessDenied />;
  }

  let body: ReactNode;
  if (failed?.error) {
    body = <ErrorState error={failed.error} onRetry={retryAll} />;
  } else if (queries.some((query) => query.isLoading)) {
    body = <LoadingState label="Cargando reportes…" />;
  } else if (sales.data && aging.data && inventory.data && branches.data && products.data) {
    body = (
      <>
        <SalesReport report={sales.data} />
        <AgingReportView report={aging.data} />
        <InventoryReport report={inventory.data} productNames={productNames} branchNames={branchNames} />
      </>
    );
  } else {
    body = <EmptyState message="No hay datos de reportes para mostrar." />;
  }

  return (
    <ScreenTemplate
      title="Reportes"
      subtitle="Ventas, antigüedad de cartera y valorización de inventario"
      actions={<Button label="Actualizar" icon="pi pi-refresh" outlined onClick={retryAll} />}
    >
      <div className="reports">
        <div className="reports__filters" role="group" aria-label="Filtros de reportes">
          <div className="reports__field">
            <label htmlFor="rep-from">Desde</label>
            <input
              id="rep-from"
              type="date"
              className="p-inputtext"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="reports__field">
            <label htmlFor="rep-to">Hasta</label>
            <input
              id="rep-to"
              type="date"
              className="p-inputtext"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          <div className="reports__field">
            <label htmlFor="rep-branch">Sede</label>
            <select
              id="rep-branch"
              className="p-inputtext"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              <option value={BRANCH_ALL}>Todas las sedes</option>
              {(branches.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            label="Limpiar filtros"
            text
            disabled={!from && !to && branchId === BRANCH_ALL}
            onClick={() => {
              setFrom('');
              setTo('');
              setBranchId(BRANCH_ALL);
            }}
          />
        </div>
        <nav className="reports__nav" aria-label="Secciones del reporte">
          <a href="#rep-sales">Ventas</a>
          <a href="#rep-aging">Cartera</a>
          <a href="#rep-inventory">Inventario</a>
        </nav>
        <p className="reports__note">
          Datos de los tres endpoints agregados aprobados, simulados con MSW. «Hasta» define el corte de cartera;
          inventario no usa fechas porque el contrato no las expone.
        </p>
        {body}
      </div>
    </ScreenTemplate>
  );
};
