# Contrato UI — Componentes financieros

**Estado:** propuesta. Preferir PrimeReact y componentes compartidos existentes.

| Componente | Entrada | Emite | Restricción |
|---|---|---|---|
| MoneyContextBar | empresa, sede, caja/cuenta, turno | navegación | solo informa; no ejecuta |
| PaymentAttemptList | intentos y saldo | revisar, reintentar seguro | no fusiona intentos repetidos |
| EvidenceCapture | intento, límites, permisos | adjuntar, reemplazar, enviar | foto no cambia pago a confirmado |
| AllocationEditor | documentos, importe disponible | asignación válida | total aplicado no supera saldo |
| DenominationCounter | denominaciones, conteo | conteo | total derivado; no moneda hardcodeada |
| ReconciliationTable | extracto, candidatos, incidencias | confirmar, descartar | un movimiento tiene un match |
| CustodyTransferCard | origen/destino/estado | entregar, recibir, incidencia | recepción única |
| AuditTimeline | eventos y soportes permitidos | abrir detalle | solo lectura para evento publicado |
| AccountingStatus | regla, periodo, evento | abrir error/documento | no permite asiento manual desde POS |

Cada componente expone carga, vacío, error, sin permiso y solo lectura. Los importes
se reciben como COP entero o valor ya formateable por locale; ningún componente
aplica redondeo fiscal propio.
