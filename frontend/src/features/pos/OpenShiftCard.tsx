import { useState } from 'react';
import { Button } from 'primereact/button';
import { useOpenShift } from '@/shared/api/pos';
import { useSession } from '@/app/providers/SessionProvider';
import { FormField, MoneyInput, MoneyText, ScreenTemplate } from '@/shared/ui';

/** BR-CAJ-01/02: sin turno abierto no se vende. Apertura con resumen (maquetas 03/04). */
export const OpenShiftCard = () => {
  const { session } = useSession();
  const [openingCash, setOpeningCash] = useState<number | null>(100000);
  const open = useOpenShift();
  const today = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

  return (
    <ScreenTemplate title="Punto de venta" subtitle={`${session.register.name} · ${session.branch.name}`}>
      <form
        className="pos-open"
        onSubmit={(event) => {
          event.preventDefault();
          open.mutate({ registerId: session.register.id, openingCash: openingCash ?? 0 });
        }}
      >
        <section className="pos__panel" aria-label="Apertura de caja">
          <h2>Apertura de caja</h2>
          <p className="pos__hint mt-0">Para vender hay que abrir el turno con la base inicial de efectivo.</p>
          <FormField id="opening-cash" label="Base inicial (COP)" {...(open.error ? { error: open.error.message } : {})}>
            <MoneyInput id="opening-cash" value={openingCash} onChange={setOpeningCash} autoFocus />
          </FormField>
          <Button
            type="submit" label="Abrir turno" icon="pi pi-unlock" loading={open.isPending}
            className="app-charge-button w-full"
          />
        </section>

        <section className="pos__panel pos-open__summary" aria-label="Resumen del turno">
          <h2>Resumen</h2>
          <dl className="pos__facts pos-open__facts">
            <div><dt>Sucursal</dt><dd>{session.branch.name}</dd></div>
            <div><dt>Caja</dt><dd>{session.register.name}</dd></div>
            <div><dt>Cajero</dt><dd>{session.user.name}</dd></div>
            <div><dt>Fecha y hora</dt><dd>{today}</dd></div>
            <div><dt>Fondo inicial</dt><dd><MoneyText value={openingCash ?? 0} strong /></dd></div>
          </dl>
        </section>
      </form>
    </ScreenTemplate>
  );
};
