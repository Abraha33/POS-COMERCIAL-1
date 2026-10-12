# Capa 5: contratos de backend (PROPUESTA v0.6.0)

Estado: **`x-status: simulated` + `x-approval: proposed`**. Tienen Zod (`shared/contracts/pos-ops.ts`), igualdad con el
OpenAPI verificada por `tsc`, handlers MSW (`mocks/handlers/posops.ts`) y escenarios de conformidad (41/41 contra el mock).
**No** tienen backend real ni reglas aprobadas por el dueño, y el cliente de `features/pos-ops` y `pos/orders` sigue
guardando en `localStorage`: aún no consume estos endpoints.

| Dominio | Operaciones | Dominio simulado en el cliente |
|---|---|---|
| Turnos (F03) | `POST /pos/shifts/{id}/handover` | `features/pos-ops/shift.ts` |
| Autorizaciones (F12) | `GET/POST /pos/authorizations`, `POST /pos/authorizations/{id}/decision` | `authorization.ts` |
| Sincronización (F13) | `POST /pos/sync/batches` | `offline.ts`, `simulator.ts` |
| Pedidos | `GET/POST /pos/orders`, `POST /pos/orders/{id}/transitions` | `features/pos/orders/orders.ts` |

## Reglas que impone el mock (y debe imponer el backend)
- **Autorizaciones:** solo un supervisor decide; quien solicita no aprueba (`SELF_APPROVAL` 403); aprobación de un solo
  uso con `validUntil`; vencida → 410.
- **Relevo:** la diferencia del arqueo exige una autorización `relevo` aprobada y se consume (`AUTHORIZATION_REQUIRED` 409).
- **Sync:** `idempotencyKey` por operación (reenvío = mismo resultado); `dependsOn` pendiente → `reintentable`; PIN o
  datos de tarjeta en `payload` → `rechazada`; turno cerrado → `revision`.
- **Pedidos:** `ESTADO_INVALIDO`, `SALDO_PENDIENTE` al despachar con saldo (salvo crédito), `TIENE_PAGOS` al cancelar,
  motivo obligatorio.

## Pendiente
- Que `pos-ops` y `pos/orders` consuman estos endpoints (hoy no) y fusionar su simulación local con la del servidor.
- Concurrencia real entre cajas, caducidad con reloj real, reglas del dueño y backend Frappe.
