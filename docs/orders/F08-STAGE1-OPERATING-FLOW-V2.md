# F08 — Etapa 1: flujo operativo definitivo propuesto (pedidos omnicanal sin burocracia)

**Producto:** Holamigo ERP/POS. **Corte:** 2026-10-12. **Alcance del encargo:** especificación etapas 1–3, NO construcción etapa 4. **Precedencia:** conserva [PED v1](PED-ORDERS-FULFILLMENT-V1.md) como antecedente aprobado; la conversación posterior de usuario define explícitamente faltantes ágiles, microapp de proveedores opcional y **autorización por persona, operación y contexto; NO por cargo fijo**. Las propuestas de esta v2 se declaran derivadas cuando no hubo aprobación puntual. **Relaciones:** F04/F06, F07, INV, COM, CAJ/TES/CON, ADM, CAT y REP. F13 Offline queda fuera de alcance.

## 1. Resultado y principio
Centralizar pedidos que vienen de POS, tienda online, redes sociales/WhatsApp, teléfono y otros canales para **alistarlos correctamente y despacharlos antes**. Calidad es verificar que el cliente reciba **exactamente lo solicitado o una modificación aceptada**, no prometer matemáticamente 100% de aciertos. El KPI objetivo es cero errores de referencias, variantes y cantidades; registrar incidentes reales.

**Regla de fricción:** no crear aprobaciones, formularios, estados, tickets o pasos administrativos solo por registrar. Acciones operativas predeterminadas en 1–2 toques; el sistema registra actor/hora/origen automáticamente. La escalación aparece únicamente cuando hay faltante, dinero, excepción de entrega o cambio de lo solicitado.

## 2. Capacidades y permisos (sin cargos rígidos)
Tres conceptos independientes:
- **Persona:** identidad responsable real.
- **Autorización vigente:** capacidad para una operación concreta, con empresa/sede/caja, presupuesto/límite, tiempo, alcance y eventualmente pedido/faltante específicos. Puede ser permanente, temporal o para **un solo desembolso**. **Se verifica en servidor cada vez**.
- **Asignación:** persona encargada de ejecutar una tarea. Ser asignado comprador NO le concede automáticamente autorización para entregar dinero ni para modificar condiciones comerciales.
Un empleado puede preparar hoy, entregar dinero mañana y ser comprador autorizado en otro turno. Administrador, cajero y encargado son nombres organizativos y no fuentes únicas del permiso. En empresas pequeñas una sola persona puede concentrar varias capacidades **si la política permite**; registrar los actos separados sin forzar doble aprobación ficticia.

Capacidades mínimas: `order.intake`, `order.pick`, `order.markMissing`, `order.sourceView`, `order.sourceDecide`, `order.buyAssign`, `cash.disburseApprove`, `cash.disburseHandOver`, `order.buyExecute`, `order.receive`, `order.verify`, `order.dispatch`, `order.deliveryConfirm`, `order.override`. Derechos de lectura limitados según tarea. **Quien no tiene autorización no debe ver datos de gastos/proveedores/dinero ni ejecutar sus comandos**.

## 3. PED-01 — Ingreso omnicanal sin duplicados
- **Canal**: POS/venta rápida, ecommerce, red social/chat, llamada, vendedor u otro origen configurable.
- Si existe integración, ingresa automáticamente con ID externo/evento de canal. Si no, un operador autorizado crea el pedido en una pantalla breve copiando los datos confirmados del cliente. **Nunca asumir sincronización nativa con plataformas no conectadas.**
- Mínimo: identificador, origen, cliente o contacto identificable, ítems (SKU/variante/UOM/cantidad), modalidad retiro/entrega, plazo prometido si existe, instrucciones y referencia a pago/venta/fiscal cuando aplique.
- Pedido queda con solicitud original y versión aceptada; corregir productos/cantidades posteriores no sobreescribe lo que pidió el cliente. Eventual precio/tax del CAT/F04, no recalcular arbitrariamente después de facturar.
- Si pedido externo duplica una venta POS o web, resolver correlación por fuente + ID externo + tenant/canal; **no crear dos pedidos** ni dos cobros. Pedidos importados sin datos suficientes quedan *por confirmar*, no se inventa SKU, destino ni pago.

## 4. PED-02 — Priorización simple y explicable
- Regla predeterminada ya aprobada D-043: **fecha prometida y riesgo de incumplimiento → pago confirmado → antigüedad de llegada**. Otra política empresarial aprobada puede aplicar **pagados → parcialmente pagados → no pagados**, con llegada dentro de nivel.
- Etiqueta de urgencia (`urgente`, `hoy`, `normal`) es independiente de progreso y de pago. Mostrar motivo: "vence hoy", "pagado y listo para recoger", etc.
- Se permite prioridad especial de persona autorizada con motivo corto auditable. Pedido con transferencia pendiente no cuenta como pagado.
- Pagar no significa preparar ni permite entregar si la política comercial exige saldo o comprobación fiscal.

## 5. PED-03 — Una bandeja, trabajo visible
- Vista de **pedidos**: pendientes, preparando, requieren atención, en verificación, listos, despachados, entregados; estados textuales con semáforo/íconos sin color exclusivo. La atención por faltantes es una **incidencia paralela**, no una transición que borra el avance del resto de ítems.
- Vista de **preparador** solo responde: **qué preparar, cuánto, dónde buscar, cuánto se ha empacado**. No mostrar precio de proveedores, presupuesto, cartera ni auditoría salvo permiso.
- Vista de **resolutor de faltantes** recibe únicamente alertas asignadas por permiso/ámbito; gestiona opciones y persona que comprará. No mostrarle a todos los empleados las negociaciones.
- Vista de **persona autorizada para dinero** muestra solicitud de avance/apoyo a compra, origen de fondos, beneficiario/portador, importe y autorización necesaria, sin hacer que el preparador revise finanzas.

## 6. PED-04/PED-05 — Preparar y reportar faltante en un toque
1. Preparador abre pedido prioritario, toma/acepta tarea (asignación explícita o automática; impide que dos preparadores consuman la misma cantidad simultáneamente).
2. Por línea ve producto, presentación, variante, cantidad solicitada, recogida y ubicación por **bodega y zona**. Mostrar primero ubicación y stock con fuente/hora: oficial por bodega vs **probable** por zona; "stock registrado" no es prueba de que se encuentre en estante. Cantidad disponible, reservada, no vendible y fecha se leen del INV.
3. Registra cantidad tomada; puede tomar parcialmente y continuar con otros productos. Escáner recomendado si está disponible; sin escáner elige por línea. Marcaciones rápidas "Encontrado", "Tomé N" y "**No encontré / Faltante**". Si no aparece físicamente pese a stock oficial, reporta **faltante físico**, sin alterar automáticamente ledger.
4. Marcar faltante genera incidente por `pedido+línea+cantidad pendiente` con contexto del stock visto; se notifican **solo personas autorizadas/encargadas**, y preparador sigue armando el resto. **No se exige formulario de motivo**; observación opcional (por ejemplo "no estaba en bodega 2").
5. Si otra bodega tiene stock, el resolutor puede solicitar recogida/traslado interno con autorización pertinente. Si no hay stock utilizable, puede explorar compra externa sin obligar al preparador a pasar por compras.
6. Cuando llegue mercancía, la recepción/autorización conforme INV/COM actualiza disponibilidad y permite retomar esas líneas; la verificación final valida pedido íntegro contra versión aceptada.

## 7. Subflujo de faltante y abastecimiento externo (PED-05A; sin burocracia)
**Una incidencia visible para el resolutor, no cinco formularios para los demás.**
- `Reportado` → `Buscando` → `Compra asignada` → `En camino` → `Recibido`. **No disponible / intento fallido** regresa a **Buscando** guardando intentos previos; estados adicionales técnicos pueden mantenerse internos si aportan trazabilidad.
- **Buscar**: mostrar stock de otras bodegas primero, después establecimientos/proveedores posibles con precios/canales de contacto y *hora/fuente* si están conocidos. La microapp independiente "Radar de precios/establecimientos" puede alimentar candidatos si está conectada; **no es requisito**, ni garantiza precio/disponibilidad, ni crea órdenes automáticamente. El autorizado puede registrar "proveedor local + precio informado" con una acción.
- **Decidir y asignar**: la persona con `order.sourceDecide` escoge opción por disponibilidad real, cercanía, precio y urgencia; se comunica por llamada/mensaje. Selecciona comprador autorizado o asignado. No se fuerza solicitud, cotización formal, orden de compra ni aprobación doble por defecto.
- **Dinero**: si hace falta adelanto, persona autorizada para `cash.disburseApprove` autoriza monto y persona autorizada para `cash.disburseHandOver` entrega/registrar fondos desde una caja/fuente determinada; **pueden ser la misma persona** si tiene ambos permisos y política permite. El empleado asignado como comprador no hereda poderes de caja. Vincular el movimiento a CAJ-05/COM-08, nunca crear un ledger paralelo ni exigir efectivo cuando se paga con transferencia autorizada.
- **Intento fallido**: comprador pulsa "**No había / No conseguí**" y opcionalmente indica nueva observación/precio; vuelve automáticamente a Buscando. **Si ya recibió dinero, conserva avance y obligación de rendición**; no reiniciar ni duplicar desembolso. Puede cambiar comprador/opción sin borrar historial.
- **Compra exitosa**: comprador indica "Comprado/En camino"; recepción verifica SKU/variante/UOM, cantidad y condición. Registrar aceptado y sobrante/no utilizable; vincular recepción rápida de COM/INV, o la fuente autorizada si pickup directo. Si lo comprado no corresponde, **no usarlo como sustitución sin aceptación del cliente**.
- **Rendición simple del dinero**: capturar importe real, soporte mínimo según política, cambio devuelto/diferencia, responsable y tiempo; no forzar contabilidad al comprador. El cierre contable utiliza F-FIN y COM. Si fondos insuficientes, gestionar autorización adicional específica; si el proveedor falla, dinero entregado sigue en custodia hasta reintegro/uso autorizado.
- **Reaprovechar faltantes**: si varios pedidos piden el mismo SKU, la compra puede abastecerlos juntos pero conservar asignaciones de cantidades y **no comprar dos veces el mismo faltante por concurrencia**. No prometer prioridad de asignación sin stock real.

## 8. PED-06/PED-07 — Verificación y entrega
- Una vez marcadas y empacadas las líneas disponibles, verificador autorizado revisa **SKU, variante/presentación, cantidad, condición y versión aceptada**. Puede ser la misma persona preparadora si la política lo permite; doble persona solo cuando riesgo/política la exige. Usar escáner si existe, no forzar fotografías de cada unidad.
- Pedido **completo** solo cuando todas las cantidades acordadas están verificadas y no hay faltantes críticos pendientes. Si faltan 4 de 10 no mostrar 100%; mostrar `6/10` y estado "parcial / en espera".
- Si cliente autoriza entrega parcial o sustitución, guardar aceptación/condiciones y generar nueva versión aceptada o entrega parcial; despachado parcial ≠ pedido íntegro completado. Si no autoriza, no marcar listo completo.
- Empleado autorizado marca "Listo" → "Despachado" al entregar a responsable de transporte/retiro con evidencia mínima de custodia → "Entregado" cuando existe confirmación apropiada. Evitar pasos manuales extra cuando retiro ocurre en la caja y política permite registrar entrega en un toque.
- Si cliente rechaza/modifica después, abrir incidencia y F07 donde aplique sin borrar venta/documentos/pagos.

## 9. PED-08 — Correcciones, cancelación, historial
- Cancelar/editar borrador no crea compensaciones. Si hay pago, reserva, factura, salida o entrega, se requieren eventos vinculados de cancelación/reversión/F07/TES/CON, **sin eliminar historial**.
- No vender/disminuir stock dos veces por pedido + venta F04/F06. Reservado, recogido, empacado, entregado y descontado contablemente son hechos relacionados pero independientes.
- Cada cambio guarda `persona + permiso efectivo + acción + hora + referencia a SKU/cantidad/dinero/documento`; la mayoría automáticamente.
- Incidentes expirados/asignados no ocultan pedidos que requieren atención y no bloquean preparar otros.

## 10. Defaults de política (configurables; no cifras impuestas)
- Faltante: un toque, observación opcional, escalamiento automático por permisos y sede.
- Compra externa: el resolutor puede decidir proveedor e indicar comprador sin trámite adicional. Formalidad adicional solo por límite/política/ley.
- Fondos: autorización distinta de asignación; entrega y rendición con evento único por movimiento, monto y destino; evidencia solo cuando política o ley.
- Permisos: por persona + acción + ámbito + vigencia + límite + recurso, revocación efectiva incluso si estaba viendo pantalla.
- Stock: consulta por bodega oficial y ubicación probable, no garantizada. Si no aparece, no ajustar stock sin INV.
- Calidad: bloqueo de "Listo completo" ante cantidades no verificadas; no crear falsa confirmación de cliente.
- Prioridades: fecha/riesgo por defecto con alternativa pago-first por empresa.
- UX: interfaz compacta PrimeReact inspirada en **jerarquía visual minimalista de referencia** https://dribbble.com/shots/27138932-E-commerce-Seller-Order-Sales-Management-Mobile-App, adaptada al despacho; no copiar pantallas comerciales de análisis de ventas.

## 11. Pruebas de aceptación documentales (se ejecutarán únicamente en etapa 4)
1. Pedido WhatsApp creado manualmente y ecommerce importado muestran origen y cliente sin duplicar orden externa.
2. Pedido 10 uds: 6 recogidas, 4 faltantes; preparador sigue con otra línea sin formulario/finanzas.
3. Mismo SKU en dos bodegas: visualizar existencias con fecha; almacén 2 marcado probable no se presenta como confirmado.
4. Persona A prepara; B con `sourceDecide` elige proveedor; C con `cash.disburseHandOver` entrega dinero; D compra; C mañana puede preparar con permisos válidos.
5. Persona que compra sin permiso de caja intenta desembolsar: servidor deniega aunque esté asignado a comprar.
6. Comprador llega y proveedor no tiene SKU: un toque `No había`, faltante vuelve a búsqueda, intento anterior auditable, dinero ya entregado no desaparece.
7. Compra exitosa con 2 uds equivocadas: recepción rechaza esas 2 y no las incorpora a pedido ni disponible sin revisión.
8. Orden pagada parcialmente: urgencia y progreso preparador no cambian ficticiamente el pago; restricción de entrega según política.
9. Dos responsables gestionan el mismo faltante: no producen compra/desembolso duplicado; revisión y dedupe por idempotencia.
10. Verificador detecta variante incorrecta o falta 1 unidad: "Listo" bloqueado hasta corrección o aceptación de entrega parcial.
11. Cliente acepta entrega parcial: aparece 6 entregadas, 4 pendientes, no `100 % pedido completo`.
12. Cierre operativo: venta, pago, desembolso compra, recepción y salida a entrega enlazados sin duplicación de stock/caja.
13. Cambio de persona autorizada/turno no reescribe eventos ni concede permisos por título de cargo.
14. Pantalla móvil 375 px y escritorio 1366 px mantienen CTA preparar/faltante/continuar visibles y accesibles.

**Pendientes técnicos y no aprobaciones tácitas:** evaluar disponibilidad de datos por zona/ubicación del backend, método exacto de recepción externa, captura contractual de consentimiento de sustitución/entrega parcial, hardware, reglas fiscales, umbrales, fuentes de datos de radar y SLA de entrega. Requieren contraste con branch y APIs reales. No construir código ni integraciones en este encargo.
