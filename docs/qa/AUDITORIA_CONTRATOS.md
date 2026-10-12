# Auditoría de contratos del POS (solo lectura)

Fecha: 2026-10-12 · Base auditada: `pos-proofs` / `feat/pos-proofs` @ `cfe0e8f` (oficial, puerto 8082) ·
`contracts/openapi.yaml` v0.6.0.

> **Aclaración de entorno.** El encargo decía "entorno oficial en 8081". El oficial declarado por el dueño es **8082**
> (`pos-proofs`); el 8081 es la rama `unificado`. Se auditó `pos-proofs`; las diferencias de `unificado` están en §2.4.
> No se tocó ningún puerto, rama, `main`, ni se ejecutó build. Esta auditoría **no modifica código**.

Método: inventario programático de `openapi.yaml` (61 operaciones) cruzado con los handlers MSW y con los hooks de
`shared/api` y su uso en `features/`; lectura de `shared/contracts/*`; búsqueda de estado local (`localStorage`) y de
tipos locales de las features. Lo que no se pudo comprobar se marca **(a verificar)**.

---

## 1. Resumen ejecutivo

- **Ninguna operación es real**: 61/61 tienen `x-status: simulated` (responde MSW). Sin backend, DIAN ni banco.
- **25** operaciones tienen reglas de negocio aprobadas (sin `x-approval`); **36** son `x-approval: proposed`.
- Los contratos Zod y OpenAPI están alineados por tipos (`Assert<Same<>>`, 71 aserciones) y por conformidad (42/42),
  pero **las features mantienen modelos locales paralelos** que no están en el contrato: tres modelos de "turno", dos
  mecanismos de aprobación, un catálogo de canales de pago hardcodeado, y estado de comprobantes/conciliación solo local.
- Hay **hooks y operaciones sin consumidor en la UI** (reportes, devoluciones, empresa, ajustes, conteos…).
- Falta contrato para: caja/terminal, catálogo de canales y cuentas destino, denominaciones, comprobante/impresión,
  documento fiscal, usuarios/roles configurables.

---

## 2. Matriz de contratos actuales

Leyenda de estado: **M-A** mock con regla aprobada · **M-P** mock con contrato propuesto · **LOCAL** estado/modelo solo en
el cliente, sin contrato · **DEV** infraestructura de desarrollo fuera de contrato.

### 2.1 Por dominio

| Dominio | Operaciones OpenAPI | Zod | Estado | ¿La UI la consume? | Observación |
|---|---|---|---|---|---|
| Autenticación y sesión | `POST /auth/login`, `GET /auth/session` | `auth.ts`, `session.ts` | M-A | `login`: sí (`useLogin`). **`/auth/session`: no** | `main.tsx` obtiene la sesión simulada importando el handler del mock (`sessionFor`), no la API |
| Usuarios, roles, permisos | `GET/POST/PUT /employees` (PROPUESTA POST/PUT) | `registry.ts`, `session.ts` | M-A / M-P | sí (`useEmployees`, `useSaveEmployee`) | Matriz `rolePermissions` **vive en el contrato del cliente**; no hay endpoint de permisos ni CRUD de roles |
| Productos | `GET/POST/PUT /products` | `product.ts` | M-A | sí | `brand`, `presentations` son PROPUESTA v0.6.0 dentro del mismo esquema |
| Inventario | `GET /stock/levels`, `/stock/movements`, `/inventory/transfers` (+receive), `/inventory/alerts` | `stock.ts`, `inventory.ts` | M-A | sí | — |
| Inventario (ajustes/conteos) | `POST /inventory/adjustments`, `/inventory/counts` | `inventory.ts` | M-P | **no** (`useCreateStockAdjustment`, `useCreateInventoryCount` sin consumidor; flag `INVENTORY_ADJUSTMENTS_ENABLED=false`) | Contrato listo, UI deshabilitada |
| Clientes y cartera | `GET/POST/PUT /customers`, `GET /receivables`, `POST /receivables/{id}/payments`, `POST /customers/{id}/payments`, `GET /payables`, `POST /payables/{id}/payments` | `party.ts`, `ledger.ts` | M-A / M-P | parcial: **no** `usePayCustomer` ni `useReceivablePayments` | Dos formas de abonar cartera (por documento y por cliente) |
| Venta POS | `GET /sales`, `POST /pos/sales`, `POST /pos/sales/{id}/void` | `sale.ts`, `pos.ts` | M-A | sí | Asimetría `GET /sales` vs `POST /pos/sales` |
| Pagos simples y mixtos | (dentro de `SaleCreate.payments`) | `paymentSchema` | M-A + campos M-P (`channel`,`reference`,`destination`,`proofId`) | sí | Ver P3: enum de 6 medios vs 9 canales de UI |
| Caja y turnos | `GET /pos/shifts/current`, `GET /pos/shifts`, `POST /pos/shifts`, `…/{id}/close`, `…/{id}/movements`, `…/{id}/handover` | `pos.ts`, `pos-ops.ts` | M-A / M-P | actual/abrir/cerrar/movimientos/relevo: sí. **`GET /pos/shifts`: no** | Hay además dos modelos locales de turno (P1) |
| Autorizaciones | `POST /auth/supervisor-approvals`, `GET/POST /pos/authorizations`, `…/decision` | `auth.ts`, `pos-ops.ts` | M-A / M-P | ambas | Dos mecanismos superpuestos (P2) |
| Pedidos | `GET/POST /pos/orders`, `PUT /pos/orders/{id}`, `POST …/transitions` | `pos-ops.ts` (`PosOrder`) | M-P | solo `GET` y `PUT` (offline-first). **`POST /pos/orders` y `/transitions`: no** | Modelo local `Order` distinto del de contrato |
| Devoluciones y anulaciones | `GET/POST /pos/sales/{id}/returns`, `POST /pos/sales/{id}/void` | `pos.ts`, `ledger.ts` | M-P / M-A | devolver y anular: sí. **`useSaleReturns` (listar): no** | — |
| Cola offline / sync | `POST /pos/sync/batches`, `GET /pos/sync/operations/{key}` | `pos-ops.ts` | M-P | sí (`pos-ops`) | `kind` y `payload` son `string`/`record` libres |
| Comprobantes e impresión | **ninguna** | **ninguno** | LOCAL | — | `DocumentType`, reimpresiones y comprobante de pago son estado local o DEV |
| Reportes | `GET /reports/sales-summary`, `/aging`, `/inventory-valuation` | `reports.ts` | M-P | **no** (3 hooks sin consumidor) | La pantalla calcula en cliente (`features/reports/aggregate.ts`) |
| Empresa/sucursales | `GET/PUT /company`, `GET /branches`, `PUT /branches/{id}` | `registry.ts` | M-P | `useBranches` sí; **`useCompany`, `useSaveCompany`, `useSaveBranch`: no** | — |

### 2.2 Mocks, stubs, locales y propuestas (separación)

| Categoría | Qué es |
|---|---|
| **Reales** | **Ninguno.** Todo responde MSW; el contrato no se ha ejercido contra Frappe. |
| **Mock con regla aprobada (25)** | login, session, products GET/POST/PUT, customers GET, suppliers GET, employees GET, stock levels/movements, purchase-orders GET, receivables GET, payables GET, sales GET, pos/sales POST, void, shifts current/open/close/movements, supervisor-approvals, transfers GET/POST/receive, alerts |
| **Mock con contrato PROPUESTA (36)** | v0.4.0–v0.6.0: altas/ediciones de clientes, proveedores, empleados; órdenes de compra (crear/enviar/recibir/cancelar); pagos de cartera; devoluciones; ajustes y conteos; reportes; empresa y sucursales; listado de turnos; relevo; autorizaciones; sync; pedidos |
| **LOCAL (sin contrato)** | modelo de turno de `pos-ops` (`ShiftRecord`), solicitudes de autorización locales (`AuthRequest`), cola `QueuedOperation`, ventas suspendidas (`pos.held.*`), pedidos locales + sucursal (`orders`), catálogo de canales (`defaultChannels`), tipo de documento (`pos.documentType.v1`), referencias usadas (`pos.paymentReferences.v1`), reimpresiones (`pos.reprints.v1`), conciliación «recibido» (`pos.recon.*`), escenarios de acceso (`pos-access/scenarios.ts`), `terminalId: 'ter-001'` fijo |
| **DEV (fuera de contrato)** | relay de comprobantes `/dev-relay/proofs` (middleware de Vite; `proofId` apunta a esto), `apiMocksForLan()` |

### 2.3 Qué contratos consume realmente la UI

Consumidos: login; products; customers/suppliers/employees (lectura y guardado); stock levels/movements; transfers y
alerts; purchase-orders (crear/enviar/recibir); receivables/payables y sus pagos por documento; sales; ventas, anulación y
devolución; turno actual/abrir/cerrar/movimientos/relevo; supervisor-approvals; authorizations; sync; pedidos (list+PUT).

**Sin consumidor en la UI** (contrato existe, hook existe o no): `GET /auth/session`, `GET /pos/shifts`,
`GET /pos/sales/{id}/returns` (listar), `POST /pos/orders`, `POST /pos/orders/{id}/transitions`,
`POST /customers/{id}/payments`, `GET /receivables/{id}/payments`, `POST /inventory/adjustments`,
`POST /inventory/counts`, `GET/PUT /company`, `PUT /branches/{id}`, los 3 `/reports/*`, `POST /purchase-orders/{id}/cancel`
**(a verificar** la cancelación: puede usarse desde un diálogo que no importa el hook por nombre).

### 2.4 Diferencias en `unificado` (8081)

`unificado` añade 4 handlers **sin operación en OpenAPI** (heredados de la carpeta principal), que violan la regla de no
presentar endpoints falsos: `GET /pos/payments`, `GET /pos/shifts/history`, `GET /pos/offline/queue`,
`GET /pos/supervisor/alerts` (más datos semilla `payments`, `offlineQueue`, `supervisorAlerts`, `posOrders`). Quedan sin
registrar en esa rama, y no existen en el oficial. Además `unificado` usa un único `SessionProvider` con guarda de
invitado → `/login` y `setUnauthorizedHandler` (401 global), que **el oficial no tiene**.

---

## 3. Problemas encontrados

Severidad: **A** bloquea el desarrollo paralelo · **M** genera retrabajo · **B** limpieza.

| # | Sev. | Problema | Evidencia |
|---|---|---|---|
| P1 | A | **Tres modelos de turno.** `Shift` del contrato (`open/closed`, en inglés); `ShiftRecord` local de `pos-ops` (`activo/pausado/finalizando/cerrado`, `startSimulatedShift` crea uno propio); y `pos-access` modela `CashRegister/Terminal/CashierSession` con escenarios que **no persisten** ni llaman `POST /pos/shifts`. Solo `OpenShiftCard` abre el turno por API. | `shared/contracts/pos.ts`; `features/pos-ops/types.ts`; `features/pos-access/model.ts` |
| P2 | A | **Dos mecanismos de aprobación superpuestos**: PIN→token (`/auth/supervisor-approvals`, acciones en inglés `discount/negative_stock/below_cost/credit_exception`) y solicitudes (`/pos/authorizations`, tipos en español `descuento/precio/anulacion/relevo/otra…`). Se solapan en descuento, anulación y excepción de crédito sin criterio documentado de cuándo usar cada uno. | `contracts/auth.ts`, `contracts/pos-ops.ts` |
| P3 | A | **Medio de pago ≠ canal.** El enum contractual tiene 6 medios; la UI tiene 9 canales y 4 (Bancolombia, otros bancos, Bre-B, PSE) colapsan en `transferencia`, por lo que `byPaymentMethod` pierde el canal. `channel` es `string` libre; el catálogo está hardcodeado en el cliente; no hay endpoint de canales ni de cuentas destino. | `sale.ts`; `features/pos/proofs/channels.ts` |
| P4 | A | **`proofId` apunta a una entidad sin contrato** (relay DEV). Con un backend real no hay dónde validar que el comprobante existe, está verificado ni a qué venta pertenece. | `sale.ts`; `vite.config.ts` (`/dev-relay/proofs`) |
| P5 | A | **No hay contrato de caja/terminal.** El OpenAPI solo conoce `registerId` en cuerpos; no hay recurso `register`/`terminal`, ni asignación cajero↔caja, ni "caja ocupada". `terminalId` está fijo en el cliente. | `openapi.yaml`; `useOps.ts` |
| P6 | M | **Comprobante/documento sin contrato.** `DocumentType` (factura electrónica vs documento equivalente POS) es preferencia local y **no viaja en `SaleCreate`**; `Sale`/`SaleReceipt` no tienen campos de documento fiscal; no hay recurso de impresión/reimpresión. (Correcto no inventar datos fiscales; falta el contrato del documento.) | `proofs/documents.ts`; `sale.ts`; `reprints.ts` |
| P7 | M | **Convención de idioma mezclada** en enums: `Shift.status` inglés; el resto español; acciones de aprobación inglés vs tipos de autorización español; `code` de error en inglés mayúsculas, `string` libre sin catálogo en el contrato. | `pos.ts`, `auth.ts`, `sale.ts` |
| P8 | M | **Nombres de identidad heterogéneos**: `cashierId`, `requesterId`, `decidedById`, `createdById`, `assigneeId`; en el relevo la petición usa `toEmployeeId` y la respuesta `toId/fromId`. | `pos-ops.ts`, `pos.ts` |
| P9 | M | **Dos nombres para idempotencia**: `clientOperationId` (venta) e `idempotencyKey` (sync); y hay dos caminos para una venta offline (`SaleCreate.offline` y la operación de sync). **(a verificar** si el sync de `kind` venta invoca `POST /pos/sales`.) | `pos.ts`, `pos-ops.ts`, `handlers/sales.ts` |
| P10 | M | **Sync con tipos libres**: `kind: string`, `payload: record`; el rechazo de PIN/tarjeta en `payload` es una regla del mock, no un esquema. | `pos-ops.ts` |
| P11 | M | **Permisos viven en el cliente**: `rolePermissions` está dentro de `shared/contracts` y los mocks autorizan con ella; `Session` no incluye permisos; 6 roles fijos sin CRUD de roles; `admin` y `propietario` tienen la misma matriz (la diferencia está en reglas puntuales). | `session.ts`, `app/config/permissions.ts` |
| P12 | M | **Crédito con tres campos solapados**: `creditTermDays` (7/15/30/45/60, PROPUESTA) vs BR-CLI-06 aprobada "30+3", más `creditDueDate` y `creditInstallments`. | `pos.ts` |
| P13 | M | **Pedidos: modelo duplicado** (`PosOrder` contractual vs `Order` local) con campos opcionales para encajar; `POST /pos/orders` y `/transitions` existen en contrato y mock pero la UI solo usa `PUT` con versión. | `pos-ops.ts`, `features/pos/orders/*` |
| P14 | M | **Reportes con doble fuente de verdad**: existen 3 endpoints `/reports/*`, pero la pantalla agrega en cliente desde `useSales`. | `features/reports/aggregate.ts` |
| P15 | M | **La UI importa del mock**: `main.tsx` usa `mocks/handlers/auth.sessionFor` y `test-users`; `GET /auth/session` no se llama. | `main.tsx` |
| P16 | B | Rutas y etiquetas asimétricas: `GET /sales` vs `POST /pos/sales`; `tags` incoherentes (`POST /suppliers` en `purchases`, `GET` en `catalog`; branches en `catalog` y `admin`). | `openapi.yaml` |
| P17 | B | Datos de referencia faltantes: bodegas (stock solo por sucursal), denominaciones de efectivo (hardcodeadas en `CashDialog`/`pos-access`), series y numeración de documentos, listas de precios, datos fiscales completos de la empresa. | varios |
| P18 | B | Credencial de prueba cambiada **sin commitear** por una herramienta externa: `TEST_PASSWORD = '1234'` en `mocks/test-users.ts` (el contrato de ejemplo usa otro valor). | `git diff` |
| P19 | B | El oficial **no maneja 401 global** (sesión expirada); existe solo en la rama de la carpeta principal. | — |

---

## 4. Propuesta de contrato canónico por dominio

No inventa endpoints fiscales; todo lo nuevo queda `x-approval: proposed` hasta decisión del dueño.

| Dominio | Canon propuesto |
|---|---|
| **Sesión** | `GET /auth/session` es la única fuente; `Session` añade `permissions: Permission[]` y `terminal: {id,name}`; el cliente deja de importar del mock. Los permisos los entrega el servidor (la matriz se mueve a `contracts/` como dato de referencia, no lógica). |
| **Usuarios/roles** | Mantener 6 roles fijos como `Role`; separar `GET /roles` (solo lectura) de `employees`. CRUD de roles queda fuera hasta decisión. |
| **Caja y turno** | Un solo modelo: `Shift` (contrato) + recursos nuevos `GET /pos/registers` (caja, terminal, `expectedOpening`, `occupiedBy`) y `GET /pos/cash-denominations`. `ShiftRecord` local y los escenarios de `pos-access` se **derivan** de `Shift`+`Register`; los estados `pausado/finalizando` pasan a atributos de `Shift` o se eliminan. Un único vocabulario (propuesta: español, `abierto/cerrado`). |
| **Aprobaciones** | Un solo concepto `Authorization` (`/pos/authorizations`) con `mode: 'pin-inmediato' | 'solicitud'`. `/auth/supervisor-approvals` pasa a ser su variante inmediata (misma lista de `action`/`type`, un solo idioma). |
| **Pagos** | `Payment.method` se mantiene como medio contable; `channel` pasa a `channelId` referenciando `GET /pos/payment-channels` (catálogo configurable: tipo, campos exigidos, destinos). `proofId` referencia `GET /pos/payment-proofs/{id}` con estado (`esperando/recibido/verificando/confirmado/rechazado`) y vínculo a operación. |
| **Comprobante/documento** | `SaleCreate.documentType` (selección, no emisión) y, en la respuesta, un bloque `document` **opaco/opcional** (`status`, `number?`) que el backend completa; los campos DIAN concretos se definen con el proveedor/regla aprobada, no antes. Impresión: recurso `GET /pos/sales/{id}/document` (representación) y `POST …/reprint` con motivo y auditoría. |
| **Pedidos** | `PosOrder` es el modelo único; el cliente local lo extiende por composición. La UI usa `POST /pos/orders` al crear y `transitions` para estados; `PUT` solo para edición con `version`. |
| **Devoluciones/anulaciones** | Sin cambios de forma; consumir `GET returns` en el detalle de venta; unificar `reason` en un catálogo corto. |
| **Sync** | `kind` como `enum` y `payload` discriminado por `kind`; una sola idempotencia: `idempotencyKey` (en venta, `clientOperationId` pasa a ser alias documentado o se unifica). |
| **Reportes** | Decidir: servidor como fuente (`/reports/*`) o agregación cliente; no ambas. Recomendado servidor + el cliente solo presenta. |
| **Convenciones** | Español en enums de dominio; `…Id` con sufijo de rol consistente; `code` de error como `enum` publicado en OpenAPI. |

---

## 5. Cambios incompatibles (breaking)

1. `Shift.status` `open|closed` → vocabulario único (afecta mocks, fixtures `seed.json`, tests, `useCurrentShift`).
2. `Payment.channel: string` → `channelId` con catálogo; `PaymentMethod` puede ganar valores.
3. `Session` + `permissions`/`terminal`; el cliente deja de derivar permisos de `rolePermissions`.
4. Fusión de `/auth/supervisor-approvals` y `/pos/authorizations` (acciones/tipos renombrados).
5. `SaleCreate.documentType` obligatorio u opcional con default (decisión de producto).
6. `SyncOperation.kind` como enum (rechaza tipos desconocidos).
7. `ShiftHandoverRequest.toEmployeeId` ↔ `CustodyEntry.toId` unificar.

---

## 6. Migración mínima recomendada (orden)

1. **Congelar** vocabulario y nombres (decisiones del dueño en §4) en un documento corto.
2. **Contratos de referencia** (solo lectura, PROPUESTA): `registers`, `cash-denominations`, `payment-channels`; con Zod,
   handlers, ejemplos y conformidad. Sin tocar flujos.
3. **Sesión**: `GET /auth/session` consumido por la UI; `permissions` y `terminal` en `Session`; quitar import de mocks
   en `main.tsx`; añadir manejo de 401.
4. **Turno único**: derivar `pos-access` y `pos-ops` de `Shift`+`Register`; retirar `startSimulatedShift` y escenarios
   como fuente de verdad (quedan como datos de prueba).
5. **Pagos**: catálogo de canales desde API; `proofId` contra recurso de comprobantes (el relay DEV pasa a ser su mock).
6. **Aprobaciones**: unificar mecanismo y renombrar acciones.
7. **Pedidos y reportes**: consumir `POST /pos/orders`/`transitions`; decidir fuente de reportes.
8. **Documento**: añadir `documentType` y bloque `document` opaco.

Cada paso: contrato + Zod + handler + fixture + conformidad antes de tocar la UI.

---

## 7. Archivos que habría que modificar

| Paso | Archivos |
|---|---|
| Contratos | `contracts/openapi.yaml`; `contracts/examples/*`; `contracts/fixtures/*.json` (regenerar); `frontend/src/shared/contracts/{session,auth,pos,pos-ops,sale,registry}.ts` + `index.ts`; `frontend/src/tests/contract-types.ts`; `pnpm gen:api` → `shared/api/generated/schema.d.ts` |
| Mocks | `frontend/src/mocks/{seed.ts,db.ts,test-users.ts}`; `mocks/handlers/{auth,shifts,posops,sales}.ts`; nuevos handlers de `registers/denominations/channels/proofs` |
| API cliente | `shared/api/{auth,pos,posOrders,authorizations,sync,shiftHandover}.ts`; nuevos `registers.ts`, `channels.ts`, `proofs.ts` |
| UI (mínimo, sin rediseño) | `main.tsx`; `app/providers/SessionProvider.tsx`; `features/pos-access/{model,scenarios,AccessView,OpeningView}.tsx`; `features/pos-ops/{types,shift,useOps,authSync}.ts`; `features/pos/proofs/{channels,gateway,documents}.ts`; `features/pos/QuickSale.tsx`, `PaymentDialog.tsx`; `features/pos/orders/*`; `features/reports/*` |
| Conformidad | `frontend/src/conformance/{scenarios,contracts-bridge}.ts` |
| Docs | `docs/architecture/CONTRATO_CAPA_5.md`; `docs/business-rules/99-preguntas-abiertas.md`; este informe |

---

## 8. Riesgos

- **Regresión de la venta rápida**: es el flujo con más estado local acoplado (pagos mixtos, crédito, comprobantes).
- **Fixtures y snapshots** (`seed.json`, capturas `docs/qa/audit`) cambian con cualquier ajuste de seed/enum.
- **Reglas no aprobadas**: 36/61 operaciones son PROPUESTA; consolidarlas puede fijar como canónico algo que el dueño
  rechace. Mantener `x-approval: proposed` hasta validación.
- **Datos fiscales**: no inventar numeración, CUFE ni estados DIAN; el bloque `document` debe ser opaco.
- **Offline**: unificar turno/idempotencia afecta a la cola persistida en `localStorage` de dispositivos existentes
  (migración de claves `pos.*`).
- **Doble fuente de reportes** si no se decide cuál manda.
- **Credencial de prueba**: el cambio sin commitear de `TEST_PASSWORD` rompería ejemplos y fixtures si se commitea sin
  actualizar `contracts/`.

---

## 9. Tests necesarios

- **Contrato**: `contract-types.ts` para cada esquema nuevo; `openapi.test.ts` (handler ⇔ operación, `x-status`).
- **Conformidad**: escenarios por recurso nuevo (registers, channels, proofs, session con permisos); caso de 401.
- **Unitarios**: mapeo canal→medio; derivación `Shift`→vista de acceso/turno; unificación de aprobaciones (PIN y
  solicitud producen el mismo `Authorization`); `kind` enumerado en sync.
- **UI (Vitest)**: sesión desde API sin importar mocks; acceso con caja ocupada/sin permiso a partir de `Register`;
  pagos con catálogo remoto; reporte desde servidor.
- **Migración**: lectura de claves `pos.*` antiguas y de la cola persistida con el modelo nuevo.
- **E2E (Playwright + axe)**: venta rápida completa (efectivo, mixto, crédito, transferencia con comprobante), apertura →
  venta → cierre, relevo con autorización, pedido crear→preparar→cobrar, devolución y anulación.

---

## 10. Límites de esta auditoría

- No se ejecutó la app ni el build; los consumos se infirieron por búsqueda estática de hooks y nombres. Los
  "sin consumidor" pueden tener uso indirecto **(a verificar)**.
- No se auditó la rama de otras herramientas más allá del delta de `unificado`.
- No se revisaron `docs/business-rules/*` línea por línea; el estado "aprobada/propuesta" sale de `x-approval`.
- Todo lo descrito como "funciona" corre sobre mocks.
