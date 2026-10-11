type Param = { name: string; value: string; source: string };

/** Parámetros ya aprobados (docs/business-rules). Solo informativos: no hay ajustes editables. */
const params: readonly Param[] = [
  { name: 'Precios con IVA incluido', value: 'Sí; la base se calcula como precio / (1 + tasa)', source: 'BR-VEN-03' },
  { name: 'Descuento máximo: Cajero', value: '5 %', source: 'BR-VEN-04' },
  { name: 'Descuento máximo: Administrador', value: '15 % (con PIN de supervisor)', source: 'BR-VEN-04' },
  { name: 'Descuento máximo: Propietario', value: 'Libre', source: 'BR-VEN-04' },
  { name: 'Plazo de crédito a clientes', value: '30 días', source: 'BR-CLI-06' },
  { name: 'Días de gracia', value: '3 días tras el vencimiento', source: 'BR-CLI-06' },
  { name: 'Ajuste al peso (efectivo)', value: 'Múltiplos de $50', source: 'BR-GEN-05' },
  { name: 'Descuadre de caja permitido', value: '$0; toda diferencia exige nota', source: 'BR-CAJ-06' },
];

export const SettingsTab = () => (
  <div>
    <p role="note" className="p-3 border-1 surface-border border-round mt-0">
      Parámetros aprobados, de <strong>solo lectura</strong>. No son editables desde la aplicación; cambiarlos exige
      aprobación del dueño y un cambio de reglas de negocio.
    </p>
    <div className="app-table-scroll">
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <caption className="sr-only">Parámetros aprobados</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left p-2 border-bottom-1 surface-border">Parámetro</th>
            <th scope="col" className="text-left p-2 border-bottom-1 surface-border">Valor</th>
            <th scope="col" className="text-left p-2 border-bottom-1 surface-border">Regla</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name}>
              <th scope="row" className="text-left p-2 border-bottom-1 surface-border font-normal">{p.name}</th>
              <td className="p-2 border-bottom-1 surface-border">{p.value}</td>
              <td className="p-2 border-bottom-1 surface-border text-color-secondary">{p.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
