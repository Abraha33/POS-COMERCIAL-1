# Peticiones del carril E-Administración a shared / contracts

1. `contract:` Edición de permisos por rol (hoy la matriz es solo lectura). PROPUESTA, requiere contrato y regla de negocio.
2. `contract:` Escritura de sedes y datos de empresa (`POST/PUT /branches`, `/company`). PROPUESTA.
3. `contract:` `GET /employees` y `GET /branches` no exigen permiso en mocks; confirmar si `admin.manage` debe aplicarse en lectura.
4. `contract:` Usuario de acceso (username, restablecer PIN, último ingreso) no existe en `Employee`; no se muestra.
5. `core:` `Session.branch` es una sede fija en `SessionProvider`; no hay selector de sede de sesión.
6. Entorno: `app.test.tsx`, `pos-quick-sale.test.tsx` y `pos-cash-held.test.tsx` fallan también sin estos cambios (verificado con stash).

## Estado (contract/v0.5.0)
1. **Pendiente:** edición de permisos por rol (requiere regla de negocio).
2. **Atendida parcial:** `PUT /branches/{id}` y `GET/PUT /company` (hooks `useSaveBranch`, `useCompany`, `useSaveCompany`). Sin `POST /branches`.
3. **Abierta:** `GET /employees` y `GET /branches` siguen sin exigir `admin.manage` (se usan para nombres en otros módulos); ver 99.
4. **Pendiente:** usuario de acceso en `Employee`.
5. **Atendida:** `Session.branch` es la sede real del empleado; sin selector de sede.
6. **Ya resuelta/entorno:** timeouts globales (20 s); flakiness aislada en `pos-*` bajo carga.
