# Hoja de carril: pos-shell

## Objetivo
Componer la pantalla de venta (catálogo, cliente, carrito, totales, cobrar) sin poseer reglas de negocio.

## Fuente de verdad
- `docs/architecture/UI-CONTRACTS-AND-WORKTREES.md`
- `docs/contracts-v1/02-ui/UI-POS-SALE-SIX-CONTRACTS.md`
- `docs/pos/FLOWS-F01-F14.md`
- Contrato (v0.8.0), **aprobado**: `GET /products`, `POST /products`, `POST /pos/sales`
- Contrato, **propuesto**: `GET /pos/country-pack`

## Posees (de `lanes.json`)
- `frontend/src/features/pos/QuickSale.tsx`
- `frontend/src/features/pos/PosPage.tsx`
- `frontend/src/features/pos/*.css`
- `frontend/src/tests/pos-quick-sale.test.*`
- `frontend/src/tests/pos-catalog-ui.test.*`
- `frontend/src/tests/pos-history.test.*`
- `frontend/src/tests/pos-price-tiers.test.*`
- `frontend/src/tests/pos-sale-extras.test.*`
- `frontend/e2e/pos-sales.spec.ts`

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles.
Pide lo que falte en `docs/qa/requests/lane-pos-shell.md`.

## Entorno
`pnpm lane:new pos-shell` · `DEV_PORT=8105 pnpm dev`

## Bloqueos conocidos
- `QuickSale.tsx` es el archivo más disputado del POS: un solo agente a la vez en este carril.
- Operaciones `proposed` (no construir producción encima sin aprobación): `GET /pos/country-pack`.

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`. Informar siempre qué NO se verificó (backend real, DIAN, banco, hardware).
