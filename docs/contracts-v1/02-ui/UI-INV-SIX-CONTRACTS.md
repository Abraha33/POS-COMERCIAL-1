# UI-INV — Seis contratos de interfaz: Existencias y conteos diarios por zonas

**Etapa 2 · v0.1 de contratos derivados para revisión técnica; no implementación ni pruebas.** **Dependencia funcional:** ../../inventory/INV-ZONES-CYCLE-STOCK-V1.md. Aplica [UI Foundation](UI-FOUNDATION-SIX-CONTRACTS.md). **Excluye:** PED/F08 y F13 Offline como alcance de esta iteración (cualquier referencia es límite de integración externo). Un documento por dominio con seis secciones evita multiplicar 43 subflujos en pantallas.

## FLOW
1. INV-01/02: iniciar inventario o recepción → líneas SKU/UOM/ubicación → distinguir aceptado/dañado/pendiente → validar → publicar por supervisor cuando aplique.
2. INV-03/09: consulta stock físico oficial, reservado, en tránsito, no vendible y disponible; identificar antigüedad y origen.
3. INV-04/05: programación DIARIA → lista zonas por urgencia ROJO/AMARILLO/VERDE/GRIS → asignación ayudante+cajero → captura por SKU → diferencias ajustadas por movimientos concurrentes → reconteo → supervisor → ajuste autorizado.
4. INV-06/07/08: traslados de origen a destino, ventas/devoluciones y bajas, cada uno con documento propio; no usar conteo para mutar stock.

**Invariante:** actor/empresa/sede/documento/revisión/permisos/errores en cada comando; registros publicados jamás se editan desde componentes; estados financieros inciertos no vuelven a borrador.

## SCREEN
- Home inventario: métricas de stock y alertas, bandeja semáforo por zonas con prioridad y estado independientes.
- Conteo: cabecera zona, responsables, corte y movimientos; filas de SKU/cantidad/UOM/observaciones, avance, discrepan­cias y reconteo; revisión supervisor separada.
- Movimientos: tabla filtrable por bodega/ubicación/tipo/estado; detalle histórico sin editar registros publicados; configuración de zonas y frecuencia.
**Regiones y tareas:** ContextHeader (P1 contexto), ActionToolbar (P1 búsqueda/acción), WorkList (P1 selección), DetailWorkspace (P1 edición/revisión), SummaryRail (P1 importes/alertas), OverlayHost (P1 confirmaciones/autorizaciones), AuditTrail (P2 trazabilidad). P3: vistas avanzadas según permiso, nunca ocultar dato necesario para confirmar una operación.

## TEMPLATE
- OperationalDashboard para resumen y prioridades por zona.
- ReconciliationWorkbench para sesión de conteo y discrepancias (esperado solo al supervisor o después de captura).
- TransactionalWorkbench para recepción, traslado y ajuste; SettingsWorkspace para zonas/política.
Contenedor de capa pública reusa UI Foundation; el template no guarda único estado de operación ni implementa reglas de dominio.

## COMPONENTS
Componentes funcionales propuestos y contratos de eventos (props/esquemas definitivos en etapa 3):
- `ZonePriorityQueue(zones,urgency,sessionStatus) → selectZone`
- `CountSessionHeader(zone,cutoff,users,revision) → assign/pause`
- `CountLineEditor(item,uom,qty,note) → save/recount`
- `DiscrepancyReview(lines,movements,diff) → authorize/reject`
- `StockAvailability(stockBreakdown,asOf) → inspect`
- `TransferReceiveGrid(items,expected,received,damaged) → submit`
**Cardinalidad:** listas paginadas/virtualizadas cuando el volumen lo exija, diálogos únicos, sin controles duplicados de aprobación; acciones explícitas con idempotencyKey cuando se publiquen. Componentes de PrimeReact se eligen después de auditar versión local; nombres anteriores son interfaces de dominio no código.

## RESPONSIVE
- 1366: cola zonas lateral+conteo; 768: zona en cabecera y tabla optimizada; 375: contador SKU por SKU, cantidad amplia, reconteo sin tablas horizontales globales.
- En cualquier tamaño, separar claramente prioridad de zona y estado conteo; dar fecha de corte y aviso de venta concurrente.
Objetivos de revisión 1366/768/375 px, zoom 200 % y viewport bajo; no certificar responsive sin QA. Estados loading/empty/error/forbidden/unknown deben conservar contexto y CTA de recuperación segura.

## ACCESSIBILITY
- Etiquetas explícitas 'Urgente por conteo vencido', 'En revisión por diferencia'; no codificar por color solamente.
- Foco de scanner en código, evitar autoenvío con mismo SKU, soporte teclado/táctil y cambios de responsable accesibles.
Todos los formularios con labels reales, ayudas, errores programáticos y foco restaurado. Objetivo WCAG 2.2 AA sujeto a pruebas axe + teclado + contraste en etapa 4; no usar solo color.

## Casos de error y recuperación UI
- Zona gris inhabilitada, stock desactualizado, ítem en dos zonas, sesión abandonada, diferencia sin aprobar, conteo conflictivo, bodega moviendo stock y falta de permiso.
- Nunca mostrar 'Conciliado' por completar captura: se requiere resolución/decisión explícita.

## Contrato de handoff
Los comandos y queries asociados se especifican en `../03-data/OPERATION-MATRIX.md`, DTO/Zod lógico en `../03-data/SCHEMA-CATALOG.md`, permisos y máquinas en `../03-data/STATE-AND-PERMISSION-CONTRACTS.md`. Agente implementador debe comprobar nombres y capacidades actuales del frontend antes de crear componentes nuevos y **no puede afirmar que estas pantallas existan**.

