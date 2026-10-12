export type BarDatum = { label: string; value: number };

export type MiniBarsProps = {
  data: readonly BarDatum[];
  ariaLabel: string;
  formatValue?: (value: number) => string;
  /** Altura del área de barras en px. */
  height?: number;
  /** Índice resaltado (p. ej. el día actual). */
  highlight?: number;
};

/**
 * Gráfico de barras simple y accesible: barras decorativas (aria-hidden) + tabla equivalente para lectores de pantalla.
 * Para gráficos complejos usar chart.js (ya instalado) en el módulo de reportes.
 */
export const MiniBars = ({ data, ariaLabel, formatValue = String, height = 160, highlight }: MiniBarsProps) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="app-bars" aria-label={ariaLabel}>
      <div className="app-bars__plot" style={{ height }} aria-hidden="true">
        {data.map((d, index) => (
          <div className="app-bars__col" key={`${d.label}-${index}`}>
            <span className="app-bars__value">{formatValue(d.value)}</span>
            <div
              className={`app-bars__bar${index === highlight ? ' app-bars__bar--highlight' : ''}`}
              style={{ height: `${Math.round((d.value / max) * (height - 40))}px` }}
            />
          </div>
        ))}
      </div>
      <div className="app-bars__plot" aria-hidden="true">
        {data.map((d, index) => <span className="app-bars__label" key={`${d.label}-l${index}`}>{d.label}</span>)}
      </div>
      <div className="sr-only">
      <table>
        <caption>{ariaLabel}</caption>
        <thead><tr><th scope="col">Periodo</th><th scope="col">Valor</th></tr></thead>
        <tbody>
          {data.map((d, index) => (
            <tr key={`${d.label}-t${index}`}><th scope="row">{d.label}</th><td>{formatValue(d.value)}</td></tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
};
