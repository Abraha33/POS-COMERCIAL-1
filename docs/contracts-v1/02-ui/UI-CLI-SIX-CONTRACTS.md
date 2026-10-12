# UI-CLI — Seis contratos de interfaz: Clientes, cartera y condiciones de crédito

**Etapa 2 · v0.1 de contratos derivados para revisión técnica; no implementación ni pruebas.** **Dependencia funcional:** ../01-functional/CLI-CUSTOMERS-CREDIT.md + F04/TES-05. Aplica [UI Foundation](UI-FOUNDATION-SIX-CONTRACTS.md). **Excluye:** PED/F08 y F13 Offline como alcance de esta iteración (cualquier referencia es límite de integración externo). Un documento por dominio con seis secciones evita multiplicar 43 subflujos en pantallas.

## FLOW
1. CLI-01: buscar/seleccionar/crear cliente sin abandonar venta y sin perder carrito; datos fiscales pertinentes y privacidad.
2. CLI-02/03: fijar cupos/condiciones, verificar saldo vencido y exposición concurrente antes de aprobar venta a crédito.
3. CLI-04/06: abono o anticipo en efectivo/banco, verificación real de pago, aplicación individual a varias facturas y saldo.
4. CLI-05: estado de cuenta y vencimientos como consulta trazable sin edición de documentos.

**Invariante:** actor/empresa/sede/documento/revisión/permisos/errores en cada comando; registros publicados jamás se editan desde componentes; estados financieros inciertos no vuelven a borrador.

## SCREEN
- Cliente dentro del POS encima del carrito: buscador compacto, modo consumidor final, crear/editar en diálogo.
- Pantalla Cartera: filtros por vencimiento/riesgo, tabla clientes y facturas, saldos, límite, evidencia de abonos.
- Detalle cliente: identificación/contactos, condición crédito, saldo, facturas, notas, anticipos, acciones según permiso.
**Regiones y tareas:** ContextHeader (P1 contexto), ActionToolbar (P1 búsqueda/acción), WorkList (P1 selección), DetailWorkspace (P1 edición/revisión), SummaryRail (P1 importes/alertas), OverlayHost (P1 confirmaciones/autorizaciones), AuditTrail (P2 trazabilidad). P3: vistas avanzadas según permiso, nunca ocultar dato necesario para confirmar una operación.

## TEMPLATE
- WorkspaceListDetail para catálogo clientes/cartera.
- TransactionalWorkbench para apertura o pago de cartera con AllocationGrid; SettingsWorkspace para condiciones de crédito.
Contenedor de capa pública reusa UI Foundation; el template no guarda único estado de operación ni implementa reglas de dominio.

## COMPONENTS
Componentes funcionales propuestos y contratos de eventos (props/esquemas definitivos en etapa 3):
- `CustomerContextBar(selected,eligibility) → choose/edit`
- `CustomerQuickDialog(fields,identityPolicy) → save`
- `CreditExposureCard(limit,used,pending) → requestOverride`
- `ReceivableAgingList(invoices) → inspect`
- `AllocationGrid(payment,invoices,remaining) → apply`
- `CustomerStatementPanel(entries,asOf) → export`
**Cardinalidad:** listas paginadas/virtualizadas cuando el volumen lo exija, diálogos únicos, sin controles duplicados de aprobación; acciones explícitas con idempotencyKey cuando se publiquen. Componentes de PrimeReact se eligen después de auditar versión local; nombres anteriores son interfaces de dominio no código.

## RESPONSIVE
- 1366: cliente y estado de cartera lado a lado, 768: detalle inferior, 375: lista compacta y aplicación de factura en pasos, saldo fijo visible.
- En POS el editor cliente jamás tapa totales permanentemente; al cerrar conserva draft.
Objetivos de revisión 1366/768/375 px, zoom 200 % y viewport bajo; no certificar responsive sin QA. Estados loading/empty/error/forbidden/unknown deben conservar contexto y CTA de recuperación segura.

## ACCESSIBILITY
- Mensajes de límite explican saldo y factura, no solo rojo.
- Formato local documentos y dinero, errores campos anunciados, privacidad en exportaciones.
Todos los formularios con labels reales, ayudas, errores programáticos y foco restaurado. Objetivo WCAG 2.2 AA sujeto a pruebas axe + teclado + contraste en etapa 4; no usar solo color.

## Casos de error y recuperación UI
- Cliente duplicado/inactivo, crédito límite concurrente, mora, transferencia pendiente, recibo parcial, sobrepago, cambio cliente en checkout.
- No tratar crédito como método efectivo bancario confirmado.

## Contrato de handoff
Los comandos y queries asociados se especifican en `../03-data/OPERATION-MATRIX.md`, DTO/Zod lógico en `../03-data/SCHEMA-CATALOG.md`, permisos y máquinas en `../03-data/STATE-AND-PERMISSION-CONTRACTS.md`. Agente implementador debe comprobar nombres y capacidades actuales del frontend antes de crear componentes nuevos y **no puede afirmar que estas pantallas existan**.

