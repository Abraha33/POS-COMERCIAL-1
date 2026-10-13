# UI-REP — Seis contratos de interfaz: Informes X/Z, historial, auditoría y gerencia

**Etapa 2 · v0.1 de contratos derivados para revisión técnica; no implementación ni pruebas.** **Dependencia funcional:** ../../reports/REP-REPORTS-AUDIT-V1.md + ../../finance/F-FIN-ENTERPRISE-V1.md. Aplica [UI Foundation](UI-FOUNDATION-SIX-CONTRACTS.md). **Excluye:** PED/F08 y F13 Offline como alcance de esta iteración (cualquier referencia es límite de integración externo). Un documento por dominio con seis secciones evita multiplicar 43 subflujos en pantallas.

## FLOW
1. REP-01: X provisional con filtros por caja/turno y corte temporal; múltiples consultas sin cerrar.
2. REP-02/03: Z idempotente tras revisión y consolidado multica­ja/sede sin sumar transferencias internas.
3. REP-04/08: consulta histórica con drill-down a documentos/actores/autorizaciones y acciones contextuales seguras.
4. REP-05/06/07/09: KPIs ventas, stock/zonas, cartera/proveedores y exportaciones auditadas; indicar origen y frescura.

**Invariante:** actor/empresa/sede/documento/revisión/permisos/errores en cada comando; registros publicados jamás se editan desde componentes; estados financieros inciertos no vuelven a borrador.

## SCREEN
- Dashboard gerencial con filtros fecha/sede y KPI por dominio, incidencias y estado de actualización.
- Historial denso con búsqueda avanzada, facets por documento/actor/estado y detalle auditado.
- Informes X/Z con resumen seccional y drill-down, diferencia y medios, recibos y documentos fiscales separados.
**Regiones y tareas:** ContextHeader (P1 contexto), ActionToolbar (P1 búsqueda/acción), WorkList (P1 selección), DetailWorkspace (P1 edición/revisión), SummaryRail (P1 importes/alertas), OverlayHost (P1 confirmaciones/autorizaciones), AuditTrail (P2 trazabilidad). P3: vistas avanzadas según permiso, nunca ocultar dato necesario para confirmar una operación.

## TEMPLATE
- OperationalDashboard para KPIs e incidencias.
- WorkspaceListDetail para historial y auditoría.
- ReconciliationWorkbench de solo lectura/revisión para cierre y reportes por turno.
Contenedor de capa pública reusa UI Foundation; el template no guarda único estado de operación ni implementa reglas de dominio.

## COMPONENTS
Componentes funcionales propuestos y contratos de eventos (props/esquemas definitivos en etapa 3):
- `ReportFilters(period,tenant,site,register) → apply`
- `KpiMetric(value,source,asOf,estimated) → drillDown`
- `XReportPreview(cut,sections) → export`
- `ZReportSummary(cut,shift,exceptions) → inspect`
- `AuditEventTimeline(events) → inspectDocument`
- `ExportControl(format,fields,permission) → request`
**Cardinalidad:** listas paginadas/virtualizadas cuando el volumen lo exija, diálogos únicos, sin controles duplicados de aprobación; acciones explícitas con idempotencyKey cuando se publiquen. Componentes de PrimeReact se eligen después de auditar versión local; nombres anteriores son interfaces de dominio no código.

## RESPONSIVE
- 1366: KPIs pequeños y panel drill-down; 768: grid de KPIs adaptativo, historial filtros panel; 375: KPIs una columna/dos compactos, detalles sin tabla global overflow.
- Impresión de X/Z requiere versión y ámbito visibles, resumen de turnos; no recortar valores monetarios.
Objetivos de revisión 1366/768/375 px, zoom 200 % y viewport bajo; no certificar responsive sin QA. Estados loading/empty/error/forbidden/unknown deben conservar contexto y CTA de recuperación segura.

## ACCESSIBILITY
- Todos los indicadores muestran unidad, fuente y estado estimado/definitivo textual.
- Paginación de historial con cabeceras asociadas; gráficas con alternativa tabular y foco.
- Exportación sensible requiere confirmación con objetivo accesible.
Todos los formularios con labels reales, ayudas, errores programáticos y foco restaurado. Objetivo WCAG 2.2 AA sujeto a pruebas axe + teclado + contraste en etapa 4; no usar solo color.

## Casos de error y recuperación UI
- Reporte sin datos, datos parciales/atrasados, Z ya generado, diferencia abierta, pagado incierto, usuario sin permiso, exportación demasiado grande.
- Reportes no pueden introducir asientos o facturas.

## Contrato de handoff
Los comandos y queries asociados se especifican en `../03-data/OPERATION-MATRIX.md`, DTO/Zod lógico en `../03-data/SCHEMA-CATALOG.md`, permisos y máquinas en `../03-data/STATE-AND-PERMISSION-CONTRACTS.md`. Agente implementador debe comprobar nombres y capacidades actuales del frontend antes de crear componentes nuevos y **no puede afirmar que estas pantallas existan**.
