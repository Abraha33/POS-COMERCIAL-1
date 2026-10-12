# Contrato UI — Finanzas operativas

**Estado:** propuesta derivada de F-FIN empresarial. **Cubre:** CAJ-01…07,
TES-01…06 y CON-01…05. No habilita integración bancaria, fiscal ni contable real.

## Invariantes

- Una venta, intento de pago, evidencia, aprobación, documento, impresión y entrega
  son entidades de ciclo de vida independiente.
- Una fotografía es evidencia; nunca confirma un ingreso bancario.
- Un pago, reembolso, desembolso, importación o reverso usa identidad idempotente.
- Los movimientos internos entre custodias no son ingreso ni gasto.
- El POS no elige cuentas contables; el mapeo publicado por contador/ERPNext decide.
- No borrar operaciones publicadas: corregir con reverso o ajuste referenciado.

## Ciclos y estados

| Grupo | Estados mínimos | Recuperación requerida |
|---|---|---|
| Intento de pago | iniciado, pendiente, confirmado, rechazado, incierto, revertido | incierto exige consulta antes de reintentar |
| Evidencia bancaria | borrador, enviada, en revisión, aprobada, rechazada, reemplazada | conservar versiones enviadas |
| Movimiento de caja | borrador, solicitado, autorizado, ejecutado, rechazado, reversado | permisos, soporte y saldo se revalidan |
| Custodia | solicitado, en tránsito, recibido, discrepancia, cancelado | una recepción única por traslado |
| Arqueo | abierto, contado, con diferencia, aprobado, cerrado | diferencia no se autocompensa |
| Conciliación | importado, sugerido, confirmado, incidencia, descartado | un extracto no puede importar dos veces |
| CxC/CxP | abierta, parcialmente pagada, pagada, vencida, disputada | aplicación por documento y saldo exacto |
| Periodo contable | abierto, en cierre, cerrado, ajuste controlado | no escritura retrospectiva sin permiso |

## Mapa de verticales

| Vertical | Flujos | Precondición | Resultado UI verificable |
|---|---|---|---|
| Responsabilidad y apertura | CAJ-01, CAJ-02 | usuario, sede y caja válidos | custodio, fondo y turno trazables |
| Cobro y evidencia | CAJ-03, CAJ-04, TES-01 | venta o pago pendiente | saldo confirmado separado del pendiente |
| Salidas y proveedores | CAJ-05, TES-06 | caja/cuenta, permiso y soporte | aplicación a factura sin duplicar compra |
| Custodia y cierre | CAJ-06, CAJ-07, TES-03 | turno y responsables | tránsito, arqueo y diferencia auditables |
| Conciliación y postventa | TES-02, TES-04, TES-05 | documento de origen | match único, reverso o abono trazable |
| Contabilidad | CON-01…05 | configuración profesional publicada | vista de estado, nunca asiento manual en POS |

## Permisos de interfaz

La interfaz oculta acciones no disponibles, pero servidor/adapter vuelve a validar:
ejecutor, aprobador, conciliador, sede, caja, cuenta, proveedor, límite y turno. Una
empresa pequeña puede reunir roles; la UI muestra la incompatibilidad y solicita la
excepción registrada, no la omite.

## Casos de aceptación mínimos

1. Dos transferencias iguales producen dos intentos y dos conjuntos de evidencias.
2. Un timeout de datáfono queda incierto y no permite doble cobro.
3. Un pago de proveedor reparte importe entre varias facturas sin crear una compra.
4. Caja a caja fuerte mantiene el dinero total y deja tránsito hasta recepción.
5. Arqueo separa efectivo esperado, contado y diferencia; exige explicación.
6. Un extracto repetido no duplica movimientos ni conciliaciones.
7. Un periodo cerrado bloquea cambios y admite solo ajuste autorizado.
