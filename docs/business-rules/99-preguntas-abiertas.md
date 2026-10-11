# Decisiones del dueño del negocio

Respuestas recibidas a las 12 preguntas. Las reglas resultantes están en `00`…`05` con estado **APROBADA**.

| # | Tema | Decisión | Reglas |
|---|------|----------|--------|
| 1 | Dinero | Enteros al cliente; backend con 4–6 decimales | BR-GEN-01 |
| 2 | IVA | Precios con IVA incluido; 19 %, 5 %, 0 % exento, 0 % excluido (separados), impoconsumo 8 % soportado | BR-PRO-03/04, BR-VEN-03 |
| 3 | Redondeo | Sobre el total de factura, nunca por línea; "Ajuste al peso" para efectivo | BR-GEN-05 |
| 4 | Stock negativo | Bloqueado por defecto; excepción con PIN de supervisor y alerta | BR-VEN-05, BR-INV-02 |
| 5 | Pago mixto | Sí, arreglo de pagos; cambio solo en efectivo | BR-VEN-06/08 |
| 6 | Crédito | 30 días, 3 de gracia, bloqueo por mora o cupo | BR-CLI-03/06, BR-VEN-07 |
| 7 | Descuentos | Cajero 5 %, administrador 15 % con PIN, propietario libre; nunca bajo costo sin propietario | BR-VEN-04/14 |
| 8 | Valoración | Costo promedio ponderado | BR-PRO-06, BR-INV-05 |
| 9 | Caja | Descuadre $0 con nota obligatoria; ingresos y egresos tipificados | BR-CAJ-06/09 |
| 10 | Offline | Sí; al sincronizar se acepta la venta y el stock queda negativo para revisión | BR-VEN-13 |
| 11 | DIAN | Modelo listo desde ya (Res. 165, documento equivalente POS); emisión = prioridad 1 de la Fase 2 | BR-CLI-07 |
| 12 | Multi-sede | `branchId` en todo desde el día 1; traslados en dos pasos | BR-GEN-10, BR-INV-03 |

## Aclaraciones menores pendientes (se aplica el valor por defecto indicado)
| ID | Duda | Por defecto |
|----|------|-------------|
| A1 | "Ajuste al peso de 1 a 49" vs redondeo al múltiplo de $50 más cercano (máx. ±25). ¿Siempre hacia abajo/arriba o al más cercano? | Más cercano a múltiplo de $50, half-up |
| A2 | Cajero: "0 % (o máx. 5 % de cortesía)". ¿Cuál? | 5 % |
| A3 | ¿Correo obligatorio también para consumidor final? | No; obligatorio solo para clientes identificados |
| A4 | Diferencias entre lo enviado y lo recibido en un traslado | Se rechaza la recepción parcial (todo o nada) hasta definirlo |
| A5 | Descuento %: ¿por línea o sobre el total de la venta? | Por línea |
| A6 | ¿Impoconsumo 8 % se activa ya (restaurantes/bebidas)? | Soportado, no activado |
| A7 | Catálogo de `taxResponsibility` (códigos DIAN) | Texto libre validado como no vacío |
| A8 | Quién autoriza con PIN | `admin` y `propietario`; `below_cost` solo `propietario` |

## Preguntas abiertas v0.5.0 (PROPUESTA, ver `08-*`)
| ID | Duda | Valor por defecto del contrato |
|----|------|--------------------------------|
| B1 | A7: ¿el catálogo DIAN de `taxResponsibility` es O-13, O-15, O-23, O-47, R-99-PN? | Sí, cerrado; fuera del catálogo = 422 |
| B2 | ¿Las cuentas por pagar tienen periodo de gracia? | No (`en_gracia` nunca aplica) |
| B3 | ¿El abono en efectivo de un cliente entra al turno de caja? (BR-CAR-03) | No |
| B4 | ¿Un ajuste puede dejar el stock negativo? | No (`STOCK_INSUFFICIENT`) |
| B5 | ¿El bodeguero ajusta/cuenta solo su sede? | Sí |
| B6 | Costo promedio ponderado **por sede** (BR-INV-05): ¿cómo se modela? | `Product.cost` global en el mock (`costBasis=product_cost`) |
| B7 | ¿`GET /employees`, `GET /branches` exigen `admin.manage`? | No (abiertos a cualquier sesión) |
| B8 | ¿Se puede anular un abono o devolver a crédito (BR-DEV-06)? | No modelado |
| B9 | ¿Qué rol aprueba conteos con diferencias grandes? | Sin umbral |
