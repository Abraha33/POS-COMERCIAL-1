# Registro de decisiones — 2026-10-12

**Ámbito:** ERP/POS Holamigo. **Clasificación:** A = aprobación explícita del usuario; C = consolidación coherente de reglas anteriores del proyecto; P = propuesta técnica aún no aprobada; V = verificación necesaria. Toda categoría distinta de A NO equivale a aceptación ni a implementación.

| ID | Nivel | Decisión, condición y consecuencia |
|---|---|---|
| D-001 | A | Adoptar **modelo financiero ESTÁNDAR EMPRESARIAL** en sustitución expresa del simplificado anterior; 18 flujos CAJ 7 + TES 6 + CON 5. |
| D-002 | A | Caja y responsabilidad configurables; asignar **usuario cajero responsable**, sede/caja/turno. Permisos de ejecución y custodia distintos. |
| D-003 | A | El cajero autorizado puede **pagar gastos y compras** desde caja; abonar facturas antiguas/nuevas de proveedores o saldarlas. Respetar CxP y registrar origen del dinero. |
| D-004 | A | F06 admite varios pagos independientes para el mismo total, incluso repetidos del mismo banco/método, con importes parciales y saldos automáticos. |
| D-005 | A | Transferencias manuales: cajero fotografía el comprobante, **varias fotos**, confirma vista previa o repite, **Enviar** remite al responsable de cuenta que verifica en su propia app; el administrador también usa Holamigo en teléfono. |
| D-006 | C | Comprobante capturado y comprobante validado **no son equivalentes**; se requiere confirmación confiable de la cuenta receptora. |
| D-007 | A | Datáfono con error/rechazo: permitir volver al inicio del cobro y cambiar/reintentar medio; intento incierto no se da por fallido: consulta/reconciliación obligatoria antes de recobrar. |
| D-008 | A | Independencia entre factura emitida/enviada, entrega al cliente, orden de impresión y papel efectivamente impreso; minimizar soporte de múltiples drivers en el núcleo. |
| D-009 | A | F07 devoluciones/cambios/reembolsos sólo ejecutados por personal autorizado. |
| D-010 | A | F08 pedidos queda pendiente para profundizar después; conservar enlace y crear pedido/entrega programada como capacidad definida sin cerrar todo el workflow. |
| D-011 | A | Catálogo de **dos niveles**: vista resumida y ficha detallada al seleccionar producto, con presentaciones, cantidades, información y precios escalonados. |
| D-012 | C | Encontrar productos por búsqueda textual/SKU/barcode, luego por marca/categoría, y por atributos descriptivos combinados si no recuerda producto; filtros combinables, sin inventar atributos. |
| D-013 | C | Bloque de cliente encima del carrito; búsqueda y creación/edición bajo permisos; consumidor final según reglas fiscales. |
| D-014 | C | Suspender y recuperar carrito; **cobro pendiente es estado diferente**, jamás resetear pago ya iniciado como borrador libre. |
| D-015 | C | Checkout permite venta inmediata o pedido para recoger/entrega posterior, pagado ahora o pendiente según reglas; no duplicar venta ni fiscalizar antes del evento legal pertinente. |
| D-016 | C | Navegación operativa de POS: Venta, Suspendidas, Cobros pendientes, Pedidos, Mi turno, Más. Gestor de pedidos con semáforo y roles separados. |
| D-017 | P | Botón flotante de Pedidos cerca del encabezado del catálogo: mockup explorado, no ubicación definitivamente aprobada. |
| D-018 | C | Header informa sede, caja, cajero, turno, conectividad y sincronización; evita duplicar funciones en shell. |
| D-019 | C | Arquitectura UI: Header informa; Navegación conecta; POS workspace ejecuta; estado compartido fuera de pantalla/dialog desmontable. |
| D-020 | C | Seis contratos UI: FLOW, SCREEN, TEMPLATE, COMPONENTS, RESPONSIVE y ACCESSIBILITY; derivarlos de flujos aprobados, no revisión manual exhaustiva de cada documento. |
| D-021 | C | Flujo → contrato → vertical slice: usar PrimeReact de base, evitar átomos propios redundantes; tablet/móvil desde mismos componentes funcionales. |
| D-022 | C | Trabajo paralelo OpenCode con worktrees y límites exclusivos por archivos; integrador único del estado, shell, overlay y contratos compartidos; Claude audita. |
| D-023 | C | F13 datos móviles son conectividad alternativa; offline requiere persistencia local/autorización y sincronización idempotente real. |
| D-024 | C | Inventario de conteo por ayudante físico + cajero registrador + supervisor de diferencias; no ajustar stock automáticamente al contar. |
| D-025 | C | Arquitectura de negocio componible ADR-001: plataforma → dominios → capacidades → perfiles → configuración → extensiones, sin codificar sectores rígidos. |
| D-026 | C | Backend candidato Frappe/ERPNext, POS Core propio; no modificar ERPNext core; validar transacciones, permisos, cierres, DIAN y desempeño. |
| D-027 | C | Documentación oficial con estado y decisiones priorizadas para que Codex no dependa exclusivamente de contexto parcial de chats; código/proofs determinan implementación. |
| D-028 | A | PIM + DAM y Radar de Precios son microapps opcionales, vendibles aparte o integrables; **limpieza de datos** es servicio independiente, no responsabilidad automática del PIM. |
| D-029 | C | Producto ERP/POS internacional por capacidades, fiscalidad por proveedor externo y país cuando proceda; no convertir el núcleo en un proveedor tecnológico fiscal extranjero. |
| D-030 | V | Fiscalidad internacional, protección de datos, costos por país y términos del servicio: validar legalmente antes de comercializar. |
| D-031 | V | Estado real de PrimeReact, 38 endpoints OpenAPI, 86 funciones del informe y reglas 00–07: sólo auditable en working tree actualizado, no aprobado como código existente por inferencia. |
| D-032 | V | Impuestos, reconocimiento, soportes, conciliación, contabilidad colombiana, emisión fiscal y funcionamiento ERPNext: aprobación profesional y pruebas necesarias. |
| D-033 | P | Recomendación de arqueo ciego, separación ejecutor/aprobador/conciliador y umbrales por empresa; valores monetarios de umbral pendientes. |
| D-034 | C | Pagos Nequi, Daviplata, Bancolombia, Bre-B, tarjeta, efectivo, mixto y crédito: UI contextual y cuentas de destino configuradas por administrador, no formularios largos. |
| D-035 | C | Venta, cobro, emisión fiscal, envío de documento, impresión y entrega son procesos con estados distintos, aunque el cajero vea una acción compacta. |
| D-036 | P | Criterios WCAG 2.2 AA y breakpoints iniciales de contratos históricos son objetivos propuestos, no certificación. |
| D-037 | A | F10 se redefine como **Control, conciliación y cierre integral de caja**: informe X repetible, conciliación de facturación/ingresos/egresos/custodia, arqueo físico solo del efectivo, incidencias y cierre Z único/auditable. No crea una segunda contabilidad ni reemplaza documentos fiscales. |

## Orden de precedencia y conflictos conocidos
1. **Modelo simplificado anterior → estándar empresarial vigente (D-001)**.
2. Verificación de transferencia sin foto → **con varias fotos y revisión antes del envío (D-005)**.
3. Catálogo con vista única → **resumen + ficha (D-011)**.
4. Impresión implícita al facturar → **estados separados (D-008)**.
5. F08 era prioridad de detalle → **aplazado para profundización (D-010)**.
6. Auditoría antigua sobre Next/shadcn de rama Frappe **no invalida** Vite/PrimeReact aprobado pero no verificado en árbol nuevo.
7. El documento histórico v0.1 de pos-proofs NO incluye necesariamente las decisiones D-001..D-037; leer siempre primero este registro.

## Qué aún no está resuelto
- Verificación del frontend real `capa-2-responsive` (rama local aparentemente no publicada) y si `pos-proofs` ya existe allí.
- Contratos API definitivos, persistencia durable, idempotencia, estados de checkout, propiedad de overlays y merge de agentes.
- Clasificación contable colombiana, impuesto por línea, momento de expedición DIAN, conservación comprobantes, recepción/bancos, cierre.
- Diseño detallado F08, periféricos específicos, políticas offline por operación, gestión de discrepancias y límites por empresa.
- Los documentos publicados en GitHub son **documentación**; ningún componente de producción se declara validado por este commit.

