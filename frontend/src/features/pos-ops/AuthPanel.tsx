import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { EmptyState, FormDialog, MoneyInput, MoneyText, SegmentedTabs, StatusTag, type StatusDef } from '@/shared/ui';
import { authTypeLabels, expireIfNeeded, summarize } from './authorization';
import type { AuthRequest, AuthStatus, AuthType } from './types';
import type { Ops } from './useOps';

export const authStatusMap: Record<string, StatusDef> = {
  pendiente: { label: 'Pendiente', tone: 'warning', icon: 'pi pi-clock' },
  aprobada: { label: 'Aprobada', tone: 'success', icon: 'pi pi-check' },
  rechazada: { label: 'Rechazada', tone: 'danger', icon: 'pi pi-times' },
  vencida: { label: 'Vencida', tone: 'neutral', icon: 'pi pi-history' },
  cancelada: { label: 'Cancelada', tone: 'neutral', icon: 'pi pi-ban' },
  ejecutada: { label: 'Ejecutada', tone: 'info', icon: 'pi pi-check-circle' },
};

type Filter = 'pendiente' | 'aprobada' | 'rechazada' | 'vencida';
const waited = (iso: string) => {
  const min = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60_000));
  return min < 1 ? 'ahora' : `${min} min`;
};

export const AuthPanel = ({ ops }: { ops: Ops }) => {
  const [filter, setFilter] = useState<Filter>('pendiente');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { isSupervisor, session } = ops;
  const now = new Date();

  const visible = useMemo(
    () => ops.authList.map((a) => expireIfNeeded(a, new Date())).filter((a) => isSupervisor || a.requesterId === session.user.id),
    [ops.authList, isSupervisor, session.user.id],
  );
  const count = (s: AuthStatus[]) => visible.filter((a) => s.includes(a.status)).length;
  const rows = visible
    .filter((a) => (filter === 'aprobada' ? a.status === 'aprobada' || a.status === 'ejecutada' : a.status === filter || (filter === 'vencida' && a.status === 'cancelada')))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const alerts = summarize(visible, now);
  const open = visible.find((a) => a.id === openId) ?? null;

  return (
    <div className="po-stack">
      <section className="po-panel" aria-labelledby="po-auth">
        <header className="po-panel__head">
          <h2 id="po-auth">{isSupervisor ? 'Bandeja de autorizaciones' : 'Mis solicitudes'}</h2>
          {!isSupervisor ? <Button label="Nueva solicitud" icon="pi pi-plus" onClick={() => setCreating(true)} /> : null}
        </header>
        {isSupervisor && alerts.slow > 0 ? <p className="po-hint" role="status">{alerts.slow} solicitud(es) llevan más de 5 minutos esperando.</p> : null}
        <SegmentedTabs<Filter>
          ariaLabel="Estado de las solicitudes" variant="chips" value={filter} onChange={setFilter}
          options={[
            { value: 'pendiente', label: 'Pendientes', count: count(['pendiente']) },
            { value: 'aprobada', label: 'Aprobadas', count: count(['aprobada', 'ejecutada']) },
            { value: 'rechazada', label: 'Rechazadas', count: count(['rechazada']) },
            { value: 'vencida', label: 'Vencidas', count: count(['vencida', 'cancelada']) },
          ]}
        />
        {rows.length === 0 ? (
          <EmptyState title="Sin solicitudes aquí" description={isSupervisor ? 'Cuando un cajero pida una excepción aparecerá en esta bandeja.' : 'Si necesitas una excepción, crea una solicitud y sigue trabajando.'} />
        ) : (
          <div className="app-table-scroll" role="region" aria-label="Solicitudes" tabIndex={0}>
            <table className="po-table">
              <thead>
                <tr><th scope="col">Operación</th><th scope="col">Solicitante</th><th scope="col" className="po-num">Importe</th><th scope="col">Espera</th><th scope="col">Estado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} data-testid={`auth-row-${a.id}`}>
                    <td>{authTypeLabels[a.type]}</td>
                    <td>{a.requesterName}</td>
                    <td className="po-num"><MoneyText value={a.amount} /></td>
                    <td>{waited(a.createdAt)}</td>
                    <td><StatusTag status={a.status} map={authStatusMap} /></td>
                    <td><Button label="Abrir" size="small" outlined aria-label={`Abrir solicitud de ${authTypeLabels[a.type]} de ${a.requesterName}`} onClick={() => setOpenId(a.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <NewRequestDialog ops={ops} visible={creating} onHide={() => setCreating(false)} />
      {open ? <DetailDialog ops={ops} request={open} onHide={() => setOpenId(null)} /> : null}
    </div>
  );
};

const NewRequestDialog = ({ ops, visible, onHide }: { ops: Ops; visible: boolean; onHide: () => void }) => {
  const [type, setType] = useState<AuthType>('descuento');
  const [amount, setAmount] = useState<number | null>(null);
  const [prev, setPrev] = useState('');
  const [next, setNext] = useState('');
  const [reason, setReason] = useState('');
  const [resource, setResource] = useState('carrito-1');

  const submit = () => {
    const ok = ops.actions.requestAuth({
      type, amount: amount ?? 0, reason, resource: { kind: type === 'relevo' ? 'turno' : 'operacion', id: resource },
      previous: { valor: prev }, proposed: { valor: next },
    });
    if (ok) { setReason(''); setAmount(null); setPrev(''); setNext(''); onHide(); }
  };

  return (
    <FormDialog
      visible={visible} title="Solicitar autorización" onHide={onHide} onSubmit={submit} submitLabel="Enviar solicitud"
      submitDisabled={reason.trim() === '' || amount === null} error={ops.error}
    >
      <p className="po-hint">Tu trabajo se conserva mientras el supervisor decide.</p>
      <div className="po-field">
        <label htmlFor="po-type" className="po-label">Operación</label>
        <select id="po-type" className="p-inputtext w-full" value={type} onChange={(e) => setType(e.target.value as AuthType)}>
          {(Object.keys(authTypeLabels) as AuthType[]).map((t) => <option key={t} value={t}>{authTypeLabels[t]}</option>)}
        </select>
      </div>
      <div className="po-field">
        <label htmlFor="po-resource" className="po-label">Referencia (carrito, venta o turno)</label>
        <input id="po-resource" className="p-inputtext w-full" value={resource} onChange={(e) => setResource(e.target.value)} />
      </div>
      <div className="po-field">
        <label htmlFor="po-amount" className="po-label">Importe</label>
        <MoneyInput id="po-amount" value={amount} onChange={setAmount} aria-label="Importe" />
      </div>
      <div className="po-field po-field--row">
        <div><label htmlFor="po-prev" className="po-label">Valor actual</label><input id="po-prev" className="p-inputtext w-full" value={prev} onChange={(e) => setPrev(e.target.value)} /></div>
        <div><label htmlFor="po-next" className="po-label">Valor solicitado</label><input id="po-next" className="p-inputtext w-full" value={next} onChange={(e) => setNext(e.target.value)} /></div>
      </div>
      <div className="po-field">
        <label htmlFor="po-reason" className="po-label">Motivo</label>
        <textarea id="po-reason" className="p-inputtext w-full" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </FormDialog>
  );
};

const DetailDialog = ({ ops, request, onHide }: { ops: Ops; request: AuthRequest; onHide: () => void }) => {
  const [note, setNote] = useState('');
  const [currentAmount, setCurrentAmount] = useState<number | null>(request.amount);
  const mine = request.requesterId === ops.session.user.id;
  const canDecide = ops.isSupervisor && request.status === 'pendiente' && !mine;

  return (
    <Dialog header={authTypeLabels[request.type]} visible onHide={onHide} modal style={{ width: 'min(34rem, 94vw)' }}>
      <dl className="po-facts">
        <div><dt>Solicitante</dt><dd>{request.requesterName}</dd></div>
        <div><dt>Estado</dt><dd><StatusTag status={request.status} map={authStatusMap} /></dd></div>
        <div><dt>Importe</dt><dd><MoneyText value={request.amount} strong /></dd></div>
        <div><dt>Recurso</dt><dd>{request.resource.kind}: {request.resource.id}</dd></div>
        <div><dt>Valor actual</dt><dd>{String(request.previous.valor ?? '—')}</dd></div>
        <div><dt>Valor solicitado</dt><dd>{String(request.proposed.valor ?? request.proposed.contado ?? '—')}</dd></div>
        <div><dt>Motivo</dt><dd>{request.reason}</dd></div>
        {request.decidedByName ? <div><dt>Decidió</dt><dd>{request.decidedByName}{request.decisionNote ? ` · ${request.decisionNote}` : ''}</dd></div> : null}
      </dl>
      {ops.error ? <p className="po-error" role="alert">{ops.error}</p> : null}

      {canDecide ? (
        <>
          <label htmlFor="po-decision" className="po-label">Observación (obligatoria si rechazas)</label>
          <textarea id="po-decision" className="p-inputtext w-full" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="po-actions">
            <Button label="Rechazar" severity="danger" outlined icon="pi pi-times" onClick={() => ops.actions.decide(request.id, 'rechazada', note) && onHide()} />
            <Button label="Aprobar" icon="pi pi-check" onClick={() => ops.actions.decide(request.id, 'aprobada', note) && onHide()} />
          </div>
        </>
      ) : null}

      {ops.isSupervisor && mine && request.status === 'pendiente' ? (
        <p className="po-hint" role="status">No puedes decidir tu propia solicitud: la decide otra persona con permiso.</p>
      ) : null}

      {mine && request.status === 'aprobada' ? (
        <>
          <div className="po-field">
            <label htmlFor="po-now" className="po-label">Importe actual de la operación</label>
            <MoneyInput id="po-now" value={currentAmount} onChange={setCurrentAmount} aria-label="Importe actual de la operación" />
            <p className="po-hint">Si cambia respecto a lo aprobado, la autorización deja de valer.</p>
          </div>
          <div className="po-actions">
            <Button
              label="Aplicar autorización" icon="pi pi-check-circle"
              onClick={() => ops.actions.executeAuth(request.id, { type: request.type, resource: request.resource, amount: currentAmount ?? 0, proposed: request.proposed }) && onHide()}
            />
          </div>
        </>
      ) : null}

      {mine && request.status === 'pendiente' ? (
        <div className="po-actions"><Button label="Cancelar solicitud" outlined onClick={() => ops.actions.cancelAuth(request.id) && onHide()} /></div>
      ) : null}

      <h3 className="po-subtitle">Historial</h3>
      <ul className="po-list" aria-label="Auditoría de la solicitud">
        {request.audit.map((e, i) => (
          <li key={`${e.at}-${i}`}><span>{new Date(e.at).toLocaleTimeString('es-CO')} · <strong>{e.event}</strong> {e.detail ? `· ${e.detail}` : ''}</span></li>
        ))}
      </ul>
    </Dialog>
  );
};
