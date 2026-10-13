# CLI — Clientes, cuentas por cobrar y crédito operativo

**Etapa 1: propuesta funcional derivada de F04/F06, TES-05, CAT y REP.** Sin implementación. **Alcance:** CLI-01..CLI-06. No crear segundo libro de CxC; ERPNext/tesorería son la autoridad contable.

| ID | Flujo mínimo | Excepciones y permisos |
|---|---|---|
| CLI-01 | Cajero busca cliente/consumidor final → selecciona o crea con identificación/documentos aplicables → administra contactos/direcciones bajo permiso | Duplicado ID fiscal, datos incompletos, cliente inactivo, datos sujetos a privacidad; no borrar cliente con facturas |
| CLI-02 | Administrador define cupo, plazo, condición comercial y actor autorizador; registra vigencia, excepciones y bloqueos | Cliente sin cupo, moroso, mora, dos ventas concurrentes que superan exposición; autorización contextual |
| CLI-03 | POS consulta saldo y cupo disponible → valida venta a crédito → crea deuda vinculada a documento comercial | Crédito ≠ medio de pago acreditado; bloqueo concurrente y transacción de reserva/exposición |
| CLI-04 | Cajero autorizado recibe efectivo/banco por deuda antigua/nueva → confirma recaudo y aplica a una o varias facturas | Pago no identificado, transferencia pendiente, exceso/anticipo; abono no vuelve a crear venta |
| CLI-05 | Usuario consulta estado de cuenta con partidas, vencimientos, notas, pagos, anticipos y saldo verificable | Consulta entre tenants/sedes, cliente restringido, saldos aún no sincronizados |
| CLI-06 | Tesorería registra anticipo/saldo a favor y lo aplica a documentos elegibles → concilia excedentes/reembolsos | No aplicar anticipos arbitrariamente, duplicados, monedas distintas, devoluciones |

## Política comercial de crédito
- Clientes con deuda y fecha vencimiento calculada desde documento aplicable; condiciones por empresa/cliente y cambios versionados.
- Para aprobar crédito comprobar **exposición vigente + documentos no pagados + reservas concurrentes relevantes** contra cupo, con permiso para excepciones y motivo.
- Crédito no se presenta como efectivo, transferencia ni cargo bancario confirmado.
- Si el cliente cambia en carrito, recalcular precio, impuestos, elegibilidad de crédito y requerimientos fiscales.
- Abonos parciales y multi-factura con asignaciones individuales; un recaudo tiene una sola salida/entrada monetaria aunque afecte varias facturas.
- Datos personales y fiscales sujetos a consentimiento/base legal, retención y mínimo acceso por rol según país.

## Flujo integrado
Identificar cliente → validar condiciones → operar venta contado/crédito → confirmar documento y exposición → estado de cuenta → registrar abono/anticipo → conciliar → cerrar deuda. En caso de devolución, ajuste disminuye cuenta por cobrar si no hubo dinero recibido; si existe excedente, generar saldo o reembolso autorizado.

## Aceptación
1. Documento a crédito por 100 no aumenta efectivo; el cobro posterior por 40 disminuye CxC a 60 sin nueva venta.
2. Dos cajas proponen créditos por 70 contra cupo restante de 100: no se pueden confirmar ambos sin override aprobado.
3. Pago bancario fotografiado queda pendiente hasta acreditar; la cuenta del cliente no queda pagada por foto.
4. Un abono de 90 aplicado a facturas 30+50 deja 10 en anticipo/saldo según autorización, no ingreso doble.
5. Cliente desactivado mantiene historial y restricciones configuradas.
6. Cambiar cliente durante carrito preserva líneas pero revalida precios y condiciones.
7. Estado de cuenta devuelve totales conciliables con documentos fuente, con versión/corte.

## Por validar
Política de mora, cupo default, plazos, límites, reporte de centrales, tratamiento tributario y tipo de identificaciones; contratos de integración TES/ERPNext. No inventar tasas de interés ni cargos automáticos.
