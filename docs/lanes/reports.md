# Hoja de carril: reports

## Objetivo
Que gerencia consulte ventas, antigüedad de cartera y valorización de inventario con filtros por fecha y sede, con permisos.

## Fuente de verdad
- Reglas: `docs/reports/REP-REPORTS-AUDIT-V1.md` (REP-01..09, D-041, D-044).
- UI: `docs/contracts-v1/02-ui/UI-REP-SIX-CONTRACTS.md`.
- Contrato (v0.8.0), **todo propuesto**: `GET /reports/sales-summary`, `GET /reports/aging`,
  `GET /reports/inventory-valuation`.

## Posees (de `lanes.json`)
`frontend/src/features/reports/**` · `frontend/src/tests/reports-*.test.*`

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles.
Pide lo que falte en `docs/qa/requests/lane-reports.md`.

## Entorno
`pnpm lane:new reports` · `DEV_PORT=8111 pnpm dev`

## Estado
**No arranca todavía.** Los tres reportes son `proposed` y el contrato no cubre filtros, fuentes, cierre X/Z ni permisos por
reporte. Aprobar el contrato es la condición para asignarlo.

## Qué falta del lado del integrador
1. Aprobar o ajustar las tres operaciones de reportes.
2. Definir filtros comunes (fecha, sede, caja) y paginación.
3. Definir permisos por reporte y los estados X provisional / Z definitivo (D-044).

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`.
