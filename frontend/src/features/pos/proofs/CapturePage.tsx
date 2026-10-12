import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { formatMoney } from '@/shared/utils/format';
import { getProofGateway } from './gateway';
import { fileToEvidence } from './image';
import { proofStatusLabel, type PublicProof } from './proofs';
import './proofs.css';

type View =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; proof: PublicProof };

/**
 * Página del teléfono: abierta con el QR de la venta. Sin sesión ni menú; el token solo habilita esta solicitud.
 * No muestra otros datos de la venta ni confirma el pago: solo entrega evidencia.
 */
export const CapturePage = ({ token }: { token: string }) => {
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    getProofGateway()
      .getPublic(token)
      .then((proof) => alive && setView({ kind: 'ready', proof }))
      .catch((e: unknown) =>
        alive && setView({ kind: 'error', message: e instanceof Error ? e.message : 'No se pudo abrir el enlace.' }),
      );
    return () => {
      alive = false;
    };
  }, [token]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setPreview(await fileToEvidence(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer la imagen.');
    }
  };

  const send = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      await getProofGateway().submitPublic(token, preview);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el comprobante.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="capture">
      <section className="capture__card" aria-labelledby="capture-title">
        <h1 id="capture-title">Comprobante de pago</h1>

        {view.kind === 'loading' ? <p role="status">Abriendo solicitud…</p> : null}
        {view.kind === 'error' ? <p role="alert">{view.message} Pide un código nuevo en el computador de la caja.</p> : null}

        {view.kind === 'ready' ? (
          <>
            <p className="capture__amount" data-testid="capture-amount">{formatMoney(view.proof.amount)}</p>
            <dl className="capture__facts">
              <div><dt>Medio</dt><dd>{view.proof.channelLabel}</dd></div>
              {view.proof.destination ? <div><dt>Cuenta destino</dt><dd>{view.proof.destination}</dd></div> : null}
              <div><dt>Registra</dt><dd>{view.proof.employee}</dd></div>
              <div><dt>Estado</dt><dd>{proofStatusLabel[view.proof.status]}</dd></div>
            </dl>

            {sent ? (
              <p role="status" data-testid="capture-sent">
                Comprobante enviado. Ya puedes volver a la caja: el cajero verificará el pago.
              </p>
            ) : (
              <>
                <p>Toma una foto nítida del comprobante o elige una imagen que ya tengas.</p>
                <div className="proof__row">
                  <Button type="button" icon="pi pi-camera" label="Tomar foto" onClick={() => cameraRef.current?.click()} />
                  <Button type="button" icon="pi pi-image" label="Elegir imagen" outlined onClick={() => fileRef.current?.click()} />
                </div>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} aria-label="Tomar foto del comprobante" onChange={(e) => void pick(e.target.files?.[0])} />
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} aria-label="Elegir imagen del comprobante" onChange={(e) => void pick(e.target.files?.[0])} />
                {preview ? <img className="capture__preview" src={preview} alt="Vista previa del comprobante" /> : null}
                <Button type="button" label="Enviar comprobante" icon="pi pi-send" disabled={!preview} loading={busy} onClick={() => void send()} />
              </>
            )}
            {error ? <p role="alert">{error}</p> : null}
          </>
        ) : null}
      </section>
    </main>
  );
};
