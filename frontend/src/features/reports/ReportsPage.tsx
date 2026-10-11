import { useMemo, useState, type ReactNode } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import type { Sale } from '@/shared/contracts';
import {
  useBranches, useCustomers, useEmployees, usePayables, useProducts, useReceivables, useSales, useStockLevels,
  useSuppliers,
} from '@/shared/api/queries';
import {
  EmptyState, ErrorState, KpiCard, LoadingState, MiniBars, MoneyText, ScreenTemplate, StatusTag,
} from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import {
  BRANCH_ALL, REFERENCE_DATE, filterSales, inventoryReport, ledgerReport, salesByCashier, salesByDay,
  salesByPayment, summarizeSales, type Bucket, type LedgerReport, type StockRow,
} from './aggregate';
import './reports.css';

const UNKNOWN_BRANCH = 'Sede desconocida';

const Kpis = ({ children }: { children: ReactNode }) => <div className="reports__kpis">{children}</div>;

const warnIf = (condition: boolean, text: string) => (condition ? { text, tone: 'down' as const } : undefined);

const Section = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section className="reports__section" aria-labelledby={`${id}-h`} id={id}>
    <h2 id={`${id}-h`}>{title}</h2>
    {children}
  </section>
);

const ScrollHint = () => <p className="reports__scrollhint">Desliza la tabla para ver todas las columnas.</p>;

const BucketTable = ({ caption, head, buckets }: { caption: string; head: string; buckets: Bucket[] }) => (
  <div className="app-table-scroll">
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

const ChartCard = ({ title, buckets }: { title: string; buckets: Bucket[] }) => (
  <div className="reports__chart">
    <h3>{title}</h3>
    <MiniBars
      data={buckets.map((b) => ({ label: b.label, value: b.total }))}
      ariaLabel={`${title}. ${buckets.map((b) => `${b.label}: ${formatMoney(b.total)}`).join('; ')}`}
      formatValue={formatMoney}
      height={200}
    />
  </div>
);

type StockTableProps = { caption: string; rows: StockRow[]; branchName: (id: string) => string };

const StockTable = ({ caption, rows, branchName }: StockTableProps) => (
  <div className="app-table-scroll">
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
            <td>{branchName(r.branchId)}</td>
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
  <Section id={idPrefix} title={title}>
    <Kpis>
      <KpiCard label="Saldo total" value={<MoneyText value={report.balance} />} />
      <KpiCard
        label="Vencido"
        value={<MoneyText value={report.overdue} />}
        delta={warnIf(report.overdue > 0, 'Requiere gestión')}
      />
      <KpiCard label="Vigente" value={<MoneyText value={report.current} />} />
      <KpiCard label="Documentos abiertos" value={String(report.openCount)} />
    </Kpis>
    {report.top.length === 0 ? (
      <EmptyState message="No hay saldos pendientes." />
    ) : (
      <div className="app-table-scroll">
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
  const branchList = useBranches();
  const queries = [sales, stock, products, receivables, payables, customers, suppliers, employees, branchList];

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [branchId, setBranchId] = useState(BRANCH_ALL);

  const branchNames = useMemo(
    () => new Map((branchList.data ?? []).map((b) => [b.id, b.name])),
    [branchList.data],
  );
  const branchName = (id: string) => branchNames.get(id) ?? UNKNOWN_BRANCH;

  const report = useMemo(() => {
    if (!sales.data || !stock.data || !products.data || !receivables.data || !payables.data
      || !customers.data || !suppliers.data || !employees.data || !branchList.data) return null;
    const productMap = new Map(products.data.map((p) => [p.id, p]));
    const employeeNames = new Map(employees.data.map((e) => [e.id, e.name]));
    const customerNames = new Map(customers.data.map((c) => [c.id, c.name]));
    const supplierNames = new Map(suppliers.data.map((s) => [s.id, s.name]));
    const filtered = filterSales(sales.data, { from, to }, branchId);
    return {
      filtered,
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
    customers.data, suppliers.data, employees.data, branchList.data, from, to, branchId,
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
            <KpiCard label="Ventas" value={String(summary.count)} icon="pi pi-shopping-cart" />
            <KpiCard label="Total vendido" value={<MoneyText value={summary.total} />} icon="pi pi-dollar" />
            <KpiCard label="Ticket promedio" value={<MoneyText value={summary.average} />} icon="pi pi-receipt" />
            <KpiCard
              label="Anuladas"
              value={String(summary.voided)}
              icon="pi pi-ban"
              delta={warnIf(summary.voided > 0, 'Revisar anulaciones')}
            />
          </Kpis>
          {report.filtered.length === 0 ? (
            <EmptyState message="No hay ventas para el rango y la sede elegidos. Amplía las fechas o cambia de sede." />
          ) : (
            <>
              <div className="reports__charts">
                <ChartCard title="Ventas por día (COP)" buckets={byDay} />
                <ChartCard title="Ventas por medio de pago (COP)" buckets={byPayment} />
              </div>
              <div className="reports__split">
                <BucketTable caption="Ventas por día" head="Día" buckets={byDay} />
                <BucketTable caption="Ventas por medio de pago (neto de cambio)" head="Medio" buckets={byPayment} />
                <BucketTable caption="Ventas por cajero" head="Cajero" buckets={byCashier} />
              </div>
              <h3>Detalle de ventas</h3>
              <ScrollHint />
              <div className="app-table-scroll">
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
                  <Column header="Sede" body={(s: Sale) => branchName(s.branchId)} />
                  <Column header="Estado" body={(s: Sale) => <StatusTag status={s.status} />} />
                  <Column
                    field="total" header="Total" sortable bodyClassName="reports__num"
                    body={(s: Sale) => <MoneyText value={s.total} />}
                  />
                </DataTable>
              </div>
            </>
          )}
        </Section>

        <Section id="rep-inventory" title="Inventario">
          <Kpis>
            <KpiCard label="Valor a costo" value={<MoneyText value={inventory.value} />} icon="pi pi-box" />
            <KpiCard label="Unidades en existencia" value={String(inventory.units)} />
            <KpiCard
              label="Bajo mínimo"
              value={String(inventory.belowMinimum.length)}
              delta={warnIf(inventory.belowMinimum.length > 0, 'Reponer')}
            />
            <KpiCard
              label="Stock negativo"
              value={String(inventory.negative.length)}
              delta={warnIf(inventory.negative.length > 0, 'Ajustar inventario')}
            />
          </Kpis>
          {inventory.belowMinimum.length === 0 && inventory.negative.length === 0 ? (
            <EmptyState message="Sin productos bajo mínimo ni con stock negativo." />
          ) : (
            <div className="reports__split">
              <StockTable caption="Stock negativo" rows={inventory.negative} branchName={branchName} />
              <StockTable caption="Bajo el mínimo" rows={inventory.belowMinimum} branchName={branchName} />
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
              {(branchList.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Button
            label="Limpiar filtros"
            text
            disabled={!from && !to && branchId === BRANCH_ALL}
            onClick={() => { setFrom(''); setTo(''); setBranchId(BRANCH_ALL); }}
          />
        </div>
        <nav className="reports__nav" aria-label="Secciones del reporte">
          <a href="#rep-sales">Ventas</a>
          <a href="#rep-inventory">Inventario</a>
          <a href="#rep-rec">Cartera por cobrar</a>
          <a href="#rep-pay">Cartera por pagar</a>
          <a href="#rep-cash">Caja</a>
        </nav>
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
