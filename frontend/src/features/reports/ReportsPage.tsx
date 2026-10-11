import { useMemo, useState, type ReactNode } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import type { Sale } from '@/shared/contracts';
import {
  useCustomers, useEmployees, usePayables, useProducts, useReceivables, useSales, useStockLevels, useSuppliers,
} from '@/shared/api/queries';
import { EmptyState, ErrorState, LoadingState, ScreenTemplate } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import {
  BRANCH_ALL, REFERENCE_DATE, filterSales, inventoryReport, ledgerReport, salesByCashier, salesByDay,
  salesByPayment, summarizeSales, type Bucket, type LedgerReport, type StockRow,
} from './aggregate';
import { BarChart } from './BarChart';
import './reports.css';

const statusLabels: Record<Sale['status'], string> = { pagada: 'Pagada', credito: 'Crédito', anulada: 'Anulada' };

const Kpi = ({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) => (
  <div className={`reports__kpi${warn ? ' reports__kpi--warn' : ''}`}>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

const Kpis = ({ children }: { children: ReactNode }) => <dl className="reports__kpis">{children}</dl>;

const Section = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section className="reports__section" aria-labelledby={id}>
    <h2 id={id}>{title}</h2>
    {children}
  </section>
);

const BucketTable = ({ caption, head, buckets }: { caption: string; head: string; buckets: Bucket[] }) => (
  <div className="reports__tablewrap">
    <table className="reports__table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{head}</th>
          <th scope="col" className="reports__num">Ventas</th>
          <th scope="col" className="reports__num">Total</th>
        </tr>
      </thead>
      <tbody>
        {buckets.map((b) => (
          <tr key={b.key}>
            <td>{b.label}</td>
            <td className="reports__num">{b.count}</td>
            <td className="reports__num">{formatMoney(b.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const describeBuckets = (buckets: Bucket[]): string =>
  buckets.map((b) => `${b.label}: ${formatMoney(b.total)}`).join('; ');

const StockTable = ({ caption, rows }: { caption: string; rows: StockRow[] }) => (
  <div className="reports__tablewrap">
    <table className="reports__table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Producto</th>
          <th scope="col">Sede</th>
          <th scope="col" className="reports__num">Existencia</th>
          <th scope="col" className="reports__num">Mínimo</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={4}>Ninguno.</td></tr>
        ) : rows.map((r) => (
          <tr key={r.key}>
            <td>{r.name}</td>
            <td>{r.branchId}</td>
            <td className="reports__num">{r.onHand}</td>
            <td className="reports__num">{r.minimum}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

type LedgerProps = { title: string; partyHeader: string; report: LedgerReport; idPrefix: string };

const LedgerBlock = ({ title, partyHeader, report, idPrefix }: LedgerProps) => (
  <Section id={`${idPrefix}-title`} title={title}>
    <Kpis>
      <Kpi label="Saldo total" value={formatMoney(report.balance)} />
      <Kpi label="Vencido" value={formatMoney(report.overdue)} warn={report.overdue > 0} />
      <Kpi label="Vigente" value={formatMoney(report.current)} />
      <Kpi label="Documentos abiertos" value={String(report.openCount)} />
    </Kpis>
    {report.top.length === 0 ? (
      <EmptyState message="No hay saldos pendientes." />
    ) : (
      <div className="reports__tablewrap">
        <table className="reports__table">
          <caption>Mayores saldos</caption>
          <thead>
            <tr>
              <th scope="col">{partyHeader}</th>
              <th scope="col" className="reports__num">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {report.top.map((t) => (
              <tr key={t.id}><td>{t.name}</td><td className="reports__num">{formatMoney(t.balance)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Section>
);

/** Panel del propietario: todo se calcula en el navegador sobre las listas completas (no hay endpoints de reporte). */
export const ReportsPage = () => {
  const sales = useSales();
  const stock = useStockLevels();
  const products = useProducts();
  const receivables = useReceivables();
  const payables = usePayables();
  const customers = useCustomers();
  const suppliers = useSuppliers();
  const employees = useEmployees();
  const queries = [sales, stock, products, receivables, payables, customers, suppliers, employees];

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [branchId, setBranchId] = useState(BRANCH_ALL);

  const report = useMemo(() => {
    if (!sales.data || !stock.data || !products.data || !receivables.data || !payables.data
      || !customers.data || !suppliers.data || !employees.data) return null;
    const productMap = new Map(products.data.map((p) => [p.id, p]));
    const employeeNames = new Map(employees.data.map((e) => [e.id, e.name]));
    const customerNames = new Map(customers.data.map((c) => [c.id, c.name]));
    const supplierNames = new Map(suppliers.data.map((s) => [s.id, s.name]));
    const filtered = filterSales(sales.data, { from, to }, branchId);
    const branches = [...new Set([...sales.data.map((s) => s.branchId), ...stock.data.map((l) => l.branchId)])].sort();
    return {
      filtered,
      branches,
      employeeNames,
      summary: summarizeSales(filtered),
      byDay: salesByDay(filtered),
      byPayment: salesByPayment(filtered),
      byCashier: salesByCashier(filtered, employeeNames),
      inventory: inventoryReport(stock.data, productMap, branchId),
      receivable: ledgerReport(receivables.data, (e) => ('customerId' in e ? e.customerId : ''), customerNames),
      payable: ledgerReport(payables.data, (e) => ('supplierId' in e ? e.supplierId : ''), supplierNames),
    };
  }, [
    sales.data, stock.data, products.data, receivables.data, payables.data,
    customers.data, suppliers.data, employees.data, from, to, branchId,
  ]);

  const failed = queries.find((q) => q.error);
  const retryAll = () => queries.forEach((q) => void q.refetch());

  let body: ReactNode;
  if (failed?.error) body = <ErrorState error={failed.error} onRetry={retryAll} />;
  else if (!report) body = <LoadingState label="Calculando reportes…" />;
  else {
    const { summary, byDay, byPayment, byCashier, inventory, receivable, payable } = report;
    body = (
      <>
        <Section id="rep-sales" title="Ventas">
          <Kpis>
            <Kpi label="Ventas" value={String(summary.count)} />
            <Kpi label="Total vendido" value={formatMoney(summary.total)} />
            <Kpi label="Ticket promedio" value={formatMoney(summary.average)} />
            <Kpi label="Anuladas" value={String(summary.voided)} warn={summary.voided > 0} />
          </Kpis>
          {report.filtered.length === 0 ? (
            <EmptyState message="No hay ventas para el rango y la sede elegidos. Amplía las fechas o cambia de sede." />
          ) : (
            <>
              <div className="reports__charts">
                <BarChart title="Ventas por día (COP)" buckets={byDay} summary={describeBuckets(byDay)} />
                <BarChart title="Ventas por medio de pago (COP)" buckets={byPayment} summary={describeBuckets(byPayment)} />
              </div>
              <div className="reports__split">
                <BucketTable caption="Ventas por día" head="Día" buckets={byDay} />
                <BucketTable caption="Ventas por medio de pago (neto de cambio)" head="Medio" buckets={byPayment} />
                <BucketTable caption="Ventas por cajero" head="Cajero" buckets={byCashier} />
              </div>
              <h3>Detalle de ventas</h3>
              <DataTable
                value={report.filtered}
                dataKey="id"
                size="small"
                stripedRows
                paginator
                rows={10}
                emptyMessage="Sin ventas."
              >
                <Column field="number" header="Número" sortable />
                <Column field="date" header="Fecha" sortable body={(s: Sale) => s.date.slice(0, 10)} />
                <Column header="Cajero" body={(s: Sale) => report.employeeNames.get(s.cashierId) ?? s.cashierId} />
                <Column field="branchId" header="Sede" />
                <Column header="Estado" body={(s: Sale) => statusLabels[s.status]} />
                <Column field="total" header="Total" sortable body={(s: Sale) => formatMoney(s.total)} bodyClassName="reports__num" />
              </DataTable>
            </>
          )}
        </Section>

        <Section id="rep-inventory" title="Inventario">
          <Kpis>
            <Kpi label="Valor a costo" value={formatMoney(inventory.value)} />
            <Kpi label="Unidades en existencia" value={String(inventory.units)} />
            <Kpi label="Bajo mínimo" value={String(inventory.belowMinimum.length)} warn={inventory.belowMinimum.length > 0} />
            <Kpi label="Stock negativo" value={String(inventory.negative.length)} warn={inventory.negative.length > 0} />
          </Kpis>
          {inventory.belowMinimum.length === 0 && inventory.negative.length === 0 ? (
            <EmptyState message="Sin productos bajo mínimo ni con stock negativo." />
          ) : (
            <div className="reports__split">
              <StockTable caption="Stock negativo" rows={inventory.negative} />
              <StockTable caption="Bajo el mínimo" rows={inventory.belowMinimum} />
            </div>
          )}
        </Section>

        <div className="reports__split">
          <LedgerBlock title="Cuentas por cobrar" partyHeader="Cliente" report={receivable} idPrefix="rep-rec" />
          <LedgerBlock title="Cuentas por pagar" partyHeader="Proveedor" report={payable} idPrefix="rep-pay" />
        </div>

        <Section id="rep-cash" title="Caja">
          <p className="reports__pending">
            Pendiente: no hay un listado de turnos de caja en las lecturas compartidas, por lo que no se muestran cuadres ni
            diferencias históricas.
          </p>
        </Section>
      </>
    );
  }

  return (
    <ScreenTemplate
      title="Reportes"
      subtitle="Vista del propietario"
      actions={<Button label="Actualizar" icon="pi pi-refresh" outlined onClick={retryAll} />}
    >
      <div className="reports">
        <div className="reports__filters" role="group" aria-label="Filtros">
          <div className="reports__field">
            <label htmlFor="rep-from">Desde</label>
            <input id="rep-from" type="date" className="p-inputtext" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="reports__field">
            <label htmlFor="rep-to">Hasta</label>
            <input id="rep-to" type="date" className="p-inputtext" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="reports__field">
            <label htmlFor="rep-branch">Sede</label>
            <select id="rep-branch" className="p-inputtext" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value={BRANCH_ALL}>Todas las sedes</option>
              {(report?.branches ?? []).map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <Button
            label="Limpiar filtros"
            text
            disabled={!from && !to && branchId === BRANCH_ALL}
            onClick={() => { setFrom(''); setTo(''); setBranchId(BRANCH_ALL); }}
          />
        </div>
        <p className="reports__note">
          Calculado en el navegador sobre las listas completas (no hay endpoints de reporte). Fecha de referencia para
          cartera: {REFERENCE_DATE}. Cuentas por cobrar y por pagar no tienen sede y ignoran ese filtro; inventario ignora
          las fechas. El valor del inventario usa el costo del producto.
        </p>
        {body}
      </div>
    </ScreenTemplate>
  );
};
