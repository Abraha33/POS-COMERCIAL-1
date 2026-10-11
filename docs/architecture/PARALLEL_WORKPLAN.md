# Plan de trabajo en paralelo: frontend y backend

Fuente de verdad: `contracts/openapi.yaml` (v0.3.0) + `docs/business-rules/` (aprobadas) + `contracts/fixtures/`.
Nadie espera a nadie: el frontend usa los mocks, el backend se mide con la **misma suite de conformidad**.

## Cómo se conectan los dos lados
```
            contracts/openapi.yaml  ──►  tipos generados + Zod (frontend)
            docs/business-rules          ▲
            contracts/fixtures           │ verificados por tests
                  │                      │
   ┌──────────────┴───────────┐   ┌──────┴─────────────────────────┐
   │ frontend/src/mocks (MSW) │   │ backend/ (Frappe/ERPNext)      │
   └──────────────┬───────────┘   └──────┬─────────────────────────┘
                  └──── frontend/src/conformance (19+ escenarios) ────┘
```
- La suite corre contra el mock (`pnpm test`) y por HTTP real (`pnpm conformance`, con o sin `API_BASE_URL`).
- Cuando el backend pasa la suite, el frontend cambia de mock a backend sin tocar pantallas.

## Arquitectura de integración
Frappe/ERPNext es solo backend; el frontend (React) se conecta por API `/api/v1` según `contracts/openapi.yaml`.
Detalle y opción elegida (app propia de Frappe, `pos_api`): `backend/README.md`.

## Carriles del frontend (cada agente, su carpeta)
Todos consumen hooks de `frontend/src/shared/api` (no crean fetch propios) y `shared/utils/pricing.ts`.

| Carril | Módulo | Primera entrega | Usa |
|---|---|---|---|
| F1 | `pos` | Apertura de turno → venta (líneas, pago mixto, cambio) → cierre con cuadre | `useCurrentShift`, `useOpenShift`, `useCreateSale`, `useVoidSale`, `useRequestApproval`, `useCloseShift`, `useAddShiftMovement`, `computeTotals` |
| F2 | `products`, `inventory` | Traslados en dos pasos y alertas de stock negativo | `useTransfers`, `useCreateTransfer`, `useReceiveTransfer`, `useInventoryAlerts` |
| F3 | `purchases` | Órdenes de compra (lista existe; crear/recibir pendiente de contrato) | `usePurchaseOrders` |
| F4 | `customers`, `receivables`, `payables` | Ficha de cliente con tipo de documento DIAN, saldo y cupo | `useCustomers`, `useReceivables` |
| F5 | `administration` | Empleados y roles | `useEmployees` |
| F6 | `reports` | Ventas del turno/día, caja, stock negativo | `useSales`, `useStockLevels` |

Mapeo de errores a UX (todos los `code` vienen de `ApiError.code`):

| Código | Qué hace la pantalla |
|---|---|
| `STOCK_INSUFFICIENT` | Ofrecer PIN de supervisor (`negative_stock`) |
| `APPROVAL_REQUIRED` / `APPROVAL_INVALID` | Abrir diálogo de PIN y reintentar con `approvalToken` |
| `DISCOUNT_NOT_ALLOWED`, `PRICE_BELOW_COST` | Mostrar el tope y quién puede autorizar |
| `PAYMENT_INSUFFICIENT` | Resaltar faltante |
| `CREDIT_LIMIT_EXCEEDED`, `CUSTOMER_BLOCKED_OVERDUE` | Mostrar cupo/saldo o facturas vencidas |
| `SHIFT_NOT_OPEN` | Llevar a apertura de turno |
| `CASH_NOTE_REQUIRED` | Pedir nota de justificación |
| `IDEMPOTENCY_KEY_REUSED` | Error interno: regenerar `clientOperationId` solo si el contenido cambió |

## Carriles del backend
Orden sugerido; cada carril se da por terminado cuando **sus escenarios de conformidad pasan** contra `API_BASE_URL`.

| Carril | Alcance | Reglas | Escenarios de conformidad |
|---|---|---|---|
| B0 | **Cerrar primero.** Versión y levantamiento de Frappe/ERPNext, app `pos_api` con proxy `/api/v1`, modo de auth, CORS, carga de `contracts/fixtures`, `branchId` en todo. Prototipo mínimo: login y sesión pasando conformidad | BR-GEN-10 | `autenticación` (prototipo) |
| B1 | Auth: login, sesión, `supervisor-approvals` con PIN, roles/permisos | BR-VEN-04/05/14 | `autenticación`, `below_cost solo propietario` |
| B2 | Caja: turnos, movimientos, cierre con diferencia/nota | BR-CAJ-01..09 | `caja y turnos` |
| B3 | Ventas: precios/IVA incluido, totales y ajuste al peso, pago mixto, descuentos, bajo costo, stock, crédito, idempotencia, anulación | BR-VEN-01..14, BR-CLI | `ventas` |
| B4 | Inventario: movimientos, stock negativo + alertas, traslados en dos pasos, costo promedio | BR-INV, BR-PRO-06 | `inventario y traslados` |
| B5 | Compras y cartera (operaciones aún sin contrato: definirlas en `openapi.yaml` primero) | — | por crear |

## Procedimiento de cambio de contrato
1. PR `contract:` editando `openapi.yaml` (+ `examples/`, `docs/business-rules/`, escenario de conformidad).
2. `pnpm gen:api` y actualizar el Zod; `pnpm core:check` debe seguir en verde (mock conforme).
3. El integrador aprueba; luego frontend y backend implementan en sus ramas.

## Comandos
```bash
# Frontend (desde frontend/)
pnpm dev                                  # app con mocks, http://localhost:5188
pnpm test                                 # unit + conformidad contra el mock (MSW)
pnpm conformance                          # suite por HTTP real contra el mock
API_BASE_URL=http://localhost:8000/api/v1 pnpm conformance   # contra el backend real
pnpm core:check                           # los 8 gates
```
Usuarios de prueba y PIN: `contracts/fixtures/users.json` (el backend de desarrollo debe cargarlos).

## Brechas conocidas (no ocultar)
- No hay backend ni instancia; la versión de Frappe, el modo de auth (token vs. cookie) y el mapeo real a DocTypes están sin decidir ni verificar.
- La suite no cubre aún: `CUSTOMER_BLOCKED_OVERDUE` (necesita reloj controlable), `PRODUCT_INACTIVE`, ventas offline (`offline`/`occurredAt`), `CASH_COUNT_REQUIRED`, recepción por rol en todos los casos.
- Compras (crear/recibir) y cartera (abonos) no tienen operaciones de escritura en el contrato.
- Mocks y suite son estado en memoria con reloj fijo (2026-10-11); no prueban concurrencia, rendimiento ni persistencia.
- Aclaraciones A1–A8 pendientes (`docs/business-rules/99-preguntas-abiertas.md`).
