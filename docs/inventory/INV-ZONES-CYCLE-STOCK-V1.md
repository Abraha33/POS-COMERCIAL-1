# INV — Inventarios, bodegas y conteo diario por zonas (grupo 4)

**Aprobación funcional:** usuario, 2026-10-12. **Versión:** v1.0 funcional; integra y amplía [conteo por ayudante y cajero](COUNT-DUAL-ROLE.md). **Estado de software:** pendiente de implementar/validar con ERPNext. **Alcance:** INV-01..INV-10.

## Regla central aprobada: operación DIARIA por ZONAS
- Cada empresa configura su sede, bodega y **zonas físicas u operativas** (ejemplo ilustrativo: siete zonas); el número no es fijo.
- **Todos los días existe un programa de conteo**. La cobertura puede ser rotativa según riesgo/frecuencia. Una empresa puede exigir contar todas las zonas a diario.
- Bandeja que ordena zonas por **urgencia** y no únicamente por ubicación. Rojo / amarillo / verde / gris son indicadores visuales + texto/ícono; no confiar sólo en el color.
- La urgencia de una zona es **distinta del estado de su sesión de conteo**: pendiente, en conteo, esperando reconteo, esperando aprobación, conciliada, cerrada/con incidencia. Una zona recién contada con discrepancia pendiente NO se vuelve "verde por finalizar captura".
- El cajero guía y registra, el ayudante cuenta en físico, el supervisor revisa diferencias y autoriza ajustes. Pueden combinarse personas bajo permiso y auditoría, pero no autoaprobar ajustes sensibles sin política explícita.
- Los conteos no alteran stock oficial hasta la publicación autorizada de un documento de ajuste válido.
- Venta/recepción/transferencia durante conteo: calcular diferencia con **punto de corte temporal** + movimientos concurrentes auditados, o aplicar bloqueo selectivo de SKU/ubicación cuando corresponda; no congelar toda la tienda de forma predeterminada.

## Arquitectura conceptual (sin imponer DocTypes)
```text
Tenant → Sede → Bodega → Zona(s) / ubicación operativa
Producto/variante + UOM → stock ledger ERPNext y ubicaciones confirmadas
CountingPolicy → DailySchedule → ZonePrioritySnapshot
CountingSession → CountLine (+ recuentos y evidencia) → Discrepancy → Approval → StockAdjustment
```
Una zona NO es por defecto una bodega contable. Puede existir un mismo SKU en varias zonas; sumar sin doble contabilizar, identificando ubicaciones de control real vs 'ubicación probable'. No crear stock por zona ficticio si la fuente oficial solo controla por bodega. Separar existencias físicas registradas, reservadas, vendibles, bloqueadas/en cuarentena, en tránsito y estimadas.

## Semáforo de prioridad aprobado
| Color + etiqueta | Significado | Comportamiento |
|---|---|---|
| ROJO — Urgente | Conteo vencido; discrepancia significativa anterior sin cerrar; riesgo elevado o alerta de existencias | Encabeza la bandeja, exige atención/revisión |
| AMARILLO — Próximo | Conteo programado hoy o aproximándose a plazo | Tras rojas, informar fecha/hora objetivo |
| VERDE — Al día | Conteo vigente y sin incidencia crítica pendiente | Puede aparecer como completado o próximo según calendario, pero no confundirse con "capturado" |
| GRIS — No disponible | Zona suspendida/bloqueada/sin configuración | Motivo textual obligatorio; no concluir "sin riesgo" |

Prioridad puede ponderar días sin contar, diferencias recientes, rotación, faltantes y valor; pesos/umbrales/frecuencia **por empresa**, sin cifras inventadas. Un supervisor puede promover prioridad con motivo auditado; cambios de algoritmo versionados. Fecha de conteo y estado de conciliación se guardan por zona/sesión; historial preservado.

## Flujos completos
| ID | Operación y responsable | Excepciones / criterio |
|---|---|---|
| INV-01 | Admin importa/declara inventario inicial por SKU/UOM/bodega/ubicación confiable + costo; aprueba lote base. | Duplicados, costo faltante, conteos incompatibles; no publicar doble saldo |
| INV-02 | Receptor vincula pedido/comprobante → cuenta recibido → aceptado / faltante / sobrante / dañado → confirma recepción. | Recepción parcial, discrepancia con proveedor; solo aceptado vendible tras reglas de calidad |
| INV-03 | Cajero consulta stock oficial por bodega + reservado + no vendible + disponible y fecha de actualización. | No inventar stock por zona; red caída → mostrar antigüedad/estatus |
| INV-04 | Scheduler propone zonas urgentes diarias → responsable asigna ayudante/cajero → punto de corte → capturas con cantidades/UOM/observaciones → cierre de captura. | Zona inaccesible, ítem ausente, interrupción, doble conteo, turno cambiado |
| INV-05 | Motor compara conteos ajustados por operaciones concurrentes → reclasifica diferencias → reconteo → supervisor valida → ajuste ERPNext. | Diferencia pendiente, reintentos, aprobador no autorizado, ajuste duplicado |
| INV-06 | Origen solicita traslado → prepara y despacha → stock en tránsito según modelo → destino recibe total/parcial → resuelve diferencias. | Recepción parcial, traslado sin confirmar, múltiples bodegas, daño en tránsito |
| INV-07 | Venta confirmada/despacho y devolución elegible producen entradas/salidas correctas según su evento contractual. | No duplicar por cierre POS, refund sin mercancía física, cuarentena en devolución |
| INV-08 | Operador registra daño, merma, pérdida/vencimiento → clasifica y adjunta evidencia → supervisor aprueba baja/traslado a no vendible. | Sin motivo, lote específico, doble baja, efecto contable |
| INV-09 | Motor separa disponible y reservado; negativos **bloqueados por defecto** para venta ordinaria; permiso excepcional configurable. | Dos cajas venden última unidad, reservas concurrentes/canceladas, pedido parcial |
| INV-10 | Capacidad optativa: lote/vencimiento/serial, FEFO/traceability para perfiles elegibles, arquitectura preparada. | No imponer a todos; cumplimiento farmacéutico u otras leyes requiere especialización |

## Experiencia operativa (4 áreas, no 10 pantallas)
1. **Resumen:** stock, alertas, zonas y movimientos recientes.
2. **Conteos de hoy:** bandeja de zonas ordenada por urgencia, estado por separado, personas asignadas, pendientes/reconteos.
3. **Movimientos:** recepciones, traslados, ajustes, mermas y auditoría en un explorador común.
4. **Configuración:** zonas, mapeo de SKU/ubicación, frecuencia, riesgo, autorizadores, excepciones y UOM.

Responsable puede iniciar conteo en desktop/cajero; ayudante utiliza apoyo manual o dispositivo autorizado; sin imágenes obligatorias. UI compacta, búsqueda/escáner prioritarios.

## Casos de aceptación
1. Una bodega con siete zonas genera planificación **diaria**; conteos se priorizan rojas → amarillas → verdes, mientras gris explica bloqueo.
2. Zona 3 en rojo por conteo vencido; al contar con diferencia sin aprobar **sigue mostrando incidencia**, no verde falsamente.
3. Conteo inicia a 10:00; ocurre venta de 2 unidades a las 10:30 y entrada de 3 a las 10:45; el sistema reconcilia con el instante de cada ítem y movimientos para no inventar diferencias.
4. Producto en zonas 1 y 5 aparece una sola vez en el stock total real; si la ubicación es probable, el sistema no inventa ledger por zona.
5. Ayudante cuenta, cajero registra; aprobación del supervisor es distinta del conteo; sin aprobación no muta stock oficial.
6. Dos sesiones concurrentes sobre mismos SKU/ubicación disparan conflicto controlado, no doble ajuste.
7. Recepción parcial, traslado parcial y devolución a cuarentena no inflan 'disponible'.
8. Importación inicial repetida e idempotente, con revisión de errores/costos.
9. Reserva de la última unidad desde dos cajas no produce sobreventa si negativos están prohibidos.
10. Zona que no se pudo contar registra causa y prioridad siguiente jornada; no se marca como completada.

## Integración / límites
ERPNext será autoridad para movimientos oficiales Stock Entry, Stock Reconciliation, Stock Ledger, reservas y efectos contables tras pruebas reproducibles. Zona/sesión/prioridad es capacidad Holamigo, no necesariamente un DocType nativo. Cada operación documentada tiene idempotencia, permisos y scope tenant/sede/bodega. Precisar en diseño técnico política de corte horario, conteos ciegos, correspondencia SKU-ubicación, valoración y cierres contables; no bloquear toda la tienda por defecto.

**Estado:** diseño de negocio aprobado; métricas, umbrales monetarios, APIs, performance y conectores deben validarse antes de producción.

