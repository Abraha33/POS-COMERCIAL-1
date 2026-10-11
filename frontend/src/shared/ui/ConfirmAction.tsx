
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';

export type ConfirmActionProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` para acciones destructivas (anular, vaciar). */
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirmación controlada de acciones irreversibles. Enfoca "Cancelar" primero; Esc cancela. */
export const ConfirmAction = ({
  visible, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  tone = 'primary', loading, onConfirm, onCancel,
}: ConfirmActionProps) => {
  return (
    <Dialog
      visible={visible}
      header={title}
      modal
      onHide={onCancel}
      style={{ width: 'min(28rem, 94vw)' }}
    >
      <p className="m-0">{message}</p>
      <div className="app-dialog__footer">
        <Button type="button" label={cancelLabel} outlined autoFocus onClick={onCancel} disabled={loading} />
        <Button
          type="button" label={confirmLabel} severity={tone === 'danger' ? 'danger' : undefined}
          loading={loading} onClick={onConfirm}
        />
      </div>
    </Dialog>
  );
};
