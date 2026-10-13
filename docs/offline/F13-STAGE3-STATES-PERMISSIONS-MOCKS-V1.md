# F13 — Etapa 3B: máquinas de estado, permisos, errores y escenarios de QA propuestos

**Estado:** diseño de contratos; NO mocks, tests, cola local o frontend operativos. Fuente: [Etapa 1](F13-STAGE1-FUNCTIONAL-V1.md), [UI](F13-STAGE2-UI-SIX-CONTRACTS-V1.md), [Etapa 3A](F13-STAGE3-DATA-SYNC-ADAPTERS-V1.md). Todo caso se considerará **PENDIENTE** hasta ejecución de etapa 4.

## 1. Máquinas de estado independientes
| Máquina | Estados lógicos candidatos | Condición de paso y cautela |
|---|---|---|
| `ConnectivityMode` | online → degraded → offline_ready/offline_unprepared → reconnecting → syncing → online/attention_required | Salud backend + políticas/capacidad; no depende solo Wi-Fi |
| `LocalSnapshot` | preparing → ready → stale/expired → refreshed/removed | Stale se puede consultar etiquetado si política; expired puede bloquear función |
| `LocalPersistence` | editing → persisting → saved_local / save_failed | Guardado local confirmado mediante transacción IndexedDB, NO backend |
| `OutboxEvent` | saved_local → waiting_dependencies → eligible → sending → acknowledged / already_applied / rejected / conflict / unknown | `sending` o HTTP 200 no son ACK aplicado; idemKey y evento constantes |
| `UnknownOperation` | possible_sent → querying_source → confirmed / rejected / unresolved_escalated | Nunca crear cargo distinto por timeout |
| `SyncConflict` | detected → review_requested → assigned → resolving → resolved / rejected_for_rework | No "last write wins" para dinero, SKU, inventario fiscal o pedidos con cambios |
| `OfflineCashProvisional` | captured → saved_local → sync_pending → reconciling → posted / correction_required / blocked_legal | No es factura, ni efectivo oficialmente conciliado al guardarse |
| `OfflineOrderCapture` | saved_local → queued → checked_against_version → applied / needs_review | Cambios F08 deben coincidir con versión aceptada antes de "Listo oficial" |
| `OfflineInventoryCount` | captured → queued → ledger_window_review → accepted_capture / recount_required / discrepancy_review | Captura no crea ajuste de stock |
| `DeviceReadiness` | not_prepared → prepared → expired / revoked / quota_unavailable | Datos/permiso pueden expirar, pérdida de almacenamiento no es manejable por UI |
| `SessionCustody` | active → handover_requested → isolated_pending → restored_by_authorized_actor | Logout no elimina datos ni expone tenant anterior en puesto compartido |

Estados `payment`, `fiscal`, `order`, `stock`, `delivery` que ya tienen sus contratos **no** se reemplazan por `offline=true`. Una venta provisoria no crea comprobante fiscal, salida de stock oficial o pago bancario acreditado de manera automática.

## 2. Permisos por persona (regla transversal D-055)
Cada capacidad se valida por **persona+acción+tenant+sede+caja+turno+dispositivo+vigencia+límite**, no por cargo. Una capacidad online **no autoriza automáticamente** operación offline. Propuestas de permisos:
| Capacidad | Offline | Precondición |
|---|---|---|
| `offline.readCatalog` | Sí | Datos scope cacheados, identidad local válida y ventana |
| `offline.editSaleDraft` | Sí | Usuario/dispositivo autorizados, datos suficientes |
| `offline.suspendDraft` | Sí | Sin PaymentAttempt comprometido/UNKNOWN |
| `offline.captureOrderPick` | Sí | Pedido previamente asignado/descargado y vigencia |
| `offline.markOrderMissing` | Sí | Pedido y línea válidos, se notifica al reingresar |
| `offline.recordCount` | Sí | Zona/sesión asignada, evento fechado y scope |
| `offline.provisionalCashSale` | **Condicional** | Política empresarial y fiscal habilitada, límites activos, efectivo/custodia, sin cobros inciertos |
| `offline.verifyBankPayment` | No | Fuente bancaria requiere verificación |
| `offline.fiscalIssue` | No por defecto | Solo eventual contingencia legalmente aprobada como flujo futuro separado |
| `offline.grantPermission` | No | Requiere servidor y verificación |
| `offline.stockAdjustmentPost` | No | Requiere ledger oficial y autorización en servidor |
| `offline.paySupplier` / `offline.refund` | No por defecto | Riesgo de dinero duplicado |
| `offline.closeZ` | No | Requiere reconciliación completa |
| `offline.resolveSensitiveConflict` | No | Requiere servidor, persona habilitada y evidencia |

**Revocación durante desconexión** no puede consultarse en tiempo real. Mitigaciones documentales: alcance mínimo, corta vigencia, límites monetarios, equipo vinculado, condición de sesión; en reconexión revalidar permisos **antes de publicar** y rechazar/escalar lo que ya no corresponda. No prometer revocación instantánea sin red.

## 3. Errores estables y recuperación
| Código propuesto | Situación | UX y resultado |
|---|---|---|
| OFFLINE_DATA_NOT_PREPARED | No existe paquete apto | Shell + indicación sin consulta inventada |
| OFFLINE_POLICY_EXPIRED | Falta vigencia | Bloqueo de acción sensible y volver a conectar |
| DEVICE_NOT_AUTHORIZED | Equipo o sesión no habilitados | Bloqueo, reautenticación conectada |
| LOCAL_STORAGE_QUOTA | Cuota excedida | No decir guardado, pedir liberar espacio/reconectar bajo custodia |
| LOCAL_WRITE_FAILED | IndexedDB falla | Preservar en editor temporal y advertir riesgo; no declarar persistido |
| BACKEND_UNREACHABLE | Servidor no responde | Modos según capacidad, no asumir éxito remoto |
| OPERATION_UNKNOWN | Puede haber llegado POST | Consultar estado por misma clave |
| IDEMPOTENT_REPLAY | Evento ya procesado | Mostrar resultado anterior, sin duplicar |
| DEPENDENCY_NOT_READY | Falta evento padre/aprobación | Dejar en cola y mostrar causa si retrasa |
| ORDER_REVISION_CONFLICT | Pedido aceptado cambió | Comparar cantidades/variante, no "Listo" falso |
| PRICE_QUOTE_EXPIRED | Precio local venció | Aviso, revalidar y resolver diferencia comercial |
| STOCK_LEDGER_MOVED | Stock cambió en otra caja | Reconciliar/ajustar plan, no descontar dos veces |
| BANK_UNVERIFIED | Pago reportado no acreditado | Estado pendiente, no completo |
| CASH_LIMIT_EXCEEDED | Supera tope provisional | Guardar carrito, bloquear confirmación |
| PROVISIONAL_FISCAL_BLOCK | Falta política fiscal habilitada | No emitir documento legal ni fingir factura |
| GRANT_REVOKED | Permiso no vigente al sync | Evento rechazado, revisión y custodia |
| SESSION_SWITCH_PENDING | Cambio de usuario/caja con datos no ACK | Aislar/sellar pendientes, no exponer al siguiente |
| UNSUPPORTED_BROWSER_CAPABILITY | SW/IDB/almacenamiento no disponible | Deshabilitar offline, continuar online cuando posible |
| ACK_LOST | Servidor aplicó pero ACK se perdió | Status query + retry mismo evento/idemKey |
| DEVICE_CLOCK_SKEW | Reloj local incorrecto | Servidor ordena y reconcilia por secuencia/instante validado |

## 4. Fixtures/escenarios MSW descriptivos (20 casos)
| ID | Estado inicial / evento | Resultado observable esperado y aserción negativa |
|---|---|---|
| OFF-S01 | Pérdida red editando carrito | Draft guardado local, no venta registrada ni carrito vacío |
| OFF-S02 | Dispositivo nuevo sin precarga | Shell abre, "No hay datos offline"; no catálogo inventado |
| OFF-S03 | Catálogo cacheado 2 días; precio cambió en servidor | Precio con `asOf`, orden no se contabiliza con precio antiguo sin validación |
| OFF-S04 | Venta efectivo provisional bajo política validada | Recibo **interno no fiscal**, dinero custodiado, posterior reconciliación |
| OFF-S05 | Venta efectivo excede límite | Carrito persiste; bloqueo sin ingreso contable |
| OFF-S06 | Cliente muestra foto transferencia sin red | Solo nota pendiente, nunca acreditado |
| OFF-S07 | Cargo tarjeta se envió, timeout, luego caída | UNKNOWN conserva attemptId; query antes de reintentar |
| OFF-S08 | 2 transferencias mismas referencias reportadas | Revisión/dedupe según fuente bancaria, no sumar 2 acreditaciones |
| OFF-S09 | Pedido F08 cacheado: 6 de 10 preparados y 4 faltantes | Progreso local, alerta remota NO entregada hasta ACK |
| OFF-S10 | Pedido cambió SKU al servidor durante caída | Conflicto de versión, no declarar listo/completo |
| OFF-S11 | Conteo zona 10 unidades con venta concurrente de otra caja | Reconciliar ledger temporalmente, no ajuste directo |
| OFF-S12 | Un mismo outbox event se reenvía tres veces por ACK perdido | Un solo efecto servidor `already_applied`, misma key |
| OFF-S13 | Orden causal picking->missing->verify | Sync conserva dependencias, no verifica antes de aplicar faltante |
| OFF-S14 | Revocan permiso de capturar pedido antes de reconexión | Revalidación falla, no aplicar a ciegas y registrar evento |
| OFF-S15 | Chrome elimina CacheStorage o bloquea persistencia | Explicar falta de datos/almacenamiento; no prometer recuperación imposible |
| OFF-S16 | Logout con 7 eventos pendientes | Aislar datos de actor, advertir custodia, no borrado silencioso |
| OFF-S17 | Wi-Fi activo pero ERPNext API cae | `degraded/offline_ready` por health backend, no `online` |
| OFF-S18 | Hotspot móvil vuelve con API accesible | `reconnecting` y sync seguro, no exigir Offline si hay backend |
| OFF-S19 | Cierre Z solicitado con 4 ventas provisionales pendientes | Bloquear Z definitivo, X histórico identificado |
| OFF-S20 | Banco/DIAN inalcanzables con POS Core conectado | Capacidades parciales por servicio; no validar banco/emitir fiscal por inferencia |

Formato futuro fixture: `scenarioId, operationId, connectivity, deviceState, policy/grants, initialSnapshots, initialOutbox, inputEvents, expectedLocalState, expectedServerAck, expectedUI, forbiddenSideEffects, expectedAudit`. Todos los datos sintéticos sin credenciales ni fotos de clientes. Futura implementación MSW simula resultados sin declarar conexión oficial.

## 5. Matriz de gates que NO están cerrados en este documento
- Arquitectura del backend para idempotencia durable y verificación de estado de terceros (PSP/DIAN), controles por tenant y permisos por persona.
- Normas de Colombia: comprobantes, cierre, facturación de contingencia, protección de datos; validación jurídica/contable.
- Límites de ventas provisionales, política antifraude, edad máxima de caché, máxima duración offline y política de aceptación de precios.
- Stock concurrente en bodega/zonas, reservas y reconciliación entre dispositivos.
- Pruebas funcionales, carga, fallos de navegador, PWA iOS/Android, Service Worker, IndexedDB, IndexedDB schema upgrades, recuperación tras cierre.
- Seguridad: amenaza por equipo compartido, XSS, cifrado/restauración, política de borrado y recuperación de datos pendientes.

**No codificado.** Esta etapa describe qué debe hacer una futura implementación para comprobar integridad; ningún escenario significa PASS.
