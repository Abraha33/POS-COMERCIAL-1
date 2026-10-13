# UI-FIN — Seis contratos de interfaz: Caja, tesorería y contabilidad F-FIN

**Etapa 2 · v0.1 de contratos derivados para revisión técnica; no implementación ni pruebas.** **Dependencia funcional:** ../../finance/F-FIN-ENTERPRISE-V1.md + ../../reports/REP-REPORTS-AUDIT-V1.md. Aplica [UI Foundation](UI-FOUNDATION-SIX-CONTRACTS.md). **Excluye:** PED/F08 y F13 Offline como alcance de esta iteración (cualquier referencia es límite de integración externo). Un documento por dominio con seis secciones evita multiplicar 43 subflujos en pantallas.

## FLOW
1. CAJ-01..04: custodio/turno, apertura/denominaciones, cobros mixtos, fotos múltiples y validación desde móvil de responsable bancario.
2. CAJ-05..07: egresos gasto/compra/pago varias facturas, custodia, traslados, conciliación de recibos y arqueo ciego configurado; cierre X/Z integral.
3. TES-01..06: verificar recaudos, conciliar extractos, depósitos/traslados, reembolsos, cobrar cartera y pagar proveedores.
4. CON-01..05: parametrización contable, asientos como autoridad ERPNext, fiscal externo, informes y cierre contable separado de cierre de caja.

**Invariante:** actor/empresa/sede/documento/revisión/permisos/errores en cada comando; registros publicados jamás se editan desde componentes; estados financieros inciertos no vuelven a borrador.

## SCREEN
- Mi caja: responsable/fondo/movimientos/resumen efectivo y verificación; acceso rápido a gasto y pago proveedor con permiso.
- Cierre: informe X, conciliación documentaria + conteo billetes/monedas + diferencias/incidencias + supervisor + Z, sin exigir contabilidad al cajero.
- Tesorería: bandejas de validación bancaria, conciliaciones, CxC/CxP y transferencias; detalle de asignaciones/doc; Configuración CON en perfil contador.
**Regiones y tareas:** ContextHeader (P1 contexto), ActionToolbar (P1 búsqueda/acción), WorkList (P1 selección), DetailWorkspace (P1 edición/revisión), SummaryRail (P1 importes/alertas), OverlayHost (P1 confirmaciones/autorizaciones), AuditTrail (P2 trazabilidad). P3: vistas avanzadas según permiso, nunca ocultar dato necesario para confirmar una operación.

## TEMPLATE
- TransactionalWorkbench para desembolso/abono y PaymentSession.
- ReconciliationWorkbench para efectivo, evidencia, bancos y arqueo.
- OperationalDashboard para turnos, pendientes de verificación y control de tesorería; SettingsWorkspace para plan de cuentas.
Contenedor de capa pública reusa UI Foundation; el template no guarda único estado de operación ni implementa reglas de dominio.

## COMPONENTS
Componentes funcionales propuestos y contratos de eventos (props/esquemas definitivos en etapa 3):
- `DenominationCounter(denominations,declaredTotal) → count`
- `MoneyBreakdown(byMethod,confirmed,pending) → inspect`
- `ExpensePaymentEditor(kind,supplier,invoiceAllocations) → requestApproval`
- `EvidenceCaptureQueue(images,attemptId) → submit`
- `BankVerificationReview(attempt,bankReference) → approve/reject`
- `ReconciliationMatchList(entries,matches) → match`
- `CloseShiftReview(xReport,difference,exceptions) → requestZ`
**Cardinalidad:** listas paginadas/virtualizadas cuando el volumen lo exija, diálogos únicos, sin controles duplicados de aprobación; acciones explícitas con idempotencyKey cuando se publiquen. Componentes de PrimeReact se eligen después de auditar versión local; nombres anteriores son interfaces de dominio no código.

## RESPONSIVE
- 1366: caja y documentos en paneles separados, 768: conteo y resumen alternan, 375: denominaciones grandes con total y corte fijo; verificador bancario opera en móvil.
- No anidar aprobación sobre confirmación que pierda fotos; X accesible sin cerrar, Z exige revisión final.
Objetivos de revisión 1366/768/375 px, zoom 200 % y viewport bajo; no certificar responsive sin QA. Estados loading/empty/error/forbidden/unknown deben conservar contexto y CTA de recuperación segura.

## ACCESSIBILITY
- Importes y diferencias anunciados en texto, denominaciones con rótulo COP claro.
- Foto aprobada visualmente no confirma banco; aria status 'Pendiente verificación'.
- Focus trap del diálogo de aprobación y recuperación de foco a intento por ID.
Todos los formularios con labels reales, ayudas, errores programáticos y foco restaurado. Objetivo WCAG 2.2 AA sujeto a pruebas axe + teclado + contraste en etapa 4; no usar solo color.

## Casos de error y recuperación UI
- Dinero físico distinto de electrónicos, abono a varias facturas, transferencia en tránsito, declaración con diferencias, Z duplicado, tarjeta UNKNOWN, foto duplicada.
- Contabilidad no cambia por reimprimir; conciliación bancaria no crea un segundo cobro.

## Contrato de handoff
Los comandos y queries asociados se especifican en `../03-data/OPERATION-MATRIX.md`, DTO/Zod lógico en `../03-data/SCHEMA-CATALOG.md`, permisos y máquinas en `../03-data/STATE-AND-PERMISSION-CONTRACTS.md`. Agente implementador debe comprobar nombres y capacidades actuales del frontend antes de crear componentes nuevos y **no puede afirmar que estas pantallas existan**.
