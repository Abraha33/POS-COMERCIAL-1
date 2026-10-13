# F04/F05/F06 — Catálogo, carrito, cobros, facturación y comprobantes

**Versión:** 2026-10-12. **Estado:** decisiones aprobadas + criterios propuestos, pendiente validar contratos/API y frontend actual. **Objetivo:** minimizar interacción del cajero sin reducir trazabilidad, seguridad o exactitud financiera.

## 1. Arquitectura visible (desktop)
```text
POS Workspace (estado durable fuera de rutas/diálogos)
 ├─ Header: empresa/sede · caja/terminal · cajero · turno · internet/sync · alertas · Más
 ├─ Navegación operativa: Venta | Suspendidas | Cobros pendientes | Pedidos | Mi turno | Más
 └─ Área de trabajo
    ├─ Izquierda — Catálogo
    │   ├─ buscador prominente (texto, SKU, barcode, atributos)
    │   ├─ filtros discretos (categoría, marca, familia, presentación, atributos)
    │   ├─ vista resumida de resultados, densidad alta
    │   └─ ficha detallada contextual (drawer/diálogo, no otra pantalla de venta)
    └─ Derecha — Cobro
        ├─ cliente SOBRE carrito (buscar/crear/editar; fiscal/entrega según caso)
        ├─ carrito (líneas, UOM, cantidad, precio, escala, descuento)
        ├─ acciones (suspender/recuperar/reiniciar, con reglas)
        ├─ totales fijos (impuesto por ítem, descuentos, cargos, pagado y saldo)
        └─ acciones prominentes: Cobrar ahora | Crear pedido / Programar entrega

OverlayHost único: producto detallado, cliente, pagos, evidencia fotográfica, permisos y entrega.
```
Objetivo dos zonas principales (catálogo 55 % aprox.; cliente/carrito 45 % aprox.), no restricción matemática fija. Móvil: búsqueda primero, carrito contextual, resumen/acción anclada; tablet reorganiza las mismas funciones. Minimalista sin fotografías obligatorias de productos, skeleton e iconos simples. Semáforos nunca solo color.

**Gestión de pedidos:** debe estar a un acceso visible de POS, independientemente de ubicación de botón flotante (variant visual aún no congelada). Vista propia con semáforo compacto, no un Kanban grande dentro de Venta. F08 queda pendiente para profundización.

## 2. Catálogo: problema = encontrar el producto
Búsqueda dominante por nombre, fragmento, sinónimos cargados, referencia/SKU/barcode. Código exacto puede agregar directo si no hay ambigüedad de variante/UOM. Si no lo encuentra: filtro por marca, categoría o familia; si tampoco conoce esos datos: atributos descriptivos **combinables** como material, color, tipo de artículo, tamaño, contenido/capacidad y presentación. Ejemplo de consulta descrita: 'vaso plástico blanco'; **no inventar atributos ni indexación que el backend no tenga**. Resultado sin precio válido no se vende a precio cero. Estados: cargando, vacío, error, agotado, sin precio, variantes múltiples, stock por consultar.

**Vista resumida APROBADA:** nombre + código + marca/presentación breve + precio principal / 'desde' + disponibilidad y acción Agregar/Ver ficha. Miniatura opcional; resultados en filas compactas, teclado/lector de código prioritarios.

**Ficha detallada APROBADA:** producto y SKU, variantes, color/material/capacidad verificables, presentación/UOM/factor, lista de precios aplicable, precio por volumen, precio de cliente, impuesto real y stock permitido de mostrar, ubicación por permiso, cantidad/subtotal, agregar. Fotografías solo si existen; no bloquear por imágenes ausentes. No mezclar **presentación** (paquete/caja) con **escalón de volumen** (descuento al adquirir N paquetes) ni **lista de cliente**. Recalcular si cantidad, cliente o unidad cambian; reglas de prioridad de precios requieren contrato PricingService.

## 3. Cliente encima del carrito
Elegir cliente/final consumidor, buscar nombre/ID/teléfono/código, crear y editar rápido con validación y permisos. Identificación fiscal conforme a reglas reales. Cambiar cliente puede cambiar lista de precios, descuentos, crédito y requisitos; recalcular y mostrar cambio. Desactivar clientes vinculados a documentos en vez de borrar historial.

## 4. Carrito y conservación
Editar cantidades con +/- y entrada directa, presentación, precio aplicado, descuento autorizado, observaciones, quitar línea, suspender, recuperar, reiniciar/vaciar (confirmación). Carrito suspendido sin pagos comprometidos ≠ **sesión de cobro pendiente**. Si hay pago en verificación, aprobado o incierto, preservar PaymentSession; no permitir borrar y crear otra transacción con cargo duplicado.

Invariantes: SaleDraft con ID/revisión + tenant/site/terminal/shift/customer + price quotes + líneas; PaymentSession persistida separadamente. Cambiar de Venta a Pedidos, Mi turno o cualquier modal NO destruye draft ni checkout. Los diálogos carecen de autoridad financiera propia.

## 5. F06: flujo desde 'Cobrar'
1. Revisar productos/UOM/cantidad/precio aplicado, impuestos y total.
2. Verificar cliente y datos fiscales (o consumidor final bajo reglas).
3. Seleccionar operación: entrega inmediata, retiro posterior o domicilio programado; el último genera pedido vinculado (F08) sin asumir cobro/facturación.
4. Iniciar sesión de cobro única, conservada al navegar; seleccionar medio de pago.
5. **Agregar pagos independientes por importe**: efectivo, tarjeta, banco, Nequi, Daviplata, Bancolombia, otros bancos, Bre-B llave/QR, crédito autorizado; cualquier mezcla y **repetición del mismo medio**.
6. Cada pago tiene ID, cuenta receptora configurada, estado y referencia/evidencia. El POS muestra confirmado, en verificación, rechazado, incierto y saldo libre sin confundirlos.
7. Cuando cumple política de cobro o crédito: confirmar negocio una sola vez mediante backend idempotente.
8. Gestionar documento fiscal según normativa, registrar aceptación/contingencia/rechazo; entrega electrónica al cliente en paso separado.
9. Imprimir opcionalmente, registrar que se envió al dispositivo o confirmar impresión solo si existe respuesta verificable.
10. Retornar a nueva venta solo tras persistir la operación, dejando pedido/entrega y pendientes vinculados.

**Ejemplo:** total COP 100.000 → Nequi COP 50.000 (pendiente aprobación) → efectivo COP 50.000 confirmado → confirmado 50.000, pendiente de verificación 50.000, saldo libre sin asignar 0. **No** marcar cobrado 100.000 hasta verificar Nequi o registrar política de crédito autorizada. También aceptar dos transferencias de COP 50.000 a cuentas diferentes, con dos verificaciones independientes. Efectivo puede cubrir todo.

## 6. Verificación de transferencias con varias fotografías
1. POS precarga monto, banco/cuenta/llave/QR, titular y destino según configuración. Cajero NO escribe cuentas repetidamente ni recibe permiso para app bancaria del propietario.
2. Cliente hace transferencia y muestra recibo.
3. Cajero elige Tomar foto o Adjuntar; **puede capturar varias fotos**, visualizar, aceptar la foto o repetirla antes de enviar. Aceptar fotografía es solo revisión de calidad visual.
4. Acción **Enviar a verificación** vincula fotos versionadas a PaymentAttempt y notifica cuenta/usuario responsable; estado = pendiente.
5. Administrador abre Holamigo desde su teléfono, inspecciona fotos y confirma el movimiento en el canal oficial de la cuenta, mediante QR verificador cuando sea soportado, o mediante movimiento acreditado; rechaza o pide nueva foto en caso contrario.
6. Cajero recibe confirmación, puede continuar otra venta durante espera y regresar sin reconstruir el pago. Toda aprobación guarda actor, momento, método, importe, cuenta e identificador; controles anti-reutilización de comprobantes.

**No** inferir confirmación desde screenshot, OCR, fotografía, firma visual ni mensaje verbal. Subida de archivos protegida, almacenamiento privado, permisos y retención a definir.

## 7. Datáfono / tarjeta
- Aprobado → conservar referencia y estado confirmado.
- Rechazado o cancelación confirmada → permitir regresar a selector al inicio del cobro, sin destruir draft.
- Error antes de enviar solicitud → reintentar seguro.
- Timeout tras posible autorización o datáfono sin respuesta → **incierto**; consultar por ID/terminal/proveedor o revisión externa ANTES de cobrar otra vez, incluso si el usuario vuelve visualmente al inicio.
- Reversión/reembolso requiere flujo separado, autorización y trazabilidad; no tratarlo como borrar fila.

## 8. Fiscal / entrega electrónica / impresión / despacho
Entidades y estados separados:
- Sale: editing/committed/adjusted/voided mediante correcciones.
- PaymentAttempt: created/pending/confirmed/rejected/unknown/reversed.
- FiscalDocument: pending/submitted/accepted/rejected/contingency (verificar etiquetas proveedor y DIAN).
- DocumentDelivery: pending/sent/delivered/failed cuando sea comprobable.
- PrintJob: queued/sent-to-device/failed/acknowledged-printed si hardware garantiza.
- FulfillmentOrder: pending/packing/ready/delivered con incidencia; independiente del pago.

En caso impresora sin respuesta, **nunca repetir la venta ni emitir otra factura**; permitir reimpresión usando mismo documento. Una transmisión a DIAN no equivale a aceptación ni a entrega. Cobrar y entregar después: pedido vinculado a venta/pagos; pedido para pagar después: no asumir venta fiscal final antes de evento exigible por ley.

## 9. Contratos transversales
- Money: decimal exacto/entero menor según moneda, impuestos por producto/jurisdicción, nunca 8,25 % fijo de demo.
- Quantity/UOM: decimales exactos, equivalencias validadas, presentaciones reales.
- Pricing: lista de cliente, escalas, descuentos/promociones con precedencia comprobable.
- Contexto: tenant/sede/caja/turno/usuario y capability grants por operación.
- Commands + events tipados; back-end autoridad para pagos, stock, venta y documentos.
- Errores estructurados con recuperación; registros append-only para intentos financieros.
- Offline y fiscalidad: permisos por tipo de operación, jamás declarar aceptado un evento local.
- Accesibilidad: foco y lectores de barra, atajos seguros, mensajes no basados solo en color.

## 10. Criterios de aceptación prioritarios
- Búsqueda por término, marca, categoría y atributo; SKU exacto; estados vacíos y variantes ambiguas.
- Vista resumida y ficha detallada; al cambiar cantidad/cliente se aplica precio por volumen correcto.
- Navegar a Pedidos y volver conserva carrito + checkout + intentos.
- Suspender solo cuando estado lo permite; pendientes electrónicos separados.
- 100.000 = dos pagos de 50.000; no suma como confirmados los que están por verificar.
- Múltiples fotos por intento; vista previa/repetir/enviar; responsable valida desde dispositivo distinto.
- Rechazo de tarjeta permite volver al inicio; timeout no permite doble cargo.
- Fallo de impresora no altera venta, pago ni estado fiscal.
- Crear pedido/entrega programada no duplica cobro ni inventario.
- Todos los permisos server-side y recuperación auditables.

**No afirmar integración o cumplimiento hasta prueba sobre frontend vigente, POS Core/ERPNext y proveedor fiscal.**
