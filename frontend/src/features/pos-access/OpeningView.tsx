import { Button } from 'primereact/button';
import { MoneyText, StatusTag, type StatusDef } from '@/shared/ui';
import type { AccessScenario, CashDenomination, OpeningCount } from './model';
import { needsJustification, rowSubtotal } from './opening';

type Props = {
  scenario: AccessScenario;
  denominations: CashDenomination[];
  /** Texto escrito por la persona (permite detectar entradas inválidas). */
  raw: Record<string, string>;
  count: OpeningCount;
  invalid: Record<string, boolean>;
  authorized: boolean;
  submitting: boolean;
  onQuantity: (id: string, value: string) => void;
  onNote: (value: string) => void;
  onReview: () => void;
  onCancel: () => void;
  reviewDisabled: boolean;
  disabledReason: string | null;
};

const differenceMap: Record<string, StatusDef> = {
  exacta: { label: 'Base exacta', tone: 'success', icon: 'pi pi-check-circle' },
  sobrante: { label: 'Sobrante', tone: 'warning', icon: 'pi pi-arrow-up' },
  faltante: { label: 'Faltante', tone: 'danger', icon: 'pi pi-arrow-down' },
  'sin-base': { label: 'Sin base esperada', tone: 'neutral', icon: 'pi pi-minus' },
};

export const differenceKind = (count: OpeningCount): string =>
  count.difference === null ? 'sin-base' : count.difference === 0 ? 'exacta' : count.difference > 0 ? 'sobrante' : 'faltante';

const kindLabel = { moneda: 'Moneda', billete: 'Billete' } as const;

/** POS-F02: conteo de la base por denominación, diferencia y revisión antes de abrir. */
export const OpeningView = ({
  scenario, denominations, raw, count, invalid, authorized, submitting,
  onQuantity, onNote, onReview, onCancel, reviewDisabled, disabledReason,
}: Props) => {
  const { session, terminal, register } = scenario;
  const kind = differenceKind(count);
  const needsNote = needsJustification(count);

  return (
    <div className="pa-opening" data-testid="opening-view">
      <section className="pa-panel pa-panel--context" aria-label="Contexto de la apertura">
        <dl className="pa-facts pa-facts--inline">
          <div><dt>Cajero</dt><dd>{session.name}</dd></div>
          <div><dt>Sede</dt><dd>{session.branchName}</dd></div>
          <div><dt>Terminal</dt><dd>{terminal?.name}</dd></div>
          <div><dt>Caja</dt><dd>{register?.name}</dd></div>
        </dl>
      </section>

      <section className="pa-panel" aria-labelledby="pa-count">
        <h2 id="pa-count">Conteo de base inicial</h2>
        <div className="app-table-scroll" role="region" aria-label="Denominaciones" tabIndex={0}>
          <table className="pa-table">
            <thead>
              <tr><th scope="col">Tipo</th><th scope="col">Valor</th><th scope="col">Cantidad</th><th scope="col" className="pa-num">Subtotal</th></tr>
            </thead>
            <tbody>
              {denominations.map((d) => (
                <tr key={d.id} data-testid={`row-${d.id}`}>
                  <td>{kindLabel[d.kind]}</td>
                  <td><MoneyText value={d.value} /></td>
                  <td>
                    <input
                      className="p-inputtext pa-qty"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={`Cantidad de ${kindLabel[d.kind].toLowerCase()} de ${d.value}`}
                      aria-invalid={invalid[d.id] || undefined}
                      value={raw[d.id] ?? ''}
                      placeholder="0"
                      disabled={submitting || authorized}
                      onChange={(e) => onQuantity(d.id, e.target.value)}
                    />
                    {invalid[d.id] ? <span className="pa-error" role="alert">Solo números enteros, 0 o más.</span> : null}
                  </td>
                  <td className="pa-num"><MoneyText value={rowSubtotal(d, count.quantities[d.id] ?? 0)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pa-panel" aria-labelledby="pa-summary">
        <h2 id="pa-summary">Resumen</h2>
        <dl className="pa-facts">
          <div><dt>Total contado</dt><dd data-testid="opening-total"><MoneyText value={count.total} strong /></dd></div>
          <div>
            <dt>Base esperada</dt>
            <dd data-testid="opening-expected">{count.expected === null ? 'No configurada' : <MoneyText value={count.expected} />}</dd>
          </div>
          <div>
            <dt>Diferencia</dt>
            <dd data-testid="opening-difference">
              {count.difference === null ? '—' : <MoneyText value={count.difference} signed strong />}{' '}
              <StatusTag status={kind} map={differenceMap} />
            </dd>
          </div>
          <div><dt>Autorización</dt><dd data-testid="opening-auth">{needsNote ? (authorized ? 'Autorizada (simulación)' : 'Requerida') : 'No requerida'}</dd></div>
        </dl>

        <label htmlFor="pa-note" className="pa-label">
          {needsNote ? (count.total === 0 ? 'Motivo de la base en cero (obligatorio)' : 'Motivo de la diferencia (obligatorio)') : 'Observaciones (opcional)'}
        </label>
        <textarea
          id="pa-note" className="p-inputtext pa-note" rows={3} value={count.note} disabled={submitting || authorized}
          onChange={(e) => onNote(e.target.value)}
        />
        {disabledReason ? <p className="pa-hint" role="status" data-testid="opening-blocked">{disabledReason}</p> : null}

        <div className="pa-actions">
          <Button label="Revisar apertura" icon="pi pi-list-check" disabled={reviewDisabled} onClick={onReview} />
          <Button label="Cancelar" outlined onClick={onCancel} disabled={submitting} />
        </div>
      </section>
    </div>
  );
};
