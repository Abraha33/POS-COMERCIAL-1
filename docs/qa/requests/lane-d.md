# Peticiones del carril D (Clientes y cartera) a shared / contratos

| # | Tipo | Petición | Motivo |
|---|------|----------|--------|
| 1 | `core:` permisos | Añadir `customers.edit`, `receivables.pay` y `payables.pay` a `Permission` y `rolePermissions`. | Hoy solo existen permisos `*.view`; la UI de editar cliente y abonar/pagar se condiciona a `receivables.view`/`payables.view` y depende del 403 del servidor. |
| 2 | `core:` fecha de referencia | Exponer un reloj de aplicación (`useToday()` o similar) en `shared/utils`. | La mora y los vencimientos usan la constante `LEDGER_REFERENCE_DATE = 2026-10-11` (SUP), igual a `mockNow`. Con backend real la mora debe venir calculada del servidor. |
| 3 | `contract:` mora | Campos derivados en `Receivable` (`balance`, `status`, `daysOverdue`) y `Customer` (`outstandingBalance`, `overdueBalance`). | Hoy el cliente suma facturas en el navegador; el servidor es la autoridad (regla 4). |
| 4 | `contract:` abonos | `GET /receivables/{id}/payments` (historial de abonos) y abono con imputación automática a las facturas más antiguas (BR-CLI-05) además del abono a factura indicada. | La ficha del cliente no puede mostrar el historial de abonos. |
| 5 | `contract:` responsabilidad tributaria | Catálogo cerrado de `taxResponsibility` (códigos DIAN). | Hoy es texto libre (PROPUESTA). |
| 6 | `core:` UI | `DataTablePage` con slot de resumen/filtros y orden inicial. | Receivables/payables usan `DataTable` propio por esta limitación. |
| 7 | `mocks` | Handler de abono en efectivo ligado al turno (BR-CAR-03 es SUP). | No se modela impacto en caja. |
