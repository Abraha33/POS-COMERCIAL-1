# Capa 5: contratos de backend (PROPUESTA v0.6.0)

Especificados en `contracts/openapi.yaml` con `x-status: planned` + `x-approval: proposed`: **sin mock ni backend**.
Reflejan los dominios que hoy el cliente simula en `localStorage`. Ninguno está aprobado por el dueño.

| Dominio | Operaciones | Dominio simulado en el cliente |
|---|---|---|
| Turnos (F03) | `POST /pos/shifts/{id}/handover` | `features/pos-ops/shift.ts` |
| Autorizaciones (F12) | `GET/POST /pos/authorizations`, `POST /pos/authorizations/{id}/decision` | `authorization.ts` |
| Sincronización (F13) | `POST /pos/sync/batches` | `offline.ts`, `simulator.ts` |
| Pedidos | `GET/POST /pos/orders`, `POST /pos/orders/{id}/transitions` | `features/pos/orders/orders.ts` |

## Reglas que el servidor debe imponer (hoy solo las impone el cliente)
- **Autorizaciones:** quien solicita no aprueba; aprobación de un solo uso con `validUntil`; la `fingerprint` detecta cambios.
- **Sync:** `idempotencyKey` por operación; reenvío = mismo resultado; un rechazo no bloquea las demás; `dependsOn` en orden;
  sin PIN ni datos de tarjeta en `payload`.
- **Pedidos:** máquina de estados del cliente (`pendiente → en-proceso → listo → despachado → entregado`, `problema`
  reversible, `cancelado` solo sin pagos); despacho con saldo solo a crédito (`SALDO_PENDIENTE`).
- **Turnos:** el responsable no cambia sin `CustodyEntry` con arqueo de entrega.

## Para pasar de `planned` a `simulated`
1. Zod en `shared/contracts` + `Assert<Same<>>` en `contract-types.ts`.
2. Ejemplos en `contracts/examples` y fixtures.
3. Handlers MSW + escenarios de conformidad.
4. Aprobación del dueño de las reglas (`docs/business-rules`).
Pendiente: nada de esto está hecho; el cliente sigue usando `localStorage`.
