import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { Shift } from '@/shared/contracts';
import { ErrorState, LoadingState, ScreenTemplate } from '@/shared/ui';
import { AccessView } from './AccessView';
import { AuthorizationDialog, OpeningReviewDialog } from './dialogs';
import type { AccessScenario } from './model';
import { OpeningView } from './OpeningView';
import { accessStatus, computeOpening, needsJustification, parseQuantity, simulatedShift, toShiftOpen } from './opening';
import { defaultDenominations, scenarios } from './scenarios';
import { ApiError } from '@/shared/api/client';
import { useI18n } from '@/app/i18n/I18nProvider';
import { useAccessData } from './useAccessData';
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
 * POS-F01 (acceso) y POS-F02 (apertura). Fuente REAL (v0.7.0): caja y turno desde `GET /pos/registers` y
 * `GET /pos/shifts/current`; la apertura llama a `POST /pos/shifts`. Los escenarios solo existen con `?escenario=<id>`
 * para pruebas de la interfaz; no son la fuente de verdad.
 */
export const PosAccessPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const data = useAccessData();
  const { escenario } = useSearch({ from: '/pos/acceso' });
  const simulated = escenario !== undefined && scenarios.some((s) => s.id === escenario);
  const [scenarioId, setScenarioId] = useState(simulated ? escenario! : scenarios[0]!.id);
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

  const base: AccessScenario = useMemo(() => {
    if (simulated) return scenarios.find((s) => s.id === scenarioId)!;
    return {
      id: 'real',
      label: 'Datos reales',
      session: data.session,
      terminal: data.terminal,
      register: data.register,
      activeShift: data.activeShift,
      loadError: data.error !== null,
    };
  }, [simulated, scenarioId, data.session, data.terminal, data.register, data.activeShift, data.error]);
  const scenario: AccessScenario = useMemo(
    () => (reliefDone && base.register ? { ...base, register: { ...base.register, occupiedBy: null } } : base),
    [base, reliefDone],
  );
  const denominations = simulated ? defaultDenominations : data.denominations;

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
    for (const d of denominations) {
      const value = parseQuantity(raw[d.id] ?? '');
      if (value === null) invalid[d.id] = true;
      else quantities[d.id] = value;
    }
    return { quantities, invalid };
  }, [raw]);

  const count = computeOpening(denominations, parsed.quantities, scenario.register?.expectedOpening ?? null, note);
  const hasInvalid = Object.keys(parsed.invalid).length > 0;
  const mustJustify = needsJustification(count);
  const status = accessStatus(scenario, openedShift);

  let disabledReason: string | null = null;
  if (hasInvalid) disabledReason = 'Corrige las cantidades marcadas: deben ser enteros de 0 o más.';
  else if (mustJustify && note.trim() === '') disabledReason = 'Escribe el motivo para continuar: la base no coincide con la esperada.';

  /** Envío. Real: `POST /pos/shifts`. Escenario de prueba: respuesta guionada (outcome), sin servidor. */
  const submit = () => {
    if (inFlight.current || !scenario.register) return;
    const register = scenario.register;
    inFlight.current = true;
    setSubmitting(true);
    setConfirmError(null);
    setSent((n) => n + 1);
    const finish = (shift: Shift) => {
      inFlight.current = false;
      setSubmitting(false);
      setOpenedShift(shift);
      setReviewOpen(false);
      setView('access');
    };
    const fail = (message: string) => {
      inFlight.current = false;
      setSubmitting(false);
      setConfirmError(message);
    };
    if (simulated) {
      window.setTimeout(() => {
        if (outcome === 'error') return fail('No se pudo abrir la caja. Revisa el conteo y vuelve a intentarlo.');
        if (outcome === 'offline') {
          return fail('Sin conexión: no se pudo verificar la apertura. No se asumió abierta; reintenta al recuperar la conexión.');
        }
        finish(simulatedShift(toShiftOpen(count, register), scenario.session, register, new Date()));
      }, CONFIRM_MS);
      return;
    }
    data.openShift.mutate(toShiftOpen(count, register), {
      onSuccess: (shift) => finish(shift),
      onError: (error) => fail(
        error instanceof ApiError && error.code === 'SHIFT_ALREADY_OPEN'
          ? 'La caja ya tiene un turno abierto. Actualiza el acceso.'
          : 'No se pudo abrir la caja. Revisa el conteo y vuelve a intentarlo.',
      ),
    });
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
          scenario={scenario} denominations={denominations} raw={raw} count={count} invalid={parsed.invalid}
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
    <ScreenTemplate title={t('access.title')} subtitle={simulated ? t('access.subtitle.sandbox') : `${data.session.branchName} · ${scenario.register?.name ?? 'sin caja'}`}>
      {simulated ? (
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
      ) : null}

      {openedShift ? (
        <p className="pa-hint" role="status" data-testid="opened-shift">
          Turno abierto en {scenario.register?.name}: base {openedShift.openingCash.toLocaleString('es-CO')} COP.
          {simulated ? ' (escenario de prueba; no se guardó en el servidor).' : ''}
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
