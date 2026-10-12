import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import type { ApprovalRequest } from '@/shared/contracts';
import { useRequestApproval } from '@/shared/api/pos';
import { FormField } from '@/shared/ui';

type Action = ApprovalRequest['action'];

const titles: Record<Action, string> = {
  discount: 'Autorizar descuento',
  negative_stock: 'Autorizar venta sin existencias',
  below_cost: 'Autorizar venta bajo el costo (solo propietario)',
  credit_exception: 'Autorizar excepción de crédito (propietario o administrador)',
};

type Props = {
  action: Action | null;
  reason?: string;
  onApproved: (approvalToken: string) => void;
  onCancel: () => void;
};

/** PIN de supervisor (BR-VEN-04/05/14). El PIN se canjea por un token; nunca viaja dentro de la venta. */
export const SupervisorPinDialog = ({ action, reason, onApproved, onCancel }: Props) => {
  const [pin, setPin] = useState('');
  const approval = useRequestApproval();

  const submit = () => {
    if (!action) return;
    approval.mutate(
      { action, pin },
      {
        onSuccess: (result) => {
          setPin('');
          onApproved(result.approvalToken);
        },
      },
    );
  };

  return (
    <Dialog
      header={action ? titles[action] : ''}
      visible={action !== null}
      onHide={() => {
        setPin('');
        approval.reset();
        onCancel();
      }}
      className="pos-dialog"
      style={{ width: 'min(26rem, 95vw)' }}
      modal
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {reason ? <p className="mt-0">{reason}</p> : null}
        <FormField
          id="supervisor-pin"
          label="PIN de supervisor"
          error={approval.error ? approval.error.message : undefined}
        >
          <InputText
            id="supervisor-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            className="w-full"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </FormField>
        <div className="flex justify-content-end gap-2">
          <Button type="button" label="Cancelar" severity="secondary" outlined onClick={onCancel} />
          <Button type="submit" label="Autorizar" icon="pi pi-lock-open" loading={approval.isPending} disabled={pin.length < 4} />
        </div>
      </form>
    </Dialog>
  );
};
