import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSession } from '@/app/providers/SessionProvider';
import { useOnlineStatus } from '@/app/layouts/useOnlineStatus';
import * as auth from './authorization';
import * as offline from './offline';
import * as shifts from './shift';
import { useCurrentShift } from '@/shared/api/pos';
import { posAuthorizationsApi } from '@/shared/api/authorizations';
import { posSyncApi } from '@/shared/api/sync';
import { runAuthSync } from './authSync';
import { createHttpTransport } from './httpTransport';
import { createSimulatedRemote, type SimulatedOutcome } from './simulator';


/** `api`: API de capa 5 (mock); `local`: simulador con respuestas guionadas, solo para pruebas de la interfaz. */
export type ServerMode = 'api' | 'local';
import { StorageUnavailableError, createOpsStore, type KeyValueStorage } from './store';
import type { AuthRequest, AuthType, ConnectivityState, IncidentKind, OperationKind, QueuedOperation, Scope, ShiftRecord } from './types';

export type OpsOptions = { storage?: KeyValueStorage | null };

const SUPERVISOR_ROLES = ['admin', 'propietario'];

/**
 * Une la lógica pura (turnos, autorizaciones, cola) con el almacén local y el simulador remoto.
 * Todo es SIMULADO: no llama a ningún servicio. Los fallos de almacenamiento se exponen en `error` y la
 * operación NO se da por hecha.
 */
export const useOps = (options: OpsOptions = {}) => {
  const { session } = useSession();
  const browserOnline = useOnlineStatus();
  const scope: Scope = useMemo(
    () => ({ companyId: session.company.id, branchId: session.branch.id, registerId: session.register.id, terminalId: 'ter-001' }),
    [session.company.id, session.branch.id, session.register.id],
  );
  const store = useMemo(
    () => (options.storage === undefined ? createOpsStore(scope) : createOpsStore(scope, options.storage)),
    [scope, options.storage],
  );

  const sub = useCallback((l: () => void) => store.subscribe(l), [store]);
  const snapShifts = useSyncExternalStore(sub, () => store.snapshotKey('shifts'), () => '');
  const snapAuth = useSyncExternalStore(sub, () => store.snapshotKey('auth'), () => '');
  const snapQueue = useSyncExternalStore(sub, () => store.snapshotKey('queue'), () => '');
  // El snapshot (texto guardado) es la dependencia: cambia con cada escritura y fuerza la relectura.
  const shiftList = useMemo(() => store.read<ShiftRecord>('shifts'), [store, snapShifts]);
  const authList = useMemo(() => store.read<AuthRequest>('auth'), [store, snapAuth]);
  const queue = useMemo(() => store.read<QueuedOperation>('queue'), [store, snapQueue]);

  const remote = useRef(createSimulatedRemote());
  const serverShift = useCurrentShift();
  const serverShiftRef = useRef<string | undefined>(undefined);
  serverShiftRef.current = serverShift.data?.id;
  const httpTransport = useMemo(() => createHttpTransport(posSyncApi, () => serverShiftRef.current), []);
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [serverMode, setServerMode] = useState<ServerMode>('api');
  const [syncing, setSyncing] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [policyCtx, setPolicyCtx] = useState(offline.defaultPolicyContext);
  const [error, setError] = useState<string | null>(null);
  const [nextOutcome, setNextOutcome] = useState<SimulatedOutcome>('ok');
  const syncingRef = useRef(false);

  const online = browserOnline && !simulatedOffline;

  const guard = <T,>(fn: () => T): T | null => {
    try {
      setError(null);
      return fn();
    } catch (e) {
      setError(e instanceof StorageUnavailableError ? `${e.message} La operación no se realizó.` : 'No se pudo completar la operación.');
      return null;
    }
  };

  // Al abrir tras una recarga: lo que quedó "enviando" pasa a incierto, nunca se reenvía a ciegas.
  useEffect(() => {
    const raw = store.read<QueuedOperation>('queue');
    if (raw.some((o) => o.status === 'enviando')) guard(() => store.write('queue', offline.recoverInterrupted(raw)));
  }, [store]);

  const current = shifts.recoverOwnShift(shiftList, scope.registerId, session.user.id)
    ?? shiftList.find((s) => s.scope.registerId === scope.registerId && s.status !== 'cerrado') ?? null;
  const mine = current !== null && current.cashierId === session.user.id;
  const isSupervisor = SUPERVISOR_ROLES.includes(session.user.role);

  const saveShift = (next: ShiftRecord) => store.write('shifts', [...store.read<ShiftRecord>('shifts').filter((s) => s.id !== next.id), next]);
  // Autorizaciones: con el servidor en modo API se emparejan con la capa 5 cada 5 s (la UI sigue siendo local-first).
  const authBusy = useRef(false);
  const guardRef = useRef(guard);
  guardRef.current = guard;
  useEffect(() => {
    if (serverMode !== 'api' || !online) return undefined;
    const tick = async () => {
      if (authBusy.current) return;
      authBusy.current = true;
      try {
        await runAuthSync(
          posAuthorizationsApi,
          () => store.read<AuthRequest>('auth'),
          (next) => guardRef.current(() => store.write('auth', next)),
          scope,
          new Date(),
        );
      } finally {
        authBusy.current = false;
      }
    };
    void tick();
    const t = window.setInterval(() => void tick(), 5000);
    return () => window.clearInterval(t);
  }, [serverMode, online, store, scope]);

  const saveAuth = (next: AuthRequest) => store.write('auth', [...store.read<AuthRequest>('auth').filter((a) => a.id !== next.id), next]);

  const run = <T,>(result: { ok: true; value: T } | { ok: false; message: string }, then: (v: T) => void): boolean => {
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    return guard(() => (then(result.value), true)) ?? false;
  };

  const connectivity: ConnectivityState = offline.connectivityOf({
    browserOnline,
    backendReachable: simulatedOffline ? false : serverMode === 'api' ? true : remote.current.isReachable(),
    syncing,
    reconnecting,
    queue,
  });

  const heldCarts = (() => {
    try {
      const raw = window.localStorage.getItem(`pos.held.${scope.registerId}`);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  })();

  const actions = {
    /** Equivale a una apertura confirmada de POS-F02 (que hoy es simulada y no persiste). */
    startSimulatedShift: (openingCash: number) => {
      const r = shifts.startShift(
        { scope, cashierId: session.user.id, cashierName: session.user.name, openingCash, openingRef: 'pos-f02-simulada' },
        shiftList,
        new Date(),
      );
      run(r, saveShift);
    },
    pause: () => current && run(shifts.pause(current), saveShift),
    resume: (reauthId: string | null) => current && run(shifts.resume(current, reauthId), saveShift),
    handover: (input: Omit<shifts.HandoverInput, 'fromId'>, policy: shifts.HandoverPolicy) => {
      if (!current) return false;
      return run(shifts.handover(current, { ...input, fromId: session.user.id }, policy, new Date()), (o) => {
        saveShift(o.current);
        if (o.closed) saveShift(o.closed);
      });
    },
    addIncident: (kind: IncidentKind, detail: string) =>
      current && run(shifts.addIncident(current, { kind, detail, reporterId: session.user.id }, new Date()), saveShift),
    resolveIncident: (id: string) => current && run(shifts.resolveIncident(current, id, new Date()), saveShift),
    finishReview: () =>
      current
        ? shifts.reviewFinish(current, {
            heldCarts,
            pendingOperations: offline.pendingCount(queue),
            uncertainOperations: queue.filter((o) => o.status === 'incierto').length,
            pendingAuthorizations: authList.filter((a) => auth.expireIfNeeded(a, new Date()).status === 'pendiente').length,
          })
        : { blockers: [], warnings: [] },
    requestFinish: () => {
      if (!current) return false;
      const review = actions.finishReview();
      return run(shifts.requestFinish(current, review, new Date()), saveShift);
    },
    /** Simula lo que hará POS-F10 al cerrar. */
    simulateClose: () => current && run(shifts.markClosed(current, new Date()), saveShift),

    requestAuth: (input: Omit<auth.NewRequest, 'scope' | 'requesterId' | 'requesterName'>) =>
      run(auth.createRequest({ ...input, scope, requesterId: session.user.id, requesterName: session.user.name }, new Date()), saveAuth),
    decide: (id: string, decision: 'aprobada' | 'rechazada', note: string) => {
      const found = authList.find((a) => a.id === id);
      if (!found) return false;
      const approver = { id: session.user.id, name: session.user.name, canApprove: isSupervisor };
      const fn = decision === 'aprobada' ? auth.approve : auth.reject;
      return run(fn(found, approver, note, new Date()), saveAuth);
    },
    cancelAuth: (id: string) => {
      const found = authList.find((a) => a.id === id);
      return found ? run(auth.cancel(found, session.user.id, new Date()), saveAuth) : false;
    },
    executeAuth: (id: string, now: { type: AuthType; resource: { kind: string; id: string }; amount: number; proposed: Record<string, string | number> }) => {
      const found = authList.find((a) => a.id === id);
      return found ? run(auth.execute(found, session.user.id, now, new Date()), saveAuth) : false;
    },

    /** Intenta registrar una operación respetando la política; si no se puede, devuelve el motivo. */
    submitOperation: (kind: OperationKind, payload: Record<string, string | number>, idempotencyKey?: string) => {
      const decision = offline.evaluate(kind, online, { ...policyCtx, shiftValid: current !== null && current.status === 'activo' });
      if (!decision.allowed) {
        setError(decision.reason);
        return { queued: false as const, reason: decision.reason };
      }
      const done = guard(() => {
        const r = offline.enqueue(queue, { kind, scope, shiftId: current?.id ?? 'sin-turno', cashierId: session.user.id, payload, ...(idempotencyKey ? { idempotencyKey } : {}) }, new Date());
        if (!r.duplicate) store.write('queue', r.queue);
        return r;
      });
      return done ? { queued: true as const, duplicate: done.duplicate, id: done.op.id } : { queued: false as const, reason: 'No se pudo guardar localmente.' };
    },
    sync: async () => {
      if (syncingRef.current) return;
      if (!online) {
        setError('Sin conexión: la sincronización se hará al recuperarla.');
        return;
      }
      syncingRef.current = true;
      setSyncing(true);
      try {
        if (serverMode === 'local') remote.current.script(nextOutcome);
        const transport = serverMode === 'api' ? httpTransport : remote.current.transport;
        const next = await offline.syncQueue(store.read<QueuedOperation>('queue'), transport, new Date());
        guard(() => store.write('queue', next));
        setNextOutcome('ok');
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    },
    review: (id: string) => {
      const op = queue.find((o) => o.id === id);
      if (op) guard(() => store.write('queue', queue.map((o) => (o.id === id ? offline.requestReview(o, new Date()) : o))));
    },
    setSimulatedOffline: (value: boolean) => {
      if (!value && simulatedOffline) {
        setReconnecting(true);
        window.setTimeout(() => setReconnecting(false), 400);
      }
      setSimulatedOffline(value);
      remote.current.setReachable(!value);
    },
    clearError: () => setError(null),
  };

  return {
    scope, session, online, browserOnline, simulatedOffline, serverMode, setServerMode, connectivity, syncing,
    shifts: shiftList, current, mine, isSupervisor, authList, queue, heldCarts,
    policyCtx, setPolicyCtx, nextOutcome, setNextOutcome, error, remote: remote.current, actions,
  };
};

export type Ops = ReturnType<typeof useOps>;
