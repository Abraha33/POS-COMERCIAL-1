# UI-COM — Seis contratos de interfaz: Compras, recepción y proveedores

**Etapa 2 · v0.1 de contratos derivados para revisión técnica; no implementación ni pruebas.** **Dependencia funcional:** ../../purchasing/COM-PURCHASING-SUPPLIERS-V1.md. Aplica [UI Foundation](UI-FOUNDATION-SIX-CONTRACTS.md). **Excluye:** PED/F08 y F13 Offline como alcance de esta iteración (cualquier referencia es límite de integración externo). Un documento por dominio con seis secciones evita multiplicar 43 subflujos en pantallas.

## FLOW
1. COM-01/02: registrar proveedor/condiciones y propuestas de reposición no publicadas automáticamente.
2. COM-03: orden opcional o controlada con aprobación según importe/rol; cambios versionados.
3. COM-04/05: recepción total/parcial → cantidades aceptadas/dañadas/faltantes → casar factura con orden y recepción → registrar incidencias.
4. COM-06/07/08: distribuir costos conforme regla validada, gestionar devolución proveedor y derivar pagos a CAJ-05/TES-06.

**Invariante:** actor/empresa/sede/documento/revisión/permisos/errores en cada comando; registros publicados jamás se editan desde componentes; estados financieros inciertos no vuelven a borrador.

## SCREEN
- Bandeja: Órdenes, Recepciones, Facturas y Proveedores mediante filtros/estados, no wizard único obligatorio.
- Editor de compra rápida: proveedor + líneas recibidas + impuestos/costos + documento y elección contado/crédito; compra controlada con referencias de orden/recepción.
- Conciliación recepción: solicitadas vs recibidas/aceptadas/dañadas/pendientes, notas por línea, diferencias; autorización y soporte.
**Regiones y tareas:** ContextHeader (P1 contexto), ActionToolbar (P1 búsqueda/acción), WorkList (P1 selección), DetailWorkspace (P1 edición/revisión), SummaryRail (P1 importes/alertas), OverlayHost (P1 confirmaciones/autorizaciones), AuditTrail (P2 trazabilidad). P3: vistas avanzadas según permiso, nunca ocultar dato necesario para confirmar una operación.

## TEMPLATE
- WorkspaceListDetail para proveedores/órdenes/facturas.
- TransactionalWorkbench para compra rápida, orden y recepción; ReconciliationWorkbench para cotejo orden-recepción-factura.
Contenedor de capa pública reusa UI Foundation; el template no guarda único estado de operación ni implementa reglas de dominio.

## COMPONENTS
Componentes funcionales propuestos y contratos de eventos (props/esquemas definitivos en etapa 3):
- `SupplierLookup(supplier,accountsStatus) → select`
- `PurchaseLineGrid(items,uom,cost) → adjust`
- `ReceiptDifferenceGrid(ordered,received,accepted,rejected) → confirm`
- `DocumentThreeWayMatch(order,receipt,invoice) → dispute/approve`
- `ApBalancePreview(invoiceAllocations) → payViaFinance`
- `AttachmentEvidenceList(files,policy) → add/removeBeforeSubmit`
**Cardinalidad:** listas paginadas/virtualizadas cuando el volumen lo exija, diálogos únicos, sin controles duplicados de aprobación; acciones explícitas con idempotencyKey cuando se publiquen. Componentes de PrimeReact se eligen después de auditar versión local; nombres anteriores son interfaces de dominio no código.

## RESPONSIVE
- 1366: documentos paralelos para cotejo, 768: resumen+detalle expandible, 375: líneas una a una con totales fijos y diferencias visibles.
- Acciones pagar/documentar/recibir separadas; nunca un botón que contabilice y pague inadvertidamente.
Objetivos de revisión 1366/768/375 px, zoom 200 % y viewport bajo; no certificar responsive sin QA. Estados loading/empty/error/forbidden/unknown deben conservar contexto y CTA de recuperación segura.

## ACCESSIBILITY
- Estado diferencias con texto y cantidad, selector UOM con etiqueta completa.
- Factura duplicada, cuenta bancaria cambiada y compra incierta requieren mensaje modal accesible con recuperación.
Todos los formularios con labels reales, ayudas, errores programáticos y foco restaurado. Objetivo WCAG 2.2 AA sujeto a pruebas axe + teclado + contraste en etapa 4; no usar solo color.

## Casos de error y recuperación UI
- Factura duplicada, proveedor sin cuenta validada, recepción parcial, precio distinto, daño, aceptación fuera de tolerancia y reintento de publicación.
- Un pago no crea inventario otra vez.

## Contrato de handoff
Los comandos y queries asociados se especifican en `../03-data/OPERATION-MATRIX.md`, DTO/Zod lógico en `../03-data/SCHEMA-CATALOG.md`, permisos y máquinas en `../03-data/STATE-AND-PERMISSION-CONTRACTS.md`. Agente implementador debe comprobar nombres y capacidades actuales del frontend antes de crear componentes nuevos y **no puede afirmar que estas pantallas existan**.
