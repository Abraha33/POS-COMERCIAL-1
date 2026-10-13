# F13 — Etapa 2: seis contratos UI del modo offline

**Estado:** documentación UI, no implementación; se apoya en [flujo F13](F13-STAGE1-FUNCTIONAL-V1.md) y [foundation](../contracts-v1/02-ui/UI-FOUNDATION-SIX-CONTRACTS.md). Frontend objetivo React/TS/Vite + PrimeReact, sujeto a auditoría del frontend realmente vigente. **Diseño:** discreto, semántico, mínimo ruido, sin modales repetitivos ni confundir "guardado local" con "servidor confirmado".

## 1. FLOW — Experiencia operativa y transiciones
| Estado | Señal visible | Acciones habilitadas | Recuperación |
|---|---|---|---|
| `online` | Sin alerta intrusiva; indicador opcional de estado saludable | Flujo normal sujeto a permisos; persistir drafts y operaciones con IDs | Ninguna |
| `degraded` | Pequeño aviso "Servicio intermitente", contador de operaciones inciertas | Solo capacidades confirmadas; comandos inseguros deshabilitados | Consultar estado backend por idempotencyKey |
| `offline_ready` | Barra delgada "Sin conexión · trabajando localmente" + pendientes | Carritos, pedidos asignados y conteos locales; efectivo provisional **si** habilitado | Guardar y mostrar `Pendiente de sincronizar` |
| `offline_unprepared` | "Sin conexión · datos no disponibles" + causa | Solo navegación/shell y drafts ya persistidos válidos | Volver a conectar; no prometer datos |
| `reconnecting` | "Conexión recuperada · validando" y progreso no bloqueante | Leer detalles, continuar captura segura según política; deshabilitar publicación definitiva | Revalidar identidad/grants y resolver UNKNOWN |
| `syncing` | Indicador compacto `Sincronizando 3 de 8` | No bloquear toda la app, bloquear solo agregados en conciliación riesgosa | ACK granular por operación |
| `attention_required` | Badge neutral advertencia + recuento, sin modal automático | Abrir cola de conflictos, ver diferencia/ayuda | Usuario autorizado resuelve lo imprescindible |
| `synced` | Indicador vuelve normal, aviso breve | Operación normal | No borrar evidencia requerida antes de políticas retención |

**Restricción:** detección de Wi-Fi no basta; UI recibe diagnóstico de salud servicio y capacidad offline del dominio. Ningún icono de red prueba que DIAN, banco o ERPNext están disponibles. Una operación de dinero UNKNOWN no se presenta como error reintentable estándar.

## 2. SCREEN — Solo dos superficies adicionales; adaptar las existentes
**A. Indicador global de conectividad / estado**
- En `OperationalHeader` del POS: conectividad real del backend, número pendientes, estado de los datos, acciones `Ver pendientes` cuando existan.
- Mensajes específicos en contexto: precio **"Última actualización 10:35"**, stock **"Estimado, no confirmado"**, pedido **"Cambios locales"**, pago **"Sin verificar"**, venta **"Provisional, no fiscal"**.
- Ningún banner persistente que tape carrito/CTA. Un aviso global compacto; más detalle al pulsar.
- El indicador cambia por estado real de cada operación; venta, pago, factura, preparación e impresión continúan independientes.

**B. Bandeja de operaciones pendientes / conflictos**
- Una lista por operación (sin entidades fiscales o financieras en bruto): hora, tipo, caja/sede, persona, `guardada en este equipo`, `enviada`, `verificando`, `confirmada`, `requiere atención`, `rechazada`.
- Detalle al seleccionar: diferencia entre captura local y estado oficial, razón, consecuencias e instrucción de un paso. Acciones contextuales `Consultar estado`, `Revisar`, `Volver a enviar` **solo** cuando se confirme que es seguro y con misma clave, `Solicitar ayuda`.
- Filtros mínimamente útiles: `Pendientes`, `Atención`, `Confirmadas`; una sola cola transversal con contexto/policies; no panel administrativo separado por cada submódulo.
- Visualización de respaldo/rescate local si cierre/logout/borrado puede eliminar trabajo pendiente; advertencia explicativa y acción segura.

**Pantallas existentes, variaciones offline:**
- **POS F04/F05:** buscar en catálogo cacheado, editar/suspender/recuperar; badge de precios obsoletos, opciones no vendibles claramente señaladas. El botón `Cobrar` solo habilitado para efectivo provisional permitido, y se rotula `Registrar venta provisional`, no `Facturar`.
- **Cobro F06:** medios bancarios, reembolsos y crédito sin autoridad vigente bloqueados; información bancaria reportada se registra como nota local no acreditada si política permite, nunca como `pagado`. PaymentAttempt UNKNOWN mantiene su ID y consulta pendiente.
- **Pedidos F08:** líneas y faltantes de pedidos previamente descargados; indicador `Cambios por sincronizar`. Evitar que `No encontré` dispare alerta supuestamente recibida en otra ubicación. `Verificado localmente` no equivale a `Listo oficialmente` si servidor exige conciliación.
- **Inventarios INV-04:** capturar cantidades, observaciones; snapshot de zona/stock fechado, no emitir ajuste.
- **Caja F02/F10:** efectivo físico puede contarse localmente como borrador; X histórico etiquetado como `corte anterior`; Z no disponible definitivo antes de conciliar.

## 3. TEMPLATE — Composición sin nuevas pantallas masivas
- `ConnectivityIndicatorSlot` en Header; no dueño del estado de conectividad, solo presentación.
- `OfflineAwareFeatureWorkspace` como *contrato de slots* `freshnessSlot`, `pendingActionSlot`, `capabilityGuardSlot`, `recoverySlot`; no reescribir cada módulo.
- `SyncInboxTemplate` lista compacta + detalle lateral/página móvil con filtro y CTA segura.
- `ConflictReviewPanel` incluye snapshot local, registro servidor, resolución autorizada, impacto en dinero/stock/calidad y confirmación, nunca "Sobrescribir" universal.
- `OfflineUnavailableState` compacto para operación sin snapshot/política.
- `OneOverlayHost` ya existente para revisión/permiso si imprescindible; no lanzar modales automáticamente al reconectar.
- Compartir `SaleDraftStore` y `PaymentSessionStore` legítimos, nunca crear checkout duplicado dentro de "OfflineWorkspace". Estado durable depende de servicio/ID, no ruta o modal.

## 4. COMPONENTS — Propiedades y eventos conceptuales
| Componente | Props imprescindibles | Evento | Invariantes |
|---|---|---|---|
| `ConnectivityStatus` | backendReachable, mode, lastHeartbeat, offlineCapable | inspect | Wi-Fi/OS online ≠ backend saludable |
| `PendingOpsCounter` | unsent, unknown, conflicting | openQueue | Recuento de eventos, no confundirse con ventas |
| `OfflineCapabilityGate` | resource, action, grantState, deviceReadiness, policyExpiry, permitted | viewReason | Interfaz no autoriza la operación: servidor reconfirma |
| `DataFreshnessLabel` | source, asOf, expiresAt, confidence | inspect | Oficial antiguo/estimado distintos |
| `LocalSaveStatus` | entityId, persistedAt?, persistenceConfirmed, localEventId | inspect | "Guardado" solo tras confirmación persistencia local |
| `SyncQueueRow` | localEventId, type, createdAt, syncStage, revision, result | inspect/queryStatus | Un evento por línea, retry no cambia su ID |
| `SyncProgress` | acknowledged, total, pausedCount, unknownCount | pauseView | Progreso de ACK, no progreso de upload ingenuo |
| `SyncConflictDetail` | captured, server, kind, actorCapability, options | resolve/escalate | Dinero/calidad nunca fusión automática arbitraria |
| `OfflineProvisionalReceipt` | localNumber, scope, value, capturedBy, nonFiscalLabel, pending | viewSameReference | No presentar como documento DIAN ni reemitir factura |
| `ScopedSessionWarning` | unsyncedSensitive, logoutOrSwitch, deviceId, serverReachable | seekSafeHandover | No borrar outbox con logout/switch sin custodiar |
| `RecoveryActions` | operationId, canQuery, canSafeRetry, canAskHelp | query/retrySameKey/askHelp | Nunca segundo cargo/ajuste por botón "Reintentar" |

**Errores UI comunes:** `loading`, `no_local_data`, `stale`, `persisting`, `saved_local`, `sync_pending`, `unknown`, `conflict`, `forbidden`, `quota_error`, `sync_complete`. Acciones riesgosas siempre requieren backend o política offline firmada/vigente y reconciliación.

## 5. RESPONSIVE — comportamiento por pantalla
| Vista | Escritorio 1366 px | Tablet 768 px | Móvil 375 px |
|---|---|---|---|
| Header | badge + "3 pendientes" a la derecha sin desplazar venta | solo status/contador, panel popover | icono + número con texto al desplegar, sin tapar CTA |
| Carrito y venta | precio/stock fechados al lado de ítem | etiqueta compacta en detalle | etiqueta bajo precio y CTA `Guardar borrador` accesible |
| Pedido | progreso y faltantes locales con aviso | lista de líneas, cambios pendientes en barra | `Tomé N` y `No encontré` accesibles con pulgar |
| Conteo | fila cantidad local guardada con hora | inputs reducidos | pantalla por SKU, estado guardado visible |
| Cola Sync | tabla densa + detalle | tarjetas + drawer | tarjetas una columna + pantalla detalle, acciones de recuperación abajo |

Zoom 200%, teclado, red de baja calidad y viewport de poca altura pendientes de prueba; modal no elimina drafts al cerrar. No inferir que el navegador del dispositivo ofrece Background Sync.

## 6. ACCESSIBILITY — objetivos para futura QA
- Estado de red, persistencia y resultado de operación por **texto**, no solo icono/color; anuncios live discretos al cambiar `Sin conexión`, `Guardado local` o `Requiere atención`.
- Teclado/escaner compatibles; evitar acciones duplicadas por Enter/lector, foco restaurado en overlays; navegación no depende de gestos.
- Errores de dinero/stock con nombre de operación, motivo y CTA seguro; nunca anunciar "venta confirmada" ante `saved_local`.
- Contraste y WCAG 2.2 AA como meta, no certificación; mensaje accesible cuando botón está inhabilitado y motivo.
- Ajustes por ancho/cantidad de texto sin truncar `NO FISCAL`, `SIN VERIFICAR` o `PENDIENTE`.
- Señales no intrusivas durante reconexión, salvo riesgo irreversible donde se pide confirmación explícita.

**Entregable:** seis contratos documentales UI, sin componente PrimeReact, CSS, mocks o pruebas ejecutadas.
