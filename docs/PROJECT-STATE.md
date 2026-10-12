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
- F10: control y cierre integral de caja separa arqueo físico de efectivo de la conciliación documental de facturas, crédito, cartera, proveedores, gastos, electrónicos y custodia; Informe X es provisional e Informe Z es un corte interno único/auditable, no documento fiscal.
- Trabajo: Flow-first y contract-driven; usuario aprueba flujo/reglas/UX, se derivan 6 contratos técnicos; desarrollo OpenCode paralelo **solo después de límites de archivos y store**, Claude auditoría/QA; mock-first con contratos.

## Estado objetivo y evidencia
Inventario del 12/10: F01–F06 y F12 con **base funcional avanzada**; F07, F09–F11, F13–F14 **parciales**; F08 **aplazado**. Los 18 flujos financieros tienen propuesta funcional, NO firma contable ni pruebas. '35–40 % global' fue una orientación conversacional, no métrica auditada: NO usarla como avance verificado.

**P0:** auditar working tree local `capa-2-responsive`, decidir estado dueño de `SaleDraft`/`PaymentSession`, probar navegación sin pérdida, revisar pagos/idempotencia/errores, y propiedad de archivos del equipo. **P1:** validar OpenAPI, reglas 00–07, precios, inventario, caja, impuestos, offline, conectores. Las pruebas reales, permisos en servidor, integración fiscal, periféricos y ERPNext permanecen sin acreditar.

## Regla de actualización
Toda nueva decisión implica editar el registro, el documento funcional afectado y sus pruebas/contratos dependientes. Añadir fecha, autor de decisión (usuario/propuesta), estado (aprobada/propuesta/pendiente), referencia y riesgo. Nunca sobrescribir silenciosamente la historia.

