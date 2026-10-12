import { Button } from 'primereact/button';
import { EmptyState, StatusTag, type StatusDef } from '@/shared/ui';
import { useI18n } from '@/app/i18n/I18nProvider';
import type { AccessScenario, AccessStatus } from './model';

import type { MessageKey } from '@/app/i18n/messages';
import type { StatusDef as UiStatusDef } from '@/shared/ui';

/** Mapa de estado visual con la etiqueta traducida en el momento de pintar. */
const statusMap = (t: (key: MessageKey) => string): Record<string, UiStatusDef> =>
  Object.fromEntries(
    Object.entries(statusTone).map(([key, tone]) => [key, { ...tone, label: t(statusKeys[key as keyof typeof statusKeys]) }]),
  );

/** Estado visual por clave de estado; la etiqueta se traduce al pintar (ver `statusKeys`). */
const statusTone: Record<string, Omit<StatusDef, 'label'>> = {
  'turno-propio': { tone: 'success', icon: 'pi pi-check-circle' },
  'caja-cerrada': { tone: 'info', icon: 'pi pi-lock' },
  'caja-ocupada': { tone: 'warning', icon: 'pi pi-exclamation-triangle' },
  'sin-permiso': { tone: 'danger', icon: 'pi pi-ban' },
  'sin-conexion': { tone: 'warning', icon: 'pi pi-wifi' },
};
const statusKeys = {
  'turno-propio': 'access.status.active',
  'caja-cerrada': 'access.status.closed',
  'caja-ocupada': 'access.status.occupied',
  'sin-permiso': 'access.status.noPermission',
  'sin-conexion': 'access.status.noConnection',
} as const;

const explanationKeys: Partial<Record<AccessStatus, string>> = {
  'turno-propio': 'access.explain.active',
  'caja-cerrada': 'access.explain.closed',
  'caja-ocupada': 'access.explain.occupied',
  'sin-permiso': 'access.explain.noPermission',
  'sin-conexion': 'access.explain.noConnection',
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
  const { t } = useI18n();

  if (status === 'sin-caja' || !register || !terminal) {
    return (
      <EmptyState
        title={t('access.noRegister.title')}
        description={t('access.noRegister.description')}
        action={<Button label={t('access.back')} icon="pi pi-arrow-left" outlined onClick={onBack} />}
      />
    );
  }

  return (
    <div className="pa-access" data-testid="access-view" data-status={status}>
      <section className="pa-panel" aria-labelledby="pa-who">
        <h2 id="pa-who">{t('access.field.cashier')}</h2>
        <dl className="pa-facts">
          <div><dt>{t('access.field.name')}</dt><dd>{session.name}</dd></div>
          <div><dt>{t('access.field.role')}</dt><dd>{session.role}</dd></div>
          <div><dt>{t('access.field.branch')}</dt><dd>{session.branchName}</dd></div>
          <div><dt>{t('access.field.terminal')}</dt><dd>{terminal.name}</dd></div>
          <div><dt>{t('access.field.register')}</dt><dd>{register.name}</dd></div>
          <div><dt>{t('access.field.connection')}</dt><dd>{session.online ? t('access.connection.online') : t('access.connection.offline')}</dd></div>
        </dl>
      </section>

      <section className="pa-panel" aria-labelledby="pa-state">
        <h2 id="pa-state">{t('access.state.title')}</h2>
        <p><StatusTag status={status} map={statusMap(t)} /></p>
        <p className="pa-hint" role="status">{explanationKeys[status] ? t(explanationKeys[status] as MessageKey) : ''}</p>
        {status === 'caja-ocupada' ? <p className="pa-hint">{t('access.occupiedBy')} <strong>{register.occupiedBy}</strong></p> : null}
        <div className="pa-actions">
          <Button label={t('access.continue')} icon="pi pi-shopping-cart" disabled={status !== 'turno-propio'} onClick={onContinue} />
          <Button label={t('access.open')} icon="pi pi-unlock" disabled={status !== 'caja-cerrada'} onClick={onOpen} />
          <Button label={t('access.relief')} icon="pi pi-users" outlined disabled={status !== 'caja-ocupada'} onClick={onRelief} />
          <Button label={t('access.back')} icon="pi pi-arrow-left" text onClick={onBack} />
        </div>
      </section>
    </div>
  );
};
