# Venta rápida — matriz de funciones y subflujos contra el repositorio

Rama `feat/pos-proofs` (sobre `feat/pos-sales`). Estado **medido contra el código**, no contra la intención.

Leyenda: ✔ hecho y probado · ◐ parcial (qué falta en la nota) · ✘ no existe · **C** requiere ampliar el contrato · **B** depende de backend real.
Todo lo marcado ✔ corre sobre mocks/`localStorage`: **nada está listo para producción**.

## Arquitectura decidida
Formularios **dinámicos por tipo de canal** (`features/pos/proofs/channels.ts`): cuenta, billetera, llave, QR, datáfono,
pasarela. Un banco nuevo es una fila de configuración, no un formulario. El catálogo es PROPUESTA y configurable.

## 01 Header operativo
| Subflujo | Estado | Nota |
|---|---|---|
| Sede, caja, turno, conexión | ✔ | AppShell + Pos header |
| Acceso directo a Pedidos con contador | ✔ | pestaña "Pedidos n" |
| Vista previa del semáforo en el header | ✘ | los 4 contadores solo viven dentro de Pedidos; falta un resumen en el header |
| Alertas reales (F12) en el header | ◐ | el estado existe en `pos-ops`, no se consume aquí |

## 02 Bandejas rápidas
| Subflujo | Estado | Nota |
|---|---|---|
| Suspendidas, Cobros pendientes, Pedidos | ✔ | contadores y filtros |
| Reanudar revalidando precios y stock | ✘ | hoy se reanuda con los precios actuales sin avisar diferencias |
| Reintentar operación de resultado incierto | ◐ | la cola offline (F13) lo modela; no está atada al botón Cobrar |

## 03 Catálogo inteligente
| Subflujo | Estado | Nota |
|---|---|---|
| Texto, código de barras, SKU, categoría, disponibilidad, frecuentes, lista/cuadrícula | ✔ | |
| Marca, presentación, historial reciente | ✘ **C** | el contrato de producto no tiene marca ni presentaciones |
| Conversión de unidades / presentaciones | ✘ **C** | |

## 04 Detalle de producto
| Subflujo | Estado | Nota |
|---|---|---|
| Existencias por sede, escalones por volumen | ✔ | escalones = ejemplo informativo (PROPUESTA) |
| Listas de precio y promociones | ✘ **C** | el servidor decide el precio |

## 05 Clientes y facturación
| Subflujo | Estado | Nota |
|---|---|---|
| Selección, alta rápida, cupo y saldo | ✔ | |
| Buscar por NIT/teléfono, editar, direcciones | ✘ | |
| Elegir documento a emitir (factura electrónica / documento equivalente POS) | ✔ | **selección**, recuerda el último; la emisión no existe (**B**, DIAN) |
| No eliminar clientes con historial fiscal | ✘ **C** | no hay operación de borrado; falta la regla explícita |

## 06 Carrito
| Subflujo | Estado | Nota |
|---|---|---|
| Líneas, cantidades, descuento con PIN, duplicar | ✔ | |
| Conservar el carrito ante error | ◐ | por diseño el error no vacía el carrito; sin prueba dedicada |
| Cambio de unidad y aviso de stock por línea | ✘ | |

## 07 Control de la venta
| Subflujo | Estado | Nota |
|---|---|---|
| Resumen, ajuste al peso, IVA estimado | ✔ | |
| Pagado / saldo en pantalla principal | ✘ | solo dentro del cobro |
| Cargos adicionales | ✘ **C** | |

## 08 Cobros dinámicos
| Subflujo | Estado | Nota |
|---|---|---|
| Efectivo con sugeridos y cambio | ✔ | |
| Canales Nequi, DaviPlata, Bancolombia, otros bancos, Bre-B, PSE | ✔ | campos por tipo de canal; referencia, cuenta destino |
| Datáfono | ✔ | código de aprobación obligatorio, últimos 4 y terminal opcionales |
| Referencia duplicada | ◐ | solo contra este dispositivo; la validación real es del servidor (**B**) |
| Comprobante por QR/archivo, estados y verificación | ✔ | ver `POS_COMPROBANTES_MOVILES.md` |
| Confirmar venta bloqueado hasta verificar / excepción autorizada | ✔ | |
| Persistir canal, referencia y cuenta en la venta | ✘ **C** | `Payment` = `{method, amount}`; hoy se registra solo `method` |
| Conciliar cuentas receptoras; "reportado vs recibido" | ✘ **B** | |
| Ingreso en efectivo vs banco en el cierre de turno | ◐ | `expectedCash` ya cuenta solo efectivo neto; falta el desglose por canal |
| Cobros en el turno correcto | ✔ | la venta lleva `shiftId` |

## 09 Crédito y cartera
| Subflujo | Estado | Nota |
|---|---|---|
| Cliente obligatorio, cupo disponible, bloqueo si excede | ✔ | |
| Plazo 7/15/30/45/60 configurable, abono inicial, cuotas | ✘ **C** | plazo fijo de 30 días en el mock (BR-CLI-06 "30+3"); cualquier otro plazo es PROPUESTA |
| Vencimiento ajustable con autorización | ✘ | |
| Saldo a CxC, historial, alertas | ◐ | la venta crea CxC; sin alertas ni historial en la venta |
| Cobro posterior de un crédito | ◐ | existe en Cartera (abonos), no desde el POS |
| Aviso "se factura aunque no se haya recibido el dinero" | ✔ | texto en el cobro a crédito |

## 10 Finalización
| Subflujo | Estado | Nota |
|---|---|---|
| Recibo, nueva venta, programar entrega, crear pedido | ✔ | |
| Reimpresión sin duplicar | ✘ | |
| Idempotencia (`clientOperationId`) | ✔ | cubierta en los mocks y en la conformidad del contrato; sin prueba E2E de doble clic |

## Pagos mixtos independientes
| Subflujo | Estado | Nota |
|---|---|---|
| Varias filas con medio y monto | ✔ | |
| Cada componente con su propio formulario, estado y comprobante | ✘ | **pendiente**: hoy una fila mixta solo tiene medio y monto |
| Estados Recibido / Por verificar / Confirmado / Sujeto a autorización por componente | ✘ | |
| Reversar un componente sin borrado silencioso | ✘ | hoy "Quitar" borra la fila |

## Resumen
Este corte cierra: canales dinámicos, documento a emitir, comprobante móvil con verificación y excepción trazable.
**No** cierra: pagos mixtos independientes, ciclo completo de crédito (plazos, cuotas, abono inicial), persistencia del
canal/referencia en la venta (necesita contrato) ni reimpresión. Es el orden recomendado: (1) ampliar `Payment` con
`channel`, `reference`, `proofId`; (2) crédito con plazo/abono; (3) mixtos como componentes.
