# Hoja de carril: pos-orders

## Objetivo
Que un pedido se cree desde la venta, se prepare, se cobre en caja y se entregue (F08).

## Fuente de verdad
- `docs/orders/PED-ORDERS-FULFILLMENT-V1.md`
- `docs/orders/F08-STAGES-1-3-INDEX.md`
- `docs/decisions/2026-10-12-DECISION-REGISTER.md`
- Contrato (v0.8.0), **aprobado**: — ninguna operación propia aprobada.
- Contrato, **propuesto**: `GET /pos/orders`, `POST /pos/orders`, `PUT /pos/orders/{id}`, `POST /pos/orders/{id}/transitions`

## Posees (de `lanes.json`)
- `frontend/src/features/pos/orders/**`
- `frontend/src/tests/pos-orders*.test.*`

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles.
Pide lo que falte en `docs/qa/requests/lane-pos-orders.md`.

## Entorno
`pnpm lane:new pos-orders` · `DEV_PORT=8104 pnpm dev`

## Bloqueos conocidos
- **F08 está aplazado para implementación (D-010, D-040).** No asignar este carril sin orden del dueño.
- Operaciones `proposed` (no construir producción encima sin aprobación): `GET /pos/orders`, `POST /pos/orders`, `PUT /pos/orders/{id}`, `POST /pos/orders/{id}/transitions`.

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`. Informar siempre qué NO se verificó (backend real, DIAN, banco, hardware).
