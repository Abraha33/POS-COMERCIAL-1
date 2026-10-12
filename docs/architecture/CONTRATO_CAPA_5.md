# Capa 5: contratos de backend (PROPUESTA v0.6.0)

Estado: **`x-status: simulated` + `x-approval: proposed`**, con Zod (`shared/contracts/pos-ops.ts`), igualdad con el
OpenAPI verificada por `tsc`, handlers MSW (`mocks/handlers/posops.ts`) y conformidad 42/42 contra el mock.
**No** hay backend real ni reglas aprobadas por el dueño.

| Dominio | Operaciones | Quién lo consume hoy |
|---|---|---|
| Pedidos | `GET /pos/orders?branchId`, `PUT /pos/orders/{id}` (concurrencia optimista), `POST /pos/orders`, `POST …/transitions` | **`features/pos/orders`** vía `ordersSync.ts` (offline-first) |
| Sincronización offline | `POST /pos/sync/batches`, `GET /pos/sync/operations/{key}` | **`features/pos-ops`** vía `httpTransport.ts` (por defecto) |
| Turnos (F03) | `POST /pos/shifts/{id}/handover` | solo conformidad; la UI de turnos sigue local |
| Autorizaciones (F12) | `GET/POST /pos/authorizations`, `POST …/decision` | solo conformidad; la UI sigue local |

## Cómo consumen
- **Pedidos:** el dispositivo sigue siendo la fuente mientras no hay conexión (`localStorage`). Cada cambio marca el
  pedido como pendiente; `useOrdersSync` (montado en el POS) sube lo pendiente con su `version`, baja los pedidos de otras
  terminales y muestra el estado en la bandeja (sincronizado, pendiente, sin conexión, conflicto). En conflicto de
  versión **gana el servidor** y se avisa; un salto de estado ilegal se rechaza; el número lo asigna el servidor si hay
  repetido. Lo que el usuario edita *mientras* se sincroniza no se pisa.
- **Cola offline (pos-ops):** el servidor por defecto es la API; el simulador local con respuestas guionadas queda
  como herramienta de prueba (selector "Servidor al sincronizar"). Se usa el turno real del servidor; sin turno
  abierto allí, la operación se rechaza (`SHIFT_NOT_FOUND`).

## Reglas que impone el mock (y debe imponer el backend)
- Autorizaciones: solo un supervisor decide; no se auto-aprueba; un solo uso con `validUntil`; vencida → 410.
- Relevo: la diferencia del arqueo exige autorización `relevo` aprobada y consumible una sola vez.
- Sync: `idempotencyKey` por operación; `dependsOn` pendiente → `reintentable`; PIN/tarjeta en `payload` → rechazada;
  turno cerrado → `revision`; consulta por clave antes de reenviar.
- Pedidos: `VERSION_CONFLICT`, `ESTADO_INVALIDO` (saltos ilegales; un pago no se reduce), `SALDO_PENDIENTE`,
  `TIENE_PAGOS`.

## Pendiente
- UI de turnos y autorizaciones (`pos-ops`) todavía opera sobre registros locales: sus endpoints existen y están
  probados, pero la pantalla no los llama.
- Resolución de conflictos más fina que "gana el servidor"; reloj real y caducidades; concurrencia real entre cajas.
- Reglas del dueño y backend Frappe.
