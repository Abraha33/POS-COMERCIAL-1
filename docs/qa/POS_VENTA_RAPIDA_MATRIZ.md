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
| Vista previa del semáforo en el header | ✔ | 4 contadores (pendientes, en proceso, con faltante, listos) junto a Pedidos |
| Alertas reales (F12) en el header | ◐ | el estado existe en `pos-ops`, no se consume aquí |

## 02 Bandejas rápidas
| Subflujo | Estado | Nota |
|---|---|---|
| Suspendidas, Cobros pendientes, Pedidos | ✔ | contadores y filtros |
| Reanudar revalidando precios y catálogo | ✔ | aviso de cambios de precio y retiro de productos inactivos; el stock lo valida el servidor al cobrar |
| Reintentar operación de resultado incierto | ◐ | la cola offline (F13) lo modela; no está atada al botón Cobrar |

## 03 Catálogo inteligente
| Subflujo | Estado | Nota |
|---|---|---|
| Texto, código de barras, SKU, categoría, disponibilidad, frecuentes, lista/cuadrícula | ✔ | |
| Marca y presentaciones | ✔ (mocks) | `brand` y `presentations` PROPUESTA v0.6.0; búsqueda por marca; agregar una presentación suma sus unidades base |
| Historial reciente | ✔ | "Frecuentes" (catálogo) e "Historial del cliente" (compras, total, crédito, saldo) |
| Conversión de unidades | ◐ | `factor` por presentación; el cobro siempre es por unidad base |

## 04 Detalle de producto
| Subflujo | Estado | Nota |
|---|---|---|
| Existencias por sede, escalones por volumen | ✔ | escalones = ejemplo informativo (PROPUESTA) |
| Listas de precio y promociones | ✘ **C** | el servidor decide el precio |

## 05 Clientes y facturación
| Subflujo | Estado | Nota |
|---|---|---|
| Selección, alta rápida, cupo y saldo | ✔ | |
| Buscar por nombre, NIT o teléfono | ✔ | Enter selecciona si hay una sola coincidencia |
| Editar cliente | ✔ | solo con permiso `customers.edit` (el cajero crea pero no edita) |
| Direcciones de cliente | ✔ (mocks) | `addresses` PROPUESTA v0.6.0; alta y edición con una dirección principal |
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
| Referencia duplicada | ✔ (mocks) | aviso local + `REFERENCE_DUPLICATED` 409 en el mock; la validación real es del backend (**B**) |
| Comprobante por QR/archivo, estados y verificación | ✔ | ver `POS_COMPROBANTES_MOVILES.md` |
| Confirmar venta bloqueado hasta verificar / excepción autorizada | ✔ | |
| Persistir canal, referencia, cuenta y comprobante en la venta | ✔ (mocks) | `Payment` v0.6.0 PROPUESTA: `channel`, `reference`, `destination`, `proofId`; conformidad 37/37 |
| Conciliar cuentas receptoras; "reportado vs recibido" | ◐ | vista "Conciliación de cobros" (Más): reportado por canal y cuenta, con/sin comprobante, "recibido" digitado desde el extracto; sin conexión bancaria (**B**) |
| Ingreso en efectivo vs banco en el cierre de turno | ✔ (vista) | el diálogo de caja (cierre de turno) muestra efectivo, banco/billeteras y crédito por canal y avisa de cobros digitales sin comprobante confirmado |
| Cobros en el turno correcto | ✔ | la venta lleva `shiftId` |

## 09 Crédito y cartera
| Subflujo | Estado | Nota |
|---|---|---|
| Cliente obligatorio, cupo disponible/utilizado/excedente | ✔ | el excedente se muestra; "Autorizar excedente" pide PIN de propietario/administrador (`credit_exception`) |
| Plazo 7/15/30/45/60, abono inicial | ✔ (mocks) | `creditTermDays` PROPUESTA; 30 es el aprobado (BR-CLI-06 "30+3"), el resto se marca "propuesta" |
| Cuotas / plan de pagos | ✔ (mocks) | `creditInstallments` PROPUESTA (2–12); una cuenta por cobrar por cuota; vista previa del plan |
| Vencimiento libre con autorización | ✔ (mocks) | `creditDueDate` ≤ 180 días; exige acción `credit_exception` (propietario o administrador) |
| Saldo a CxC, historial, alertas | ◐ | la venta crea CxC; sin alertas ni historial en la venta |
| Cobro posterior de un crédito | ◐ | existe en Cartera (abonos), no desde el POS |
| Aviso "se factura aunque no se haya recibido el dinero" | ✔ | texto en el cobro a crédito |

## 10 Finalización
| Subflujo | Estado | Nota |
|---|---|---|
| Recibo, nueva venta, programar entrega, crear pedido | ✔ | |
| Reimpresión sin duplicar | ✔ | "Reimprimir copia" cuenta copias del mismo documento; sin venta, stock ni caja nuevos |
| Idempotencia (`clientOperationId`) | ✔ | cubierta en los mocks y en la conformidad del contrato; sin prueba E2E de doble clic |

## Pagos mixtos independientes
| Subflujo | Estado | Nota |
|---|---|---|
| Varias filas con medio y monto | ✔ | |
| Cada componente con su propio formulario, monto y comprobante | ✔ | `features/pos/mixed`; probado en unidad y UI |
| Estados Recibido / Por verificar / Confirmado / Sujeto a autorización por componente | ✔ | |
| Reversar un componente confirmado sin borrado silencioso | ✔ | motivo y responsable; queda en "Reversados". Un componente no confirmado sí se quita |

## Resumen
Cerrado en esta rama: canales dinámicos, documento a emitir, comprobante móvil con verificación y excepción trazable,
canal/referencia/cuenta/comprobante en la venta (contrato v0.6.0 PROPUESTA), plazo y abono inicial de crédito, y pagos
mixtos como componentes independientes con reversa trazable.
Capa 5: pedidos y la cola offline de `pos-ops` **ya consumen** la API simulada (ver `docs/architecture/CONTRATO_CAPA_5.md`);
las autorizaciones y la entrega de turno de `pos-ops` también consumen la API (el relevo sin conexión no se reenvía).
Sigue **sin** cerrar: conexión bancaria real para la conciliación y backend real. Todo lo ✔ corre sobre mocks.
