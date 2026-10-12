import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { useEmployees } from '@/shared/api/queries';
import { EmptyState, FormDialog, MoneyInput, MoneyText, StatusTag, type StatusDef } from '@/shared/ui';
import { defaultHandoverPolicy, shouldLockForInactivity, type HandoverPolicy } from './shift';
import type { IncidentKind, ShiftRecord } from './types';
import type { Ops } from './useOps';

export const shiftStatusMap: Record<string, StatusDef> = {
  activo: { label: 'Activo', tone: 'success', icon: 'pi pi-check-circle' },
  pausado: { label: 'Pausado', tone: 'warning', icon: 'pi pi-pause' },
  finalizando: { label: 'Finalizando', tone: 'info', icon: 'pi pi-flag' },
  cerrado: { label: 'Cerrado', tone: 'neutral', icon: 'pi pi-lock' },
};

const incidentLabels: Record<IncidentKind, string> = {
  'error-operativo': 'Error operativo',
  'problema-caja': 'Problema de caja',
  dispositivo: 'Dispositivo desconectado',
  'pago-pendiente': 'Pago pendiente',
  'transferencia-por-verificar': 'Transferencia por verificar',
  'resultado-incierto': 'Operación con resultado incierto',
  conexion: 'Interrupción de conexión',
  'relevo-incompleto': 'Relevo no completado',
};

const fmt = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

/** Bloquea por inactividad: pausa el turno cuando pasa el límite sin teclado ni puntero. */
const useInactivityLock = (enabled: boolean, limitMs: number, onLock: () => void) => {
  const last = useRef(Date.now());
  const cb = useRef(onLock);
  cb.current = onLock;
  useEffect(() => {
    if (!enabled) return undefined;
    last.current = Date.now();
    const touch = () => { last.current = Date.now(); };
    window.addEventListener('keydown', touch);
    window.addEventListener('pointerdown', touch);
    const timer = window.setInterval(() => {
      if (shouldLockForInactivity(last.current, Date.now(), limitMs)) cb.current();
    }, 1000);
    return () => {
      window.removeEventListener('keydown', touch);
      window.removeEventListener('pointerdown', touch);
      window.clearInterval(timer);
    };
  }, [enabled, limitMs]);
};

type Props = { ops: Ops };

export const ShiftPanel = ({ ops }: Props) => {
  const navigate = useNavigate();
  const { current: shift, mine, actions, session } = ops;
  const [dialog, setDialog] = useState<'handover' | 'incident' | 'finish' | null>(null);
  const [limit, setLimit] = useState(300_000);

  useInactivityLock(shift?.status === 'activo' && mine, limit, () => void actions.pause());

  if (!shift) {
    return (
      <EmptyState
        title="No hay un turno activo en esta caja"
        description="El turno nace de una apertura confirmada. Abre la caja para empezar a operar."
        action={
          <div className="po-actions">
            <Button label="Ir a acceso y apertura" icon="pi pi-unlock" onClick={() => void navigate({ to: '/pos/acceso' })} />
            <Button
              label="Crear turno simulado (base $ 200.000)" outlined icon="pi pi-flask"
              onClick={() => actions.startSimulatedShift(200000)}
            />
          </div>
        }
      />
    );
  }

  return (
    <div className="po-stack">
      <section className="po-panel" aria-labelledby="po-shift">
        <header className="po-panel__head">
          <h2 id="po-shift">Turno</h2>
          <StatusTag status={shift.status} map={shiftStatusMap} />
        </header>
        <dl className="po-facts">
          <div><dt>Responsable</dt><dd>{shift.cashierName}</dd></div>
          <div><dt>Caja</dt><dd>{session.register.name}</dd></div>
          <div><dt>Terminal</dt><dd>{shift.scope.terminalId}</dd></div>
          <div><dt>Inicio</dt><dd>{fmt(shift.openedAt)}</dd></div>
          <div><dt>Base inicial</dt><dd><MoneyText value={shift.openingCash} /></dd></div>
          <div><dt>Origen</dt><dd>{shift.openingRef}</dd></div>
        </dl>
        {!mine ? <p className="po-hint" role="status">Este turno es de {shift.cashierName}. Solo quien lo tiene puede operarlo.</p> : null}
        <div className="po-actions">
          <Button label="Pausar" icon="pi pi-pause" outlined disabled={!mine || shift.status !== 'activo'} onClick={() => actions.pause()} />
          <Button label="Relevar" icon="pi pi-users" outlined disabled={!mine || shift.status !== 'activo'} onClick={() => setDialog('handover')} />
          <Button label="Registrar incidencia" icon="pi pi-exclamation-circle" outlined disabled={shift.status === 'cerrado'} onClick={() => setDialog('incident')} />
          <Button label="Finalizar turno" icon="pi pi-flag" disabled={!mine || (shift.status !== 'activo' && shift.status !== 'pausado')} onClick={() => setDialog('finish')} />
        </div>
        <div className="po-field po-field--inline">
          <label htmlFor="po-lock">Bloquear por inactividad</label>
          <select id="po-lock" className="p-inputtext" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={60_000}>1 minuto</option>
            <option value={300_000}>5 minutos</option>
            <option value={900_000}>15 minutos</option>
            <option value={0}>Nunca</option>
          </select>
        </div>
      </section>

      <section className="po-panel" aria-labelledby="po-inc">
        <h2 id="po-inc">Incidencias</h2>
        {shift.incidents.length === 0 ? <p className="po-hint">Sin incidencias en este turno.</p> : (
          <ul className="po-list">
            {shift.incidents.map((i) => (
              <li key={i.id}>
                <span><strong>{incidentLabels[i.kind]}</strong> · {fmt(i.at)}<br />{i.detail}</span>
                {i.status === 'abierta'
                  ? <Button label="Resolver" size="small" outlined onClick={() => actions.resolveIncident(i.id)} />
                  : <span className="po-hint">Resuelta</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {shift.custody.length > 0 ? (
        <section className="po-panel" aria-labelledby="po-cus">
          <h2 id="po-cus">Entregas de custodia</h2>
          <ul className="po-list">
            {shift.custody.map((c) => (
              <li key={c.id}>
                <span>
                  <strong>{c.fromName} → {c.toName}</strong> · {fmt(c.at)}<br />
                  Esperado <MoneyText value={c.expectedCash} />
                  {c.countedCash !== null ? <> · contado <MoneyText value={c.countedCash} /> · diferencia <MoneyText value={c.difference ?? 0} signed /></> : ' · sin conteo'}
                  {c.note ? <><br />{c.note}</> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <LockDialog ops={ops} shift={shift} />
      <HandoverDialog ops={ops} shift={shift} visible={dialog === 'handover'} onHide={() => setDialog(null)} />
      <IncidentDialog ops={ops} visible={dialog === 'incident'} onHide={() => setDialog(null)} />
      <FinishDialog ops={ops} shift={shift} visible={dialog === 'finish'} onHide={() => setDialog(null)} />
    </div>
  );
};

/** Pantalla bloqueada: el turno sigue abierto; se reanuda reautenticando a quien tiene la custodia. */
const LockDialog = ({ ops, shift }: { ops: Ops; shift: ShiftRecord }) => {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const locked = shift.status === 'pausado';
  useEffect(() => { if (!locked) { setCode(''); setMsg(null); } }, [locked]);
  const submit = () => {
    if (code.length < 4) return;
    const who = ops.session.user.id;
    setCode('');
    if (who !== shift.cashierId) setMsg(`Solo ${shift.cashierName} puede reanudar este turno.`);
    else ops.actions.resume(who);
  };
  return (
    <Dialog header="Terminal bloqueada" visible={locked} onHide={() => undefined} closable={false} modal style={{ width: 'min(26rem, 94vw)' }}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <p className="po-hint">El turno sigue abierto. Tus carritos y operaciones pendientes se conservan.</p>
        <label htmlFor="po-reauth" className="po-label">Código de {shift.cashierName}</label>
        <input
          id="po-reauth" className="p-inputtext w-full" type="password" inputMode="numeric" autoComplete="off" autoFocus
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <p className="po-hint">Simulación de interfaz: cualquier código de 4 o más dígitos identifica. No se guarda.</p>
        {msg ? <p className="po-error" role="alert">{msg}</p> : null}
        <div className="po-actions">
          <Button type="submit" label="Reanudar turno" icon="pi pi-play" disabled={code.length < 4} />
        </div>
      </form>
    </Dialog>
  );
};

const HandoverDialog = ({ ops, shift, visible, onHide }: { ops: Ops; shift: ShiftRecord; visible: boolean; onHide: () => void }) => {
  const employees = useEmployees();
  const [toId, setToId] = useState('');
  const [expected, setExpected] = useState<number | null>(shift.openingCash);
  const [counted, setCounted] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<HandoverPolicy['mode']>(defaultHandoverPolicy.mode);
  const [msg, setMsg] = useState<string | null>(null);

  const candidates = (employees.data ?? []).filter((e) => e.active && e.id !== ops.session.user.id);
  const to = candidates.find((e) => e.id === toId);
  const difference = counted === null || expected === null ? null : counted - expected;
  const needsAuth = difference !== null && difference !== 0;
  const approved = ops.authList.find(
    (a) => a.type === 'relevo' && a.resource.id === shift.id && a.status === 'aprobada' && a.requesterId === ops.session.user.id,
  );
  const pending = ops.authList.find((a) => a.type === 'relevo' && a.resource.id === shift.id && a.status === 'pendiente');
  const proposed = { contado: counted ?? 0 };

  const requestAuth = () => {
    const ok = ops.actions.requestAuth({
      type: 'relevo', resource: { kind: 'turno', id: shift.id }, amount: Math.abs(difference ?? 0),
      previous: { esperado: expected ?? 0 }, proposed, reason: note.trim() || 'Diferencia en el relevo',
    });
    setMsg(ok ? 'Solicitud enviada al supervisor. Vuelve cuando esté aprobada.' : null);
  };

  const submit = () => {
    if (!to || expected === null) return;
    if (needsAuth && approved) {
      const executed = ops.actions.executeAuth(approved.id, { type: 'relevo', resource: { kind: 'turno', id: shift.id }, amount: Math.abs(difference ?? 0), proposed });
      if (!executed) return;
    }
    const done = ops.actions.handover(
      { toId: to.id, toName: to.name, expectedCash: expected, countedCash: counted, note, authorizationId: approved?.id ?? null },
      { requireCount: true, mode },
    );
    if (done) onHide();
  };

  return (
    <FormDialog
      visible={visible} title="Relevar la caja" onHide={onHide} onSubmit={submit} submitLabel="Confirmar relevo"
      submitDisabled={!to || counted === null || (needsAuth && !approved) || (needsAuth && note.trim() === '')}
      error={ops.error}
    >
      <div className="po-field"><span className="po-label">Entrega</span><strong>{shift.cashierName}</strong></div>
      <div className="po-field">
        <label htmlFor="po-to" className="po-label">Recibe</label>
        <select id="po-to" className="p-inputtext w-full" value={toId} onChange={(e) => setToId(e.target.value)}>
          <option value="">Elige a la persona</option>
          {candidates.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      <div className="po-field">
        <label htmlFor="po-expected" className="po-label">Efectivo esperado (simulado)</label>
        <MoneyInput id="po-expected" value={expected} onChange={setExpected} aria-label="Efectivo esperado" />
      </div>
      <div className="po-field">
        <label htmlFor="po-counted" className="po-label">Efectivo contado</label>
        <MoneyInput id="po-counted" value={counted} onChange={setCounted} aria-label="Efectivo contado" />
      </div>
      <div className="po-field" aria-live="polite">
        <span className="po-label">Diferencia</span>
        {difference === null ? '—' : <MoneyText value={difference} signed strong />}
      </div>
      <div className="po-field">
        <label htmlFor="po-mode" className="po-label">Política del relevo</label>
        <select id="po-mode" className="p-inputtext w-full" value={mode} onChange={(e) => setMode(e.target.value as HandoverPolicy['mode'])}>
          <option value="transferir">Transferir custodia (mismo turno)</option>
          <option value="cerrar-e-iniciar">Cerrar este turno e iniciar otro</option>
        </select>
      </div>
      <div className="po-field">
        <label htmlFor="po-note" className="po-label">{needsAuth ? 'Motivo de la diferencia (obligatorio)' : 'Observaciones (opcional)'}</label>
        <textarea id="po-note" className="p-inputtext w-full" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {needsAuth ? (
        <div className="po-field">
          {approved ? <p className="po-ok" role="status">Autorización aprobada por {approved.decidedByName}.</p>
            : pending ? <p className="po-hint" role="status">Autorización pendiente del supervisor.</p>
            : <Button type="button" label="Solicitar autorización al supervisor" icon="pi pi-shield" outlined disabled={note.trim() === ''} onClick={requestAuth} />}
          {msg ? <p className="po-hint" role="status">{msg}</p> : null}
        </div>
      ) : null}
    </FormDialog>
  );
};

const IncidentDialog = ({ ops, visible, onHide }: { ops: Ops; visible: boolean; onHide: () => void }) => {
  const [kind, setKind] = useState<IncidentKind>('error-operativo');
  const [detail, setDetail] = useState('');
  return (
    <FormDialog
      visible={visible} title="Registrar incidencia" onHide={onHide} submitLabel="Registrar" submitDisabled={detail.trim() === ''}
      onSubmit={() => { if (ops.actions.addIncident(kind, detail)) { setDetail(''); onHide(); } }} error={ops.error}
    >
      <div className="po-field">
        <label htmlFor="po-kind" className="po-label">Tipo</label>
        <select id="po-kind" className="p-inputtext w-full" value={kind} onChange={(e) => setKind(e.target.value as IncidentKind)}>
          {(Object.keys(incidentLabels) as IncidentKind[]).map((k) => <option key={k} value={k}>{incidentLabels[k]}</option>)}
        </select>
      </div>
      <div className="po-field">
        <label htmlFor="po-detail" className="po-label">Qué pasó</label>
        <textarea id="po-detail" className="p-inputtext w-full" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} />
      </div>
    </FormDialog>
  );
};

const FinishDialog = ({ ops, shift, visible, onHide }: { ops: Ops; shift: ShiftRecord; visible: boolean; onHide: () => void }) => {
  const navigate = useNavigate();
  const review = ops.actions.finishReview();
  const finishing = shift.status === 'finalizando';
  return (
    <Dialog header="Finalizar turno" visible={visible} onHide={onHide} modal style={{ width: 'min(32rem, 94vw)' }}>
      {review.blockers.length > 0 ? (
        <ul className="po-list po-list--alert" aria-label="Impide finalizar">
          {review.blockers.map((b) => <li key={b}>{b}</li>)}
        </ul>
      ) : null}
      {review.warnings.length > 0 ? (
        <ul className="po-list" aria-label="Se conserva para conciliación">
          {review.warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      ) : null}
      {review.blockers.length === 0 && review.warnings.length === 0 ? <p className="po-hint">No hay operaciones abiertas.</p> : null}
      <p className="po-hint">El arqueo y el cierre de caja se hacen en el flujo de cierre (POS-F10); aquí solo se solicita.</p>
      {ops.error ? <p className="po-error" role="alert">{ops.error}</p> : null}
      <div className="po-actions">
        <Button label="Volver" outlined onClick={onHide} />
        {finishing ? (
          <>
            <Button label="Ir a arqueo y cierre" icon="pi pi-arrow-right" onClick={() => void navigate({ to: '/pos' })} />
            <Button label="Simular cierre" outlined icon="pi pi-flask" onClick={() => { ops.actions.simulateClose(); onHide(); }} />
          </>
        ) : (
          <Button label="Solicitar finalización" icon="pi pi-flag" disabled={review.blockers.length > 0} onClick={() => ops.actions.requestFinish()} />
        )}
      </div>
    </Dialog>
  );
};
