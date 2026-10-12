# POS — contrato de accesibilidad

## Teclado y foco

- El buscador de producto recibe foco inicial cuando la pantalla está lista.
- Atajos se documentan y no reemplazan botones accesibles; conflictos con lector de pantalla se evitan.
- Abrir un modal mueve el foco al título/primer campo; cerrar devuelve el foco al control que lo abrió.
- Errores de pago, stock y autorización son anunciados por región viva y asociados al control correspondiente.

## Semántica

- Catálogo, carrito y checkout tienen nombres de región distinguibles.
- Iconos de acciones siempre tienen nombre accesible.
- El semáforo de pedidos comunica texto/estado, no solo color.
- Las acciones destructivas explican consecuencia, objeto afectado y requieren confirmación.

## Contraste y táctil

- Texto normal cumple contraste mínimo 4.5:1; no usar verde/rojo como única señal.
- Controles táctiles tienen objetivo mínimo de 44 × 44 px.
- El foco visible no se elimina y se diferencia del hover.

## Estados comprobables

- Carga: `aria-busy` o equivalente; skeleton no oculta contenido ya disponible sin aviso.
- Vacío: explica qué falta y la siguiente acción posible.
- Error: incluye acción de recuperación cuando exista.
- Éxito: confirma resultado sin depender solo de toast temporal.

## Validación

Cada cambio de plantilla debe pasar pruebas de teclado y axe en desktop, tablet y teléfono. La auditoría histórica reportó contraste insuficiente y desborde; ambos son bloqueadores de declarar accesibilidad integral PASS.
