> DOCUMENTO HISTÓRICO (v0.1.0, 2026-10-12). Este contrato se conserva íntegro para trazabilidad. Sus avisos de «no subido» y «no aprobado» describen su estado al ser redactado. Para las decisiones vigentes consultar `docs/PROJECT-STATE.md` y `docs/decisions/2026-10-12-DECISION-REGISTER.md`. No asumir implementación.

# POS-SALE-SCREEN — Contrato de pantalla Venta rápida

**Versión:** 0.1.0 · **Estado:** BORRADOR PARA VALIDACIÓN · **Alcance:** pantalla principal, paneles y diálogos.

## 1. Objetivo y modelo mental

El cajero debe distinguir de inmediato qué vender, a quién, cuánto cobrar y qué hacer después. Pantalla densa pero limpia, sin imágenes obligatorias ni estadísticas decorativas. **Permanentemente visible:** búsqueda, cliente, carrito, total, cobrar y crear pedido; el resto se muestra por demanda. PrimeReact 10.9.9 según auditoría suministrada.

## 2. Regiones y prioridades

| ID | Región | Contenido obligatorio | Acciones | Prioridad | Visible |
|---|---|---|---|---|---|
| H1 | Header compacto | empresa/sede, caja, terminal, cajero, turno, conexión/sync | bloquear, Mi turno, alertas, Más | P1 estado, P2 menús | persistente |
| H2 | Navegación | Venta rápida, Suspendidas, Cobros pendientes, Pedidos, Mi turno, Más | navegar sin perder draft | P1/P2 | escritorio visible, móvil menú compacto |
| C1 | Catálogo | foco en buscador, SKU/barcode/nombre, resultados | buscar/escanear, filtros, frecuentes | P1 | permanente |
| C2 | Filtros | categoría, familia, marca, presentación, disponibilidad; favoritos/recientes | aplicar/quitar | P2 | compacto o desplegable |
| C3 | Producto | SKU, variante, UOM, stock, precio, escalas, listas | cantidad, agregar, detalle | P2/P3 | fila + panel detalle |
| R1 | Cliente (encima carrito) | nombre/ID, tipo documento/datos necesarios, lista aplicada | buscar, crear, editar, cambiar | P1/P2 | persistente |
| R2 | Carrito | líneas, cantidades, presentación, precio, descuento, subtotal | +/- cantidad, editar, eliminar, suspender, reiniciar, duplicar | P1 + P2 | permanente |
| R3 | Resumen | subtotal, descuentos, impuestos calculados, cargos, total, cobrado y saldo cuando aplique | ajustar mediante reglas | P1 | visible y anclado |
| R4 | Finalización | Cobrar ahora; Crear pedido/programar entrega | iniciar checkout o pedido | P1 | anclado |
| X1 | Auxiliares | autorizaciones, detalles, transferencias, historial, devoluciones | según contexto | P3 | diálogo/panel |

## 3. Comportamientos precisos

**Header:** jamás ocupar más de una banda de información en desktop si cabe; alertas solo críticas/accionables. Conexión y sincronización son estados distintos. Cierre turno bajo Mi turno, no botón protagonista de venta.

**Catálogo:** búsqueda con foco inicial; escaneo exacto puede agregar según regla de producto; con variantes ambiguas seleccionar presentación; resultados compactos con nombre/SKU/UOM/precio; vacíos, error, sin stock y loading explícitos. No exigir foto. Filtros combinables con búsqueda. Resultado sin precio válido no se vende a precio cero silenciosamente.

**Producto:** al abrir panel mostrar detalles completos, existencias contextualizadas, escalas aplicables, presentaciones y lista de precios según rol; recalcular al cambiar cantidad, cliente o presentación. No permitir precios históricos arbitrarios como tarifas actuales.

**Cliente:** bloque encima del carrito, consumidor final solo cuando sea legal/operativamente aceptado. Búsqueda por nombre/ID/teléfono; alta y edición rápida dentro de diálogo, con permisos y validación. Borrado físico de clientes vinculados a documentos restringido; preferir desactivación.

**Carrito:** una línea = identidad de producto/presentación/UOM + condiciones de precio; cantidades exactas; total no editable. Acciones secundarias como suspender/reiniciar agrupadas sin ocultar posibilidad de recuperación. Si hay pagos capturados no ofrecer "reiniciar" como si fuera borrador libre.

**Cobro:** modalidades efectivas en Colombia: efectivo, transferencia (bancos/cuentas, Nequi, Daviplata, Bre-B llave/QR cuando estén configurados), tarjeta, mixto, crédito autorizado. Cada método muestra solo campos apropiados. Copiar datos de destino y mostrar titular/cuenta; registrar referencia; no confirmar por captura de pantalla. Cambio por efectivo y saldo de mixtos. Estados pendiente, parcial, verificación, incierto, confirmado, rechazado; siempre permitir recuperar estado vigente sin duplicar intento.

**Crear pedido:** se considera acción de finalización igual de visible que Cobrar, con dos subcasos: cobrar ahora y entregar después; crear pedido para cobrar después. Requiere contacto, entrega/recogida, fecha/franja y dirección cuando corresponda; enlaza al gestor F08.

**Pedidos:** navegación directa desde header a bandeja semáforo minimalista; el cajero consulta/cobra pendientes; el despachador prepara; administrador resuelve abastecimiento. No incrustar un Kanban dentro del carrito.

## 4. Condiciones por contexto

| Condición | Efecto UI |
|---|---|
| Turno ausente/cerrado | deshabilitar acciones transaccionales; CTA abrir caja |
| Sin productos | carrito vacío, cobro deshabilitado, búsqueda disponible |
| Cliente cambiado | confirmar/revisualizar variaciones de precio |
| Descuento restringido | solicitar F12, conservar venta sin aplicar aún |
| Pago en proceso | preservar payment session; evitar suspender/reiniciar inseguro |
| Transferencia reportada | estado «Por verificar», no «Pagada» |
| Sin red | indicador discreto; habilitar solo acciones permitidas por F13 |
| Producto agotado | mostrar disponibilidad real; aplicar política de apartados/pedidos |
| Entrega programada | panel de destino/fecha; no bloquear carrito hasta confirmar pedido |
| Error de impresión | recibo reimprimible; no repetir confirmación |

## 5. Responsabilidad de navegación

PosPage/Route es solo composición; el enrutamiento puede desmontar QuickSale sin destruir draft, checkout ni operaciones. `activeDraftId` reside en un store persistente con clave que impida cruce entre empresa/sede/terminal. Los diálogos no son propietarios de datos transaccionales; emiten comandos y muestran estados. Al entrar en otra vista, conservar foco/posición cuando sea razonable y refrescar validaciones al volver.

## 6. Criterios de aceptación de pantalla

- Cajero puede ejecutar venta ordinaria sin visitar pantallas administrativas.
- Cliente siempre se ubica arriba del carrito en escritorio/tablet; móvil lo presenta antes del resumen de líneas.
- Búsqueda, carrito, total, Cobrar y Crear pedido están disponibles sin recorrer menús secundarios.
- Suspendidas, Cobros pendientes, Pedidos y Mi turno accesibles en un paso desde navegación principal.
- No mostrar a cajeros márgenes/costos de compra sin permiso.
- Pantalla no presenta datos ficticios como productos o tarifas reales.
- Componentes muestran estados `loading`, `empty`, `error`, `disabled`, `offline`, `permission_denied` cuando aplican.

## 7. Pendiente de conciliar con frontend vigente

Nombre/posición exacta de rutas, ancho disponible bajo shell, menú y quick-actions existentes, layout de checkout actual, variantes comerciales, filtros ya implementados, permisos, estado de cliente y políticas de entrega.