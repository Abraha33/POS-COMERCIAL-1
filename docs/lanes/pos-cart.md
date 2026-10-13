# Hoja de carril: pos-cart

## Objetivo
Que la venta en curso (líneas, cliente, nota) sobreviva a cambiar de pantalla, suspenderse y recuperarse, por caja y turno.

## Fuente de verdad
- `docs/pos/FLOWS-F01-F14.md`
- `docs/pos/SALE-UX-CHECKOUT.md`
- `docs/contracts-v1/02-ui/UI-POS-SALE-SIX-CONTRACTS.md`
- Contrato (v0.8.0), **aprobado**: — ninguna operación propia aprobada.
- Contrato, **propuesto**: — ninguna.
- No tiene operaciones propias: el borrador vive en el cliente. Usa productos y clientes por los hooks de `shared/api`.

## Posees (de `lanes.json`)
- `frontend/src/features/pos/sale-draft/**`
- `frontend/src/tests/pos-cash-held.test.*`
- `frontend/e2e/carrito-navegacion.spec.ts`

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles.
Pide lo que falte en `docs/qa/requests/lane-pos-cart.md`.

## Entorno
`pnpm lane:new pos-cart` · `DEV_PORT=8101 pnpm dev`

## Bloqueos conocidos
- Ninguno registrado. Confirma el alcance con el integrador antes de empezar.

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`. Informar siempre qué NO se verificó (backend real, DIAN, banco, hardware).
