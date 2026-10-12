import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { EmptyState, StatusTag, type StatusDef } from '@/shared/ui';
import { canRetry, evaluate, offlineMatrix } from './offline';
import { outcomeLabels, type SimulatedOutcome } from './simulator';
import type { ConnectivityState, OperationKind, QueueStatus } from './types';
import type { Ops } from './useOps';

export const connectivityMap: Record<ConnectivityState, StatusDef & { text: string }> = {
  sincronizado: { label: 'Conectado', text: 'Todo sincronizado', tone: 'success', icon: 'pi pi-wifi' },
  pendientes: { label: 'Pendientes', text: 'Conectado con operaciones por sincronizar', tone: 'info', icon: 'pi pi-sync' },
  'sin-conexion': { label: 'Sin conexión', text: 'Trabajando sin conexión', tone: 'warning', icon: 'pi pi-ban' },
  reconectando: { label: 'Reconectando', text: 'Recuperando la conexión', tone: 'info', icon: 'pi pi-spin pi-spinner' },
  sincronizando: { label: 'Sincronizando', text: 'Enviando operaciones', tone: 'info', icon: 'pi pi-spin pi-sync' },
  'con-errores': { label: 'Atención requerida', text: 'Hay operaciones que requieren revisión', tone: 'danger', icon: 'pi pi-exclamation-triangle' },
  incierto: { label: 'Resultado incierto', text: 'No se sabe si el servidor aplicó una operación', tone: 'warning', icon: 'pi pi-question-circle' },
};

const queueMap: Record<QueueStatus, StatusDef> = {
  pendiente: { label: 'Pendiente', tone: 'info', icon: 'pi pi-clock' },
  enviando: { label: 'Enviando', tone: 'info', icon: 'pi pi-sync' },
  confirmada: { label: 'Confirmada', tone: 'success', icon: 'pi pi-check' },
  reintentable: { label: 'Reintentable', tone: 'warning', icon: 'pi pi-refresh' },
  rechazada: { label: 'Rechazada', tone: 'danger', icon: 'pi pi-times' },
  revision: { label: 'Requiere revisión', tone: 'danger', icon: 'pi pi-flag' },
  incierto: { label: 'Resultado incierto', tone: 'warning', icon: 'pi pi-question-circle' },
};

/** Indicador discreto de conexión; al activarlo abre el panel de sincronización. */
export const ConnectivityBadge = ({ ops, onOpen }: { ops: Ops; onOpen: () => void }) => {
  const c = connectivityMap[ops.connectivity];
  const pending = ops.queue.filter((o) => o.status !== 'confirmada' && o.status !== 'rechazada').length;
  return (
    <button type="button" className={`po-badge po-badge--${c.tone}`} onClick={onOpen} data-testid="connectivity" data-state={ops.connectivity}>
      <i className={c.icon} aria-hidden="true" />
      <span>{c.label}{pending > 0 ? ` · ${pending}` : ''}</span>
    </button>
  );
};

const sampleOps: { kind: OperationKind; label: string }[] = [
  { kind: 'venta-efectivo', label: 'Venta en efectivo' },
  { kind: 'movimiento-efectivo', label: 'Movimiento de efectivo' },
  { kind: 'cobro-tarjeta', label: 'Cobro con tarjeta' },
  { kind: 'verificar-transferencia', label: 'Verificar transferencia' },
  { kind: 'credito-nuevo', label: 'Crédito nuevo' },
];

export const SyncPanel = ({ ops }: { ops: Ops }) => {
  const [detailId, setDetailId] = useState<string | null>(null);
  const [counter, setCounter] = useState(1);
  const c = connectivityMap[ops.connectivity];
  const detail = ops.queue.find((o) => o.id === detailId) ?? null;

  return (
    <div className="po-stack">
      <section className="po-panel" aria-labelledby="po-conn">
        <header className="po-panel__head">
          <h2 id="po-conn">Conexión y sincronización</h2>
          <StatusTag status={ops.connectivity} map={connectivityMap} />
        </header>
        <p role="status" data-testid="connectivity-text">{c.text}.</p>
        {ops.error ? <p className="po-error" role="alert" data-testid="ops-error">{ops.error}</p> : null}
        <div className="po-actions">
          <Button label="Sincronizar ahora" icon="pi pi-sync" disabled={ops.syncing || ops.queue.length === 0} onClick={() => void ops.actions.sync()} />
        </div>
      </section>

      <section className="po-panel" aria-labelledby="po-queue">
        <h2 id="po-queue">Operaciones locales</h2>
        {ops.queue.length === 0 ? <EmptyState title="Nada por sincronizar" description="Lo que hagas sin conexión aparecerá aquí." /> : (
          <div className="app-table-scroll" role="region" aria-label="Cola de operaciones" tabIndex={0}>
            <table className="po-table">
              <thead><tr><th scope="col">Operación</th><th scope="col">Estado</th><th scope="col" className="po-num">Intentos</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {ops.queue.map((o) => (
                  <tr key={o.id} data-testid={`queue-${o.idempotencyKey}`}>
                    <td>{offlineMatrix[o.kind].label}</td>
                    <td><StatusTag status={o.status} map={queueMap} /></td>
                    <td className="po-num">{o.attempts}</td>
                    <td><Button label="Detalle" size="small" outlined aria-label={`Detalle de ${offlineMatrix[o.kind].label}`} onClick={() => setDetailId(o.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="po-panel" aria-labelledby="po-sim">
        <h2 id="po-sim">Simulador (solo pruebas)</h2>
        <p className="po-hint">No es un servicio real: reproduce la conexión y las respuestas del servidor para probar la interfaz.</p>
        <div className="po-field po-field--inline">
          <input id="po-off" type="checkbox" checked={ops.simulatedOffline} onChange={(e) => ops.actions.setSimulatedOffline(e.target.checked)} />
          <label htmlFor="po-off">Simular que no hay conexión</label>
        </div>
        <div className="po-field po-field--inline">
          <input
            id="po-offcash" type="checkbox" checked={ops.policyCtx.offlineCashSalesEnabled && ops.policyCtx.fiscalOfflineValidated}
            onChange={(e) => ops.setPolicyCtx({ ...ops.policyCtx, offlineCashSalesEnabled: e.target.checked, fiscalOfflineValidated: e.target.checked })}
          />
          <label htmlFor="po-offcash">Habilitar venta en efectivo offline (política y fiscal validados)</label>
        </div>
        <div className="po-field">
          <label htmlFor="po-outcome" className="po-label">Próxima respuesta del servidor</label>
          <select id="po-outcome" className="p-inputtext w-full" value={ops.nextOutcome} onChange={(e) => ops.setNextOutcome(e.target.value as SimulatedOutcome)}>
            {(Object.keys(outcomeLabels) as SimulatedOutcome[]).map((k) => <option key={k} value={k}>{outcomeLabels[k]}</option>)}
          </select>
        </div>
        <p className="po-label">Registrar una operación</p>
        <div className="po-actions">
          {sampleOps.map((s) => {
            const decision = evaluate(s.kind, ops.online, { ...ops.policyCtx, shiftValid: ops.current?.status === 'activo' });
            return (
              <Button
                key={s.kind} label={s.label} outlined size="small" aria-disabled={!decision.allowed || undefined}
                onClick={() => {
                  ops.actions.submitOperation(s.kind, { total: 2800, ref: counter }, `${s.kind}-${counter}`);
                  setCounter((n) => n + 1);
                }}
              />
            );
          })}
        </div>
        <details className="po-details">
          <summary>Política de operaciones sin conexión</summary>
          <ul className="po-list">
            {(Object.keys(offlineMatrix) as OperationKind[]).map((k) => (
              <li key={k}><span><strong>{offlineMatrix[k].label}</strong> · {offlineMatrix[k].mode}<br />{offlineMatrix[k].why}</span></li>
            ))}
          </ul>
        </details>
      </section>

      {detail ? (
        <Dialog header={offlineMatrix[detail.kind].label} visible onHide={() => setDetailId(null)} modal style={{ width: 'min(30rem, 94vw)' }}>
          <dl className="po-facts">
            <div><dt>Estado</dt><dd><StatusTag status={detail.status} map={queueMap} /></dd></div>
            <div><dt>Clave de idempotencia</dt><dd>{detail.idempotencyKey}</dd></div>
            <div><dt>Intentos</dt><dd>{detail.attempts}</dd></div>
            <div><dt>Referencia remota</dt><dd>{detail.remoteRef ?? '—'}</dd></div>
            <div><dt>Último error</dt><dd>{detail.lastError ?? '—'}</dd></div>
          </dl>
          <div className="po-actions">
            <Button label="Reintentar" icon="pi pi-refresh" disabled={!canRetry(detail) || ops.syncing} onClick={() => void ops.actions.sync()} />
            <Button label="Solicitar revisión" outlined disabled={detail.status === 'confirmada' || detail.status === 'revision'} onClick={() => ops.actions.review(detail.id)} />
          </div>
        </Dialog>
      ) : null}
    </div>
  );
};
