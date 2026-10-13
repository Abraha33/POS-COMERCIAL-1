# Hoja de carril: purchases

## Objetivo
Que compras registre proveedores y órdenes, reciba mercancía y programe pagos.

## Fuente de verdad
- `docs/purchasing/COM-PURCHASING-SUPPLIERS-V1.md`
- `docs/contracts-v1/02-ui/UI-COM-SIX-CONTRACTS.md`
- Contrato (v0.8.0), **aprobado**: `GET /suppliers`, `GET /purchase-orders`, `GET /payables`
- Contrato, **propuesto**: `POST /suppliers`, `POST /purchase-orders`, `PUT /suppliers/{id}`, `POST /purchase-orders/{id}/send`, `POST /purchase-orders/{id}/receive`, `POST /payables/{id}/payments`, `POST /purchase-orders/{id}/cancel`

## Posees (de `lanes.json`)
- `frontend/src/features/purchases/**`
- `frontend/src/features/payables/**`
- `frontend/src/tests/purchases-orders.test.*`
- `frontend/src/tests/ledger-payables.test.*`

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles.
Pide lo que falte en `docs/qa/requests/lane-purchases.md`.

## Entorno
`pnpm lane:new purchases` · `DEV_PORT=8109 pnpm dev`

## Bloqueos conocidos
- Operaciones `proposed` (no construir producción encima sin aprobación): `POST /suppliers`, `POST /purchase-orders`, `PUT /suppliers/{id}`, `POST /purchase-orders/{id}/send`, `POST /purchase-orders/{id}/receive`, `POST /payables/{id}/payments`, `POST /purchase-orders/{id}/cancel`.

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`. Informar siempre qué NO se verificó (backend real, DIAN, banco, hardware).
