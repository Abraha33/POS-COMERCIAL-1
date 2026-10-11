import { permissionSchema, roleSchema } from '@/shared/contracts';
import { roleLabels, rolePermissions } from '@/app/config/permissions';
import { permissionLabels } from './labels';

/** Matriz de solo lectura: filas = permisos, columnas = roles. Fuente: `@/app/config/permissions`. */
export const RolesMatrixTab = () => (
  <div>
    <p role="note" className="p-3 border-1 surface-border border-round mt-0">
      <strong>PROPUESTA:</strong> la edición de permisos por rol requiere un contrato de API que aún no existe.
      Esta matriz es de solo lectura y refleja la configuración vigente de la aplicación.
    </p>
    <div className="app-table-scroll" tabIndex={0} role="region" aria-label="Matriz de permisos por rol">
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <caption className="sr-only">Permisos por rol</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left p-2 border-bottom-1 surface-border">Permiso</th>
            {roleSchema.options.map((role) => (
              <th key={role} scope="col" className="text-center p-2 border-bottom-1 surface-border">{roleLabels[role]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissionSchema.options.map((permission) => (
            <tr key={permission}>
              <th scope="row" className="text-left p-2 border-bottom-1 surface-border font-normal">
                {permissionLabels[permission]}
                <br />
                <small className="text-color-secondary">{permission}</small>
              </th>
              {roleSchema.options.map((role) => {
                const granted = rolePermissions[role].includes(permission);
                return (
                  <td
                    key={role}
                    className="text-center p-2 border-bottom-1 surface-border"
                    data-granted={granted}
                    style={{ color: granted ? 'var(--app-success)' : 'var(--text-color-secondary)' }}
                  >
                    <i className={granted ? 'pi pi-check' : 'pi pi-minus'} aria-hidden="true" />{' '}
                    <span>{granted ? 'Sí' : 'No'}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
