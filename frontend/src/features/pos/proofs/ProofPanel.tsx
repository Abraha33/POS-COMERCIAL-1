import { useEffect, useMemo, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import { Button } from 'primereact/button';
import { useSession } from '@/app/providers/SessionProvider';
import { useEmployees } from '@/shared/api/queries';
import { formatMoney } from '@/shared/utils/format';
import { getProofGateway } from './gateway';
import { fileToEvidence } from './image';
import { proofStatusLabel, type ProofRequest, type ProofStatus } from './proofs';
import { useProof } from './useProof';
import './proofs.css';

type Props = {
  operationId: string;
  method: string;
  channelId: string;
  channelLabel: string;
  amount: number;
  destination: string;
  employee: string;
  /** Persona que opera en el computador (queda en la trazabilidad). */
  actor: string;
  /** Solo propietario/administrador: autoriza vender sin pago confirmado y puede verificar. */
  canAuthorizeException: boolean;
  proofId: string | null;
  onProofId: (id: string | null) => void;
  onProof: (proof: ProofRequest | null) => void;
};

const toneOf: Record<ProofStatus, string> = {
  esperando: 'warning', recibido: 'info', enviado: 'info', verificando: 'info', confirmado: 'success', rechazado: 'danger',
  excepcion: 'warning', vencido: 'danger',
};

const qrUrl = (text: string): string => {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createDataURL(5, 2);
};

const errorText = (e: unknown): string => (e instanceof Error ? e.message : 'No se pudo completar la operación.');

/**
 * Solicitud, captura y verificación del comprobante de un pago digital (D-005).
 * Varias fotos con vista previa y "Repetir"; "Enviar" pasa la verificación al responsable de la cuenta, que verifica desde
 * su propia app (o un supervisor). La foto es evidencia; confirmar es humano.
 */
export const ProofPanel = (props: Props) => {
  const { operationId, method, channelId, channelLabel, amount, destination, employee, actor, canAuthorizeException, proofId, onProofId, onProof } = props;
  const { session } = useSession();
  const employees = useEmployees();
  const { proof, setProof, lost } = useProof(proofId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [verifierId, setVerifierId] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => onProof(proof), [proof, onProof]);

  const link = proof ? `${window.location.origin}/captura/${proof.token}` : '';
  const qr = useMemo(() => (link ? qrUrl(link) : ''), [link]);
  const responsibles = (employees.data ?? []).filter((e) => e.active);

  const run = async (action: () => Promise<ProofRequest>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await action();
      setProof(next);
      onProofId(next.id);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const gw = getProofGateway();
  const request = () =>
    run(() => gw.create({ operationId, method, channelId, channelLabel, amount, destination, employee: employee || actor }));
  const attach = async (file: File | undefined) => {
    if (!file || !proof) return;
    try {
      const image = await fileToEvidence(file);
      await run(() => gw.submitLocal(proof.id, image, actor));
    } catch (e) {
      setError(errorText(e));
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError('No se pudo copiar. Selecciona el enlace y cópialo manualmente.');
    }
  };

  const status = proof?.status ?? null;
  const awaiting = proof !== null && (status === 'esperando' || status === 'rechazado');
  const previewing = proof !== null && status === 'recibido';
  const inReview = proof !== null && (status === 'enviado' || status === 'verificando');
  // Verifica el responsable asignado o un supervisor; el cajero que solicitó solo espera.
  const canVerify = proof !== null && (canAuthorizeException || proof.verifierId === session.user.id);
  const verifierName = proof?.verifierId ? (employees.data ?? []).find((e) => e.id === proof.verifierId)?.name ?? proof.verifierId : '';

  const photos = proof?.photos ?? [];
  const photoGrid = photos.length > 0 ? (
    <ul className="proof__photos" aria-label="Fotos del comprobante">
      {photos.map((photo, index) => (
        <li key={photo.id}>
          {photo.image ? (
            <img className="proof__photo" src={photo.image} alt={`Foto ${index + 1} del comprobante`} />
          ) : (
            <p className="pos__hint">Foto {index + 1} no disponible en este equipo.</p>
          )}
          {previewing ? (
            <Button type="button" label={`Repetir foto ${index + 1}`} icon="pi pi-trash" text severity="danger" disabled={busy}
              onClick={() => void run(() => gw.removePhoto(proof!.id, photo.id, actor))} />
          ) : null}
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <section className="proof" aria-label="Comprobante de pago">
      <div className="proof__head">
        <strong>Comprobante</strong>
        <span className={`proof__badge proof__badge--${status ? toneOf[status] : 'neutral'}`} role="status" data-testid="proof-status">
          {status ? proofStatusLabel[status] : 'Sin solicitar'}
        </span>
      </div>

      {proof === null ? (
        <>
          <p className="pos__hint">
            Pide la foto del comprobante al teléfono del empleado o adjúntala aquí. Puedes agregar varias fotos. La foto es
            evidencia: el pago se confirma solo después de verificar el ingreso.
          </p>
          <Button type="button" label="Solicitar comprobante al celular" icon="pi pi-mobile" onClick={() => void request()} loading={busy} />
        </>
      ) : null}

      {awaiting ? (
        <div className="proof__request">
          <img className="proof__qr" src={qr} alt="Código QR para abrir la captura en el teléfono" width={160} height={160} />
          <div className="proof__actions">
            <p className="pos__hint">
              Escanea el QR con el teléfono del empleado. El enlace es solo para esta venta y vence en 15 minutos.
            </p>
            <label className="proof__link">
              <span className="proof__label">Enlace de captura</span>
              <input className="p-inputtext" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
            </label>
            <div className="proof__row">
              <Button type="button" label={copied ? 'Enlace copiado' : 'Copiar enlace'} icon="pi pi-copy" outlined onClick={() => void copy()} />
              <Button type="button" label="Adjuntar archivo aquí" icon="pi pi-paperclip" outlined onClick={() => fileRef.current?.click()} />
              <input
                ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} aria-label="Adjuntar comprobante"
                onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ''; }}
              />
            </div>
            {status === 'rechazado' ? (
              <p className="proof__note" role="alert">
                Rechazado: {proof.reason ?? proof.history[proof.history.length - 1]?.note ?? 'no coincide'}. Agrega una foto nueva y vuelve a enviar.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {previewing ? (
        <div className="proof__review">
          {photoGrid}
          <div className="proof__actions">
            <p className="pos__hint">
              Revisa la vista previa. Si una foto no se ve bien, repítela. Cuando estén todas, envíalas al responsable de la cuenta.
            </p>
            <div className="proof__row">
              <Button type="button" label="Agregar otra foto" icon="pi pi-plus" outlined disabled={busy} onClick={() => fileRef.current?.click()} />
              <input
                ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} aria-label="Agregar otra foto del comprobante"
                onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ''; }}
              />
            </div>
            <label className="proof__link">
              <span className="proof__label">Responsable de la cuenta</span>
              <select className="p-inputtext" value={verifierId} onChange={(e) => setVerifierId(e.target.value)} aria-label="Responsable de la cuenta">
                <option value="">Elige quién verifica…</option>
                {responsibles.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
            <Button type="button" label="Enviar al responsable" icon="pi pi-send" loading={busy} disabled={verifierId === '' || photos.length === 0}
              onClick={() => void run(() => gw.send(proof.id, verifierId, actor))} />
          </div>
        </div>
      ) : null}

      {inReview ? (
        <div className="proof__review">
          {photoGrid}
          <div className="proof__actions">
            <p className="pos__hint">
              Enviado a <strong>{verifierName}</strong>. Verifica en el banco o la billetera que ingresaron{' '}
              <strong>{formatMoney(proof.amount)}</strong> en <strong>{proof.destination || proof.channelLabel}</strong>.
            </p>
            {!canVerify ? (
              <p className="pos__hint" role="status">Esperando que el responsable verifique desde su app.</p>
            ) : (
              <>
                {status === 'enviado' ? (
                  <Button type="button" label="Empezar verificación" icon="pi pi-search" outlined loading={busy}
                    onClick={() => void run(() => gw.verify(proof.id, actor))} />
                ) : null}
                {status === 'verificando' ? (
                  <div className="proof__row">
                    <Button type="button" label="Marcar pago como verificado" icon="pi pi-check" severity="success" loading={busy}
                      onClick={() => void run(() => gw.confirm(proof.id, actor))} />
                  </div>
                ) : null}
                <label className="proof__link">
                  <span className="proof__label">Motivo si no coincide</span>
                  <input className="p-inputtext" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Monto, cuenta o fecha no coinciden" />
                </label>
                <Button type="button" label="Rechazar comprobante" icon="pi pi-times" severity="danger" outlined disabled={reason.trim().length < 3}
                  onClick={() => void run(() => gw.reject(proof.id, actor, reason))} />
              </>
            )}
          </div>
        </div>
      ) : null}

      {status === 'confirmado' ? (
        <p className="proof__ok">
          Pago confirmado por {proof?.history[proof.history.length - 1]?.by}. Ya puedes confirmar la venta.
        </p>
      ) : null}

      {proof && status !== 'confirmado' ? (
        <details className="proof__exception">
          <summary>Excepción autorizada (vender sin pago confirmado)</summary>
          {canAuthorizeException ? (
            <>
              <p className="pos__hint">Queda registrada con tu nombre y el motivo. Úsala solo si el cliente ya pagó y no se puede verificar.</p>
              <input className="p-inputtext" aria-label="Motivo de la excepción" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (mín. 5 caracteres)" />
              <Button type="button" label="Autorizar excepción" icon="pi pi-shield" outlined disabled={reason.trim().length < 5 || proof.exception !== null}
                onClick={() => void run(() => gw.authorizeException(proof.id, actor, reason))} />
              {proof.exception ? <p className="proof__note">Excepción autorizada por {proof.exception.authorizedBy}.</p> : null}
            </>
          ) : (
            <p className="pos__hint">Solo un propietario o administrador puede autorizarla.</p>
          )}
        </details>
      ) : null}

      {lost ? <p className="proof__note" role="alert">Sin conexión con el servidor de comprobantes. El estado puede estar desactualizado; no confirmes la venta hasta recuperarlo.</p> : null}
      {error ? <p className="proof__note" role="alert">{error}</p> : null}
    </section>
  );
};
