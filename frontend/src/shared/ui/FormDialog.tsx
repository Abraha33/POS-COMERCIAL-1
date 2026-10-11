import type { FormEvent, ReactNode } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';

export type FormDialogProps = {
  visible: boolean;
  title: string;
  onHide: () => void;
  onSubmit: () => void;
  children: ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  submitIcon?: string;
  loading?: boolean;
  submitDisabled?: boolean;
  /** Error del servidor/formulario, anunciado con role="alert". */
  error?: string | null;
  width?: string;
};

/** Diálogo con formulario: Enter envía, Esc cierra, botones ≥ 44 px. Pásale `handleSubmit(...)` de RHF como `onSubmit`. */
export const FormDialog = ({
  visible, title, onHide, onSubmit, children, submitLabel = 'Guardar', cancelLabel = 'Cancelar',
  submitIcon, loading, submitDisabled, error, width = 'min(32rem, 94vw)',
}: FormDialogProps) => {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <Dialog visible={visible} header={title} modal onHide={onHide} style={{ width }}>
      <form onSubmit={submit} noValidate>
        {error ? <p className="app-dialog__error" role="alert">{error}</p> : null}
        {children}
        <div className="app-dialog__footer">
          <Button type="button" label={cancelLabel} outlined onClick={onHide} disabled={loading} />
          <Button type="submit" label={submitLabel} icon={submitIcon} loading={loading} disabled={submitDisabled} />
        </div>
      </form>
    </Dialog>
  );
};
