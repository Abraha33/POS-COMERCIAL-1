# ERP/POS Holamigo — Estado y decisiones vigentes

**Corte documental:** 2026-10-12. **Estado de esta actualización:** consolidación funcional; no acredita implementación. **Fuente oficial de decisiones nuevas:** este índice y su registro enlazado. **Fuente de implementación:** código, pruebas y contratos API del working tree realmente vigente, previa auditoría.

## Jerarquía para resolver conflictos
1. Decisión explícita del usuario, con fecha y estado en [registro de decisiones](decisions/2026-10-12-DECISION-REGISTER.md).
2. Contrato funcional vigente aprobado y sus criterios de aceptación.
3. Contrato de UI, API o dominio contrastado con código y pruebas.
4. Documentación anterior conservada para trazabilidad, nunca utilizada para invalidar un cambio posterior aprobado.
5. Mockups y prototipos: ejemplos visuales, no prueba de funcionamiento ni datos oficiales.

Si un contrato heredado difiere de una decisión posterior, **no modificar la lógica sin registrar el conflicto**. Marcar OPEN y solicitar resolución técnica si afecta dinero, impuestos, stock o permisos.

## Producto
SaaS ERP/POS multitenant con núcleo común: empresa, usuarios, roles/capacidades, sedes, bodegas, auditoría, configuración y extensiones. **ADR-001 sigue vigente:** núcleo → dominios → capacidades → perfiles componibles → configuración por empresa → extensiones. Prohibido implementar ramas rígidas por "tipo de negocio". Primeros perfiles comerciales: distribuidoras y ferreterías; otras capacidades evolucionarán después.

Frontend objetivo aprobado: React + TypeScript + Vite; PrimeReact como biblioteca visual del POS (auditoría menciona 10.9.9, verificar instalado); TanStack Router/Query/Table cuando corresponda, tests Vitest/Playwright y Storybook. Backend previsto: Frappe/ERPNext + app propia POS Core; validar capacidades, transacciones y momento de contabilización con pruebas. El código de la rama `experiment/frappe-validation` consultada el 12/10 aún contiene Next.js/shadcn antiguo y NO representa necesariamente la rama local `capa-2-responsive`.

## Documentos vigentes de esta consolidación
- [Decisiones del 12/10 y estado de aprobación](decisions/2026-10-12-DECISION-REGISTER.md).
- [Mapa POS F01–F14](pos/FLOWS-F01-F14.md).
- [Experiencia Venta rápida, catálogo, carrito, cobro y comprobantes](pos/SALE-UX-CHECKOUT.md).
- [F-FIN estándar empresarial, 18 flujos](finance/F-FIN-ENTERPRISE-V1.md).
- [Arquitectura UI, propiedad del estado y trabajo paralelo](architecture/UI-CONTRACTS-AND-WORKTREES.md).
- [Conteos físicos con ayudante/cajero/supervisor](inventory/COUNT-DUAL-ROLE.md).
- [Alcances relacionados: microapps y fiscal internacional](product/RELATED-SCOPE-2026-10-12.md).
- [Criterios transversales y bloqueadores](qa/ACCEPTANCE-2026-10-12.md).
- [Handoff para Codex/OpenCode](PROJECT-HANDOFF-CODEX.md).
- [Siete contratos POS-SALE originales v0.1, conservados sin pérdida](pos-proofs/v0.1/INDEX-POS-CONTRACTS.md).

## Decisiones nucleares nuevas
- Objetivo UX: **mínima intervención del cajero**; Header informa, navegación conecta, workspace ejecuta; estilos compactos y skeleton monocromo como referencia conceptual.
- POS con header operativo, navegación Venta / Suspendidas / Cobros pendientes / Pedidos / Mi turno / Más; acceso directo a gestión pedidos, propuesta de botón flotante cercana al catálogo **solo como variante visual, pendiente decisión final**.
- Catálogo con descubrimiento por texto, código de barras/SKU, marca, categoría y **atributos descriptivos combinados** (por ejemplo vaso, blanco, plástico); no inventar atributos. Dos niveles **APROBADOS**: resultado resumido y ficha detallada con variantes, UOM, stock y reglas de precios por cantidad, cliente y presentación.
- Cliente encima del carrito, crear/editar/buscar con permisos y datos fiscales; carrito con suspender, recuperar, reiniciar de forma segura; checkout y borradores sobreviven navegación y overlays.
- F06: múltiples pagos independientes por venta (incluso dos transferencias iguales), efectivo, tarjeta/datáfono, Nequi/Daviplata/Bancolombia/otros, Bre-B, mixto, crédito; saldo y cambio; intento incierto ≠ fallido.
- Transferencia de verificación manual: fotos múltiples, vista previa/repetición/aceptación de fotografía, enviar a responsable, verificación de acreditación por canal oficial, aprobación/rechazo desde teléfono del administrador; foto ≠ dinero confirmado.
- Venta ≠ pago ≠ documento fiscal ≠ entrega electrónica ≠ impresión física. Envío de impresión no demuestra papel impreso.
- F07 devoluciones/cambios/reembolsos solo por personal autorizado; F08 gestor de pedidos **aplazado para profundización**, conservar interfaz mínima/conexiones, no dar por cerrado.
- **F-FIN estándar empresarial reemplaza el modelo simplificado elegido anteriormente**. 18 flujos: CAJ01–07, TES01–06, CON01–05; responsabilidad de caja configurable por caja/usuario/turno, ejecución/autorizar/conciliar diferenciadas; gastos, compras, abonos y saldos a proveedores pagables desde caja bajo permisos.
- F13: datos móviles/hotspot o dispositivo autorizado con red como contingencia, no equivalen a offline; una solicitud local sin conectividad no llega automáticamente al móvil del administrador.
- Inv. conteo: ayudante físico, cajero coordina/registra, supervisor autoriza diferencias; conteo no cambia stock oficial automáticamente.
- Trabajo: Flow-first y contract-driven; usuario aprueba flujo/reglas/UX, se derivan 6 contratos técnicos; desarrollo OpenCode paralelo **solo después de límites de archivos y store**, Claude auditoría/QA; mock-first con contratos.

## Estado objetivo y evidencia
Inventario del 12/10: F01–F06 y F12 con **base funcional avanzada**; F07, F09–F11, F13–F14 **parciales**; F08 **aplazado**. Los 18 flujos financieros tienen propuesta funcional, NO firma contable ni pruebas. '35–40 % global' fue una orientación conversacional, no métrica auditada: NO usarla como avance verificado.

**P0:** auditar working tree local `capa-2-responsive`, decidir estado dueño de `SaleDraft`/`PaymentSession`, probar navegación sin pérdida, revisar pagos/idempotencia/errores, y propiedad de archivos del equipo. **P1:** validar OpenAPI, reglas 00–07, precios, inventario, caja, impuestos, offline, conectores. Las pruebas reales, permisos en servidor, integración fiscal, periféricos y ERPNext permanecen sin acreditar.

## Nueva aprobación funcional — Grupos 3, 4, 5, 7 y 8 (2026-10-12)

**APROBADOS para diseño funcional (no implementados):** 43 subflujos CAT-01..08, INV-01..10, COM-01..08, PED-01..08 y REP-01..09. Consultar aprobaciones [D-037..D-044](decisions/2026-10-12-DECISION-REGISTER.md).

| Grupo | Contrato vigente | Alcance |
|---|---|---|
| 3 Productos y precios | [CAT v1](catalog/CAT-PRODUCTS-PRICING-V1.md) | Catálogo maestro, UOM, precios contextualizados deterministas, promociones sin acumulación accidental, importaciones |
| 4 Inventarios | [INV v1](inventory/INV-ZONES-CYCLE-STOCK-V1.md) | **Conteo diario por zonas priorizado por semáforo** + entradas, stock, reconteos, traslados, reservas, mermas |
| 5 Compras | [COM v1](purchasing/COM-PURCHASING-SUPPLIERS-V1.md) | Rápida/controlada, orden, recepciones parciales, factura, gastos, proveedor y pagos sin duplicados |
| 7 Pedidos | [PED v1](orders/PED-ORDERS-FULFILLMENT-V1.md) | Propuesta funcional base aprobada; **F08 continúa aplazado para construcción** |
| 8 Reportes | [REP v1](reports/REP-REPORTS-AUDIT-V1.md) | X/Z interno, consolidado, historial, indicadores, conteos por zona, auditoría y exportación |

**Precedencia:** el inventario anterior describía F11/F08 como parciales/aplazados. Ahora F11/REP y la definición base de F08/PED están funcionalmente definidos, sin cerrar QA/API. F10 se amplía a control de cierre integral X/Z. El motor de precios CAT alimenta F04/F06; INV controla operaciones oficiales, COM enlaza CxP, PED es capacidad posterior y REP obtiene datos de fuentes existentes. No crear nuevos dominios rígidos.

**Regla diaria INV aprobada:** las empresas mantienen conteos todos los días por zonas. El semáforo rojo/amarillo/verde/gris mide urgencia/actualización y es distinto del estado del conteo; una diferencia sin aprobación no se da por conciliada. Ejemplo de siete zonas no limita configuración. Recontar con las ventas/recepciones concurrentes desde punto de corte, sin bloquear toda la tienda ni ajustar stock oficial automáticamente.

**Pendientes verificables:** árbol frontend local no auditado, contratos API definitivos, política contable/fiscal, validaciones ERPNext, pruebas E2E; permisos server-side, pricing con solapamientos, conteos concurrentes, recepción parcial, prioridad real de pedidos. Los 43 subflujos son especificaciones, no 43 pantallas ni porcentaje de código.

## Paquete de preparación para frontend — ETAPAS 1–3 (2026-10-12)

**Encargo del usuario:** cerrar trabajo de especificación de los dominios restantes **exceptuando F08 Pedidos y F13 Offline**, y detenerse antes de la etapa 4 de construcción. [Paquete de contratos etapas 1–3](contracts-v1/README.md).

- **Etapa 1 — funcional:** [F07 Devoluciones/cambios](contracts-v1/01-functional/F07-RETURNS-EXCHANGES.md), [Clientes y crédito](contracts-v1/01-functional/CLI-CUSTOMERS-CREDIT.md), [ADM/F14](contracts-v1/01-functional/ADM-POS-OPERATIONS-CONFIG.md), [convergencia F09/F10/F11](contracts-v1/01-functional/POS-F09-F10-F11-CONVERGENCE.md). Contratos CAT/INV/COM/REP/F-FIN aprobados previamente se reutilizan, no se vuelven a definir.
- **Etapa 2 — UI:** [Base compartida de seis contratos](contracts-v1/02-ui/UI-FOUNDATION-SIX-CONTRACTS.md) + nueve paquetes UI por dominio POS/CAT/INV/COM/CLI/RET/FIN/REP/ADM con FLOW/SCREEN/TEMPLATE/COMPONENTS/RESPONSIVE/ACCESSIBILITY.
- **Etapa 3 — datos:** [Schemas declarativos](contracts-v1/03-data/SCHEMA-CATALOG.md), [operaciones lógicas](contracts-v1/03-data/OPERATION-MATRIX.md), [estados/permisos](contracts-v1/03-data/STATE-AND-PERMISSION-CONTRACTS.md), [adapters y escenarios de mocks](contracts-v1/03-data/ADAPTERS-MOCKS-AND-TEST-CASES.md), [trazabilidad/gates](contracts-v1/03-data/TRACEABILITY-AND-REVIEW-GATES.md).

**Estado diferenciado:** Etapas 1–3 **documentadas**, no Zod/MSW implementados, no E2E ejecutados, no endpoints reales verificados. El trabajo previo de CAT/INV/COM/REP aprobado por usuario sigue vigente. Las nuevas hipótesis de F07/CLI/ADM y los nombres de operaciones/entidades de estos paquetes son **P propuestas técnicas**, no decisiones A. Requieren cotejo con rama frontend actual, OpenAPI, permisos del servidor, ERPNext y especialista contable/fiscal según campo.

**Exclusiones preservadas:** PED/F08 y F13 Offline no recibieron nuevos contratos en este paquete; siguen en su backlog anterior. El hecho de exigir idempotencia ante timeout online no crea flujo offline. Etapa 4 construcción explícitamente NO ejecutada.

## Regla de actualización
Toda nueva decisión implica editar el registro, el documento funcional afectado y sus pruebas/contratos dependientes. Añadir fecha, autor de decisión (usuario/propuesta), estado (aprobada/propuesta/pendiente), referencia y riesgo. Nunca sobrescribir silenciosamente la historia.

