> DOCUMENTO HISTÓRICO (v0.1.0, 2026-10-12). Este contrato se conserva íntegro para trazabilidad. Sus avisos de «no subido» y «no aprobado» describen su estado al ser redactado. Para las decisiones vigentes consultar `docs/PROJECT-STATE.md` y `docs/decisions/2026-10-12-DECISION-REGISTER.md`. No asumir implementación.

# POS-SALE-ACCESSIBILITY — Contrato accesible de Venta rápida

**Versión:** 0.1.0 · **Estado:** BORRADOR PARA VALIDACIÓN · **Meta de conformidad:** WCAG 2.2 AA, sujeto a auditoría con código vigente y pruebas asistidas.

## 1. Principios verificables

- Todas las funciones críticas por teclado (sin ratón) y mediante pantalla táctil.
- Foco visible, secuencia lógica, sin trampas de teclado; retorno del foco al cerrar diálogo o drawer.
- Componentes de PrimeReact con uso de ARIA/roles correctos y propiedades nativas probadas; no asumir que su presencia garantiza accesibilidad.
- Estados financieros, conexión, semáforos, descuentos y stock: **nunca depender exclusivamente del color**.
- Mensajes anunciados de forma proporcional: cambios de cantidad/total no deben inundar al lector de pantalla.
- Formularios de cliente, cobro y entrega con labels explícitas, instrucciones y errores por campo.
- Idioma `es-CO`, moneda COP correctamente expresada; abreviaturas/IDs comprensibles.

## 2. Contrato de teclado / foco

| Acción | Comportamiento requerido |
|---|---|
| Ingresar a Venta rápida | foco inicial en búsqueda cuando no interfiere con restauración de sesión/foco existente |
| Escanear o escribir SKU | resultado anunciado; selección con Enter; Escape cierra sugerencias |
| Filtrar resultados | filtros alcanzables por Tab y operables con Space/Enter; selección anunciada |
| Abrir detalle producto | foco en título o primer campo; trap dentro del diálogo, restauración al cerrar |
| Cantidad carrito | botones con `aria-label` específicos; input con nombre de producto, cantidad y UOM |
| Eliminar línea | acción identificable por producto; confirmación solo cuando necesaria |
| Cliente | búsqueda, creación y edición con orden predecible, errores conectados a sus campos |
| Suspender/reiniciar | informar consecuencias; no disparar destructivos con atajos sin confirmación |
| Cobrar | abrir diálogo con total y contexto; foco en selector de pago; no borrar selección al cerrarlo |
| Transferencia | copiar número/llave accesible; referencia etiquetada; estado por verificar anunciado |
| Pago mixto | cada intento identificable por método, monto, fecha y estado; saldo actualizado disponible |
| Cambiar a Pedidos/Turno | navegación mantiene borrador; foco pasa al encabezado principal o contenido activo |
| Cerrar modal | Escape si no peligra un intento en curso; ofrecer decisión segura si hay operación en proceso |
| Toast/error | anuncio de errores mediante región live, foco a resumen/primer error si corresponde |

Atajos globales son opcionales y deben ser configurables/documentados; no interceptar combinaciones reservadas del navegador o del lector de pantalla. Si un lector de códigos funciona como teclado, probar repetición rápida y conflictos con Enter.

## 3. Nombres, estados y ARIA

- Botones: «Agregar vaso 12 oz al carrito», «Reducir cantidad de vaso 12 oz», «Eliminar línea vaso 12 oz»; evitar múltiples «Agregar» sin contexto accesible.
- Inputs monetarios: «Efectivo recibido en pesos colombianos»; cantidades: «Cantidad de paquetes de ...».
- Errores: `aria-invalid`, `aria-describedby`, texto con código/explicación, no solo borde rojo.
- Estado checkout: etiqueta textual `Pendiente de verificación`, `Pago confirmado`, `Resultado incierto`; anuncios al cambiar estado, sin inventar aceptación remota.
- Conectividad: textual conectado/sin conexión/sincronización pendiente además del icono.
- Producto agotado: «Sin existencias» en lugar de solo opacidad.
- Descuentos/costos restringidos: ocultación UI más validación real de permisos servidor.

## 4. Diálogos, overlays y navegación

- El `OverlayHost` debe utilizar encabezados descriptivos, foco inicial intencional, cierre evidente y retorno a disparador si existe.
- Evitar diálogos dentro de diálogos; flujo secuencial o pantalla dedicada para cobro complejo.
- Si un proceso no permite cierre por estado transaccional, explicar por qué y ofrecer salida segura; nunca bloquear teclado sin explicación.
- Tratar pestañas/carrito móvil como regiones con nombres, estado seleccionado y conservación de contexto.
- No desplazar foco inesperadamente durante actualizaciones de búsqueda/precios; anunciar total cuando un cambio afecta la decisión del cajero.

## 5. Visibilidad, targets y movimiento

- Contraste y foco conformes al objetivo AA; comprobar temas claro/oscuro si ambos existen.
- Controles táctiles adecuados para cajas y teléfonos; objetivo práctico >= 44×44 CSS px en móvil cuando el diseño lo permita; comprobar mínimo WCAG aplicable.
- Zoom 200%, reflow y orientación sin pérdida de acción o contenido; texto reescalable.
- Respetar `prefers-reduced-motion`; no utilizar animación como único medio de feedback.
- Tablas compactas deben exponer cabeceras/relaciones; al apilar en móvil no perder nombre de columna.

## 6. Matriz de verificación

| Escenario | Test automático | Test manual obligatorio |
|---|---|---|
| Buscar y agregar producto | roles, labels, foco y teclas | teclado solo + lector |
| Editar carrito | nombres accesibles, cantidades y totales | lector de pantalla y zoom |
| Registrar cliente | validación, errores por campo | teclado, anuncio del error |
| Cobro efectivo/mixto | estructura, labels, saldo | no saturación de anuncios, cierre seguro |
| Transferencia | labels de destino/referencia | copia, lectura de banco y estado |
| Venta suspendida | foco de lista/recuperación | retomar sin confundir borrador |
| Pedido para después | campos y fecha accesibles | touch y teclado virtual |
| Red caída/operación incierta | región de estado | comprensión sin color |
| Autorizar operación | diálogo etiquetado/retorno | keyboard only y rol restringido |

Herramientas a utilizar en repo si están presentes: Playwright, axe (si se autoriza dependencia), pruebas de componentes, inspección manual con NVDA + teclado en Windows, y VoiceOver/TalkBack en al menos una plataforma móvil disponible. No declarar AA solo por pasar tests automáticos.

## 7. Fallos bloqueantes

P0: foco perdido al cerrar checkout con pago incierto; confirmación accesible que duplica venta; botón Cobrar inaccesible en móvil; error financiero expresado solo con color; diálogo imposible de cerrar/recuperar; imposibilidad de completar una venta mediante teclado.

## 8. Pendientes

Inspeccionar árbol de accesibilidad real del frontend más reciente, los componentes PrimeReact elegidos, `RouteGuard/Can`, los atajos existentes y validaciones. Auditoría AA final debe registrar evidencia de dispositivo/navegador/lector de pantalla.