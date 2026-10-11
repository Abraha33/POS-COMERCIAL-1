import type { ReactNode } from 'react';

export type KpiDelta = { text: string; tone?: 'up' | 'down' | 'neutral' };

export type KpiCardProps = {
  label: string;
  /** Valor ya formateado (usa `MoneyText` para dinero). */
  value: ReactNode;
  icon?: string;
  delta?: KpiDelta;
  hint?: string;
  /** Marca el dato como cálculo sin contrato aprobado (regla 1 de CLAUDE.md). */
  proposal?: boolean;
  'data-testid'?: string;
};

/** Tarjeta de indicador (KPI): etiqueta, valor grande, variación opcional. */
export const KpiCard = ({ label, value, icon, delta, hint, proposal, 'data-testid': testId }: KpiCardProps) => (
  <article className="app-kpi" aria-label={label} data-testid={testId}>
    <p className="app-kpi__label">
      {icon ? <i className={icon} aria-hidden="true" /> : null}
      {label}
      {proposal ? <span className="app-kpi__tag" title="Cálculo propuesto, sin contrato aprobado">PROPUESTA</span> : null}
    </p>
    <strong className="app-kpi__value">{value}</strong>
    {delta ? <span className={`app-kpi__delta app-kpi__delta--${delta.tone ?? 'neutral'}`}>{delta.text}</span> : null}
    {hint ? <span className="app-kpi__hint">{hint}</span> : null}
  </article>
);
