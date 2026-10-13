# F08 — Etapa 3B: estados, permisos, errores, escenarios de mocks y aceptación

**Especificación técnica declarativa**, no código ni test/fixture/MSW ejecutado. Referencias: [flujo funcional](F08-STAGE1-OPERATING-FLOW-V2.md), [UI](F08-STAGE2-UI-SIX-CONTRACTS-V2.md), [datos y API lógica](F08-STAGE3-DATA-API-ADAPTERS-V2.md). F13 Offline fuera de este encargo.

## 1. Máquina de estados: simple para humanos, rigurosa para datos

### 1.1 Etapa visible del pedido
| Estado | Significado operativo | Entrada/salida y límites |
|---|---|---|
| `por_confirmar` | Pedido incompleto, canal sin datos suficientes o cliente no ha validado cambios | No presentar como listo para preparar |
| `pendiente` | Pedido apto, espera preparador | Asignación o autoservicio autorizado |
| `preparando` | Al menos un ítem en alistamiento | Puede tener faltantes sin perder avance |
| `por_verificar` | Cantidades recogidas, pendiente verificar correspondencia | Revisión de SKU/UOM/variante/cantidad |
| `listo` | Todas las líneas aceptadas verificadas o unidad logística parcial inequívocamente autorizada | Solo entonces disponible para despacho elegible |
| `despachado` | Salió físicamente/custodia entregada | No equivale a cliente recibió |
| `entregado` | Entrega confirmada según modalidad | Distinto de pagado o fiscal aceptado |
| `cancelado` | Cierre con compensaciones si ya hubo pago, reserva, recepción, fiscalidad | No borrar registros históricos |

`con_faltantes`, `urgente`, `dinero_pendiente`, `pagado`, `proveedor_no_disponible` son **indicadores/eventos paralelos** y NO reemplazan la etapa `preparando`. Para parcial: `FulfillmentBatch` identificable con cantidades, no falsificar `listo completo` del pedido entero; `parcial` es etiqueta de entrega/lot y pendientes restantes.

### 1.2 Progreso por línea
- Pendiente → tomado parcial / tomado completo → empacado → verificado (si hay match) → despachado / entregado conforme origen real.
- Cada cantidad verificada debe estar vinculada a SKU, variante, unidad y versión aceptada; no basta porcentaje de líneas.
- Si un faltante se resolvió con mercancía interna/externa, la línea vuelve a pendiente de recogida o se registra validación de recepción y preparación en el mismo acto **solo si física y documentalmente ocurrió**, evitando dos pasos ficticios.
- Recuento o corrección disminuye `qtyPacked/qtyVerified` explícitamente y crea evento; una copia de la vista no puede inflar cantidades.

### 1.3 Submáquina de faltante (5 estados humanos)
| Estado | Evento de cambio | Desenlace |
|---|---|---|
| `reportado` | Preparador pulsó No encontré con cantidad | Notificar a personas habilitadas, seguir otras líneas |
| `buscando` | Resolutor revisa stock alterno/proveedores | Contactar, elegir opción o mantener abierto |
| `compra_asignada` | Opción elegida, persona designada, verificada autorización por operación | Puede estar pendiente de dinero o comprar sin avance; no asumir efectivo entregado |
| `en_camino` | Compra/traslado conseguido y confirmado, aún no recibido/verificado | No inflar stock/avance antes de recepción |
| `recibido` | Mercancía correctamente recibida y aceptada en cantidad correspondiente | Se restituye posibilidad de preparar la línea |

Evento `no_habia` o `intento_fallido` cierra el intento actual y transiciona `compra_asignada` → `buscando` **sin borrar dinero avanzado, asignaciones anteriores, precios informados ni historial**. Desde `recibido` parcial permanece shortage residual con cantidad restante, ligada a misma demanda.

### 1.4 Estados de intento proveedor y dinero separados
- Intento compra: `candidate` → `contacted` (opcional) → `assigned` → `purchasing` → `bought` / `failed_no_stock` / `cancelled`; comprado → en_camino → recibido; un proveedor puede rechazar, dejando el siguiente intento.
- Avance fondos: `requested` → `approved` → `handed_over` → `partly_spent` / `spent` → `settlement_pending` → `settled` o `disputed`. El sistema financiero es autoridad, no un balance editable en pedido.
- Si el comprador recibió 80.000 y el proveedor no tenía mercancía: `handed_over` permanece hasta devolución/custodia/compra válida; NO volver a exigir entrega de 80.000 por nuevo intento.
- Transferencia entre bodegas: solicitado → preparado/salido → tránsito → recibido. "Existe en otra bodega" no significa que ya esté listo en bodega del pedido.

### 1.5 Dimensiones que jamás se colapsan
- `PaymentStatus`: unpaid/partial/paid/pending_verification, crédito autorizado como condición explícita, **no** marca preparación completada.
- `FiscalStatus`: no_emitido / pendiente / emitido_aceptado / rechazado / contingencia según proveedor real.
- `QualityStatus`: not_checked / checking / verified / mismatched.
- `DeliveryStatus`: pending / partial / dispatched / delivered / disputed.
- `StockStatus`: not_reserved / partial_reserved / reserved / picking / consumed, según autoridad real.
- `AuthorizationStatus`: grant vigente/revocado/vencido por persona+acción+contexto; una asignación continúa visible pero el servidor deniega una acción prohibida.

## 2. Contrato de autorización por persona y operación
- `PersonCapabilityGrant` es ámbito efectivo, no `Role=CAJERO`: personaId + capability + empresa + sede + caja/cuenta si aplica + pedido/faltante si es puntual + límite monetario + período + revocación.
- `TaskAssignment` asigna trabajo, **no concede automáticamente** permiso de dinero ni inventario. Una asignación a comprador sin grant `order.buyExecute` efectivo debe impedir ejecutar.
- `cash.disburseApprove` y `cash.disburseHandOver` son capacidades separadas; ambas pueden pertenecer a la misma persona cuando el control por empresa lo permite. La entrega de dinero se liga a movimiento CAJ-05/tesorería + custodio/portador.
- `order.sourceDecide` da acceso a candidatos de proveedor, no automáticamente a cuentas bancarias ni historial de caja.
- `order.receive` no permite inventariar producto defectuoso como disponible ni modificar precio ya facturado.
- `order.verify` puede coincidir con preparador solo si una política permite autoverificación; opción de segunda persona para riesgo elevado, no obligación burocrática general.
- Todas se validan en cada comando server-side. Se conserva concesión usada al ejecutar, aun si expiró después.

| Persona escenario | Grants/contexto temporal | Resultado esperado |
|---|---|---|
| A, empleado que prepara | `order.pick`, `order.markMissing` en pedidos asignados | Puede tomar y marcar faltante; NO ver fondos ni ordenar desembolso |
| B, encargado de faltantes | `order.sourceView/sourceDecide/buyAssign` en sede | Puede buscar/comunicar/decidir/asignar sin inventario/caja automáticamente |
| C, persona que entrega dinero | `cash.disburseApprove/HandOver` en caja y rango monetario | Registra aprobación/custodia por avance; cargo administrativo irrelevante |
| D, persona que compra | `order.buyExecute` sobre intento asignado | Marca No había / Comprado, no autoriza otro pago |
| E, persona que verifica | `order.verify/dispatch` según asignación | Confirma correspondencia y despacha; no cambia SKU sin aceptación |
| A al siguiente turno | nuevo grant para caja específico y vigencia válida | Puede entregar dinero si autorizado, sin editar nombre de rol |

## 3. Catálogo de errores y recuperación
| Código estable propuesto | Causa | Presentación / resultado seguro |
|---|---|---|
| ORDER_SOURCE_DUPLICATE | mismo pedido externo/canal recibido repetidamente | Mostrar pedido existente y origen; no duplicar |
| ORDER_INCOMPLETE | SKU/variante/cliente/destino no determinado | "Por confirmar"; no inventar |
| ORDER_REVISION_CONFLICT | otro empleado editó/tomó pedido | Actualizar y conservar datos locales pendientes; no sobrescribir |
| STOCK_ASOF_STALE | cantidad por bodega desactualizada | Indicar hora y solicitar consultar, no prometer que está físicamente |
| LOCATION_UNVERIFIED | zona probable, SKU no encontrado | Mostrar "Ubicación probable" y permitir reportar faltante |
| SHORTAGE_ALREADY_ACTIVE | intento duplicado al pulsar faltante | Reusar shortageId, no 2 alertas |
| SOURCE_UNAVAILABLE | proveedor contactado ya no tiene stock | Cerrar intento, volver a buscando |
| SUPPLIER_PRICE_UNCONFIRMED | precio fuente sin confirmación actual | Etiqueta "Precio informado, verificar" |
| BUYER_NOT_AUTHORIZED | designado sin capacidad efectiva | Impedir acción y ofrecer reasignación sin inventar permiso |
| PAYOUT_AUTH_REQUIRED | monto, caja o responsable no habilitado | Requiere grant específico, no login como cajero |
| PAYOUT_ALREADY_HANDED_OVER | dinero entregado en intento anterior | Mostrar avance en custodia; no duplicar |
| PAYOUT_UNKNOWN | POS/CAJ timeout después de ejecutar | Consultar operationId antes de repetir |
| STOCK_RECEIPT_UNKNOWN | recepcionando pero backend no respondió | Consultar operación antes de volver a sumar stock |
| RECEIPT_MISMATCH | SKU/cantidad/condición no coinciden | Mantener faltante y separar rechazados |
| CUSTOMER_ACCEPTANCE_REQUIRED | cambio/entrega parcial sin acuerdo | No marcar entrega completa |
| VERIFY_INCOMPLETE | SKU/variante/UOM/cantidad no coinciden | Corregir o pedir aceptación del cliente; no marcar listo |
| ORDER_ALREADY_DISPATCHED | doble despacho/reintento | Mostrar evento original, no descontar dos veces |
| PERMISSION_DENIED | falta autorización operativa vigente | Denegar en backend, mostrar instrucción corta |
| DELIVERY_CONFIRMATION_PENDING | salió de tienda, cliente aún no confirmó | Despachado ≠ entregado |

## 4. Fixtures y escenarios MSW **solo especificados** (NO código, NO mocks vivos)
Formato recomendado para futuro fixture: `scenarioId, operationId, initialState, actingPersonGrants, tenantSite, input, expectedState, expectedEvents, expectedStockMoneyRefs, expectedUI, negativeAssertion`. Todas las cifras y proveedores de escenarios ficticios etiquetados.

| Caso | Escenario | Afirmación positiva | Prohibición |
|---|---|---|---|
| PED-S01 | Red social no conectada: operador crea pedido manual | origen social y demanda original preservada | No inventar integración automática |
| PED-S02 | Webhook repetido de mismo pedido web | un pedido con revisión/eventos correctos | No duplicado ni doble cobro |
| PED-S03 | Pedido 10 uds: prepara 6, marca 4 faltantes | 6 preparadas, shortage 4, otros ítems siguen | No bloquear todo ni 100% listo |
| PED-S04 | Bodega 1 sin stock, bodega 2 con 4 registradas, zona probable | opciones stock con fecha y confianza | No declarar ubicacion garantizada |
| PED-S05 | Empleado A reporta; B decide proveedor; C entrega dinero; D compra | eventos/grants independientes auditados | No permisos por cargo |
| PED-S06 | Comprador con $80.000 avanza a proveedor, no había stock | nuevo intento abierto, $80.000 permanecen en custodia | No crear otro desembolso |
| PED-S07 | El nuevo proveedor sí tiene producto, gasta $63.000, retorna $17.000 | un gasto documentado, avance conciliado una vez | No nueva compra original/duplicación de caja |
| PED-S08 | Reciben SKU parecido incorrecto y 1 producto dañado | no completar pedido, rechazo/cuaren­tena | No sustituir sin cliente |
| PED-S09 | Dos preparadores intentan tomar mismo pedido | uno se confirma, el otro ve conflicto | No pick doble |
| PED-S10 | Dos faltantes del mismo SKU en dos pedidos agrupados a una compra | asignaciones de cantidades por pedido | No inflar reservas o comprar duplicado |
| PED-S11 | Pedido pagado hoy, entrega prometida mañana y pedido urgente parcial | orden sigue política vigente D-043 | No interpretar pendiente verificación como pagado |
| PED-S12 | Pedido alistado 100%, 1 variante errónea | verificación rechazada, corregir | No marcar listo completo |
| PED-S13 | Cliente autoriza entrega parcial de 6/10 | 6 despachadas, 4 pendientes | No mostrar 100% entregado |
| PED-S14 | Entregado a mensajero sin confirmación cliente | despachado, pendiente confirmación | No entregado automáticamente |
| PED-S15 | Asignado comprador cambia a persona sin permiso caja | puede comprar si autorizado, no entregar dinero | No permiso heredado por cargo |
| PED-S16 | Grant de entrega dinero expira antes de comando | 403/permission denied con monto intacto | No bypass desde UI |
| PED-S17 | Se pierde respuesta HTTP después de pago/recepción | resultado UNKNOWN/consultar por operation ID | No doble pago ni entrada |
| PED-S18 | Cambio de SKU pedido confirmado tras pago o facturación | nueva versión aceptada y corrección documental correspondiente | No mutar factura histórica |
| PED-S19 | 10 bodegas con zonas múltiples | lista buscable/paginada y stock oficial vs zona probable | No pantalla saturada |
| PED-S20 | Vista de preparador en móvil y escritorio | CTA encontrados/faltantes accesibles, bajo ruido | No mostrar proveedor/precio sin permiso |

## 5. Criterios de aceptación y futuros gates de etapa 4
- Contratos DTO/operaciones y flujos terminan documentalmente hasta esta etapa. **Todas las pruebas siguen por ejecutar**.
- En etapa 4 futura, probar normal/error/recuperación, permisos server-side, idempotencia, múltiples usuarios, inventario oficial/por zona, banco/caja, COM/ERPNext, confirmación cliente, F07 y document fiscal.
- Responsive objetivos 1366/768/375 px, 200% zoom, teclado, lector escáner, lector de pantalla/axe; no declarar certificación WCAG solo por redactar.
- Tiempo, exactitud y error de pedido como KPIs reales a medir después, sin afirmar 100% de calidad alcanzado por contrato.
- No inventar canales conectados, dinero autorizado, stock real, precios vivos de proveedores, saldo bancario ni aceptación del cliente.

**Pendiente de preflight antes de construir:** auditar frontend vigente, comprobar OpenAPI/ERPNext, identificar autoridad de stock y eventos fiscales, política de avances en efectivo e interacción con microapp de radar. Documento de etapa 3 NO ejecuta la etapa 4.
