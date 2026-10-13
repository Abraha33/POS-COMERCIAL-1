# Hoja de carril: reports

## Objetivo
Que gerencia consulte ventas, antigüedad de cartera y valorización de inventario con filtros por fecha y sede, con permisos.

## Fuente de verdad
- Reglas: `docs/reports/REP-REPORTS-AUDIT-V1.md` (REP-01..09, D-041, D-044).
- UI: `docs/contracts-v1/02-ui/UI-REP-SIX-CONTRACTS.md`.
- Contrato (v0.8.0), **aprobado por el dueño el 2026-10-12 (D-066)**: `GET /reports/sales-summary`, `GET /reports/aging`,
  `GET /reports/inventory-valuation` (reglas BR-REP-01..03).

## Posees (de `lanes.json`)
`frontend/src/features/reports/**` · `frontend/src/tests/reports-*.test.*`

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles.
Pide lo que falte en `docs/qa/requests/lane-reports.md`.

## Entorno
`pnpm lane:new reports` · `DEV_PORT=8111 pnpm dev`

## Estado
**Arranca con los tres reportes aprobados** (ventas por periodo y sede, antigüedad de cartera, valorización de inventario),
con el permiso único `reports.view`. El contrato todavía no cubre caja como filtro, paginación, cierre X/Z ni permisos por reporte.

## Qué falta del lado del integrador
1. Costo promedio por sede en valorización (brecha de BR-REP-03: hoy el mock responde `product_cost`).
2. Definir filtro por caja y paginación.
3. Definir permisos por reporte y los estados X provisional / Z definitivo (D-044).

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`.
