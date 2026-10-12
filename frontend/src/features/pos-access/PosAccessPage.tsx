import { ScreenTemplate } from '@/shared/ui';
import { AccessView } from './AccessView';
import { OpeningView } from './OpeningView';
import { computeOpening, accessStatus } from './opening';
import { defaultDenominations, scenarios } from './scenarios';
import './pos-access.css';

const noop = () => undefined;

/** CAPA 1 (esqueleto): ambas vistas con datos estáticos del primer escenario, sin interacción. */
export const PosAccessPage = () => {
  const scenario = scenarios[0]!;
  const count = computeOpening(defaultDenominations, {}, scenario.register?.expectedOpening ?? null);
  return (
    <ScreenTemplate title="Acceso al POS" subtitle="Escenario simulado: sin datos reales">
      <AccessView scenario={scenario} status={accessStatus(scenario, null)} onOpen={noop} onContinue={noop} onRelief={noop} onBack={noop} />
      <OpeningView
        scenario={scenario} denominations={defaultDenominations} raw={{}} count={count} invalid={{}} authorized={false}
        submitting={false} onQuantity={noop} onNote={noop} onReview={noop} onCancel={noop} reviewDisabled disabledReason={null}
      />
    </ScreenTemplate>
  );
};
