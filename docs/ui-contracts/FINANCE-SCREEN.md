# Contrato UI — Pantallas financieras

**Estado:** propuesta. Cada pantalla consume adapter/contrato; no accede al banco,
ERPNext o almacenamiento de imágenes directamente.

| Superficie | Tarea principal | Regiones obligatorias | Acciones críticas |
|---|---|---|---|
| Caja y turno | custodiar y operar turno | contexto, movimientos, saldo, incidencias | abrir, solicitar salida, arqueo, cierre |
| Cobro pendiente | resolver importe no cerrado | identidad venta, intentos, evidencias, saldo | reintentar seguro, enviar a revisión, cancelar permitido |
| Revisión móvil | verificar acreditación | evidencia, datos de destino, historial, decisión | aprobar, rechazar, pedir evidencia |
| Gasto/pago proveedor | desembolsar con control | tipo, beneficiario, documentos, soporte, aprobación | aplicar parcial/total, ejecutar, reversar permitido |
| Custodia | trasladar fondos | origen, destino, entregador, receptor, tránsito | solicitar, entregar, recibir, reportar diferencia |
| Arqueo | comparar dinero físico y esperado | denominaciones, esperado, contado, diferencias | guardar conteo, justificar, cerrar |
| Conciliación | resolver coincidencias | cuenta, periodo, extracto, sugerencias, incidencias | importar, confirmar match, descartar, investigar |
| Cartera | cobrar o pagar documentos | tercero, documentos, saldo, aplicación | registrar abono, seleccionar imputación, ver historial |
| Contabilidad | consultar configuración/estado | periodo, regla, documento, evento, error | publicar configuración autorizada, abrir detalle |

## Prioridad y cardinalidad

- Una sola acción primaria por superficie; aprobación y reverso van en confirmación.
- Contexto de empresa, sede, caja, turno y cuenta siempre visible antes de mover dinero.
- Un diálogo muestra un movimiento a la vez; las listas soportan selección múltiple
  solo para aplicar un pago a varias facturas.
- Una evidencia pertenece a un intento específico; no reutilizarla entre pagos.
- El total, saldo y estado no se calculan como autoridad en el componente: llegan del
  adapter y se actualizan tras cada comando.

## Estados de pantalla

Carga, sin permisos, sin turno, sin cuenta configurada, vacío, operación pendiente,
operación incierta, error recuperable, conflicto de versión y solo lectura. Los
estados de integración real conservan distintivo SIMULATED mientras MSW sea la fuente.
