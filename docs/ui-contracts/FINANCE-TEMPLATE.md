# Contrato UI — Plantillas financieras

**Estado:** propuesta. Las plantillas reutilizan shell, PageHeader, tablas y diálogos
existentes cuando su contrato sea suficiente; no crear otro sistema de diseño.

## Patrón de consola financiera

1. Cabecera: empresa, sede, caja/cuenta, periodo y estado de sincronización.
2. Resumen: saldo, pendientes, incidencias y última actualización.
3. Área de trabajo: lista/tabla o pasos de operación.
4. Panel de detalle: documento origen, aplicaciones, soportes y auditoría.
5. Barra de acciones: comando primario, guardar borrador, cancelar seguro.

## Patrones

| Patrón | Uso | Regla |
|---|---|---|
| Wizard de dinero | apertura, pago, arqueo, reembolso | avanzar solo con validación y preservar borrador |
| Lista + detalle | cartera, conciliación, historial | selección no cambia el documento |
| Doble confirmación | salida, reverso, cierre | muestra importe, origen, destino y consecuencia |
| Conteo por denominación | fondo y arqueo COP | cantidad y subtotal visibles, total derivado |
| Bandeja de incidencias | pagos inciertos, diferencias, extractos | prioridad y responsable, nunca autocierre |

La consola muestra el origen de cada total. El usuario puede consultar cálculo, no
editar saldo calculado ni asiento contable.
