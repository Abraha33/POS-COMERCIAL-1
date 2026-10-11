import { useMemo } from 'react';
import { Chart } from 'primereact/chart';
import { formatMoney } from '@/shared/utils/format';
import type { Bucket } from './aggregate';

/** Paleta de respaldo (jsdom/temas sin variable). En el navegador se prefiere el color primario del tema. */
const FALLBACK_COLOR = '#2563eb';

const themeColor = (variable: string): string => {
  if (typeof window === 'undefined') return FALLBACK_COLOR;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || FALLBACK_COLOR;
};

type Props = {
  title: string;
  buckets: Bucket[];
  /** Texto de lectura para lectores de pantalla; la tabla equivalente se muestra junto al gráfico. */
  summary: string;
  horizontal?: boolean;
};

/** Gráfico de barras (chart.js vía PrimeReact) con título y descripción textual. */
export const BarChart = ({ title, buckets, summary, horizontal = false }: Props) => {
  const data = useMemo(
    () => ({
      labels: buckets.map((b) => b.label),
      datasets: [{ label: title, data: buckets.map((b) => b.total), backgroundColor: themeColor('--primary-color') }],
    }),
    [buckets, title],
  );
  const options = useMemo(
    () => ({
      indexAxis: horizontal ? ('y' as const) : ('x' as const),
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { [horizontal ? 'x' : 'y']: { beginAtZero: true, ticks: { callback: (value: string | number) => formatMoney(Number(value)) } } },
    }),
    [horizontal],
  );

  return (
    <figure className="reports__chart m-0">
      <figcaption className="font-semibold mb-2">{title}</figcaption>
      <div className="reports__chart-frame">
        <Chart type="bar" data={data} options={options} ariaLabel={`${title}. ${summary}`} style={{ height: '100%' }} />
      </div>
    </figure>
  );
};
