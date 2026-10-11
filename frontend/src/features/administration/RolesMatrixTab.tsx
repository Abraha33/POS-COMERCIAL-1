import { permissionSchema, roleSchema } from '@/shared/contracts';
import { roleLabels, rolePermissions } from '@/app/config/permissions';
import { permissionLabels } from './labels';

/** Matriz de solo lectura: filas = permisos, columnas = roles. Fuente: `@/app/config/permissions`. */
export const RolesMatrixTab = () => (
  <div>
    <p role="note" className="admin__note">
      <strong>PROPUESTA:</strong> la edición de permisos por rol requiere un contrato de API que aún no existe.
      Esta matriz es de solo lectura y refleja la configuración vigente de la aplicación.
    </p>
    <div className="app-table-scroll" tabIndex={0} role="region" aria-label="Matriz de permisos por rol">
      <table className="admin__table">
        <caption className="sr-only">Permisos por rol</caption>
        <thead>
          <tr>
            <th scope="col" className="admin__sticky">Permiso</th>
            {roleSchema.options.map((role) => (
              <th key={role} scope="col" className="admin__center">{roleLabels[role]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissionSchema.options.map((permission) => (
            <tr key={permission}>
              <th scope="row" className="admin__sticky">
                {permissionLabels[permission]}
                <br />
                <small className="admin__code">{permission}</small>
              </th>
              {roleSchema.options.map((role) => {
                const granted = rolePermissions[role].includes(permission);
                return (
                  <td
                    key={role}
                    className={`admin__center ${granted ? 'admin__granted' : 'admin__denied'}`}
                    data-granted={granted}
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
