# F13 — Etapa 3A: modelo lógico de datos, operaciones y arquitectura de sincronización

**Tipo:** contrato descriptivo, NO API real, Zod compilable, PWA/Service Worker/IndexedDB implementados ni pruebas. **Fuentes:** [Etapa 1](F13-STAGE1-FUNCTIONAL-V1.md), [Etapa 2](F13-STAGE2-UI-SIX-CONTRACTS-V1.md), [matriz de operaciones](../contracts-v1/03-data/OPERATION-MATRIX.md). Autoridades POS Core/Frappe/ERPNext, CAJ/TES, INV, PED, fiscal PT y permisos del servidor. Las operaciones deben mapearse a OpenAPI real; nombres de este documento son **candidatos**.

## 1. Arquitectura de puertos, no un ERP duplicado
```text
POS / Pedidos / Inventario React
    ↕ commands + query cache
Client Domain Coordinator — capacidad efectiva, estados y separación draft/intento
    ↕ LocalPersistencePort (IndexedDB: snapshots mínimos + outbox + eventos)
    ↕ SyncCoordinator (foreground/reconnect, consulta UNKNOWN + revalidación)
    ↕ ConnectivityPort (salud backend, token, política, vigencia)
      → POS Core API + dedupe/idempotencia + authorization/version check
        → ERPNext/Stock/Payments/Fiscal integradores de autoridad
```

**PWA:** cachea shell y assets versionados para abrir app sin red cuando navegador/instalación lo soportan. **IndexedDB:** persistencia de transacciones locales y snapshots con esquema y versionado; **CacheStorage/service worker** NO contienen datos sensibles sin plan de seguridad. Background Sync es **optimización no garantizada**: el disparador fiable es abrir aplicación o sesión foreground con red saludable; no prometer sincronía cuando equipo cerrado/sin permisos.

Sincronizar por eventos/operaciones explícitas, no reconstruir un backend local para facturar ni un ledger alternativo. `POST` idempotente exige **dedupe durable en servidor**, no solo botón bloqueado en navegador.

## 2. DTO candidatos y reglas para futura validación Zod
| Entidad/DTO | Campos lógicos | Validación/invariante |
|---|---|---|
| `OfflineDeviceBinding` | deviceId, tenantId, siteIds, registerIds?, attestedIdentity?, status, registeredAt, lastSeenAt | Aislamiento tenant/sede y terminales; desactivar dispositivos remotamente al reconectar |
| `OfflinePolicyPackage` | policyId, tenant/site/deviceScope, issuedAt, expiresAt, version, serverSignatureRef, allowedCapabilities[], maxLocalOperations?, maxCashAmountMinor?, fiscalMode, cacheTTL | Verificación autenticidad y expiración, fail-closed para riesgos |
| `CachedGrant` | grantId, personId, operation, context, amountLimitMinor?, validFrom, validUntil, policyVersion, signature | Mínimo permiso. Caducidad no garantiza revocación offline: bloquear acciones sensibles y revalidar en servidor |
| `LocalSnapshot` | snapshotId, aggregateType, aggregateId, tenantId, siteId, revision, sourceAsOf, expiresAt, payloadRef, provenance, allowedUse | Datos limitados, sin claves banco ni fotos sensibles por defecto; stock estimado |
| `LocalSaleDraft` | localSaleId, canonicalSaleId?, personId, shiftId, siteId, lines[], priceSnapshotRefs[], localRevision, status, createdAt | Borrador no mueve caja ni stock |
| `LocalCashProvisionalRecord` | provisionalId, relatedDraftId, internalNonFiscalRef, cashCountRef, amountMinor, issuedAt, createdBy, status, localEventId | Solo si política fiscal/contable permite; no factura DIAN ni venta definitiva |
| `OfflineOrderCapture` | orderId, acceptedSpecRevisionCached, personId, itemsCaptured[{lineId,sku,uom,qty}], shortageEvents[], deviceSeq, captureAt, status | Sólo pedidos previamente descargados/asignados; evento offline no avisa a remoto hasta ACK |
| `OfflineCountCapture` | countSessionId, zoneId, warehouseId, cutoffAt, captureAt, lines[{sku,uom,qty,actor}], ledgerSnapshotRev?, status | Conteo local sin ajuste stock oficial, conciliación temporal por línea |
| `OutboxEvent` | localEventId, aggregateId/type, tenantId, siteId, deviceId, actorId, policyVersion, grantRef, operationKind, payloadRef, baseRevision, dependencyEventIds[], sequence, idempotencyKey, status, createdAt, persistedAt, retryState | clave estable para mismo evento; dependencia no se pierde; payload no autoritativo para precio/fiscal |
| `SyncBatch` | batchId, deviceId, tenantId, eventIds[], createdAt, resumedAt?, stage, serverCursor?, lastAckAt? | Repetición no duplica; ACK por evento, no únicamente por batch |
| `SyncAck` | localEventId, serverOperationId?, canonicalAggregateId?, appliedRevision?, result(applied/already_applied/rejected/needs_review/unknown), serverAt, warnings[], conflictRef? | Solo applied/already_applied confirmados eliminan "pendiente" en UI |
| `SyncConflict` | conflictId, localEventId, conflictType, currentServerRef?, localSnapshotRef, affectedQtyOrMoney?, safeResolutionOptions[], assignedAuthorizedId?, state | Dinero/stock fiscal nunca merge automático por "último gana" |
| `UnknownOperationRef` | operationId?, idempotencyKey, aggregateId, submittedAt, externalProviderRef?, lastStatus, lastCheckedAt?, manualReviewRequired | Consultar estado antes de reintentar cargo, pago, recibo, ajuste |
| `LocalStorageHealth` | deviceId, quotaEstimate?, persistedStorageGranted?, pendingCount, lastWriteConfirmedAt, lastBackupCheck?, needsRescue | UI no afirma almacenaje seguro si escritura falla |
| `OfflineAuditEvent` | eventId, deviceId, personId, capability, entity, occurrenceLocalAt, sequence, referencedSource, laterServerAt?, syncAckRef? | Auditoría append-only e identidad autoriza en servidor al publicar |

**Normas de datos:** cantidades decimal-string/UOM; dinero en unidad mínima/moneda; IDs estables; tiempo local meramente informativo, tiempo servidor autoridad; valores fiscales y precios no calculados en frontend como autoridad. No almacenar PAN, OTP, credenciales bancarias ni secretos en snapshots. Datos cliente mínimos, cifrado en tránsito y plan de cifrado local/en reposo conforme amenaza/equipo/entorno; IndexedDB por sí solo no garantiza aislamiento ante XSS ni usuarios del sistema operativo. Valorar `storage.persist()` sin prometer éxito.

## 3. Contratos de operaciones lógicas (NO endpoints HTTP)
| ID | Query / Command | Entrada | Respuesta/garantía |
|---|---|---|---|
| OFF.Q01 `offline.capabilityManifest` | persona, deviceId, tenant/site, session | allowed actions, cached scope, expiry, policy version, signature |
| OFF.C01 `offline.prepareDevice` | device/person/site, subset products/orders/zones, policyVersion | snapshots y checksum; datos autorizados por servidor |
| OFF.Q02 `offline.backendHealth` | tenantId/device scope | status service/auth/queue, backend version/time |
| OFF.C02 `offline.stageLocalEvent` | draft/capture y UUID evento, sequence, baseRevision | **Confirmación local IndexedDB**, NO transacción oficial |
| OFF.Q03 `offline.localPending` | device/tenant/site/shift | pendientes + UNKNOWN + conflictos, acceso scope |
| OFF.Q04 `offline.unknownStatus` | operationId or idempotencyKey | ya confirmado/rechazado/pendiente/desconocido con fuente |
| OFF.C03 `offline.syncBatch` | eventos orden causal, grantsRef, revisiones, idemKeys | ACK por evento; servidor verifica autenticidad y permisos |
| OFF.Q05 `offline.syncOutcome` | batchId/localEventId | status individual, canonical IDs, revision, conflict |
| OFF.C04 `offline.resolveConflict` | conflictId, acción permitida, revisión oficial, approvalRef? | comando de reconciliación server-side, auditable |
| OFF.C05 `offline.refreshCapabilities` | device/user/grants/context | permisos/política actuales, revocación y vencimiento |
| OFF.C06 `offline.retryStatusCheck` | same operationId + idempotencyKey | retorno idempotente; no nueva transacción económica |
| OFF.Q06 `offline.storageReadiness` | local device & browser | persistencia/cuota/errores, solo diagnóstico local |
| OFF.C07 `offline.provisionalCashReconcile` | recordRef, shiftRef, original amount, cash custodian, snapshot | una contabilización validada y documento correcto o revisión |
| OFF.C08 `offline.orderCaptureReconcile` | orderId, cached accepted version, captures, eventIds | aplicar por línea si seguro o conflicto F08 |
| OFF.C09 `offline.inventoryCountReconcile` | zone/session, captures, ledger cutoff | revisar movimientos concurrentes, sin ajuste automático |
| OFF.C10 `offline.deviceHandover` | pendingEventSummary, from/to identity, safe custody policy | custodiar datos pendientes sin permitir lectura entre usuarios |

`stageLocalEvent` es operación **de cliente** y no servicio remoto en ausencia de red; mapear luego a puerto local distinto, no intentar implementarlo como REST. Las demás operaciones son propuestas lógicas y deben mapearse a API real/adapter. `syncBatch` no equivale a promesa "exactly-once" de transporte: lograr efecto observable una sola vez con **at-least-once delivery + deduplicación server-side**.

## 4. Protocolo de sincronización y dependencias
**Paso A:** restaurar contexto (device/user/tenant/site) y confirmar servidor saludable. Si token expiró, reautenticar con conexión; outbox persiste sin mostrar PII a un actor no autorizado.

**Paso B:** buscar estado de todas las operaciones previas `UNKNOWN` por `operationId / idempotencyKey`; consulta antes de reintento. Si la autoridad externa (PSP/PT/ERPNext) no permite confirmar, elevar caso a revisión, jamás adivinar éxito.

**Paso C:** verificar `OfflinePolicyPackage`, grant actual, origen/frescura/corte, revalidar precios/impuestos/cupo/stock; no aceptar campos monetary clientes como verdad.

**Paso D:** mandar outbox ordenado por dependencias **dentro de cada agregado**; los comandos que dependen de operación rechazada quedan `blocked` y pueden requerir remapeo/conciliación. Entre cajas no existe orden global de captura confiable, no asumir monotonicidad de sus relojes.

**Paso E:** backend devuelve ACK por evento: `applied`, `already_applied`, `rejected`, `needs_review`, `unknown`. Solo cerrar operación local después de ACK estable, referenciable y durable. ACK perdido → consultar primero y reenviar **igual idempotencyKey/eventID** si permitido.

**Paso F:** casos seguros mergean automáticamente (lectura/draft independiente y actualización a otra línea si versión compatible); errores sensibles se elevan a autorizado. Mantener historial de reconciliación aun después de limpieza autorizada del payload cacheado.

## 5. Políticas sobre almacenamiento, sincronización y sesiones
- Datos particionados por tenant/site/person/device; **el origen DOM o localStorage no es perímetro de seguridad suficiente**. Carga local reducida, nunca descargar cartera/inventario de otra sede por comodidad.
- Venta con medio mixto o banco pendiente NO pasa a pagada solo por guardar localmente. Comprobante de consignación es evidencia no verificación.
- Logout / cambio de caja / cambio de usuario con eventos pendientes: conservar outbox cifrado/aislado según threat model; mostrar custodia de operaciones antes de transferir equipo y no liberar PII al siguiente usuario. Si navegador borra datos, recuperación requiere respaldos o reconciliación de autoridad, no prometer rescate mágico.
- Schema IndexedDB versionado; migraciones futuro probar rollback y fallos de escritura. No usar service worker de versiones incompatibles para aplicar cambios que alteran dinero.
- Si servicio backend funciona pero API bancaria/DIAN falla, modo parcial basado en **capacidad**, no "todo está online".
- Polling sync bajo backoff y límites, foreground al reconectar; Background Sync solo si disponible y autorizado, sin garantía de ejecución inmediata.

## 6. Validaciones del adapter real antes de construir
- Frappe/ERPNext v real, pos_core, Stock Ledger/Stock Reconciliation, POS cash shifts, estados de Sales Invoice, Delivery Note y momento fiscal.
- Endpoints OpenAPI existentes, idempotencyKey persistida y durable ante caídas del servidor, status-by-ID, scopes/grants y transacciones.
- Pruebas de cuota/evicción de Chrome/Android/iOS navegadores objetivo; equipo compartido, XSS, archivos adjuntos/consentimientos.
- Normativa DIAN/FEV/DEE POS, comprobantes no fiscales, numeración/contingencia y obligación de expedir documentos; la etiqueta "provisional" no exime obligaciones legales.
- Reglas de límite por caja/turno, custodia del efectivo real, arqueo X/Z y recuperación sin doble contabilización.
- Verificación posterior a red para cambios de prioridad F08, SKU/variante, reservas, inventario en varios dispositivos.
- Impacto de precios cacheados/stock obsoleto en reclamaciones de clientes y aceptación de cambios.

**No ejecutado:** Zod, handlers MSW, Service Worker, IndexedDB, redes, reintentos, endpoints, mocks, pruebas, código o integración.
