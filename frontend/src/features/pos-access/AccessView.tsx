import { Button } from 'primereact/button';
import { EmptyState, StatusTag, type StatusDef } from '@/shared/ui';
import type { AccessScenario, AccessStatus } from './model';

const statusMap: Record<string, StatusDef> = {
  'turno-propio': { label: 'Turno activo', tone: 'success', icon: 'pi pi-check-circle' },
  'caja-cerrada': { label: 'Caja cerrada', tone: 'info', icon: 'pi pi-lock' },
  'caja-ocupada': { label: 'Caja ocupada', tone: 'warning', icon: 'pi pi-exclamation-triangle' },
  'sin-permiso': { label: 'Sin permiso', tone: 'danger', icon: 'pi pi-ban' },
  'sin-conexion': { label: 'No verificable', tone: 'warning', icon: 'pi pi-wifi' },
};

const explanation: Partial<Record<AccessStatus, string>> = {
  'turno-propio': 'Tienes un turno abierto en esta caja. Puedes continuar con la venta.',
  'caja-cerrada': 'La caja está cerrada. Cuenta la base inicial para abrirla.',
  'caja-ocupada': 'Otra persona tiene el turno abierto en esta caja. Pide el relevo o elige otra caja.',
  'sin-permiso': 'Tu rol no puede vender en el punto de venta. Pide acceso a un administrador.',
  'sin-conexion': 'Sin conexión no se puede verificar el estado del turno. Reintenta antes de abrir o vender.',
};

type Props = {
  scenario: AccessScenario;
  status: AccessStatus;
  onOpen: () => void;
  onContinue: () => void;
  onRelief: () => void;
  onBack: () => void;
};

/** POS-F01: quién eres, en qué sede/terminal/caja estás y qué puedes hacer ahora. */
export const AccessView = ({ scenario, status, onOpen, onContinue, onRelief, onBack }: Props) => {
  const { session, terminal, register } = scenario;

  if (status === 'sin-caja' || !register || !terminal) {
    return (
      <EmptyState
        title="Sin caja asignada"
        description="Tu usuario no tiene una caja o terminal asignada en esta sede. Pide a un administrador que la configure."
        action={<Button label="Volver" icon="pi pi-arrow-left" outlined onClick={onBack} />}
      />
    );
  }

  return (
    <div className="pa-access" data-testid="access-view" data-status={status}>
      <section className="pa-panel" aria-labelledby="pa-who">
        <h2 id="pa-who">Cajero</h2>
        <dl className="pa-facts">
          <div><dt>Nombre</dt><dd>{session.name}</dd></div>
          <div><dt>Rol</dt><dd>{session.role}</dd></div>
          <div><dt>Sede</dt><dd>{session.branchName}</dd></div>
          <div><dt>Terminal</dt><dd>{terminal.name}</dd></div>
          <div><dt>Caja</dt><dd>{register.name}</dd></div>
          <div><dt>Conexión</dt><dd>{session.online ? 'En línea' : 'Sin conexión'}</dd></div>
        </dl>
      </section>

      <section className="pa-panel" aria-labelledby="pa-state">
        <h2 id="pa-state">Estado de la caja</h2>
        <p><StatusTag status={status} map={statusMap} /></p>
        <p className="pa-hint" role="status">{explanation[status]}</p>
        {status === 'caja-ocupada' ? <p className="pa-hint">Turno de: <strong>{register.occupiedBy}</strong></p> : null}
        <div className="pa-actions">
          <Button label="Continuar a Venta rápida" icon="pi pi-shopping-cart" disabled={status !== 'turno-propio'} onClick={onContinue} />
          <Button label="Abrir caja" icon="pi pi-unlock" disabled={status !== 'caja-cerrada'} onClick={onOpen} />
          <Button label="Solicitar relevo" icon="pi pi-users" outlined disabled={status !== 'caja-ocupada'} onClick={onRelief} />
          <Button label="Volver" icon="pi pi-arrow-left" text onClick={onBack} />
        </div>
      </section>
    </div>
  );
};
