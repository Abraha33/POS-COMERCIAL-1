import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { EmptyState, MoneyText, ScreenTemplate, SegmentedTabs, StatusTag } from '@/shared/ui';
import { AuthPanel } from './AuthPanel';
import { ShiftPanel, shiftStatusMap } from './ShiftPanel';
import { ConnectivityBadge, SyncPanel } from './SyncPanel';
import { useOps, type Ops } from './useOps';
import './pos-ops.css';

type Tab = 'turno' | 'autorizaciones' | 'sincronizacion' | 'historial';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—');

const HistoryPanel = ({ ops }: { ops: Ops }) => {
  const rows = ops.shifts
    .filter((s) => ops.isSupervisor || s.cashierId === ops.session.user.id || s.custody.some((c) => c.fromId === ops.session.user.id))
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  if (rows.length === 0) return <EmptyState title="Sin turnos registrados" description="Aquí verás los turnos, relevos e incidencias de esta caja." />;
  return (
    <section className="po-panel" aria-labelledby="po-hist">
      <h2 id="po-hist">Historial de turnos</h2>
      <div className="app-table-scroll" role="region" aria-label="Historial de turnos" tabIndex={0}>
        <table className="po-table">
          <thead>
            <tr><th scope="col">Responsable</th><th scope="col">Inicio</th><th scope="col">Cierre</th><th scope="col" className="po-num">Base</th><th scope="col" className="po-num">Relevos</th><th scope="col" className="po-num">Incidencias</th><th scope="col">Estado</th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.cashierName}</td>
                <td>{fmt(s.openedAt)}</td>
                <td>{fmt(s.closedAt)}</td>
                <td className="po-num"><MoneyText value={s.openingCash} /></td>
                <td className="po-num">{s.custody.length}</td>
                <td className="po-num">{s.incidents.length}</td>
                <td><StatusTag status={s.status} map={shiftStatusMap} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

/**
 * POS-F03 (turnos), POS-F12 (autorizaciones) y POS-F13 (offline). Estado simulado en el dispositivo:
 * ninguno de estos datos existe aún en el backend.
 */
export const PosOpsPage = () => {
  const ops = useOps();
  const [tab, setTab] = useState<Tab>('turno');
  const [syncOpen, setSyncOpen] = useState(false);
  const pendingAuth = ops.authList.filter((a) => a.status === 'pendiente').length;
  const pendingOps = ops.queue.filter((o) => o.status !== 'confirmada' && o.status !== 'rechazada').length;

  return (
    <ScreenTemplate
      title="Turno y operación"
      subtitle="Simulado en este dispositivo: sin datos reales"
      actions={<ConnectivityBadge ops={ops} onOpen={() => setSyncOpen(true)} />}
    >
      <SegmentedTabs<Tab>
        ariaLabel="Secciones" variant="tabs" value={tab} onChange={setTab}
        options={[
          { value: 'turno', label: 'Turno' },
          { value: 'autorizaciones', label: 'Autorizaciones', count: pendingAuth },
          { value: 'sincronizacion', label: 'Sincronización', count: pendingOps },
          { value: 'historial', label: 'Historial' },
        ]}
      />
      <div className="po-body">
        {tab === 'turno' ? <ShiftPanel ops={ops} /> : null}
        {tab === 'autorizaciones' ? <AuthPanel ops={ops} /> : null}
        {tab === 'sincronizacion' ? <SyncPanel ops={ops} /> : null}
        {tab === 'historial' ? <HistoryPanel ops={ops} /> : null}
      </div>

      <Dialog header="Conexión y operaciones locales" visible={syncOpen} onHide={() => setSyncOpen(false)} modal style={{ width: 'min(36rem, 96vw)' }}>
        <SyncPanel ops={ops} />
      </Dialog>
    </ScreenTemplate>
  );
};
