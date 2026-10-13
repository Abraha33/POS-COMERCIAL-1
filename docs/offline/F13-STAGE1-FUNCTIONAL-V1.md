# F13 — Etapa 1: continuidad operativa offline con límites de seguridad

**Fecha:** 2026-10-12. **Estado:** propuesta funcional derivada de la recomendación aceptada por el usuario; documentación, NO ejecución de código ni habilitación de facturación sin red. **Alcance:** POS F04–F06, F08 Pedidos, INV-04 Conteos y consulta de stock/catálogo. **No implementar:** etapa 4, DIAN, ERPNext ni integraciones en vivo.

## 1. Objetivo y decisión de producto
Cuando internet o el backend estén temporalmente inaccesibles, el negocio **no debe detener tareas locales que sean seguras**: consultar un catálogo previamente descargado, componer/suspender carritos, capturar conteos y continuar la preparación de pedidos ya disponibles en el dispositivo. Algunas **ventas provisionales en efectivo** son una capacidad **condicional** (deshabilitada por defecto hasta validar reglas tributarias, límites, seguridad y conciliación). No construir ERPNext/contabilidad completos en el navegador.

**Regla UX:** no mostrar formularios ni modales por perder conexión. Solo indicador pequeño `Conectado`, `Sin conexión`, `Sincronizando`, `Atención requerida`, número de acciones pendientes y posibilidad de abrir detalle de excepciones. Ante restauración, revalidar y sincronizar automáticamente si sesión/permiso válido y servicio accesible; pedir intervención humana solo ante conflicto real.

## 2. Matriz de operaciones según conectividad (defaults conservadores)
| Capacidad | Online | Offline con datos locales previamente habilitados | Invariante |
|---|---|---|---|
| Catálogo y búsqueda de producto/precio | Autorizado por catálogo CAT | **Sí, consulta cacheada** con fecha, versión y advertencia de vigencia | Precio histórico/cached no es cotización garantizada |
| Crear/editar carrito | Sí | **Sí, borrador local** | Sin venta fiscal ni pago confirmado por crear carrito |
| Suspender/recuperar carrito | Sí | **Sí, ligado a usuario/sede/dispositivo** | No cruzar carritos ni revivir PaymentSession desconocida |
| Venta en efectivo | Confirmación normal | **Solo venta provisional**, política habilitada/validada; límite/custodia y número de comprobante interno inequívocamente no fiscal | Dinero físico recibido ≠ factura fiscal aceptada; requiere conciliación |
| Efectivo devuelto/cambio | Sí | Solo asociado a venta provisional permitida y cuenta física local, con responsabilidad del custodio | No duplicar efectivo en cierre/ERPNext |
| Transferencias, Nequi, Daviplata, Bre-B, banco | Verificar por fuente externa | **Solo nota de pago informado/pendiente**; jamás marcar acreditado | Captura/evidencia no verifica banco; no repetir cobro |
| Tarjeta/datáfono y reembolso bancario | Según proveedor | **No iniciar ni reintentar cargos/reembolsos nuevos** por defecto; UNKNOWN se consulta al regresar | Evitar cargos duplicados |
| Venta a crédito / cambio de cupo | Verifica exposición viva | **Bloqueado por defecto**; excepción futura requeriría reserva de exposición previa verificable, no solo permiso | Varias cajas offline no conocen créditos concurrentes |
| Preparación de pedido F08 | Sí | **Sí, para pedidos/asignaciones descargados** y aún válidos por política | Progreso local pendiente de consolidación; evitar confirmar listo/despacho oficial sin validar |
| Marcar faltante F08 | Sí | **Sí, evento local pendiente**; alertas a otros usuarios no llegan por sí solas | No afirmar que autorizados recibieron alerta |
| Consultar stock por bodega/zona | Oficial/operativo actualizado | **Sí, último snapshot claramente estimado** con `asOf`; ubicación probable no garantizada | No reservar ni descontar stock oficial localmente |
| Conteo físico por zonas INV | Sí | **Sí, capturas físicas locales** con cortes/timestamps y persona | Ajuste del stock oficial nunca automático |
| Traslados y ajustes de stock | Transacción autorizada | **No publicar**; se puede preparar borrador sin modificar ledger | ERPNext autoridad |
| Compras y adelantos a empleado | Autorización y custodia normal | **No desembolsos definitivos ni autorizaciones nuevas** por defecto | No entregar fondos basados solo en permiso cacheado |
| Devoluciones, anulaciones y reembolsos | Reglas y servidor | **No confirmar cambios financieros/fiscales** | No ejecutar reintegros no conciliables |
| Cierre X y Z | Datos vivos, conciliación de turno | X histórico **solo consulta** y rotulado como snapshot previo; **Z definitivo bloqueado** | No cerrar turno con eventos locales sin conciliar |
| Documentos DIAN / documento equivalente | Vía flujo fiscal/PT | **No afirmar emisión/aceptación fiscal**; contingencia únicamente mediante procedimiento validado por asesor/PT y reglamento aplicable | Recibo local no reemplaza factura legal |
| Gestión de usuarios/permisos/configuración | Servidor | Solo consulta mínima de autorizaciones offline *previamente emitidas*, sin editar ni conceder permisos | Revocación no comprobable offline; permisos sensibles cerrados |

**No confundir "hotspot de celular" con offline:** si el dispositivo accede al backend/ERPNext y servicios necesarios mediante red móvil, la sesión sigue online; si solo funciona LAN o internet parcial, comprobar conectividad específica del backend, no solo icono Wi-Fi.

## 3. F13-01 — Preparación segura ANTES de la caída
- Solo equipos registrados y perfiles autorizados pueden disponer de modo offline; el servicio entrega **paquete firmado/versionado por tenant/sede/usuario/dispositivo y ventana de vigencia** con catálogo necesario, descuentos/precios permitidos, tareas F08 asignadas, ubicaciones y política de acciones.
- Precargar únicamente datos operativamente necesarios, no todo el ERP, todo el inventario histórico, cuentas bancarias o todos los clientes. Proteger PII; definir minimización y caducidad por empresa.
- Un equipo que nunca preparó los datos **no puede prometer operar offline**, aunque la página PWA abra sin red. Si faltan datos, mostrar "No disponible sin conexión" y acción de recuperación segura.
- PWA/service worker permite abrir shell con assets cacheados cuando el navegador lo soporta. IndexedDB local contiene snapshots y outbox de acciones. Navegador podría eliminar datos, permisos pueden expirar; exigir monitoreo de capacidad/cuota/persistencia y mecanismos de respaldo/rescate cuando sea viable. No prometer durabilidad absoluta de almacenamiento cliente.
- Si hay turnos activos o PaymentSessions `UNKNOWN`, no convertirlos automáticamente en nuevas ventas locales, ni perder identificadores.

## 4. F13-02 — Detección y transición online → offline
- Detectar salud **real del backend autorizado** y latido de sincronización; navegador `navigator.onLine` no es prueba suficiente.
- No cortar una operación ya iniciada; si un POST pudo procesarse, conservar `operationId`/`idempotencyKey` y registrar `resultado desconocido`. **No enviarlo de nuevo como transacción nueva**.
- Encender capacidades offline previamente permitidas; CTA de cobro bancario, fiscal, cierre y ajustes definitivos se desactivan con explicación breve.
- Preservar carrito y tareas de preparación; cada captura tiene actor, tenant/sede/caja/turno cuando aplique, dispositivo, fecha local informativa y secuencia causal.

## 5. F13-03 — Operación local eficiente por dominio
**Venta:** preparar carrito y suspender; venta en efectivo provisional solo con `offlineCashSalesEnabled`, límite temporal/importe, turno custodio, referencia no fiscal y conciliación posterior. Si cambia precio/cliente/stock mientras no hay servidor, conservar captura original y presentar diferencias tras reconexión antes de contabilizar definitivamente.

**Pedidos F08:** solo pedidos/ítems descargados y asignados. Registrar `Tomé N`, `No encontré`, observaciones opcionales y avance; no realizar compras/entregas de dinero ni sustituir SKU automáticamente. Preparador puede seguir con otros productos; notificación a persona autorizada se entrega **al sincronizar**, no por magia durante desconexión. Verificación local puede registrarse, pero marcar `Listo oficial` o `Entregado` exige política de captura física + reconciliación; un evento local es **provisional hasta ACK servidor**.

**Inventario:** capturar conteos en zona con hora/actor, SKU/UOM y cantidad física. Mostrar posición última conocida y fecha; no calcular ajustes definitivos durante interrupción. Al reconectar, cruzar movimientos oficiales ocurridos mientras hubo desconexión y presentar diferencias antes de aprobar.

## 6. F13-04 — Recuperación y sincronización sin burocracia
1. Detectar backend saludable + identidad/sesión vigente + dispositivo autorizado.
2. Consultar **primero** operaciones de resultado incierto por `operationId/idempotencyKey` para evitar doble cobro/cierre/stock.
3. Enviar eventos de outbox en **orden causal por agregado** (venta/pedido/conteo), con una clave de evento estable. No asumir orden global entre cajas.
4. Validar permisos actuales, revisión de entidad, regla/precio vigentes y compatibilidad de stock; servidor **acepta / ya aplicado / rechaza / requiere conciliación / resultado incierto**.
5. Confirmar ACK durable antes de marcar `sincronizado`; conservar registros no conciliados, no borrarlos por cerrar pestaña.
6. Resolver automáticamente coincidencias idempotentes y eventos independientes (p.ej. dos líneas distintas), **no** resolver automáticamente conflictos de dinero, SKU/variante, cantidades o documento fiscal.
7. Presentar una bandeja compacta de **Atención requerida**, con opción revisar/reasignar o derivar; no forzar al cajero a navegar reportes y tablas técnicas.

## 7. F13-05 — Conciliación y límites de operación
- **Entre múltiples cajas sin red:** stock/cupos/pagos cambian en paralelo. Disponibilidad local = dato desactualizado/estimado, nunca garantía, y no bloquear stock oficial mediante contador local.
- **Efectivo provisional:** al volver, asignar ingreso al turno correcto sin contabilizar 2 veces; distinguir documento interno de venta/fiscal real. Diferencias no desaparecen con reintento ni se absorben en Z silenciosamente.
- **Conflicto pedido:** servidor cambió líneas/versión aceptada mientras preparador estaba offline → preservar captura y comparar línea por línea con solicitud aceptada actual; no marcar listo automáticamente.
- **Conteo:** aplicar movimientos de ledger entre `cutoffAt` y `capturedAt` por SKU/warehouse y revisar discrepancias; una venta offline provisional todavía no es salida oficial.
- **Seguridad:** quien perdió autorización mientras estuvo offline no obtiene permiso implícito; las acciones no sensibles capturadas quedan pendientes de evaluación server-side y un grant cacheado vencido bloquea acciones. Las operaciones prohibidas nunca dependen del cargo nominal.
- **Fiscal/legal:** política de contingencia FEV/DEE POS según país, PT y DIAN, antes de permitir documento fiscal o entrega de recibo que pudiera confundirse con factura. En ausencia de validación, mantener recibo interno no fiscal o suspender transacción, conforme corresponda.

## 8. F13-06 — Cierre de incidente y métricas
- Incidente offline termina solo cuando outbox del equipo/turno está vacío **o** sus casos están formalmente documentados para continuación supervisada; no equiparar reconexión con conciliación.
- Medir: duración de caída, operaciones capturadas/confirmadas/rechazadas/desconocidas, edad de pendientes, conflictos por tipo, pérdida de trabajo, operaciones duplicadas (meta 0), tiempo medio de recuperación y calidad de despacho afectada.
- Experiencia mínimo ruido, pero auditoría append-only por persona/autorización, dispositivo, origen y eventos relevantes. No exigir al usuario llenar "reporte de caída".

## 9. Condiciones y límites de política explícitos
- Offline para un dispositivo/tenant/sede requiere **activación consciente**; operaciones riesgosas deshabilitadas por defecto.
- Ventana máxima de cache y número/valor de ventas provisionales configurables, no fijados sin aprobación.
- Política de ingresos offline, numeración fiscal, comprobante, retención de PII y soporte al cliente deben validarse con contador/asesor DIAN antes de lanzamiento.
- No construir backend local paralelo, saldos en vivo falsos, reconocimiento de transferencias por foto ni sistema universal offline de proveedores.
- El producto puede contar con modo "solo consulta" si seguridad/cumplimiento lo exigen.

## 10. Escenarios de aceptación funcional (NO probados)
1. Caída de internet durante carrito: el draft persiste y puede editarse; checkout bancario se bloquea.
2. Caja provisional en efectivo habilitada con tope vigente: genera movimiento/custodia local rotulado **provisional no fiscal**; al reconectar no duplica venta ni efectivo.
3. Usuario sin datos descargados: la PWA abre shell pero no pretende mostrar catálogo/stock "actual".
4. Persona prepara pedido cacheado de 10 unidades: toma 6, marca 4 faltantes, sigue otra línea; **ningún supervisor remoto se considera notificado hasta ACK**.
5. Conteo capturado durante ventas concurrentes de otra caja: conciliación espera ledger y considera tiempos/movimientos.
6. La misma transferencia reportada por cliente antes/después de caída nunca se marca `verificada` por nota local.
7. Timeout de cargo datáfono antes de desconexión: `UNKNOWN` sobrevive recarga; consulta resultado original, nunca cobra de nuevo automáticamente.
8. Usuario pierde permiso online durante caída: backend rechaza al reconectar; acciones de mayor riesgo no pudieron ejecutarse offline.
9. Reintentar batch tras ACK perdido devuelve `ya aplicado` sin generar doble evento ni doble pago.
10. Cierre Z con pendientes/ventas provisionales exige conciliación previa; UI no permite falso cierre definitivo.
11. Navegador sin suficiente cuota/notifica borrado: sistema no declara "guardado seguro" sin confirmar persistencia de IndexedDB.
12. Cobro no permitido o valor sobre tope → bloqueo simple; permite conservar carrito.
13. Pedido modificado por otra caja entre captura y sincronización → tarea pendiente y resolución por versión, sin despacho completo incorrecto.
14. Caída del backend con Wi-Fi conectado se reconoce como modo degradado; conexión a hotspot funcionando con backend accesible se reconoce como online.

**Estado:** Etapa 1 especificada, parámetros operativos propuestos; política fiscal/financiera y compatibilidad ERPNext pendientes de contraste. No se ejecutó código.
