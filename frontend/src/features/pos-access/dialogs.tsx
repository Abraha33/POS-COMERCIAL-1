import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { MoneyText } from '@/shared/ui';
import type { OpeningCount } from './model';

type ReviewProps = {
  visible: boolean;
  count: OpeningCount;
  registerName: string;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Revisión previa a abrir. Reutilizable: solo muestra el resumen y delega la confirmación. */
export const OpeningReviewDialog = ({ visible, count, registerName, loading, error, onConfirm, onCancel }: ReviewProps) => (
  <Dialog
    header="Revisión de apertura" visible={visible} onHide={loading ? () => undefined : onCancel} modal className="pa-dialog"
    style={{ width: 'min(30rem, 95vw)' }} closable={!loading}
  >
    <dl className="pa-facts" data-testid="review-summary">
      <div><dt>Caja</dt><dd>{registerName}</dd></div>
      <div><dt>Base contada</dt><dd><MoneyText value={count.total} strong /></dd></div>
      {count.difference !== null ? <div><dt>Diferencia</dt><dd><MoneyText value={count.difference} signed /></dd></div> : null}
      {count.note ? <div><dt>Motivo</dt><dd>{count.note}</dd></div> : null}
    </dl>
    <p className="pa-hint">Simulación de interfaz: esta confirmación no abre un turno real ni guarda datos.</p>
    {error ? <p className="pa-error" role="alert" data-testid="confirm-error">{error}</p> : null}
    <div className="pa-actions">
      <Button label="Volver al conteo" outlined onClick={onCancel} disabled={loading} />
      <Button label="Confirmar apertura" icon="pi pi-check" loading={loading} disabled={loading} onClick={onConfirm} />
    </div>
  </Dialog>
);

type AuthProps = {
  visible: boolean;
  title: string;
  reason: string;
  onAuthorize: () => void;
  onCancel: () => void;
};

/**
 * Autorización de un supervisor (relevo o apertura con diferencia). SIMULACIÓN DE INTERFAZ: no valida contra
 * ningún servicio. El código vive solo en memoria del campo y se descarta al cerrar; nunca se guarda ni se registra.
 */
export const AuthorizationDialog = ({ visible, title, reason, onAuthorize, onCancel }: AuthProps) => {
  const [code, setCode] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!visible) setCode('');
  }, [visible]);

  return (
    <Dialog header={title} visible={visible} onHide={onCancel} modal className="pa-dialog" style={{ width: 'min(26rem, 95vw)' }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length >= 4) onAuthorize();
        }}
      >
        <p className="pa-hint">{reason}</p>
        <label htmlFor="pa-supervisor-code" className="pa-label">Código del supervisor</label>
        <input
          ref={input} id="pa-supervisor-code" className="p-inputtext w-full" type="password" inputMode="numeric"
          autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus
        />
        <p className="pa-hint">Simulación de interfaz: cualquier código de 4 o más dígitos autoriza.</p>
        <div className="pa-actions">
          <Button type="button" label="Cancelar" outlined onClick={onCancel} />
          <Button type="submit" label="Autorizar" icon="pi pi-shield" disabled={code.length < 4} />
        </div>
      </form>
    </Dialog>
  );
};
