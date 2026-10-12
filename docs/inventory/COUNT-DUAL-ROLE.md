# Inventario — Conteos cíclicos coordinados por caja y ayudante

**Corte:** 2026-10-12. **Estado:** regla operativa discutida; ampliar inventarios completos en otro contrato. Se mantiene independiente del módulo POS F04 y de su carrito.

## Patrón empresarial aprobado como base
En una tienda tipo conveniencia/distribuidora hay dos papeles durante el conteo: **ayudante cuenta físicamente**; **cajero guía, ingresa cantidades y notas**. Supervisor/administrador **revisa diferencias, valida o autoriza ajustes**. Los roles se asignan por capacidad, no obligan a contratar tres personas distintas.

## Flujo
1. Responsable autorizado agenda/abre sesión de conteo para sede/bodega/ubicación/alcance.
2. Sistema propone secuencia de artículos/ubicaciones. Definir si se oculta stock esperado durante conteo (recomendación: ciego).
3. Ayudante recorre y cuenta presentación/UOM físicamente; comunica cifra al cajero.
4. Cajero selecciona o escanea SKU, registra conteo y observaciones (ubicación, lote/vencimiento si aplica, dañado, faltante, mezcla de presentaciones).
5. Recontar discrepancias bajo política, sin alterar por sí solo inventario oficial.
6. Supervisor contrasta conteos e histórico de movimientos y decide ajuste/rechazo/investigación.
7. Si se aprueba, emitir movimiento de inventario con transacción auditable y, cuando corresponda, impacto contable vía motor ERPNext.
8. Cerrar sesión con responsabilidades, motivo, diferencias y resultados.

## Errores y excepciones
- Producto no encontrado o confundido con otro SKU.
- Diferentes UOM/cajas/unidades o presentaciones equivalentes.
- Artículos en tránsito, reservados, vendidos durante conteo o en otra ubicación.
- Conteo interrumpido, doble registro, conteos concurrentes.
- Diferencia notable, rotura, vencimiento, faltante/sobrante y permisos insuficientes.
- Sin conexión: solo sesiones con política de sincronización definida y bloqueo de ajustes de stock inciertos.

## Criterios de aceptación
- Contar y registrar NO cambia stock oficial sin autorización del ajuste.
- Diferencias tienen responsable de conteo, registrador, revisor, fecha y evidencia.
- Separa stock oficial, estimado operativo y ubicación probable si el modelo lo requiere.
- Estado de conteo y auditoría independientes de venta y stock recibido.
- Unidades y factores válidos no inventados.
- Ningún usuario puede aprobar un ajuste sensible sin permiso efectivo de servidor.
- Permite modelar cambio de ayudante/cajero sin perder historial.

## Diseño UI
Una bandeja compacta de sesiones por estado + detalle de líneas; escáner/teclado primero, tablet/móvil para ayudante cuando se habilite. No crear una pantalla por rol: vista contextual por permisos. El cajero puede coordinar desde equipo fijo, ayudante con dispositivos si existen. Sin imágenes obligatorias.

