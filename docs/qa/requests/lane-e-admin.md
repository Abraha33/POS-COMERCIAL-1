# Peticiones del carril E-Administración a shared / contracts

1. `contract:` Edición de permisos por rol (hoy la matriz es solo lectura). PROPUESTA, requiere contrato y regla de negocio.
2. `contract:` Escritura de sedes y datos de empresa (`POST/PUT /branches`, `/company`). PROPUESTA.
3. `contract:` `GET /employees` y `GET /branches` no exigen permiso en mocks; confirmar si `admin.manage` debe aplicarse en lectura.
4. `contract:` Usuario de acceso (username, restablecer PIN, último ingreso) no existe en `Employee`; no se muestra.
5. `core:` `Session.branch` es una sede fija en `SessionProvider`; no hay selector de sede de sesión.
6. Entorno: `app.test.tsx`, `pos-quick-sale.test.tsx` y `pos-cash-held.test.tsx` fallan también sin estos cambios (verificado con stash).
