# Hoja de carril: catalog

## Objetivo
Que se encuentre un producto por texto, marca, categoría o atributo y se vea su ficha con unidades y precio por volumen.

## Fuente de verdad
- `docs/catalog/CAT-PRODUCTS-PRICING-V1.md`
- `docs/contracts-v1/02-ui/UI-CAT-SIX-CONTRACTS.md`
- Contrato (v0.8.0), **aprobado**: `GET /products`, `POST /products`, `PUT /products/{id}`
- Contrato, **propuesto**: — ninguna.

## Posees (de `lanes.json`)
- `frontend/src/features/products/**`
- `frontend/src/tests/products-screens.test.*`

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles.
Pide lo que falte en `docs/qa/requests/lane-catalog.md`.

## Entorno
`pnpm lane:new catalog` · `DEV_PORT=8107 pnpm dev`

## Bloqueos conocidos
- Ninguno registrado. Confirma el alcance con el integrador antes de empezar.

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`. Informar siempre qué NO se verificó (backend real, DIAN, banco, hardware).
