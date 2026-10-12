# POS — contrato responsive

## Principio

La semántica del flow no cambia por viewport. Solo cambia la disposición; no se crea un POS móvil distinto.

| Contexto | Disposición |
|---|---|
| Desktop (>= 1024 px) | Catálogo y carrito simultáneos; checkout como panel o diálogo lateral. |
| Tablet (768–1023 px) | Catálogo dominante; carrito en panel plegable/drawer sin perder su resumen persistente. |
| Teléfono (< 768 px) | Una región principal por vez: catálogo, carrito o checkout; navegación explícita entre pasos y resumen persistente. |

## Reglas

- Ninguna región puede provocar scroll horizontal del documento a 375 px.
- Tablas se convierten en tarjetas, resumen o contenedor con scroll horizontal intencional y etiquetado.
- Acciones críticas conservan área táctil mínima de 44 × 44 px.
- `PosActionBar` se vuelve menú/overflow/drawer cuando no cabe; no puede quedar truncada.
- El carrito conserva contador, total y acceso visible al cambiar de región.
- Modal de pago ocupa pantalla completa en teléfono; devuelve el foco al disparador al cerrar.

## Evidencia requerida

Capturas y pruebas en 1366, 768 y 375 px para carrito vacío, carrito con líneas, checkout, error de pago y turno cerrado. La auditoría existente detectó desborde de `PosNav` a 375 px; este contrato no se considera PASS hasta corregirlo.
