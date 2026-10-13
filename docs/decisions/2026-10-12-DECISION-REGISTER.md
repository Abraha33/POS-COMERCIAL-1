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

## Orden de precedencia y conflictos conocidos
1. **Modelo simplificado anterior → estándar empresarial vigente (D-001)**.
2. Verificación de transferencia sin foto → **con varias fotos y revisión antes del envío (D-005)**.
3. Catálogo con vista única → **resumen + ficha (D-011)**.
4. Impresión implícita al facturar → **estados separados (D-008)**.
5. F08 era prioridad de detalle → **aplazado para profundización (D-010)**.
6. Auditoría antigua sobre Next/shadcn de rama Frappe **no invalida** Vite/PrimeReact aprobado pero no verificado en árbol nuevo.
7. El documento histórico v0.1 de pos-proofs NO incluye necesariamente las decisiones D-001..D-035; leer siempre primero este registro.

## Qué aún no está resuelto
- Verificación del frontend real `capa-2-responsive` (rama local aparentemente no publicada) y si `pos-proofs` ya existe allí.
- Contratos API definitivos, persistencia durable, idempotencia, estados de checkout, propiedad de overlays y merge de agentes.
- Clasificación contable colombiana, impuesto por línea, momento de expedición DIAN, conservación comprobantes, recepción/bancos, cierre.
- Diseño detallado F08, periféricos específicos, políticas offline por operación, gestión de discrepancias y límites por empresa.
- Los documentos publicados en GitHub son **documentación**; ningún componente de producción se declara validado por este commit.

## Aprobaciones adicionales expresas — 2026-10-12, después de D-036

El usuario aprobó explícitamente la propuesta funcional integrada para **los grupos 3, 4, 5, 7 y 8**. Los contratos vinculados quedan en nivel **A (funcional aprobado)**, no en estado de implementación. La aprobación comprende reglas operativas descritas; decisiones contables/fiscales, umbrales y contratos API conservan validación independiente.

| ID | Nivel | Decisión nueva o aclaración de precedencia |
|---|---|---|
| D-037 | A | **Grupo 3/CAT**: catálogo maestro único, CAT-01..08, UOM/variantes, búsqueda multifiltro, lista por cliente, escala por volumen, promociones controladas, importación con previsualización y un motor de precios determinista con regla ganadora explícita. Sin acumulación automática de beneficios. Ver [CAT v1](../catalog/CAT-PRODUCTS-PRICING-V1.md). |
| D-038 | A | **Grupo 4/INV**: INV-01..10, entradas por recepción aceptada, físico/reservado/disponible/no vendible/en tránsito, conteos diarios por zona, discrepancias aprobadas, traslados, merma y política de inventario negativo bloqueado por defecto. Ver [INV v1](../inventory/INV-ZONES-CYCLE-STOCK-V1.md). |
| D-039 | A | **Grupo 5/COM**: COM-01..08, compra rápida (según permisos) y compra controlada, recepción parcial, comparación documento/orden/mercancía, devoluciones, costos adicionales y pagos reutilizando CAJ-05/TES-06. Ver [COM v1](../purchasing/COM-PURCHASING-SUPPLIERS-V1.md). |
| D-040 | A | **Grupo 7/PED**: PED-01..08, base funcional de bandeja pipeline con etapas de preparación, prioridades, pedido parcial, empaque, despacho, entrega e incidencias. **F08 continúa aplazado para implementación** según D-010; su definición base ha sido aprobada. Ver [PED v1](../orders/PED-ORDERS-FULFILLMENT-V1.md). |
| D-041 | A | **Grupo 8/REP**: REP-01..09, informes X/Z, consolidado sede, historial, KPIs comerciales, inventario/zonas, cartera, auditoría y exportaciones controladas; fuentes financieras únicas. Ver [REP v1](../reports/REP-REPORTS-AUDIT-V1.md). |
| D-042 | A | **Conteo diario por zonas**, con semáforo ROJO urgente, AMARILLO próximo, VERDE al día, GRIS no disponible; prioridad independiente del estado sesión/reconteo/aprobación. Local ilustrativo 7 zonas, sin número fijo; ayudante cuenta, cajero registra, supervisor valida; operaciones concurrentes ajustadas por punto de corte. No suponer todas las zonas contadas cada día salvo política empresa. |
| D-043 | A | Para **priorización de pedidos**, la propuesta reciente aprobada usa **fecha prometida/riesgo de incumplimiento → verificación de pago → orden de llegada**, configurable por empresa, con opción histórica **pagados → parciales → no pagados**; la posición de cola debe ser explicable. Esta aclaración actualiza el default de propuestas antiguas sin eliminar su disponibilidad como opción. |
| D-044 | A | **F10/CAJ-07** integra control de documentos y movimientos más allá del efectivo: ventas/facturas a crédito, cobros cartera, pagos proveedor, compras contado, gastos, transferencias, devoluciones, anticipos, arqueo y X provisional/Z definitivo; REP-01..03 reutilizan el mismo corte. X/Z son reportes internos, nunca sustituyen la obligación DIAN. |

### Límites de esta aprobación
1. Los cinco grupos se consideran **funcionalmente aprobados en v1**; no implica que sus subflujos estén implementados, integrados o evaluados legalmente.
2. D-010 se conserva para la **prioridad de implementación de F08**, mientras D-040 aprueba su contrato funcional base. No marcar PED como "implementado".
3. CAT v1 no inventa listas/tarifas concretas; umbrales, redondeos, impuesto y tratamiento contable requieren validación.
4. INV diario no exige contar siete zonas todos los días; frecuencia y urgencia son políticas por empresa.
5. Si una política local contradice capacidad del backend o la normativa, registrar conflicto y abrir validación antes de activar la operación real.

## Encargo adicional de preparación técnica (2026-10-12)

El usuario autorizó **desarrollar documentación hasta etapa 3**, sin realizar etapa 4; **Pedidos/F08 y Offline/F13 fuera del alcance de este encargo**. Se registran nuevas hipótesis de diseño como `P`, para evitar elevar automáticamente todas las decisiones que el asistente derivó a políticas aprobadas.

| ID | Nivel | Alcance y estado |
|---|---|---|
| D-045 | A | El encargo documental llega a **Etapa 1 (flujos), Etapa 2 (seis contratos UI), Etapa 3 (esquemas/adapters/mocks)** y se detiene antes de construcción/QA etapa 4. Documentar el resultado en `docs/contracts-v1/`. |
| D-046 | A | **F08 Pedidos y F13 Offline** se conservan **por separado**, sin profundizar su UI/API/estados/mocks en este paquete. Se respetan los contratos/decisiones previos sin revocarlos. |
| D-047 | P | Propuesta F07: tipos devolución comercial/garantía/retracto/corrección diferenciados, inspección stock, efecto fiscal/financiero por separado, refund UNKNOWN no duplicable. Derechos legales sujetos a especialista. Ver `docs/contracts-v1/01-functional/F07-RETURNS-EXCHANGES.md`. |
| D-048 | P | Propuesta CLI: cliente/identificación, crédito con exposición concurrente, abonos multi-factura, anticipos, saldos de cartera, privacidad y validaciones. Ver `docs/contracts-v1/01-functional/CLI-CUSTOMERS-CREDIT.md`. |
| D-049 | P | Propuesta ADM/F14: jerarquías empresa/sede/caja, roles y grants, cuentas destino versionadas, periféricos, fiscalidad delegada, importaciones seguras. Ver `docs/contracts-v1/01-functional/ADM-POS-OPERATIONS-CONFIG.md`. |
| D-050 | P | Etapa 2: base UI reusable de seis secciones y nueve paquetes por dominio incluyendo POS Venta; evitar crear 43 pantallas o reimplementar PrimeReact. `docs/contracts-v1/02-ui/`. |
| D-051 | P | Etapa 3: DTO/Zod **declarativos**, operaciones API **lógicas**, puertos de adapters, estados/roles/errores y escenarios MSW **documentados**. Sin endpoints reales, handlers, tests o implementación. `docs/contracts-v1/03-data/`. |
| D-052 | P | Propuesta operativa: F09 consume CAJ-05, F10 CAJ-07/REP X/Z, F11 REP-04..09; no crear ledgers/reportes paralelos. `docs/contracts-v1/01-functional/POS-F09-F10-F11-CONVERGENCE.md`. |

### Regla de gobernanza específica
La autorización a documentar no aprueba automáticamente **porcentajes financieros, tratamiento de impuestos/garantías, endpoints, decisiones de ERPNext, umbrales, campos exactos ni pruebas**. Cualquier contradicción entre nuevas propuestas P y decisiones D-001..D-044 nivel A se resuelve a favor de las A previas. Antes de etapa 4, cotejar el frontend real con `capa-2-responsive` y OpenAPI real.


## F08 — Nuevas decisiones posteriores a D-052 (2026-10-12)

| ID | Nivel | Decisión / consecuencia |
|---|---|---|
| D-053 | A | Usuario reactiva F08 **solo para cerrar documentación de etapas 1, 2 y 3**. **Etapa 4 no autorizada**. La exclusión histórica de F08 en D-046 aplicaba al paquete previo, no al nuevo encargo separado. |
| D-054 | A | F08 **omnicanal**, rápida y sin burocracia: preparador ve SKU/variante, cantidad y ubicación; indica `No encontré` o toma parcial en una acción y continúa; faltante lo resuelven personas autorizadas por separado. |
| D-055 | A | **Autorizaciones por persona, operación, contexto y vigencia** (puntuales/temporales/permanentes), NO por cargo fijo; asignar la tarea no otorga automáticamente permiso para caja. Quien decide proveedor, entrega dinero, compra y recibe puede ser distinta persona o la misma con grants válidos. Regla transversal para Holamigo. |
| D-056 | A | Falta de mercancía: consultar stock/ubicación por distintas bodegas y, si procede, establecimientos locales y microapp Radar **opcional**; contactar fuente, elegir y asignar compra. Fallar compra ("No había") vuelve a búsqueda conservando intento, responsable y **dinero adelantado bajo custodia**; no crear burocracia ni pagos duplicados. |
| D-057 | A | Meta de calidad: antes de listo/despacho verificar referencias, variantes y cantidades contra versión aceptada del cliente; entrega parcial se identifica expresamente y no se muestra como pedido completo. Garantía de 100% es objetivo, no rendimiento medido. |
| D-058 | A | Estado de pedido, avance de preparación, pago, calidad, stock, faltantes y entrega se mantienen independientes; la urgencia/prioridad conserva D-043. Datos de zona pueden ser probables, stock oficial por bodega, mostrar fecha/fuente. |
| D-059 | P | Propuesta técnica derivada de A anteriores: tres espacios UI, submáquina de cinco estados humanos de faltante, DTOs/operaciones lógicas, grants específicos, 20 escenarios MSW **solo descriptivos**. [Paquete de diseño F08](../orders/F08-STAGES-1-3-INDEX.md). Validar con API/backend real antes de implementar. |

**Regla de precedencia:** D-053 permite documentar F08 en un paquete posterior sin alterar que D-046 excluía el trabajo anterior. F08 sigue sin código ni validación de conectores. Las prioridades de D-043 no se sustituyen automáticamente. F13 sigue excluido.


## F13 Offline — Decisiones y propuestas documentadas tras D-059 (2026-10-12)

| ID | Nivel | Alcance y efecto |
|---|---|---|
| D-060 | A | El usuario aprueba **documentar F13 hasta etapas 1, 2 y 3**, sin construcción de etapa 4. La exclusión anterior D-046 aplicaba a un paquete anterior, igual que F08; ambas historias se conservan. |
| D-061 | A | Producto **offline ligero, automático, sin ERP paralelo**, orientado a consulta catálogo/cache, borradores/suspensión carrito, captura de picking/faltantes F08 asignados y conteos locales; indicadores discretos y sincronizar al recuperar conectividad. |
| D-062 | A | **Control conservador:** transferencias/bancos sin verificación, no declarar pagos confirmados por foto; no emitir documentos fiscales aceptados ni cierres Z definitivos offline; no ajustes de inventario oficiales offline. **Venta efectivo provisional condicionada**, DESHABILITADA por defecto hasta políticas fiscal, financiera y técnica validadas. |
| D-063 | A | Integridad: operaciones locales etiquetadas pendientes hasta ACK; idempotencia + consulta estado ante `UNKNOWN`, no duplicar pagos, stocks ni pedidos; avisar sólo conflictos que requieren revisión. Autorización por persona/operación/contexto/vigencia conforme D-055; permisos en servidor al reconectar. |
| D-064 | P | Tecnología candidata: PWA/Service Worker + IndexedDB con snapshots mínimos y outbox, salud backend, sincronizador preferentemente foreground, ACK por evento, backoff y almacenamiento sujeto a cuota/evicción. **No se ha auditado frontend ni probado plataformas.** |
| D-065 | P | Arquitectura de etapas 2/3: seis contratos UI, estados, datos lógicos, operaciones candidatas, matrices de errores y 20 escenarios de mocks descritos. [Índice del paquete F13](../offline/F13-STAGES-1-3-INDEX.md). Requieren mapeo OpenAPI/ERPNext y validaciones de DIAN, banca, seguridad, límites y tests. |

## Contratos para carriles paralelos (2026-10-12)

| ID | Nivel | Alcance y efecto |
|---|---|---|
| D-066 | A | El dueño aprueba los contratos de **conteos, ajustes y reportes** para que los carriles `inventory` y `reports` puedan construir: `POST /inventory/adjustments`, `POST /inventory/counts`, `GET /reports/sales-summary`, `GET /reports/aging` y `GET /reports/inventory-valuation` pasan a `x-approval: approved` con las reglas BR-AJU-01..04, BR-CNT-01..03 y BR-REP-01..03. **No** aprueba lo que el contrato aún no modela: conteo diario por zonas con doble rol (D-042), ajustes con aprobación (D-038), cierres X/Z (D-044) ni permisos por reporte; eso exige un PR `contract:` nuevo. Sigue siendo mock, sin backend real. La brecha de BR-REP-03 (costo promedio por sede) se mantiene. |
| D-067 | A | El dueño aprueba (2026-10-13) las operaciones de **clientes, compras y administración** de la hoja 08, para que los carriles `customers`, `purchases` y `administration` puedan construir (18 operaciones, ahora `x-approval: approved`): `POST /customers`, `PUT /customers/{id}`, `POST /customers/{id}/payments`, `GET/POST /receivables/{id}/payments`, `POST /suppliers`, `PUT /suppliers/{id}`, `POST /purchase-orders`, `POST /purchase-orders/{id}/send`, `.../receive`, `.../cancel`, `POST /payables/{id}/payments`, `POST /employees`, `PUT /employees/{id}`, `GET /branches`, `PUT /branches/{id}`, `GET /company`, `PUT /company`. Respaldan permisos BR-PER, cartera BR-CAR (salvo BR-CAR-03, que sigue SUP), compras BR-COM y administración BR-ADM-04..06. **Siguen `proposed`:** devoluciones (hoja 07), historial de turnos (`GET /pos/shifts`, BR-REP-04), relevo, solicitudes de aprobación, sincronización, paquete de país, pedidos, comprobantes de pago (salvo los ya aprobados) y recibos/reimpresiones. Sigue siendo mock, sin backend real. |

**Precisión de aprobación (F13):** "me gusta, documéntalo" aprueba dirección/encargo de especificar; no homologa automáticamente emisión de comprobantes no fiscales, fiscalidad, política de ventas efectivo, importes/caducidad ni seguridad. Los DTO/APIs siguen propuestos P. **Etapa 4 no realizada.**
