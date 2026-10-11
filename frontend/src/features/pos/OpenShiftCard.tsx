import { useState } from 'react';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { useOpenShift } from '@/shared/api/pos';
import { useSession } from '@/app/providers/SessionProvider';
import { FormField, ScreenTemplate } from '@/shared/ui';

/** BR-CAJ-01/02: sin turno abierto no se vende. */
export const OpenShiftCard = () => {
  const { session } = useSession();
  const [openingCash, setOpeningCash] = useState(100000);
  const open = useOpenShift();

  return (
    <ScreenTemplate title="Punto de venta" subtitle={`${session.register.name} · ${session.branch.name}`}>
      <form
        className="pos__panel"
        style={{ maxWidth: '28rem' }}
        onSubmit={(event) => {
          event.preventDefault();
          open.mutate({ registerId: session.register.id, openingCash });
        }}
      >
        <h2>Abrir turno de caja</h2>
        <p className="pos__hint mt-0">Para vender hay que abrir el turno con la base inicial de efectivo.</p>
        <FormField id="opening-cash" label="Base inicial (COP)" error={open.error?.message}>
          <InputNumber
            inputId="opening-cash"
            value={openingCash}
            onValueChange={(e) => setOpeningCash(e.value ?? 0)}
            mode="currency" currency="COP" locale="es-CO" minFractionDigits={0}
            className="w-full"
            autoFocus
          />
        </FormField>
        <Button type="submit" label="Abrir turno" icon="pi pi-unlock" loading={open.isPending} className="w-full" />
      </form>
    </ScreenTemplate>
  );
};
