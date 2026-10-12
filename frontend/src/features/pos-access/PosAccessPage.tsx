import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { Shift } from '@/shared/contracts';
import { ErrorState, LoadingState, ScreenTemplate } from '@/shared/ui';
import { AccessView } from './AccessView';
import { AuthorizationDialog, OpeningReviewDialog } from './dialogs';
import type { AccessScenario } from './model';
import { OpeningView } from './OpeningView';
import { accessStatus, computeOpening, needsJustification, parseQuantity, simulatedShift, toShiftOpen } from './opening';
import { defaultDenominations, scenarios } from './scenarios';
import './pos-access.css';

type View = 'access' | 'opening';
type Outcome = 'ok' | 'error' | 'offline';
type AuthTarget = 'relief' | 'opening' | null;

const LOAD_MS = 250;
const CONFIRM_MS = 600;

const outcomeLabels: Record<Outcome, string> = {
  ok: 'Confirmación correcta',
  error: 'Error del servidor al confirmar',
  offline: 'Pérdida de conexión al confirmar',
};

/**
 * POS-F01 (acceso) y POS-F02 (apertura) con escenarios SIMULADOS en estado local.
 * No llama a ningún servicio ni abre turnos reales: el resultado es un `Shift` simulado con la forma del contrato.
 */
export const PosAccessPage = () => {
  const navigate = useNavigate();
  const [scenarioId, setScenarioId] = useState(scenarios[0]!.id);
  const [loading, setLoading] = useState(true);
  const [loadKey, setLoadKey] = useState(0);
  const [view, setView] = useState<View>('access');
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [authTarget, setAuthTarget] = useState<AuthTarget>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>('ok');
  const [sent, setSent] = useState(0);
  const [openedShift, setOpenedShift] = useState<Shift | null>(null);
  const [reliefDone, setReliefDone] = useState(false);
  const inFlight = useRef(false);

  const base = scenarios.find((s) => s.id === scenarioId)!;
  const scenario: AccessScenario = useMemo(
    () => (reliefDone && base.register ? { ...base, register: { ...base.register, occupiedBy: null } } : base),
    [base, reliefDone],
  );

  // Cambiar de escenario reinicia todo el flujo y simula una carga breve.
  useEffect(() => {
    setLoading(true);
    setView('access');
    setRaw({});
    setNote('');
    setAuthorized(false);
    setReviewOpen(false);
    setAuthTarget(null);
    setConfirmError(null);
    setOpenedShift(null);
    setReliefDone(false);
    setSubmitting(false);
    inFlight.current = false;
    const timer = window.setTimeout(() => setLoading(false), LOAD_MS);
    return () => window.clearTimeout(timer);
  }, [scenarioId, loadKey]);

  const parsed = useMemo(() => {
    const quantities: Record<string, number> = {};
    const invalid: Record<string, boolean> = {};
    for (const d of defaultDenominations) {
      const value = parseQuantity(raw[d.id] ?? '');
      if (value === null) invalid[d.id] = true;
      else quantities[d.id] = value;
    }
    return { quantities, invalid };
  }, [raw]);

  const count = computeOpening(defaultDenominations, parsed.quantities, scenario.register?.expectedOpening ?? null, note);
  const hasInvalid = Object.keys(parsed.invalid).length > 0;
  const mustJustify = needsJustification(count);
  const status = accessStatus(scenario, openedShift);

  let disabledReason: string | null = null;
  if (hasInvalid) disabledReason = 'Corrige las cantidades marcadas: deben ser enteros de 0 o más.';
  else if (mustJustify && note.trim() === '') disabledReason = 'Escribe el motivo para continuar: la base no coincide con la esperada.';

  /** Envío simulado. El cerrojo `inFlight` impide dos confirmaciones aunque se pulse dos veces seguidas. */
  const submit = () => {
    if (inFlight.current || !scenario.register) return;
    const register = scenario.register;
    inFlight.current = true;
    setSubmitting(true);
    setConfirmError(null);
    setSent((n) => n + 1);
    window.setTimeout(() => {
      inFlight.current = false;
      setSubmitting(false);
      if (outcome === 'error') {
        setConfirmError('No se pudo abrir la caja. Revisa el conteo y vuelve a intentarlo.');
        return;
      }
      if (outcome === 'offline') {
        setConfirmError('Sin conexión: no se pudo verificar la apertura. No se asumió abierta; reintenta al recuperar la conexión.');
        return;
      }
      setOpenedShift(simulatedShift(toShiftOpen(count, register), scenario.session, register, new Date()));
      setReviewOpen(false);
      setView('access');
    }, CONFIRM_MS);
  };

  const confirm = () => {
    if (inFlight.current) return;
    if (mustJustify && !authorized) setAuthTarget('opening');
    else submit();
  };

  const content = (() => {
    if (loading) return <LoadingState label="Cargando acceso…" />;
    if (scenario.loadError) {
      return <ErrorState error={new Error('No se pudo cargar el acceso a la caja.')} onRetry={() => setLoadKey((k) => k + 1)} />;
    }
    if (view === 'opening' && scenario.register) {
      return (
        <OpeningView
          scenario={scenario} denominations={defaultDenominations} raw={raw} count={count} invalid={parsed.invalid}
          authorized={authorized} submitting={submitting}
          onQuantity={(id, value) => setRaw((r) => ({ ...r, [id]: value }))}
          onNote={setNote}
          onReview={() => setReviewOpen(true)}
          onCancel={() => setView('access')}
          reviewDisabled={disabledReason !== null || submitting}
          disabledReason={disabledReason}
        />
      );
    }
    return (
      <AccessView
        scenario={scenario} status={status}
        onOpen={() => setView('opening')}
        onContinue={() => void navigate({ to: '/pos' })}
        onRelief={() => setAuthTarget('relief')}
        onBack={() => void navigate({ to: '/' })}
      />
    );
  })();

  return (
    <ScreenTemplate title="Acceso al POS" subtitle="Escenario simulado: sin datos reales">
      <div className="pa-sandbox" role="group" aria-label="Controles del escenario simulado">
        <div>
          <label htmlFor="pa-scenario" className="pa-label">Escenario</label>
          <select id="pa-scenario" className="p-inputtext" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
            {scenarios.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pa-outcome" className="pa-label">Resultado al confirmar</label>
          <select id="pa-outcome" className="p-inputtext" value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
            {(Object.keys(outcomeLabels) as Outcome[]).map((o) => <option key={o} value={o}>{outcomeLabels[o]}</option>)}
          </select>
        </div>
        <p className="pa-sandbox__note" data-testid="confirm-count">Confirmaciones enviadas: {sent}</p>
      </div>

      {openedShift ? (
        <p className="pa-hint" role="status" data-testid="opened-shift">
          Apertura simulada: base {openedShift.openingCash.toLocaleString('es-CO')} COP en {scenario.register?.name}. Compatible con{' '}
          <code>ShiftOpen</code>; no se guardó ningún dato.
        </p>
      ) : null}

      {content}

      {scenario.register ? (
        <OpeningReviewDialog
          visible={reviewOpen} count={count} registerName={scenario.register.name} loading={submitting}
          error={confirmError} onConfirm={confirm} onCancel={() => setReviewOpen(false)}
        />
      ) : null}
      <AuthorizationDialog
        visible={authTarget !== null}
        title={authTarget === 'relief' ? 'Autorizar relevo de caja' : 'Autorizar apertura con diferencia'}
        reason={authTarget === 'relief' ? 'Un supervisor debe autorizar que tomes el turno de esta caja.' : 'La base contada no coincide con la esperada.'}
        onCancel={() => setAuthTarget(null)}
        onAuthorize={() => {
          const target = authTarget;
          setAuthTarget(null);
          if (target === 'relief') setReliefDone(true);
          if (target === 'opening') {
            setAuthorized(true);
            submit();
          }
        }}
      />
    </ScreenTemplate>
  );
};
