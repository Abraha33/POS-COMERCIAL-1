# Hoja de carril: pos-pay

## Objetivo
Que el cobro (efectivo, tarjeta, transferencia, mixto, crédito) conserve su clave idempotente y nunca duplique una venta.

## Fuente de verdad
- `docs/pos/SALE-UX-CHECKOUT.md`
- `docs/finance/F-FIN-ENTERPRISE-V1.md`
- `docs/contracts-v1/02-ui/UI-POS-SALE-SIX-CONTRACTS.md`
- Contrato (v0.8.0), **aprobado**: `POST /pos/sales`, `POST /auth/supervisor-approvals`
- Contrato, **propuesto**: — ninguna.

## Posees (de `lanes.json`)
- `frontend/src/features/pos/payment-session/**`
- `frontend/src/features/pos/mixed/**`

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles.
Pide lo que falte en `docs/qa/requests/lane-pos-pay.md`.

## Entorno
`pnpm lane:new pos-pay` · `DEV_PORT=8102 pnpm dev`

## Bloqueos conocidos
- Ninguno registrado. Confirma el alcance con el integrador antes de empezar.

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`. Informar siempre qué NO se verificó (backend real, DIAN, banco, hardware).
