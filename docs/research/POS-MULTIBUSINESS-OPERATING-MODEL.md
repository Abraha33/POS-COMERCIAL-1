# Investigación del modelo operativo y funcional del POS multinegocio

> Estado: investigación preliminar para validación; no es una decisión de implementación.
>
> Fecha de corte: 2026-10-01.
>
> Rama objetivo: experiment/frappe-validation.
>
> Pregunta rectora: ¿qué debe construirse una vez, qué debe parametrizarse, qué merece una capacidad independiente y qué debe quedar como extensión?

## 0. Alcance, método y lenguaje de evidencia

Esta investigación parte de las fuentes canónicas del proyecto: [MASTER-PLAN](../MASTER-PLAN.md), [HANDOFF](../HANDOFF.md), [GITHUB-TRACKING](../GITHUB-TRACKING.md), [ADR-001](../ADR-001-COMPOSABLE-PROFILES.md) y los issues [#17](https://github.com/Abraha33/ERP-POS-Holamigo/issues/17), [#1](https://github.com/Abraha33/ERP-POS-Holamigo/issues/1), [#3](https://github.com/Abraha33/ERP-POS-Holamigo/issues/3) y [#18](https://github.com/Abraha33/ERP-POS-Holamigo/issues/18).

Se conserva expresamente la arquitectura canónica:

~~~text
núcleo común de plataforma
  → dominios
  → capacidades/subdominios
  → perfiles componibles
  → configuración por empresa
  → extensiones a medida
~~~

POS Core es el núcleo funcional del dominio POS, no el núcleo general de la plataforma. Ninguna conclusión introduce un tipo rígido de negocio.

Etiquetas epistemológicas usadas:

- **Hecho documentado (HD):** aparece en una fuente primaria enlazada.
- **Inferencia operativa (IO):** patrón deducido al comparar flujos; debe contrastarse con usuarios reales.
- **Hipótesis técnica (HT):** comportamiento posible de ERPNext/Frappe aún no probado en el entorno del proyecto.
- **Recomendación (R):** propuesta de diseño o alcance, no evidencia de soporte.

Las menciones a ERPNext significan “parece soportar” según documentación o modelo público de ERPNext v16; sólo una prueba reproducible en la versión y configuración del proyecto puede producir PASS, CONDITIONAL o FAIL.

## 1. Resumen ejecutivo

### Hallazgos principales

1. **No existen siete POS distintos.** Los siete sectores comparten venta, catálogo, precios, impuestos, pagos, caja, inventario, compras, permisos y auditoría. Las diferencias fuertes se concentran en cinco ejes reutilizables: medición/UOM, duración del pedido, trazabilidad, transformación/preparación y cumplimiento/logística. **IO**
2. **Peso, metro, fracciones y caja/unidad son una sola familia de medición comercial**, no cuatro módulos. Comparten cantidad decimal, UOM de venta, factor hacia UOM de stock, precisión, redondeo y precio por UOM. La captura puede variar —teclado, balanza, código de peso— sin cambiar el modelo. **HD/IO**
3. **Pedido abierto y mesa no son sinónimos.** El pedido abierto aporta ciclo de vida durable; la mesa es una asignación opcional a un recurso/localización. Una carnicería con turnos, una panadería con encargos y una ferretería con despacho posterior pueden usar pedidos abiertos sin mesas. **HD/IO**
4. **Producto compuesto, modificador y producción no deben fusionarse.** Un combo comercial puede explotar componentes al vender; un modificador cambia selección/precio/preparación; una receta o despiece transforma inventario y costo. Sus efectos contables y de stock son distintos. **IO**
5. **Lote, vencimiento y serial forman trazabilidad, pero no son la misma regla.** Lote agrupa unidades; vencimiento agrega elegibilidad/rotación; serial identifica una unidad. Conviene un subdominio cohesivo con políticas activables, no tres productos separados. **HD/R**
6. **Precio especial, lista, volumen, promoción y descuento manual comparten un motor de pricing, pero requieren precedencia y explicación.** Convertir cada modalidad en un módulo independiente crearía duplicación. **HD/R**
7. **Offline no es un interruptor de UI.** Cambia autoridad temporal, idempotencia, inventario visible, precio, permisos y resolución de conflictos. Debe diseñarse como capacidad transversal, aunque se implemente después del MVP inicial. **HD/R**
8. **ERPNext parece fuerte como motor de registro** para UOM, precios, impuestos, stock, lotes/seriales, compras, ventas y contabilidad. Los mayores riesgos están en UX POS especializada, pedido abierto/restaurante, dispositivos, offline confiable, idempotencia de negocio y composición limpia de capacidades. **HD/HT**
9. **La arquitectura correcta para una persona no es una malla de microservicios ni decenas de plugins.** Se recomiendan un monolito modular, pocos límites de dominio, un registro simple de capacidades/configuración y extensiones mediante una app propia de Frappe y contratos estables. **R**
10. **El MVP comercial inicial debe seguir enfocado en distribuidora no perecedera y ferretería.** Perecederos, farmacia, restaurante, carnicería y panadería deben influir en invariantes y pruebas, no obligar a implementar ahora sus ciclos completos. **R**

### Respuesta breve a la pregunta rectora

- **Construir una vez:** identidad/contexto, catálogo, venta/cobro/devolución, caja, inventario y ledger, pricing, compras básicas, permisos/auditoría, idempotencia y contratos POS–ERP.
- **Configurar:** precisiones, UOM permitidas, stock negativo, consumidor final, listas/precios, límites de descuento, impuestos, medios de pago, visibilidad/orden de UI y valores predeterminados.
- **Capacidad independiente:** pedidos abiertos, recursos/mesas, trazabilidad, preparación/modificadores, transformación/producción, reserva, fulfillment/picking, crédito, promociones y offline.
- **Extensión:** prescripción/regulación farmacéutica por país, balanzas o dispositivos propietarios, fiscalización local, ruteo avanzado, alquiler, recetas clínicas, integraciones de delivery y flujos particulares de cliente.

## 2. Modelo operativo comparado por sector

Esta sección describe sólo las diferencias que ayudan a descubrir piezas reutilizables.

### 2.1 Ferretería

- **Inicio y selección:** venta rápida en mostrador o cotización que luego se convierte; búsqueda por nombre coloquial, referencia de fabricante, SKU, código de barras o compatibilidad. El empleado suele consultar existencia en varias bodegas. **IO**
- **Cantidad/producto:** unidad, caja, kilogramo, metro y fracción; variantes por medida, calibre, color o marca. Un mismo artículo puede comprarse por caja y venderse por unidad. Cortes de cable/manguera introducen cantidad decimal y, a veces, remanente. **IO**
- **Precio/cliente:** consumidor final o cliente identificado; listas por segmento, precios negociados, volumen y descuentos con autorización. **IO**
- **Cierre:** pago inmediato, mixto o crédito; entrega inmediata, reserva o despacho posterior. Devoluciones pueden restringirse si el producto fue cortado o es pedido especial. **IO**
- **Back office:** compras, recepción parcial, transferencias, conteos, costo y mínimos. El dueño necesita margen, rotación, faltantes, stock inmovilizado, caja y descuentos por usuario. **IO**

### 2.2 Distribuidora de no perecederos

- **Inicio y selección:** pedido de mostrador, teléfono, preventa o reposición; catálogos grandes y muchas líneas. Búsqueda por código propio/del proveedor, barcode o historial del cliente. **IO**
- **Cantidad/producto:** unidad, display, paquete y caja con conversiones; el precio depende de UOM, lista, cliente y volumen. **HD/IO**
- **Ciclo:** cotización/pedido → reserva opcional → picking → despacho parcial/completo → factura/cobro. La venta rápida es sólo uno de varios caminos. **IO**
- **Crédito:** frecuente para clientes recurrentes; exige límite, mora, autorización y CxC. **IO**
- **Back office:** orden de compra, recepción parcial, costo, ubicación, transferencia y conteo. El dueño necesita ventas/margen por cliente/ruta/vendedor, cartera, fill rate y rotación. **IO**

### 2.3 Distribuidora de perecederos

Reutiliza el flujo de distribución y añade:

- lote, caducidad/consumo preferente, FEFO cuando corresponda y trazabilidad de recepción a despacho; **HD/IO**
- control de disponibilidad por lote y fecha, rechazo/merma, devoluciones a proveedor y posibles condiciones de temperatura; **IO**
- promociones o rebajas por cercanía a vencimiento y sustituciones ante faltantes; **IO**
- mayor costo de vender offline con stock/lotes desactualizados. **IO**

El dueño necesita merma, vencimiento próximo, rotación por lote, trazabilidad y margen después de desperdicio.

### 2.4 Restaurante

- **Inicio:** mostrador, mesa, reserva, QR, teléfono o delivery. La mesa es un recurso opcional; el pedido abierto es el agregado durable central. **HD/IO**
- **Selección:** categorías visuales, variantes y modificadores obligatorios/opcionales; notas de preparación; cursos o estaciones. **HD**
- **Ciclo:** abrir → asignar mesa/canal → agregar → enviar a preparación → modificar con reglas → servir/entregar → dividir/combinar cuenta si aplica → cobrar → cerrar. **HD**
- **Inventario/costo:** productos preparados consumen ingredientes por receta o por producción previa; la merma y el rendimiento real complican el costo. **HD/IO**
- **Control:** anulaciones después de enviar a cocina, reapertura, cortesías y descuentos necesitan autorización y auditoría. **IO**
- **Dueño:** ticket promedio, ventas por hora/canal, tiempos, anulaciones, costo teórico/real, desperdicio, desempeño de caja y mesas. **IO**

### 2.5 Farmacia

- **Inicio/selección:** búsqueda por nombre comercial, principio activo, concentración, presentación, código y barcode; sustitución requiere reglas y, según jurisdicción, validaciones profesionales. **IO**
- **Producto:** variantes/presentaciones no son siempre intercambiables. Lote y vencimiento son operativamente centrales; ciertos artículos pueden requerir serialización o trazabilidad adicional. **HD/IO**
- **Cliente/regulación:** consumidor final o identificado; prescripción, productos controlados, retenciones y reportes son reglas regulatorias locales, no POS universal. **IO**
- **Inventario:** FEFO, alertas de vencimiento, devoluciones/retiros por lote y bloqueo de lotes. **HD/IO**
- **Dueño:** margen, vencimiento, quiebres, rotación, compras, trazabilidad y cumplimiento.

La prescripción y normativa por país deben ser extensión especializada hasta conocer mercado y requisito exactos. **R**

### 2.6 Carnicería

- **Inicio/selección:** pedido al mostrador o encargo; producto elegido por corte, calidad y peso solicitado. **IO**
- **Cantidad:** venta por peso real, códigos de balanza/etiqueta y precio por kilogramo; puede existir pieza, bandeja o paquete con peso fijo/variable. **IO**
- **Transformación:** canal/pieza → cortes + subproductos + merma, con rendimiento variable. Esto es producción/despiece, no simple producto compuesto. **IO**
- **Preparación:** cortar, moler, porcionar o empacar puede ocurrir durante la venta; el peso final puede diferir del solicitado. **IO**
- **Inventario:** lote, fecha, origen cuando aplique, frío, merma y reetiquetado. **IO**
- **Dueño:** rendimiento por pieza/lote, margen por corte, merma, vencimiento, ventas por peso y diferencias entre stock teórico/físico.

### 2.7 Panadería

- **Inicio/selección:** venta rápida visual/barcode y encargos con fecha de entrega. **IO**
- **Producto:** unidad, docena, paquete, peso; variantes/sabores/tamaños; combos; productos preparados. **IO**
- **Producción:** pronóstico/plan diario → receta/BOM → consumo → hornada/lote → producto terminado → merma/devolución. El rendimiento real puede variar. **HD/IO**
- **Pedido:** tortas o pedidos personalizados permanecen abiertos, pueden pedir anticipo y preparación programada. **IO**
- **Dueño:** venta por franja, agotados, producción vs venta, desperdicio, costo de receta, pedidos pendientes y caja.

## 3. Matriz comparativa de capacidades

Leyenda: **Core** = base común; **Required** = imprescindible para operar bien ese perfil; **Default ON/OFF** = valor inicial propuesto; **Optional** = activable; **Conditional** = depende del surtido/proceso; **Not relevant** = normalmente fuera del perfil, sin prohibirlo.

Abreviaturas de sector: FER = ferretería; DNP = distribuidora no perecedera; DPE = distribuidora perecedera; RES = restaurante; FAR = farmacia; CAR = carnicería; PAN = panadería.

La columna “Clase A–F” usa: **A** núcleo común; **B** dominio; **C** capacidad/subdominio; **D** configuración; **E** diferencia sólo de UI; **F** extensión especializada. Las formas como “D sobre C” indican que el comportamiento visible es un parámetro de una capacidad mayor, no un módulo autónomo.

| Comportamiento | Clase A–F | FER | DNP | DPE | RES | FAR | CAR | PAN |
|---|---|---|---|---|---|---|---|---|
| Empresa, sede, usuarios, roles, auditoría | A | Core | Core | Core | Core | Core | Core | Core |
| Caja: apertura, movimientos, arqueo y cierre | B/POS | Core | Core | Core | Core | Core | Core | Core |
| Venta, impuestos, cobro y comprobante | B/POS | Core | Core | Core | Core | Core | Core | Core |
| Cliente final e identificado | B/CRM | Core | Core | Core | Core | Core | Core | Core |
| Catálogo, SKU, referencia y barcode | B/Catálogo | Core | Core | Core | Core | Core | Core | Core |
| UOM comercial y conversiones | C | Required | Required | Required | Default ON | Required | Required | Required |
| Cantidad fraccionaria | D sobre C | Default ON | Optional | Optional | Optional | Optional | Required | Optional |
| Venta por peso | D sobre C | Optional | Optional | Conditional | Not relevant | Conditional | Required | Optional |
| Venta por longitud | D sobre C | Required | Optional | Not relevant | Not relevant | Not relevant | Not relevant | Not relevant |
| Unidad/paquete/caja | D sobre C | Required | Required | Required | Optional | Required | Optional | Required |
| Barcode de peso/precio variable | C | Optional | Optional | Conditional | Not relevant | Conditional | Required | Optional |
| Variantes/atributos | C | Default ON | Optional | Optional | Default ON | Required | Default ON | Default ON |
| Listas por cliente/canal | C/Precios | Default ON | Required | Required | Optional | Default ON | Optional | Optional |
| Precio por volumen | C/Precios | Default ON | Required | Required | Optional | Optional | Optional | Optional |
| Promociones/cupones/lealtad | C/Precios | Optional | Optional | Optional | Optional | Optional | Optional | Optional |
| Descuento manual con autorización | C/Precios | Default ON | Default ON | Default ON | Default ON | Default ON | Default ON | Default ON |
| Pedidos abiertos | C/POS | Optional | Default ON | Default ON | Required | Optional | Optional | Default ON |
| Recursos/mesas/turnos | C/POS | Default OFF | Default OFF | Default OFF | Required | Default OFF | Optional | Default OFF |
| Cotización → pedido/venta | B/Ventas | Default ON | Required | Required | Not relevant | Optional | Optional | Optional |
| Reserva de stock | C/Inventario | Optional | Default ON | Default ON | Not relevant | Optional | Optional | Optional |
| Picking/despacho parcial | C/Fulfillment | Optional | Required | Required | Conditional | Optional | Optional | Conditional |
| Producto compuesto/kit comercial | C/Catálogo | Optional | Optional | Optional | Default ON | Optional | Optional | Default ON |
| Modificadores y notas de preparación | C/POS | Not relevant | Not relevant | Not relevant | Required | Not relevant | Default ON | Default ON |
| Preparación por estación/estado | C/Fulfillment | Not relevant | Not relevant | Not relevant | Required | Not relevant | Optional | Conditional |
| Receta/BOM y producción | C/Producción | Not relevant | Not relevant | Optional | Conditional | Optional | Required | Required |
| Rendimiento, subproducto y merma | C/Producción/Inv. | Optional | Optional | Required | Default ON | Conditional | Required | Required |
| Lote | C/Trazabilidad | Optional | Optional | Required | Conditional | Required | Required | Conditional |
| Vencimiento/FEFO | C/Trazabilidad | Not relevant | Optional | Required | Conditional | Required | Required | Required |
| Serial individual | C/Trazabilidad | Conditional | Conditional | Not relevant | Not relevant | Conditional | Not relevant | Not relevant |
| Crédito y límite | C/CxC | Optional | Default ON | Default ON | Optional | Optional | Optional | Optional |
| Pagos mixtos | B/POS | Core | Core | Core | Core | Core | Core | Core |
| Devolución parcial referenciada | B/POS | Core | Core | Core | Core | Core | Core | Core |
| Cambio como devolución + nueva venta | D/flujo | Default ON | Default ON | Default ON | Optional | Default ON | Optional | Default ON |
| Recepción parcial/rechazo | B/Compras | Core | Core | Core | Conditional | Core | Core | Core |
| Varias bodegas/sedes/cajas | A/B | Optional | Required | Required | Optional | Optional | Optional | Optional |
| Offline transaccional | C transversal | Optional | Optional | Optional | Optional | Optional | Optional | Optional |
| Integración balanza/impresora/terminal | F/adaptador | Optional | Optional | Conditional | Optional | Optional | Required | Optional |
| Prescripción/control regulatorio | F | Not relevant | Not relevant | Not relevant | Not relevant | Conditional | Not relevant | Not relevant |
| Layout visual por mosaicos/lista/búsqueda | E | Configurable | Configurable | Configurable | Configurable | Configurable | Configurable | Configurable |

### Lectura de la matriz

- “Venta por peso/metro/caja” no crea modelos de venta separados: configura una capacidad de UOM/medición.
- “Mesas” no arrastra automáticamente cocina, recetas o reservas.
- “Perecedero” no es un perfil técnico único: es la combinación trazabilidad + vencimiento + política de rotación + merma.
- “Preparado” puede significar ensamblaje al vender, preparación con estados o producción que transforma stock; se deben conservar esas tres semánticas.

## 4. Catálogo preliminar de dominios

| Dominio | Responsabilidad | Límite explícito |
|---|---|---|
| Núcleo de plataforma | tenant/empresa, identidad, roles, sedes, registro de capacidades, configuración, auditoría, extensiones | No contiene reglas de venta, stock o precios |
| Catálogo | producto, atributos/variantes, identificadores, barcodes, UOM admitidas, composición comercial | No decide precio final ni contabiliza producción |
| POS | carrito/pedido, caja, cobro, devolución, anulación, comprobante, estados de interacción | POS Core no es plataforma completa ni dueño del ledger |
| Precios | listas, precio por UOM, reglas, volumen, promociones, descuentos, impuestos contextuales | No autoriza por sí solo excepciones; consulta identidad/permisos |
| Inventario | existencia, disponibilidad, movimientos, bodegas, reserva, conteo, transferencia, costo/valoración | No decide el ciclo de mesa ni la experiencia POS |
| Trazabilidad | lotes, vencimientos, seriales, selección/rotación y recall | No es un “módulo farmacia”; sirve a cualquier sector |
| Ventas/Fulfillment | cotización, pedido, picking, preparación, despacho, entrega parcial | Venta inmediata puede saltar este ciclo |
| Compras | proveedor, orden, recepción/rechazo parcial, devoluciones y costo de entrada | Factura/obligación pertenece contablemente a CxP |
| Producción | BOM/receta, orden, consumo, producto terminado, rendimiento, subproductos | Un modificador de pedido no implica producción |
| CRM | cliente, contactos, segmentos, historial/contexto comercial | CxC conserva saldo, límite y cobro |
| CxC/CxP | crédito, saldo, vencimiento, asignación de pagos, obligaciones | No duplica pedido/compra |
| Reportes/Analítica | vistas por rol, KPIs, exportación, alertas | Consume eventos/datos; no reimplementa reglas |
| Integraciones | balanza, scanner, impresora, terminal, fiscal, delivery | Adaptadores reemplazables; nunca condicionales por sector en el núcleo |

**Recomendación:** implementar estos límites como módulos internos y contratos, no como microservicios. Separarlos físicamente sólo cuando exista una razón operacional medida.

## 5. Catálogo preliminar de capacidades/subdominios

El catálogo agrupa comportamientos cohesivos para evitar “una capacidad por checkbox”.

### C1. Medición y UOM comercial

- **Objetivo:** comprar, almacenar y vender un producto en unidades compatibles.
- **Dominios:** Catálogo, Inventario, Precios, POS, Compras.
- **Sectores:** todos; crítica en FER, DNP/DPE, CAR y PAN.
- **Reglas:** UOM de stock canónica; factores explícitos; cantidad decimal; precisión/redondeo; precio y barcode opcionales por UOM; no convertir entre dimensiones incompatibles.
- **Dependencias:** producto, UOM, pricing, stock ledger.
- **Configuración:** UOM permitidas, precisión, fracción mínima, venta menor a una unidad, captura manual/balanza.
- **Impacto transaccional:** cantidad vendida se convierte una sola vez a stock; la transacción conserva cantidad/UOM/factor originales.
- **Datos/UI:** conversiones y barcodes por producto; selector o captura contextual.
- **Riesgos:** redondeo acumulado, factores cambiados retroactivamente, precio de caja incoherente, stock residual.

### C2. Identificación y captura de producto

- **Objetivo:** resolver nombre, SKU, referencia, GTIN/barcode y códigos variables hacia una oferta vendible.
- **Dominios:** Catálogo, POS, Integraciones.
- **Sectores:** todos.
- **Reglas:** identificadores únicos por alcance; un escaneo puede incluir producto, peso, precio, lote o serial; ambigüedad nunca elige silenciosamente.
- **Dependencias:** variantes, UOM, trazabilidad.
- **Configuración:** prefijos de balanza, búsqueda difusa, campos visibles.
- **Impactos:** normalmente no cambia ledger; determina línea, cantidad y metadatos antes del cálculo.
- **Datos/UI:** índice de búsqueda compacto y parser de códigos; scanner como teclado, cámara o adaptador.
- **Riesgos:** códigos duplicados de proveedor, barcode de paquete confundido con unidad, parsing offline divergente.

### C3. Pricing contextual

- **Objetivo:** obtener un precio explicable por empresa, sede, canal, cliente, fecha, UOM y cantidad.
- **Dominios:** Precios, Catálogo, CRM, POS.
- **Sectores:** todos.
- **Reglas:** precedencia determinista; vigencia; moneda; impuestos inclusivos/exclusivos; precio base separado de descuento; snapshot en la venta.
- **Dependencias:** cliente, UOM, impuestos.
- **Configuración:** listas, asignaciones, escalas de volumen, redondeo, posibilidad de override.
- **Impactos:** cambia totales e impuestos, no cantidad física.
- **Datos/UI:** resultado con regla ganadora y explicación; alerta ante precio obsoleto.
- **Riesgos:** acumulación inesperada de reglas, discrepancia online/offline, recalcular ventas históricas.

### C4. Promociones y beneficios

- **Objetivo:** reglas temporales como descuento, producto gratis, cupón o lealtad.
- **Dominios:** Precios, CRM, POS.
- **Sectores:** reutilizable en todos, nunca obligatorio por sector.
- **Reglas:** elegibilidad, acumulación/exclusión, límites, consumo de cupón/puntos y reversión en devolución.
- **Dependencias:** pricing contextual e identidad de cliente cuando corresponda.
- **Configuración:** periodo, canal, productos, umbral, prioridad.
- **Impactos:** crea beneficios y posibles pasivos de puntos/saldo.
- **Datos/UI:** trazabilidad por regla aplicada.
- **Riesgos:** motor excesivo para MVP, fraude, divergencia offline.

### C5. Pedido durable/abierto

- **Objetivo:** mantener una intención de venta modificable durante minutos, horas o días antes de cobrar/cerrar.
- **Dominios:** POS, Ventas/Fulfillment, Auditoría.
- **Sectores:** RES required; DNP/DPE default; PAN encargos; opcional en otros.
- **Reglas:** estados explícitos; propietario; versión/optimistic locking; reservas y precio congelado o recalculado según política; historial de cambios.
- **Dependencias:** pricing, usuario, opcionalmente reserva/preparación.
- **Configuración:** caducidad, reapertura, política de precio, edición posterior a preparación.
- **Impactos:** puede reservar stock o enviar producción antes de facturar.
- **Datos/UI:** cabecera, líneas versionadas, eventos y estado.
- **Riesgos:** confundir borrador con compromiso, cambios concurrentes, pedidos huérfanos.

### C6. Recursos operativos (mesas, turnos, bahías)

- **Objetivo:** asignar un pedido a un recurso con capacidad, ocupación y representación.
- **Dominios:** POS, Ventas/Fulfillment.
- **Sectores:** RES por defecto; reutilizable si otro negocio lo necesita.
- **Reglas:** recurso independiente del pedido; asignar, mover, combinar o liberar; ocupación derivada.
- **Dependencias:** pedido abierto; reservas sólo si se habilitan.
- **Configuración:** tipos, zonas, capacidad, layout.
- **Impactos:** no debe afectar por sí solo contabilidad/inventario.
- **Datos/UI:** grafo/lista y composición visual.
- **Riesgos:** codificar “mesa” dentro de la factura o acoplarla a cocina.

### C7. Composición comercial y modificadores

- **Objetivo:** vender kits/combos y personalizar una línea sin modelar toda personalización como SKU.
- **Dominios:** Catálogo, POS, Precios; opcional Inventario/Preparación.
- **Sectores:** RES/PAN frecuentes; reutilizable.
- **Reglas:** grupos requeridos/opcionales, mínimos/máximos, suplementos; distinguir bundle comercial, componentes descontados y nota sin stock.
- **Dependencias:** catálogo y pricing.
- **Configuración:** grupos, defaults, orden y visualización.
- **Impactos:** puede sólo cambiar precio/preparación o explotar componentes de inventario; debe declararse.
- **Datos/UI:** selección guiada; línea padre/hijas.
- **Riesgos:** doble descuento de stock, combinatoria de variantes, devolución parcial ambigua.

### C8. Preparación y estaciones

- **Objetivo:** convertir líneas aceptadas en trabajo observable por estación.
- **Dominios:** Fulfillment, POS, Auditoría.
- **Sectores:** RES required; PAN/CAR conditional.
- **Reglas:** enviar, aceptar, preparar, listo, entregar, cancelar; cambios posteriores generan deltas, no reimpresión ciega.
- **Dependencias:** pedido abierto y modificadores.
- **Configuración:** estaciones, ruteo, SLA y dispositivos.
- **Impactos:** puede bloquear anulaciones y disparar consumo según política.
- **Datos/UI:** tickets/eventos y vistas por estación.
- **Riesgos:** estados demasiado finos, entrega duplicada, impresora como fuente de verdad.

### C9. Reserva y disponibilidad

- **Objetivo:** separar on-hand, reservado y disponible para prometer.
- **Dominios:** Inventario, Ventas/Fulfillment, POS.
- **Sectores:** distribución; opcional en los demás.
- **Reglas:** reserva referenciada, parcial, expiración/liberación, prioridad y no sobreasignación.
- **Dependencias:** pedido durable, bodegas y, si aplica, lote/serial.
- **Configuración:** cuándo reservar, TTL y stock de seguridad.
- **Impactos:** no mueve propiedad ni ledger físico; reduce disponibilidad.
- **Datos/UI:** cantidades distintas y causa de reserva.
- **Riesgos:** reservas huérfanas, carrera entre cajas, offline.

### C10. Picking, despacho y cumplimiento

- **Objetivo:** preparar y entregar un pedido completo o parcial desde una o varias bodegas.
- **Dominios:** Ventas/Fulfillment, Inventario.
- **Sectores:** DNP/DPE required; opcional en FER/PAN.
- **Reglas:** pendiente/preparado/despachado/entregado; backorder; sustitución; evidencia de entrega.
- **Dependencias:** pedido, reserva y transferencias.
- **Configuración:** estrategia de picking, fuente y tolerancias.
- **Impactos:** movimientos físicos y cantidades pendientes.
- **Datos/UI:** tareas y excepciones, no sólo factura.
- **Riesgos:** confundir facturación con salida física, parciales incoherentes.

### C11. Trazabilidad: lote, vencimiento y serial

- **Objetivo:** conocer qué unidad/grupo entró, dónde está y a quién salió.
- **Dominios:** Trazabilidad, Inventario, Compras, POS, Fulfillment.
- **Sectores:** DPE/FAR/CAR; conditional en otros.
- **Reglas:** lote por cantidad, serial por unidad, vencimiento sobre lote; bloqueo/recall; selección FEFO configurable; devolución conserva referencia.
- **Dependencias:** recepción y movimientos.
- **Configuración:** nivel por producto, captura obligatoria, vida útil, política de salida.
- **Impactos:** cada movimiento asigna trazas; puede impedir venta.
- **Datos/UI:** selector/escaneo y alertas.
- **Riesgos:** UX lenta, inventario preexistente sin lote, venta offline de lote agotado/bloqueado.

### C12. Crédito comercial y CxC

- **Objetivo:** cerrar una venta con saldo pendiente y administrar su cobro.
- **Dominios:** POS, CxC, CRM, Contabilidad.
- **Sectores:** distribución; opcional en todos.
- **Reglas:** cliente obligatorio, límite/exposición, vencimiento, mora, autorización y asignación de pagos.
- **Dependencias:** identidad de cliente y ledger contable.
- **Configuración:** límites, términos, tolerancia y roles de excepción.
- **Impactos:** genera cuenta por cobrar, no un “medio de pago” ficticio.
- **Datos/UI:** saldo/límite disponible y razón de bloqueo.
- **Riesgos:** permitir crédito offline, exposición concurrente, contabilidad inconsistente.

### C13. Producción, receta y rendimiento

- **Objetivo:** transformar insumos en productos/subproductos con costo y rendimiento.
- **Dominios:** Producción, Inventario, Costos.
- **Sectores:** PAN/CAR; conditional RES/DPE.
- **Reglas:** BOM versionada, consumo real/teórico, producto terminado, subproducto, lote y desviación.
- **Dependencias:** UOM, trazabilidad, costos.
- **Configuración:** backflush vs consumo explícito, tolerancia, producción previa o bajo pedido.
- **Impactos:** múltiples movimientos y valoración.
- **Datos/UI:** orden/ejecución; no debe ocurrir implícitamente en cada venta sin política.
- **Riesgos:** costo falso por rendimiento variable, sobrearquitectura para recetas simples.

### C14. Merma y desperdicio

- **Objetivo:** retirar o reclasificar stock con motivo y costo observable.
- **Dominios:** Inventario, Producción, Reportes.
- **Sectores:** todos; central en perecederos/CAR/PAN/RES.
- **Reglas:** cantidad, UOM, lote, origen, motivo, usuario y autorización.
- **Dependencias:** inventario; opcional trazabilidad/producción.
- **Configuración:** motivos, cuentas/ubicaciones de pérdida, umbrales.
- **Impactos:** salida/ajuste y costo de pérdida.
- **Datos/UI:** captura rápida y reporte.
- **Riesgos:** usar ajustes genéricos y perder causalidad; merma como vía de fraude.

### C15. Excepciones de venta: devolución, cambio, anulación

- **Objetivo:** revertir total o parcialmente con efectos simétricos y auditables.
- **Dominios:** POS, Inventario, Precios, Pagos, CxC, Auditoría.
- **Sectores:** todos.
- **Reglas:** preferir referencia original; cantidad máxima retornable; motivo/rol; reembolso al medio permitido; cambio = devolución + nueva venta enlazadas.
- **Dependencias:** venta, pagos y stock.
- **Configuración:** ventanas, artículos no retornables, autorización y destino de stock.
- **Impactos:** crédito/reembolso, reversión de impuesto, stock y beneficios.
- **Datos/UI:** selección de líneas y resultado explícito.
- **Riesgos:** devolver más de lo vendido, refund duplicado, UOM/tasa histórica incorrecta.

### C16. Offline y sincronización

- **Objetivo:** aceptar operaciones limitadas sin red y reconciliarlas sin pérdida ni duplicación.
- **Dominios:** transversal; POS Core coordina su frontera.
- **Sectores:** depende de conectividad, no del sector.
- **Reglas:** ID de operación generado en cliente; cola durable; idempotencia servidor; snapshot/config version; política por operación; conflictos visibles.
- **Dependencias:** catálogo/cache, auth delegada, observabilidad.
- **Configuración:** operaciones permitidas, límites monetarios, antigüedad, surtido cacheado.
- **Impactos:** compromiso local pendiente y posterior transacción ERP.
- **Datos/UI:** estado local/sincronizado/rechazado y recuperación.
- **Riesgos:** precio/permiso/producto/lote cambiado, stock negativo, cierre de caja antes de sincronizar.

### C17. Aprobaciones y excepciones

- **Objetivo:** autorizar descuentos, anulaciones, stock negativo, crédito o reapertura sin compartir credenciales.
- **Dominios:** Núcleo, POS, Precios, Inventario, CxC.
- **Sectores:** todos.
- **Reglas:** permiso server-side, actor solicitante/aprobador, motivo, límites y evidencia.
- **Dependencias:** identidad y auditoría.
- **Configuración:** umbrales y roles.
- **Impactos:** habilita una transición prohibida; no sustituye la regla de dominio.
- **Datos/UI:** challenge/aprobación y rastro.
- **Riesgos:** PIN compartido, aprobación offline sin autoridad vigente.

## 6. Configuración vs capacidad

### Debe ser configuración

| Comportamiento | Razón |
|---|---|
| Permitir decimales y precisión por UOM | Parámetro de medición; no crea ciclo nuevo |
| UOM vendibles y factor de conversión | Datos/reglas del producto |
| Política de stock negativo | Regla de inventario con autorización |
| Cliente “consumidor final” predeterminado | Valor inicial, no perfil |
| Lista de precios por defecto y asignación a cliente | Configuración de pricing |
| Umbral de descuento y rol aprobador | Parámetro de autorización |
| Medios de pago aceptados | Configuración de caja/pagos |
| Impuesto, inclusión y redondeo | Configuración fiscal, posiblemente localizada |
| Bodega/caja/sede predeterminada | Contexto operativo |
| Ocultar productos sin stock | Presentación/política de búsqueda |
| Ventana de devoluciones y motivos | Regla parametrizable del mismo ciclo |
| FEFO/FIFO cuando ambos usan trazabilidad existente | Política de selección, salvo que requiera algoritmo nuevo |

### Sí justifica capacidad

Existe capacidad cuando aparecen nuevos estados, invariantes, persistencia o efectos: pedido durable, reserva, trazabilidad, crédito, preparación, producción, fulfillment, promociones con saldo/cupón, recursos/mesas y offline.

### Señales de sobrearquitectura

- Una capacidad con un solo booleano y sin estado propio probablemente es configuración.
- “Venta por metro” y “venta por kilo” como módulos distintos duplicarían UOM, redondeo y pricing.
- “Perfil farmacia” dentro del backend mezclaría trazabilidad universal con regulación local.
- Un plugin separado por cada sector produciría acoplamiento y carga de upgrades para una sola persona.

## 7. Diferencias puramente visuales

No deben producir ramas de backend:

- grilla de fotos para restaurante/panadería vs lista densa para distribución;
- teclado numérico grande para peso vs entrada de cantidad en línea;
- agrupación de categorías, favoritos y colores;
- orden/visibilidad de paneles de stock, cliente, margen o preparación;
- mapa de mesas vs lista de recursos: la persistencia es la misma asignación de recurso;
- paso guiado de modificadores vs editor compacto;
- scanner automático vs botón de búsqueda;
- recibo simplificado vs vista detallada, siempre sobre el mismo documento fiscal;
- dashboards diferentes por rol.

La UI consume un esquema de composición: capacidades activas + permisos + preferencias + contexto de dispositivo. No consulta business_type.

## 8. Flujos transaccionales principales

### F1. Venta rápida

~~~text
resolver contexto de caja
→ identificar/escanear producto y UOM
→ capturar cantidad
→ resolver precio/impuesto/promoción
→ opcionalmente identificar cliente
→ validar stock y permisos
→ asignar uno o más pagos
→ confirmar con idempotency key
→ registrar venta/pagos/stock
→ emitir comprobante
~~~

Primitivas compartidas: contexto, línea comercial, motor de precio, autorización, pago, posting y auditoría.

### F2. Pedido abierto con recurso/preparación

~~~text
abrir pedido
→ opcionalmente asignar mesa/recurso/canal
→ agregar líneas + modificadores
→ fijar o recalcular precio según política
→ enviar delta a preparación
→ modificar con historial
→ marcar listo/entregado
→ cobrar (posible división)
→ cerrar y liberar recurso
~~~

La mesa y la estación son relaciones opcionales; el pedido durable es la raíz.

### F3. Cotización a cumplimiento

~~~text
cotizar
→ aceptar/convertir a pedido
→ reservar total/parcial
→ picking
→ despacho total/parcial
→ backorder si falta
→ facturar/cobrar según política
→ cerrar
~~~

Primitivas: documento versionado, líneas, reserva, tarea, movimiento, parcialidad y saldo pendiente.

### F4. Compra y recepción

~~~text
solicitud/reposición
→ orden a proveedor
→ recepción parcial
→ asignar UOM/lote/serial/vencimiento
→ aceptar o rechazar cantidades
→ actualizar stock y costo
→ mantener pendiente
→ factura/obligación
→ pago
~~~

Recepción física y obligación contable no deben colapsarse en un único estado.

### F5. Devolución/cambio

~~~text
localizar venta
→ seleccionar líneas, UOM y cantidad restante
→ validar política/autorización
→ decidir destino físico
→ revertir stock/impuesto/beneficio
→ reembolsar o generar saldo
→ si es cambio, enlazar nueva venta
~~~

### F6. Transferencia entre bodegas

~~~text
solicitar
→ reservar/pickear origen
→ despachar a tránsito
→ recibir total/parcial en destino
→ registrar faltante/daño
→ cerrar o mantener pendiente
~~~

Una transferencia incompleta requiere estado en tránsito; no puede ser dos ajustes independientes.

### F7. Producción/despiece

~~~text
planificar lote/orden
→ reservar insumos
→ consumir cantidad real
→ registrar proceso
→ recibir producto y subproductos
→ registrar merma/rendimiento
→ calcular costo
→ liberar para venta
~~~

## 9. Casos límite y responsabilidad sugerida

| Escenario difícil | Responsable primario | Regla sugerida |
|---|---|---|
| Unidad y caja | C1 Medición/UOM | Una UOM de stock; conservar factor transaccional |
| Metro | C1 | Decimal + longitud; corte/no devolución como política |
| Peso | C1 + C2/Integración | Peso es cantidad; balanza sólo captura |
| Precio por cliente | C3 Pricing + CRM | Resultado explicable y snapshot |
| Dos medios de pago | POS/Pagos | Varias asignaciones cuya suma satisface total/tolerancia |
| Devolución parcial | C15 | Contra cantidad retornable de venta original |
| Inventario negativo | Inventario + C17 | Política central, excepción autorizada; nunca oculto |
| Lote vencido | C11 | Bloquear o advertir según política legal/operativa |
| Stock reservado | C9 | On-hand ≠ disponible; reserva siempre referenciada |
| Pedido abierto horas/días | C5 | Versionado, dueño, precio y reserva explícitos |
| Venta offline | C16 | Compromiso local + cola durable + idempotencia |
| Producto deshabilitado mientras caja está offline | C16 + Catálogo | política de antigüedad; aceptar condicional o rechazar visible |
| Precio cambia durante operación | C3 + C5/C16 | versión/snapshot y política de recálculo |
| Varias bodegas | Inventario | contexto y promesa por bodega; transferencia explícita |
| Varias cajas | POS + Núcleo | sesión y numeración independientes, consolidación auditable |
| Varias sedes | Núcleo + dominios | ámbito explícito en precio, stock, permisos y caja |
| Producto preparado | C7/C8/C13 | elegir explícitamente combo, preparación o producción |
| Modificadores | C7 | selección estructurada; no texto libre como única verdad |
| Descuento autorizado | C3 + C17 | límite server-side, aprobador y motivo |
| Venta a crédito | C12 | genera CxC; cliente obligatorio |
| Límite de crédito | C12 | exposición actual + pendiente; excepción aprobada |
| Recepción parcial | Compras | recibido y pendiente por línea, con rechazo separado |
| Transferencia incompleta | Inventario/Fulfillment | bodega de tránsito y recepción parcial |
| Serial devuelto distinto | C11 + C15 | validar el serial original o excepción documentada |
| Cambio de factor UOM | C1 | no reescribir transacciones; versionar/guardar snapshot |
| Cierre con ventas offline pendientes | C16 + Caja | impedir cierre final o crear estado provisional conciliable |

## 10. Implicaciones para perfiles componibles

Los perfiles sólo aplican valores iniciales. La empresa puede modificarlos dentro de reglas seguras.

### Ferretería

| Capacidad | Predeterminado |
|---|---|
| venta rápida, barcode, variantes | Default ON |
| UOM/decimales, longitud, unidad/caja | Default ON |
| lista por cliente, volumen, descuento autorizado | Default ON |
| cotización | Default ON |
| pedido abierto, reserva, despacho | Optional |
| lotes | Optional |
| seriales | Conditional |
| mesas/preparación | Default OFF |

### Distribuidora no perecedera

| Capacidad | Predeterminado |
|---|---|
| unidad/paquete/caja y muchas líneas | Default ON |
| cliente/lista/volumen | Default ON |
| pedido, reserva, picking, despacho parcial | Default ON |
| crédito/CxC | Default ON, sujeto al alcance comercial |
| lotes/seriales | Optional |
| producción/mesas | Default OFF |

### Distribuidora perecedera

Parte del perfil anterior y añade lotes, vencimiento, FEFO y merma **Default ON**; seriales **Default OFF**; control de temperatura/IoT como **extensión**.

### Restaurante

| Capacidad | Predeterminado |
|---|---|
| pedido abierto, mesa/recurso | Default ON |
| modificadores, notas, preparación | Default ON |
| pagos/caja/cliente | Core |
| combos | Default ON |
| receta/inventario de ingredientes | Optional inicialmente |
| split avanzado, reservas, delivery | Optional/posterior |
| longitud/serial | Default OFF |

### Farmacia

| Capacidad | Predeterminado |
|---|---|
| barcode, variantes/presentaciones | Default ON |
| lote, vencimiento, FEFO | Default ON |
| cliente identificado | Optional/Conditional |
| serialización | Conditional |
| receta médica/controlados | Extension por jurisdicción |
| mesas/preparación | Default OFF |

### Carnicería

| Capacidad | Predeterminado |
|---|---|
| peso/fracciones/balanza | Default ON |
| lote/vencimiento/merma | Default ON |
| despiece/rendimiento | Default ON si procesa; Optional si sólo revende |
| preparación/modificadores | Optional |
| pedidos abiertos/encargos | Optional |
| seriales/mesas | Default OFF |

### Panadería

| Capacidad | Predeterminado |
|---|---|
| venta rápida, unidad/paquete/peso | Default ON |
| variantes/combos | Default ON |
| producción/receta/merma | Default ON si produce |
| lotes/vencimiento | Default ON o Conditional según granularidad |
| encargos/pedidos abiertos/anticipos | Default ON |
| mesas | Default OFF; activable para cafetería |

## 11. Relación conceptual con ERPNext/Frappe

### Escala

- **Directo:** ERPNext parece tener modelo estándar relevante.
- **Parcial:** existen primitivas, pero UX/reglas/contrato no cubren todo.
- **POS Core:** probablemente debe orquestar o exponer contrato propio.
- **Extensión propia:** comportamiento especializado fuera del estándar.
- **Probar:** la evidencia documental no basta.

| Comportamiento | Evaluación preliminar | Evidencia/razón |
|---|---|---|
| Empresa, usuarios, roles, bodegas | Directo | Modelos estándar Frappe/ERPNext; falta validar aislamiento real |
| Item, variantes, múltiples barcodes | Directo | Item v16 contiene variant_of, has_variants y tabla barcodes |
| UOM y conversiones | Directo/Probar | Item contiene stock_uom y tabla uoms; probar POS con caja, metro y decimales |
| Peso/longitud | Parcial | Representables como UOM/cantidad; integración y redondeo requieren prueba/POS Core |
| Item Price/listas | Directo | POS Profile y POS Invoice referencian Price List |
| Volumen/cliente/descuento | Directo/Parcial | Pricing Rule contiene cliente/grupo, min/max qty, rate/discount |
| Precedencia y explicación de precio | POS Core/Probar | Motor existe; contrato estable y explicación compacta no están demostrados |
| Impuestos | Directo/Probar | POS Invoice/Profile contienen plantillas/categorías; validar localización |
| Pagos mixtos | Directo/Probar | POS Invoice admite tabla de pagos; validar posting, devolución y cierre |
| Apertura/cierre de caja | Directo/Probar | Doctypes POS Opening/Closing; V1 canónico aún pendiente |
| Devolución referenciada | Directo/Probar | POS Invoice tiene is_return y return_against |
| Cambio | Parcial/POS Core | Componer devolución + venta y experiencia atómica |
| Inventario y stock ledger | Directo/Probar | V1.1 del proyecto está activo, no aprobado |
| Stock negativo | Directo/Probar | Stock Settings/Item exponen política; validar concurrencia y lotes |
| Reserva | Directo/Parcial | Stock Settings v16 expone reserva parcial; validar integración POS/pedido |
| Lotes, vencimiento, seriales | Directo/Probar | Item/Batch y bundles estándar; probar selección POS y devolución |
| Cotización/pedido/despacho parcial | Directo/Parcial | ERPNext Sales Order/Delivery Note; POS Core necesita DTO/orquestación |
| Compra/recepción/rechazo parcial | Directo/Probar | Purchase Receipt tiene bodega aceptada/rechazada y estado; probar parciales/costo |
| Crédito/CxC | Directo/Parcial | ERPNext contabilidad/CxC; UX, límite concurrente y offline requieren diseño |
| BOM/producción | Directo/Parcial | Manufacturing estándar; despiece/rendimiento y venta bajo pedido deben probarse |
| Merma | Parcial | Stock Entry/Reconciliation pueden mover stock; motivo/flujo analítico puede requerir extensión |
| Pedido abierto genérico | Parcial/POS Core | POS Invoice draft no debe asumirse equivalente; requiere modelo/experimento |
| Mesas/recursos | Extensión propia probable | No se encontró primitiva POS estándar suficiente en el núcleo ERPNext revisado |
| Modificadores/preparación | Extensión propia probable | Modelo especializado; no inferir de Item Variant/BOM |
| Offline robusto | POS Core/Probar | Debe validar ausencia/presencia de soporte y diseñar idempotencia/conflictos |
| Idempotencia de negocio | POS Core/Probar | Ya identificada como V6 en MASTER-PLAN |
| Dispositivos/fiscal/local | Extensión/adaptador | Depende del hardware y jurisdicción |

### Riesgos específicos de usar ERPNext como motor

1. **Modelo potente, contrato grande:** exponer DocTypes crudos al frontend acoplaría la UX a campos y migraciones. POS Core debe ofrecer DTOs pequeños. **R**
2. **Draft no equivale necesariamente a pedido abierto:** cancelación, reserva, preparación y concurrencia pueden requerir semántica propia. **HT**
3. **Pricing correcto no garantiza pricing explicable/rápido:** medir payload, latencia y regla ganadora. **HT**
4. **Trazabilidad puede ser funcional pero lenta para caja:** probar flujo con scan, lote, FEFO, devolución y offline. **HT**
5. **Contabilidad puede imponer secuencias útiles pero costosas:** no duplicar ledger en POS Core; orquestar ERPNext y medir. **R**
6. **Multitenancy por site reduce contaminación de datos, pero aumenta operación:** provisionamiento, backup, upgrade y observabilidad siguen en M0. **HD/HT**

## 12. Implicaciones para el MVP

### A. Necesario para que la arquitectura sea correcta desde el inicio

- IDs de operación e idempotencia en contratos de venta/pago/devolución.
- Cantidad decimal, UOM y factor conservados en línea; dinero con precisión explícita.
- Separación de empresa/sede/bodega/caja/usuario.
- POS Core como frontera, sin exponer DocTypes directamente.
- Registro simple de capacidades y configuración, sin business_type en reglas.
- estados/transiciones auditables y permisos server-side;
- snapshots de precio/impuesto/UOM en transacciones;
- eventos o contratos que permitan añadir reserva, trazabilidad, fulfillment y offline después;
- extensiones en app propia, sin modificar ERPNext core.

Esto no obliga a implementar mesas, lotes o producción ahora.

### B. Primer MVP recomendado: distribuidora no perecedera + ferretería

- contexto/login, empresa, sede, bodega, caja y roles cajero/admin;
- catálogo/búsqueda por nombre, SKU, referencia y barcode;
- unidad/paquete/caja, decimal y metro mediante C1;
- cliente final/identificado;
- lista de precios, precio por UOM, volumen simple y descuento con permiso;
- carrito, impuesto, pago único/mixto, venta idempotente y comprobante;
- apertura, movimientos, cierre y arqueo;
- stock visible, salida inmediata y política de stock negativo;
- devolución parcial referenciada;
- compras/recepción básica sólo si es necesaria para operar el piloto, reutilizando ERPNext;
- reportes mínimos de ventas, caja, stock y margen.

El crédito simple merece una decisión comercial explícita: si los pilotos de distribución no pueden operar sin él, incluir “venta a crédito + saldo + abono” limitado; no construir aún cartera avanzada.

### C. Posponer

- restaurante completo, mesas, cocina/KDS y split avanzado;
- promociones/lealtad complejas;
- lotes/vencimiento/FEFO si los dos primeros pilotos no los usan;
- producción, recetas, despiece y rendimiento;
- rutas, preventa móvil y logística avanzada;
- regulación farmacéutica;
- reservas avanzadas y ATP multi-bodega;
- offline completo hasta M4, aunque sus invariantes ya estén previstos.

### D. Sólo prever arquitectónicamente

- serial/lote en líneas y movimientos;
- pedido durable y cumplimiento parcial;
- adaptadores de dispositivos;
- sincronización offline;
- extensiones/localización por tenant;
- transformaciones con BOM y merma causal.

## 13. Preguntas pendientes

### Operativas

1. ¿Qué combinaciones UOM/precio usan realmente los primeros pilotos y cómo redondean remanentes?
2. ¿La distribuidora factura al ordenar, despachar o entregar?
3. ¿Qué proporción de ventas requiere crédito, y quién puede exceder límite?
4. ¿Las devoluciones reingresan a disponible, cuarentena o merma?
5. ¿Se necesita disponibilidad por sede o promesa consolidada?
6. ¿Qué hardware exacto —scanner, balanza, impresora, terminal— debe soportarse?
7. ¿Qué normas fiscales y farmacéuticas aplican en el mercado inicial?
8. ¿Qué datos y operaciones deben seguir disponibles durante una caída?

### Técnicas

1. ¿POS Invoice v16 acepta de forma correcta UOM alternativa y cantidades fraccionarias en API?
2. ¿Cómo resuelve ERPNext múltiples Item Price/Pricing Rule y qué explicación puede extraerse?
3. ¿Cuándo impactan inventario, pagos y GL durante apertura/cierre POS?
4. ¿Puede una devolución parcial conservar lote/serial, UOM, precio e impuesto originales?
5. ¿Stock Reservation cubre concurrencia de POS y pedidos parciales?
6. ¿Qué semántica segura representa un pedido abierto sin contaminar contabilidad?
7. ¿Cómo se comportan recepción y transferencia parciales con tránsito y backorder?
8. ¿Qué endpoints/operaciones son realmente atómicos e idempotentes?
9. ¿Cuál es la carga por site y la operación de cientos de tenants para una sola persona?
10. ¿Qué parte de trazabilidad y pricing puede cachearse offline sin violar reglas?

## 14. Pruebas futuras recomendadas

Cada experimento sigue la disciplina canónica.

### E1. Venta multiuom y fraccionaria

- **Duda:** ERPNext representa unidad/caja/metro con precio, stock y redondeo correctos.
- **Prueba reproducible:** crear item con stock UOM unidad o metro, UOM alternativa y Item Price por UOM; vender 1 caja y 2.75 m vía API/POS Invoice; devolver parcialmente.
- **Evidencia:** documentos, factores, SLE, totales, precisión y estado tras devolución.
- **Resultado:** PASS si conserva semántica y ledger; CONDITIONAL si POS Core normaliza/valida; FAIL si hay pérdida no compensable.
- **Implicación:** decide cuánto de C1 delegar a ERPNext.

### E2. Pricing determinista

- **Duda:** lista + cliente + UOM + volumen + vigencia producen un resultado predecible.
- **Prueba:** tabla de casos con regla única y conflictos; comparar respuesta ERPNext con resultado esperado y medir latencia.
- **Evidencia:** precio, regla(s), descuento, impuestos, payload y p95.
- **Resultado/implicación:** PASS delega cálculo; CONDITIONAL exige fachada/explicador/cache; FAIL obliga motor propio limitado.

### E3. Pago mixto y cierre

- **Duda:** dos medios, devolución y arqueo se contabilizan correctamente.
- **Prueba:** apertura; venta 60% efectivo/40% tarjeta; devolución parcial a medio definido; movimientos de caja; cierre con diferencia.
- **Evidencia:** POS Invoice, pagos, cierre, GL y cuentas.
- **Implicación:** frontera de Pagos/Caja en POS Core.

### E4. Pedido abierto

- **Duda:** un documento estándar puede permanecer editable sin efectos prematuros y con concurrencia segura.
- **Prueba:** abrir, editar desde dos sesiones, recalcular precio, reservar opcionalmente, abandonar/reabrir, cobrar/cancelar.
- **Evidencia:** estados, locks/versiones, stock, GL y auditoría.
- **Implicación:** reutilizar Sales Order/draft o crear DocType propio en pos_core.

### E5. Lote, vencimiento, FEFO y devolución

- **Duda:** selección y retorno son utilizables en caja.
- **Prueba:** dos lotes con fechas distintas; vender automáticamente/manual; bloquear vencido; devolver parte; ejecutar recall.
- **Evidencia:** bundles/SLE, lote elegido, latencia, UX y trazabilidad cliente.
- **Implicación:** estándar directo, fachada POS o extensión.

### E6. Reserva y carrera

- **Duda:** dos cajas no sobrevenden el mismo disponible reservado.
- **Prueba:** stock 5; dos pedidos concurrentes de 4; reserva parcial, expiración y liberación.
- **Evidencia:** respuestas, reserved/available, ausencia de dobles compromisos.
- **Implicación:** delegar Stock Reservation o arbitrar en POS Core.

### E7. Recepción/transferencia parcial

- **Duda:** ERPNext conserva pendiente, tránsito, rechazo y costo.
- **Prueba:** PO 10, recibir 6 aceptar/1 rechazar, luego 3; transferir 5, recibir 4 y reportar 1 faltante.
- **Evidencia:** estados, stock por bodega/tránsito, valoración y documentos enlazados.
- **Implicación:** alcance de Compras/Fulfillment.

### E8. Crédito y límite concurrente

- **Duda:** límite se aplica al saldo + operaciones simultáneas.
- **Prueba:** cliente con límite 100; dos ventas concurrentes de 70; abono y reintento; excepción autorizada.
- **Evidencia:** una sola exposición válida, CxC, auditoría.
- **Implicación:** transacción/lock en ERPNext o registro de autorización en POS Core.

### E9. Idempotencia de venta

- **Duda:** timeout/retry puede duplicar venta.
- **Prueba:** mismo operation_id en POST repetido, concurrente y después de timeout simulado.
- **Evidencia:** un documento/ledger/pago y respuesta recuperable.
- **Implicación:** PASS nativo o CONDITIONAL con registro idempotente propio, como anticipa M0/V6.

### E10. Offline con catálogo obsoleto

- **Duda:** qué hacer ante producto deshabilitado, precio/permiso/stock cambiados.
- **Prueba:** cachear; desconectar; vender; cambiar cada dato en servidor; reconectar y sincronizar.
- **Evidencia:** política aplicada, no duplicación, conflicto visible, cierre conciliable.
- **Implicación:** lista exacta de operaciones offline y datos versionados.

### E11. Producto compuesto vs producción

- **Duda:** bundles/BOM estándar cubren combo de venta, receta preparada y despiece sin efectos incorrectos.
- **Prueba:** tres escenarios separados y comparar consumo/costo/devolución.
- **Evidencia:** movimientos, valoración y reversión.
- **Implicación:** reutilización de ERPNext o capacidades propias C7/C13.

### E12. Multitenancy y extensiones

- **Duda:** una extensión por cliente puede instalarse/configurarse sin fork y sin filtrar datos.
- **Prueba:** dos sites, misma versión de core, extensión sólo en uno; migración, backup/restore y API adversarial.
- **Evidencia:** aislamiento, tiempo operativo, compatibilidad y rollback.
- **Implicación:** estrategia de site/app/config y coste real para un mantenedor.

## 15. Revisión crítica del diseño

### Riesgo: demasiadas capacidades pequeñas

Mitigación: conservar las 17 capacidades cohesivas anteriores como mapa conceptual, no convertirlas automáticamente en paquetes. Peso, metro, caja y decimal pertenecen a C1; FEFO es política dentro de C11; descuentos son reglas dentro de C3/C17.

### Riesgo: “configuración” que oculta otro ciclo transaccional

Un booleano use_tables sería insuficiente si aparecen ocupación, traslado y combinación. Un booleano use_credit sería peligroso sin CxC, límite y cobro. La prueba es preguntar si cambia estados, invariantes o ledger.

### Riesgo: duplicar ERPNext

No crear maestros, ledgers, contabilidad, compras o manufacturing paralelos hasta que una prueba demuestre una brecha. POS Core debe traducir y orquestar, no ser un segundo ERP.

### Riesgo: ERPNext como restricción de UX y latencia

No adaptar la experiencia a formularios/DocTypes. Definir contratos POS compactos y benchmarks; mantener ERPNext detrás de la frontera.

### Riesgo: offline multiplica cada regla

No prometer paridad total. Definir un subconjunto seguro; crédito, lotes escasos, promociones consumibles y aprobaciones pueden quedar online-only inicialmente.

### Riesgo: multitenancy operativo

El aislamiento por site puede ser correcto y aun fracasar por costo de provisionar, actualizar, respaldar y observar. M0/V4 y V18 son gates reales, no detalles de infraestructura.

### Riesgo: producto imposible para una persona

Preferir:

- monolito modular;
- una app pos_core;
- perfiles como datos versionados;
- pocos adaptadores;
- flags/capabilities declarativos simples;
- pruebas verticales;
- capacidades avanzadas sólo tras demanda demostrada.

Evitar:

- microservicio por dominio;
- plugin por sector;
- workflow engine genérico antes de tener tres flujos reales;
- motor de promociones universal en el primer MVP;
- sincronización bidireccional genérica de todos los DocTypes.

## 16. Fuentes

### Canónicas del proyecto

1. [MASTER-PLAN](../MASTER-PLAN.md), [HANDOFF](../HANDOFF.md), [GITHUB-TRACKING](../GITHUB-TRACKING.md) y [ADR-001](../ADR-001-COMPOSABLE-PROFILES.md).
2. Issues [#17](https://github.com/Abraha33/ERP-POS-Holamigo/issues/17), [#1](https://github.com/Abraha33/ERP-POS-Holamigo/issues/1), [#3](https://github.com/Abraha33/ERP-POS-Holamigo/issues/3) y [#18](https://github.com/Abraha33/ERP-POS-Holamigo/issues/18).

### ERPNext/Frappe oficiales

3. [ERPNext v16 Item model](https://github.com/frappe/erpnext/blob/version-16/erpnext/stock/doctype/item/item.json): UOM, conversiones, barcodes, variantes, lotes, vencimiento, seriales y descuento máximo.
4. [ERPNext v16 POS Profile](https://github.com/frappe/erpnext/blob/version-16/erpnext/accounts/doctype/pos_profile/pos_profile.json): cliente, pagos, lista, impuestos, bodega, stock, descuento y pago parcial.
5. [ERPNext v16 POS Invoice](https://github.com/frappe/erpnext/blob/version-16/erpnext/accounts/doctype/pos_invoice/pos_invoice.json): cliente, devolución, precio, pagos, impuestos y actualización de stock.
6. [ERPNext v16 Pricing Rule](https://github.com/frappe/erpnext/blob/version-16/erpnext/accounts/doctype/pricing_rule/pricing_rule.json): cliente/grupo, cantidad mínima/máxima, precio/descuento y producto gratis.
7. [ERPNext v16 Stock Settings](https://github.com/frappe/erpnext/blob/version-16/erpnext/stock/doctype/stock_settings/stock_settings.json): stock negativo, reserva, lotes/seriales y políticas UOM.
8. [ERPNext v16 Batch](https://github.com/frappe/erpnext/blob/version-16/erpnext/stock/doctype/batch/batch.json): lote, vencimiento, cantidad y valoración.
9. [ERPNext v16 Purchase Receipt](https://github.com/frappe/erpnext/blob/version-16/erpnext/stock/doctype/purchase_receipt/purchase_receipt.json): recepción, devolución, bodegas aceptada/rechazada, precio e impuestos.
10. [Documentación oficial ERPNext](https://docs.frappe.io/erpnext/) y [API REST Frappe](https://docs.frappe.io/framework/user/en/api/rest).

### Productos y operaciones comparables

11. [Odoo 19 POS workflow](https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale/use.html): apertura, pedidos en curso, clientes, venta, devolución, caja, cierre y límites offline.
12. [Odoo 19 Restaurant POS](https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale/restaurant.html): pisos/mesas y operación de restaurante.
13. [Odoo 19 POS pricing](https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale/extra/pricing.html): descuentos, promociones, lealtad, listas, volumen, redondeo e impuestos.
14. [Odoo 19 POS products](https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale/products.html): variantes, combos y UOM.
15. [Odoo 19 UOM](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/configure/uom.html): comprar en paquete, vender en unidad y conversiones.
16. [Odoo 19 lotes](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/product_tracking/lots.html), [seriales](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/product_tracking/serial_numbers.html) y [vencimientos](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/product_tracking/expiration_dates.html): trazabilidad, recall y caducidad.
17. [Odoo 19 scrap inventory](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/inventory_management/scrap_inventory.html): merma como movimiento con motivo y ubicación de pérdida.
18. [Odoo 19 Bills of Materials](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/basic_setup/bill_configuration.html): componentes, consumo flexible, operaciones y subproductos.
19. [GS1 GTIN](https://www.gs1.org/standards/id-keys/gtin) y [GS1 Application Identifiers](https://www.gs1.org/standards/barcodes/application-identifiers): identidad de producto y codificación estructurada de lote, vencimiento, serial y medidas.

### Límites de la evidencia

- Las fuentes de Odoo demuestran que los patrones son implementables y usados por un ERP/POS reconocido; no prueban que ERPNext los soporte.
- Los modelos JSON de ERPNext demuestran presencia de campos/primitivas, no corrección end-to-end, rendimiento ni adecuación UX.
- Las operaciones sectoriales marcadas IO deben validarse con entrevistas/observación de pilotos del mercado objetivo.
- Ninguna fuente externa reemplaza los experimentos M0 en la versión 16.34/16.35 observada por el proyecto.

## 17. Conclusión

El POS multinegocio viable no se obtiene agregando condicionales por sector ni haciendo universal cada función. Se obtiene manteniendo un núcleo transaccional pequeño y sólido, un puñado de capacidades con semántica propia, configuración para variaciones paramétricas, UI componible y extensiones para regulación/hardware/casos particulares.

La decisión inmediata no es implementar este catálogo. Es usarlo para ampliar la validación de Frappe/ERPNext con pruebas representativas —especialmente UOM, pricing, pagos/caja, devoluciones, trazabilidad, parciales e idempotencia— y congelar el MVP sólo cuando esa evidencia permita asignar cada responsabilidad entre ERPNext, POS Core y extensiones.
