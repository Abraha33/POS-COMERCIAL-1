# POS — contrato de pantalla Venta rápida

## Funciones obligatorias

| Área | Funciones |
|---|---|
| Descubrimiento | texto, lector/código, SKU, categoría, marca, disponibilidad, frecuentes y presentaciones. La búsqueda por atributos es `PROPOSED`. |
| Carrito | agregar, quitar, cantidad, duplicar, descuento, cliente, suspender, recuperar y reiniciar. |
| Cliente | buscar por nombre/NIT/teléfono, seleccionar, alta rápida; editar solo con permiso. |
| Cobro | efectivo, pagos mixtos, crédito, canal, referencia, destino, aprobación y cambio. |
| Postventa | recibo operativo, reimpresión simulada, historial, devolución/anulación por permisos. |
| Pedidos | crear/vincular pedido, ver semáforo y programar entrega (`PROPOSED` donde el contrato lo indique). |

## Estados mínimos

- turno ausente, abriendo, abierto, error de turno;
- catálogo loading, vacío, error, resultados;
- carrito vacío, editable, pendiente de validación, cobrando, error recuperable, confirmado;
- cliente no seleccionado, seleccionado, crédito bloqueado;
- pago insuficiente, esperando evidencia, aprobación requerida, rechazado, confirmado;
- sin conexión/sincronización pendiente solo como simulación visible.

## Permisos y visibilidad

- El permiso es una capacidad, no una ruta visual alternativa.
- Las acciones no autorizadas se ocultan o se explican con estado deshabilitado; nunca fallan silenciosamente.
- Propietario administra más capacidades; cajero conserva el mismo flow de venta.

## Errores accionables

Cada `ApiError.code` requiere mensaje traducible y salida: `SHIFT_NOT_OPEN` abre apertura; `PAYMENT_INSUFFICIENT` señala faltante; `APPROVAL_REQUIRED` abre PIN; `STOCK_INSUFFICIENT` explica inventario; `CREDIT_LIMIT_EXCEEDED` muestra cupo.

## Fuera de alcance actual

- emisión fiscal/DIAN;
- impresión térmica o apertura de cajón;
- verificación bancaria automática;
- confirmación de pago desde foto;
- funcionamiento offline real.
