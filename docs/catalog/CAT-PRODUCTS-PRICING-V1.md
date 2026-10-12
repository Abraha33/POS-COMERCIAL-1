# CAT — Productos, catálogo y precios (grupo 3)

**Aprobación funcional:** usuario, 2026-10-12. **Versión:** v1.0 funcional. **Estado técnico:** sin implementación ni contratos API probados. **Alcance:** CAT-01..CAT-08. Conservar arquitectura por capacidades de ADR-001. Esto NO sustituye la ficha de catálogo de dos niveles de F04; la alimenta.

## Principios e invariantes
1. Catálogo maestro por empresa con identidad de producto (ID persistente), SKU único en ámbito definido, referencias y códigos alternativos; no mezclar producto, variante, presentación/UOM y escala de precio.
2. Un solo origen de datos comerciales para POS, pedidos, compras, inventario e informes. Los productos con movimientos no se eliminan físicamente: desactivación con historial.
3. No inventar SKUs, datos de marca, fotos, costos, impuestos ni atributos. Importación sólo de datos confirmados o marcados como incompletos.
4. Búsqueda rápida por código, nombre, referencia y combinaciones de atributos; ficha resumen y detalle según F04.
5. Todo precio efectivo debe ser **reproducible y explicable**: conservar lista, precio base, UOM, regla ganadora, promoción aplicada, override autorizado, impuestos y snapshot en línea.
6. Moneda con precisión y redondeo definidos; no usar floats para dinero. Impuestos efectivos sujetos a parametrización profesional por producto/empresa/país.

## Flujos
| Código | Descripción / responsable / secuencia | Excepciones y controles |
|---|---|---|
| CAT-01 | Admin crea/edita/clona como plantilla/desactiva producto → valida datos → publica con historial. | SKU duplicado, borrado de producto transaccionado, campos incompletos; distinguir desactivación de eliminación |
| CAT-02 | Catálogo configura variantes, presentación, stock UOM, venta UOM y factores → valida. | Conversiones no válidas, cambios de factor con stock histórico, fracciones/precisión; jamás convertir caja en descuento por volumen |
| CAT-03 | Cajero busca por SKU/barcode/texto/familia/marca/atributos → resultado resumido → ficha detallada si variante o UOM requiere selección. | Códigos alternos duplicados, texto vacío, sin resultados, sin precio y stock no vendible |
| CAT-04 | Admin define listas por cliente/grupo/canal/sede/vigencia → cliente obtiene lista elegible con regla determinista. | Dos listas vigentes conflictivas; no elegir precio arbitrario |
| CAT-05 | Motor determina escala por cantidad y UOM válida, recalcula al cambiar cantidad/cliente; muestra regla. | Cambios durante cobro, solapamiento, fracciones y presentación |
| CAT-06 | Admin habilita promociones con fechas, exclusiones, acumulación explícita y permisos de descuento manual. | Promos superpuestas; por defecto NO acumular precios promocionales/especiales y descuentos manuales automáticamente |
| CAT-07 | Catálogo marca clasificación fiscal aplicable; integrador valida tarifas, exclusiones y cálculos. | Impuesto o clasificación desconocida → bloquear publicación/cobro fiscal o escalar según política validada |
| CAT-08 | Admin importa CSV/Excel/datos normalizados → mapea campos → previsualiza filas → valida duplicados/errores → confirma lote. | Reintento/importación parcial; rollback/estado por fila; datos faltantes no inferidos |

## Política de selección de precio (aprobada como comportamiento funcional)
1. Resolver producto + variante + UOM/presentación y cantidad.
2. Seleccionar lista base aplicable a empresa, cliente, canal, sede y fecha; lista y vigencia versionadas.
3. Determinar **una regla ganadora** de precio especial o volumen elegible mediante prioridad explícita de configuración (definir empate/fuente en contrato Pricing); no elegir al azar ni sumar ambos por defecto.
4. Evaluar promociones *compatibles* solo si la configuración declara acumulación; regla general: evitar acumulación accidental.
5. Descuento manual como modificación autorizada, vinculada a actor/motivo/límite; mostrar original y efectivo.
6. Calcular impuestos según configuración válida; persistir el snapshot de precio, impuesto y factor en transacción.
7. Recalcular y avisar cuando cambien cliente, cantidad, unidad, fecha de vigencia o regla activa; una venta ya publicada jamás se repricing retroactivamente.

**No quedan aprobados porcentajes concretos, márgenes mínimos, redondeos arbitrarios ni fórmulas fiscales.** Los empates entre listas, política de precio más bajo y promociones acumulables requieren una configuración determinista que Codex deberá especificar y probar.

## Roles y permisos
- Cajero: consultar, seleccionar UOM/variante y precio aplicado; override sólo con permiso.
- Administrador de catálogo: publicar variantes, listas, reglas e importaciones.
- Supervisor: aprobar descuentos y precios excepcionales bajo límites.
- Contador/responsable fiscal: validar tratamientos tributarios; no editar ventas publicadas.

## Aceptación mínima
- Buscar "vaso plástico blanco" utilizando **atributos existentes**; ver resultados sin inventar datos.
- Dos códigos alternativos conflictivos producen error revisable, no adición errónea.
- Producto con unidad/paquete/caja vende cantidad con factor exacto; la escala por volumen es independiente.
- Cliente A con lista especial y volumen elegible produce un precio determinista y un motivo visible; cambiar cliente recalcula.
- Una promoción no se suma a otra a menos que explícitamente lo permita la política.
- Descuento fuera del límite requiere autorización auditada.
- Importación repetida no duplica SKU ni causa pérdidas de historial; informe de errores por fila.
- POS, pedido y catálogo obtienen mismo motor y snapshot de precio (salvo cambios por evento contractual explícito).

## Integraciones y pendientes técnicos
Con F04/F06, PED, COM, INV y Reportes; validar ERPNext Item/UOM/Item Price/Pricing Rule y fiscalidad. Estados, APIs, resolución de solapamientos, indexación y rendimiento siguen por probar. **Funcional aprobado ≠ motor verificado.**

