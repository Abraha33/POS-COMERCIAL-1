# UI-RET — Seis contratos de interfaz: Devoluciones, garantías y reembolsos F07

**Etapa 2 · v0.1 de contratos derivados para revisión técnica; no implementación ni pruebas.** **Dependencia funcional:** ../01-functional/F07-RETURNS-EXCHANGES.md; ../../finance/F-FIN-ENTERPRISE-V1.md. Aplica [UI Foundation](UI-FOUNDATION-SIX-CONTRACTS.md). **Excluye:** PED/F08 y F13 Offline como alcance de esta iteración (cualquier referencia es límite de integración externo). Un documento por dominio con seis secciones evita multiplicar 43 subflujos en pantallas.

## FLOW
1. Buscar venta/cliente/documento → seleccionar líneas y cantidades remanentes → causal → evaluación de política comercial o derechos legales.
2. Inspeccionar destino físico por línea (vendible, cuarentena, proveedor, merma, sin movimiento) → calcular efectos originales → autorización obligatoria.
3. Elegir resultado (cambio, saldo a favor, crédito, reembolso, reclamación pendiente) → confirmar expediente de devolución.
4. Efectos desacoplados y relacionados: ajuste fiscal, stock, CxC, payment refund → seguimiento y cierre sin duplicación.

**Invariante:** actor/empresa/sede/documento/revisión/permisos/errores en cada comando; registros publicados jamás se editan desde componentes; estados financieros inciertos no vuelven a borrador.

## SCREEN
- Bandeja de devoluciones por estado/categoría/fecha; detalle venta original read-only con retornable por línea.
- Workbench de solicitud: líneas+motivos+inspección+resultado+importes originales+permisos; lateral con efectos/avisos.
- Expediente: lista eventos y documentos originales, pago/fiscal/stock por estado independiente, soporte y seguimiento.
**Regiones y tareas:** ContextHeader (P1 contexto), ActionToolbar (P1 búsqueda/acción), WorkList (P1 selección), DetailWorkspace (P1 edición/revisión), SummaryRail (P1 importes/alertas), OverlayHost (P1 confirmaciones/autorizaciones), AuditTrail (P2 trazabilidad). P3: vistas avanzadas según permiso, nunca ocultar dato necesario para confirmar una operación.

## TEMPLATE
- WorkspaceListDetail para historial/consulta.
- TransactionalWorkbench para caso devolución/cambio.
- ReconciliationWorkbench para efectos post-confirmación pendientes/rechazados.
Contenedor de capa pública reusa UI Foundation; el template no guarda único estado de operación ni implementa reglas de dominio.

## COMPONENTS
Componentes funcionales propuestos y contratos de eventos (props/esquemas definitivos en etapa 3):
- `OriginalSaleLookup(ref) → select`
- `ReturnableLinesGrid(remainingQty,originalSnapshot) → setQty`
- `ReturnReasonSelector(reason,legalTrack) → change`
- `ItemDispositionSelector(condition,stockDestination) → assign`
- `RefundPlanReview(payments,accounts,effects) → authorize`
- `ReturnCaseTimeline(events) → retryQueryOnly`
**Cardinalidad:** listas paginadas/virtualizadas cuando el volumen lo exija, diálogos únicos, sin controles duplicados de aprobación; acciones explícitas con idempotencyKey cuando se publiquen. Componentes de PrimeReact se eligen después de auditar versión local; nombres anteriores son interfaces de dominio no código.

## RESPONSIVE
- 1366: líneas venta izquierda+resultados/effect rail derecha; 768: paneles plegables; 375: paso venta→líneas→inspección→resultado→autorización.
- Nunca esconder derechos aplicables o resumen de riesgo de reembolso detrás de scroll horizontal.
Objetivos de revisión 1366/768/375 px, zoom 200 % y viewport bajo; no certificar responsive sin QA. Estados loading/empty/error/forbidden/unknown deben conservar contexto y CTA de recuperación segura.

## ACCESSIBILITY
- Cantidades remanentes accesibles; aviso de irreversibilidad antes de reembolso.
- Confirmación lectura completa importe/medio/estado; UNKNOWN visible en texto; acciones de autorización con etiqueta.
Todos los formularios con labels reales, ayudas, errores programáticos y foco restaurado. Objetivo WCAG 2.2 AA sujeto a pruebas axe + teclado + contraste en etapa 4; no usar solo color.

## Casos de error y recuperación UI
- Sin factura, venta anterior no accesible, devolución parcial repetida, devolución a crédito, garantía fuera de política voluntaria, fiscal rechazado, refund incierto.
- No volver a disponible producto abierto automáticamente.

## Contrato de handoff
Los comandos y queries asociados se especifican en `../03-data/OPERATION-MATRIX.md`, DTO/Zod lógico en `../03-data/SCHEMA-CATALOG.md`, permisos y máquinas en `../03-data/STATE-AND-PERMISSION-CONTRACTS.md`. Agente implementador debe comprobar nombres y capacidades actuales del frontend antes de crear componentes nuevos y **no puede afirmar que estas pantallas existan**.
