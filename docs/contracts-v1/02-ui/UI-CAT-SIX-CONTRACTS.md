# UI-CAT — Seis contratos de interfaz: Productos, variantes y precios

**Etapa 2 · v0.1 de contratos derivados para revisión técnica; no implementación ni pruebas.** **Dependencia funcional:** ../catalog/CAT-PRODUCTS-PRICING-V1.md y F04; remitir desde docs/contracts-v1/02-ui a ../../catalog/CAT-PRODUCTS-PRICING-V1.md. Aplica [UI Foundation](UI-FOUNDATION-SIX-CONTRACTS.md). **Excluye:** PED/F08 y F13 Offline como alcance de esta iteración (cualquier referencia es límite de integración externo). Un documento por dominio con seis secciones evita multiplicar 43 subflujos en pantallas.

## FLOW
1. CAT-01/02: administrador crea ficha con identificadores, variantes, stock UOM, unidades comerciales y factores; previsualiza modificaciones; publicar con revisión; producto utilizado no se borra.
2. CAT-03: cajero busca por código, nombre y atributos combinables; si código exacto y un solo SKU/UOM elegible puede agregar directo; en otros casos abrir detalle contextual.
3. CAT-04..07: crear listas/reglas → simular precio por cliente+presentación+cantidad → mostrar explicación y conflictos → publicar; override de cajero siempre requiere privilegio.
4. CAT-08: importar → mapear → dry-run por fila → revisar duplicados/errores → publicar lote idempotente.

**Invariante:** actor/empresa/sede/documento/revisión/permisos/errores en cada comando; registros publicados jamás se editan desde componentes; estados financieros inciertos no vuelven a borrador.

## SCREEN
- Lista compacta con búsqueda global prioritaria; filtros faceteados por marca/categoría/atributos confirmados; resultado con código, presentación, stock y precio válido.
- Detalle variante/UOM/cantidades/escalas/cliente; ajustes de promoción y precios en pestaña administrativa separada del POS.
- Administración con rejilla de productos, versiones, precios, importaciones por lote y errores.
**Regiones y tareas:** ContextHeader (P1 contexto), ActionToolbar (P1 búsqueda/acción), WorkList (P1 selección), DetailWorkspace (P1 edición/revisión), SummaryRail (P1 importes/alertas), OverlayHost (P1 confirmaciones/autorizaciones), AuditTrail (P2 trazabilidad). P3: vistas avanzadas según permiso, nunca ocultar dato necesario para confirmar una operación.

## TEMPLATE
- WorkspaceListDetail para buscar/listar/detallar.
- SettingsWorkspace para reglas/precios/importación.
- TransactionalWorkbench exclusivamente para previsualización de importación, no escribir stock en catálogo.
Contenedor de capa pública reusa UI Foundation; el template no guarda único estado de operación ni implementa reglas de dominio.

## COMPONENTS
Componentes funcionales propuestos y contratos de eventos (props/esquemas definitivos en etapa 3):
- `ProductSearch(query,scope) → onSelect`
- `FacetFilters(allowedAttributes) → onChange`
- `ProductSummaryRow(product,price,stock) → add/inspect`
- `ProductDetailPanel(variant,uom,qty,priceTrace) → add`
- `PriceRuleExplanation(effectivePrice,trace) → inspect`
- `ImportPreviewGrid(batch,errors) → publish`
**Cardinalidad:** listas paginadas/virtualizadas cuando el volumen lo exija, diálogos únicos, sin controles duplicados de aprobación; acciones explícitas con idempotencyKey cuando se publiquen. Componentes de PrimeReact se eligen después de auditar versión local; nombres anteriores son interfaces de dominio no código.

## RESPONSIVE
- 1366: resultados+detalle (sin múltiples modales anidados), 768: filtros colapsables y ficha drawer, 375: búsqueda persistente + ficha full-view, botones agregar/totales visibles.
- Resultados con SKU largos y variantes en tarjeta compacta sin cortar referencia; mostrar precio y razón de restricción siempre.
Objetivos de revisión 1366/768/375 px, zoom 200 % y viewport bajo; no certificar responsive sin QA. Estados loading/empty/error/forbidden/unknown deben conservar contexto y CTA de recuperación segura.

## ACCESSIBILITY
- Lector barcode no debe disparar botón Agregar dos veces; foco vuelve al resultado.
- Filtros y escalas operables por teclado, error de precio sin color exclusivo, cambios de regla anunciados brevemente.
Todos los formularios con labels reales, ayudas, errores programáticos y foco restaurado. Objetivo WCAG 2.2 AA sujeto a pruebas axe + teclado + contraste en etapa 4; no usar solo color.

## Casos de error y recuperación UI
- Sin precio, stock no vendible, SKU ambiguo, producto inactivo, carga en red, importación parcial y permiso insuficiente.
- Dos reglas de precio igualmente elegibles provocan explicación/decisión determinista, jamás elección aleatoria.

## Contrato de handoff
Los comandos y queries asociados se especifican en `../03-data/OPERATION-MATRIX.md`, DTO/Zod lógico en `../03-data/SCHEMA-CATALOG.md`, permisos y máquinas en `../03-data/STATE-AND-PERMISSION-CONTRACTS.md`. Agente implementador debe comprobar nombres y capacidades actuales del frontend antes de crear componentes nuevos y **no puede afirmar que estas pantallas existan**.

