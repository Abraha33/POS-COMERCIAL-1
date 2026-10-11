import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import type { Sale } from '@/shared/contracts';
import { useVoidSale } from '@/shared/api/pos';
import { FormField } from '@/shared/ui';
import { useNotify } from '@/app/providers/ToastProvider';
import { describeSaleError } from './saleText';

type Props = { sale: Sale; onVoided: () => void; onHide: () => void };

/**
 * Anulación con motivo obligatorio (BR-VEN-10). Permiso: admin/propietario, o cajero con el turno de la venta abierto;
 * la decisión es del servidor (`FORBIDDEN`). Se monta solo mientras está abierto.
 */
export const VoidSaleDialog = ({ sale, onVoided, onHide }: Props) => {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const voidSale = useVoidSale();
  const notify = useNotify();
  const reasonMissing = reason.trim().length === 0;

  const submit = () => {
    setTouched(true);
    if (reasonMissing) return;
    voidSale.mutate(
      { saleId: sale.id, input: { reason: reason.trim() } },
      {
        onSuccess: () => {
          notify({ severity: 'success', summary: 'Venta anulada', detail: `${sale.number}: stock reingresado.` });
          onVoided();
        },
      },
    );
  };

  return (
    <Dialog
      header={`Anular · ${sale.number}`}
      visible
      onHide={onHide}
      className="pos-dialog"
      style={{ width: 'min(30rem, 95vw)' }}
      modal
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="pos-alert pos-alert--warning">
          <i className="pi pi-exclamation-triangle" aria-hidden="true" />
          <p>
            Vas a anular la venta <strong>{sale.number}</strong>. Se reingresa todo el stock y se revierte la cuenta
            por cobrar. Esta acción no se puede deshacer.
          </p>
        </div>
        <FormField
          id="void-reason"
          label="Motivo de la anulación"
          {...(touched && reasonMissing ? { error: 'El motivo es obligatorio.' } : {})}
        >
          <input
            id="void-reason"
            className="p-inputtext w-full"
            value={reason}
            autoComplete="off"
            aria-required="true"
            autoFocus
            onChange={(e) => setReason(e.target.value)}
          />
        </FormField>
        {voidSale.error ? (
          <p className="app-dialog__error" role="alert" data-testid="void-error">
            {describeSaleError(voidSale.error, 'void')}
          </p>
        ) : null}
        <div className="app-dialog__footer">
          <Button type="button" label="Cancelar" outlined onClick={onHide} />
          <Button type="submit" label="Anular venta" icon="pi pi-ban" className="pos__danger" loading={voidSale.isPending} />
        </div>
      </form>
    </Dialog>
  );
};
