> DOCUMENTO HISTÓRICO (v0.1.0, 2026-10-12). Este contrato se conserva íntegro para trazabilidad. Sus avisos de «no subido» y «no aprobado» describen su estado al ser redactado. Para las decisiones vigentes consultar `docs/PROJECT-STATE.md` y `docs/decisions/2026-10-12-DECISION-REGISTER.md`. No asumir implementación.

# POS-SALE-RESPONSIVE — Contrato adaptable de Venta rápida

**Versión:** 0.1.0 · **Estado:** BORRADOR PARA VALIDACIÓN · **Objetivo:** misma operación en desktop, tablet y móvil sin sacrificar velocidad.

## 1. Reglas generales

Diseñar en función del espacio **real del contenedor**, no solo de `window.innerWidth`; considerar menú lateral abierto, zoom, teclado virtual, barra de navegador y tamaño de texto. Breakpoints **propuestos para probar**, no supuestos de código vigente: móvil `< 768px`, tablet `768–1199px`, desktop `>=1200px`. Validar 360×800, 390×844, 768×1024, 1024×768, 1280×720, 1366×768, 1440×900 y 1920×1080.

Mantener contexto de `SaleDraft` sin cambios al reordenar componentes, rotar dispositivo o alternar pantallas. No esconder acciones críticas detrás de hover; todos los controles deben ser usables con touch y teclado. Sin scroll horizontal global. Probar zoom 200% y reflow al 400% donde sea aplicable.

## 2. Comportamiento por región

| Región | Desktop >=1200 | Tablet 768–1199 | Móvil <768 |
|---|---|---|---|
| Header | barra única compacta; estado de caja/turno/red | condensar texto e iconos; menú secundario | nombre de caja/estado y menú; sin datos decorativos |
| Navegación | accesos en banda horizontal | accesos principales + overflow | Ventas, Pendientes, Pedidos; resto en menú accesible |
| Búsqueda | fija en parte superior del catálogo, foco | arriba del resultado, prominente | arriba; accesible desde carrito sin perder estado |
| Filtros | chips esenciales + popover | uno o dos chips + botón filtros | botón filtros abre panel no modal invasivo |
| Catálogo | resultados compactos en lista o grid opcional | lista compacta | lista vertical; alta densidad sin imágenes obligatorias |
| Detalle producto | panel contextual a un lado | panel superpuesto/ancho disponible | pantalla/drawer con retorno y foco |
| Cliente | siempre encima del carrito | siempre arriba del carrito | dentro de vista carrito, antes de líneas |
| Carrito | columna a derecha, scroll propio | panel derecho o tab con resumen | vista/panel de carrito independiente, conservar búsqueda |
| Total | pegado al pie del carrito | fijo al pie del panel de carrito | pie fijo dentro de vista carrito, considerar teclado virtual |
| Finalización | Cobrar + Crear pedido visibles | ambos accesibles | acciones apiladas o compactas, no fuera de viewport útil |
| Cobro | diálogo compacto o panel dedicado | panel/dialog ajustado | pantalla completa/drawer estable, no tapar importe y saldo |
| Pendientes | panel/tabla compacta | panel | lista de tareas compacta |
| Notificaciones | discreto en header/status | estado compacto | pequeña alerta accesible, no toast permanente |

## 3. Reglas de layout

**Desktop:** catálogo y carrito simultáneos, distribución inicial sugerida 55/45 (adaptable entre 50/50 y 60/40); altura útil = viewport menos shell/header. Catálogo scrollea internamente; carrito scrollea solo líneas; `CustomerContext`, `SaleTotals` y acciones no desaparecen por lista extensa.

**Tablet:** si la anchura del área principal no permite leer búsqueda + carrito, pasar a tabs/panel con resumen persistente. No forzar dos columnas de 300 px que hagan ilegibles nombre/precio/cantidad.

**Móvil:** buscar/añadir primero; acceso claro al carrito con conteo y total; cuando se abre, cliente → líneas → total → CTA; volver al catálogo sin abandonar venta. Modal cliente, producto, checkout y entrega adaptados a viewport, evitar overlays apilados. Respetar `safe-area-inset-bottom` y teclado virtual.

## 4. Prioridades de ocultación

Ocultar primero: imágenes grandes, texto redundante, etiquetas largas del header, filtros secundarios expandidos, datos administrativos. **No ocultar:** buscador, identidad de cliente, cantidad, total, Cobrar, Crear pedido, mensaje de bloqueo y estado de pago pendiente. No ocultar información fiscal obligatoria en la confirmación.

## 5. Casos límite y pruebas

- 0/1/100 productos encontrados y carrito 0/1/100 líneas.
- Nombre de producto y cliente largo, SKU ancho y múltiples presentaciones.
- Total de 10+ dígitos en COP y campos de importe con zoom.
- Selector de banco con nombre largo, referencia y llave QR, dentro de móvil.
- Pago mixto con 3+ intentos, referencia, saldo, error y verificación incierta.
- Modal con teclado virtual: botones de cierre/confirmación accesibles.
- Rotación y cambio de ancho mientras checkout abierto sin reiniciar.
- 200% texto, 200% zoom, preferencias reducción de movimiento.
- Tablas que se convierten en filas apiladas sin perder cabeceras/etiquetas.
- Scrolling: total y CTA disponibles mientras se recorren 100 líneas.

## 6. Presupuestos de experiencia (objetivos verificables, no garantías)

- Búsqueda accesible desde escritorio con un foco inicial; en móvil acceso en un toque.
- Para venta ordinaria, no requerir navegación a módulos administrativos.
- Entrada de códigos repetida no bloquea la interfaz; latencia de interacción local objetivo ~150–200 ms donde sea razonable.
- No depender de hover y no usar animación compleja para señalizar estados.

## 7. Pendientes

Medir ancho real de shell del frontend vigente, puntos de ruptura actuales, tamaño de sidebar, comportamiento de PrimeReact Dialog y resolución objetivo de las terminales reales. Ajustar breakpoints con pruebas visuales sin cambiar la jerarquía de información.