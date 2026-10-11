import { useState } from 'react';
import { SegmentedTabs } from '@/shared/ui';

type Group = 'all' | 'sales' | 'credit' | 'cash';
type Param = { name: string; value: string; source: string; group: Exclude<Group, 'all'> };

/** Parámetros ya aprobados (docs/business-rules). Solo informativos: no hay ajustes editables. */
const params: readonly Param[] = [
  { name: 'Precios con IVA incluido', value: 'Sí; la base se calcula como precio / (1 + tasa)', source: 'BR-VEN-03', group: 'sales' },
  { name: 'Descuento máximo: Cajero', value: '5 %', source: 'BR-VEN-04', group: 'sales' },
  { name: 'Descuento máximo: Administrador', value: '15 % (con PIN de supervisor)', source: 'BR-VEN-04', group: 'sales' },
  { name: 'Descuento máximo: Propietario', value: 'Libre', source: 'BR-VEN-04', group: 'sales' },
  { name: 'Plazo de crédito a clientes', value: '30 días', source: 'BR-CLI-06', group: 'credit' },
  { name: 'Días de gracia', value: '3 días tras el vencimiento', source: 'BR-CLI-06', group: 'credit' },
  { name: 'Ajuste al peso (efectivo)', value: 'Múltiplos de $50', source: 'BR-GEN-05', group: 'cash' },
  { name: 'Descuadre de caja permitido', value: '$0; toda diferencia exige nota', source: 'BR-CAJ-06', group: 'cash' },
];

const groups = [
  { value: 'all', label: 'Todos' },
  { value: 'sales', label: 'Ventas' },
  { value: 'credit', label: 'Crédito' },
  { value: 'cash', label: 'Caja y redondeo' },
] as const satisfies readonly { value: Group; label: string }[];

export const SettingsTab = () => {
  const [group, setGroup] = useState<Group>('all');
  const rows = params.filter((p) => group === 'all' || p.group === group);

  return (
    <div>
      <p role="note" className="admin__note">
        Parámetros aprobados, de <strong>solo lectura</strong>. No son editables desde la aplicación; cambiarlos exige
        aprobación del dueño y un cambio de reglas de negocio.
      </p>
      <div className="admin__sub">
        <SegmentedTabs options={groups} value={group} onChange={setGroup} ariaLabel="Grupos de parámetros" variant="chips" />
      </div>
      <div className="app-table-scroll">
        <table className="admin__table">
          <caption className="sr-only">Parámetros aprobados</caption>
          <thead>
            <tr>
              <th scope="col">Parámetro</th>
              <th scope="col">Valor</th>
              <th scope="col">Regla</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.name}>
                <th scope="row">{p.name}</th>
                <td>{p.value}</td>
                <td className="admin__code">{p.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
