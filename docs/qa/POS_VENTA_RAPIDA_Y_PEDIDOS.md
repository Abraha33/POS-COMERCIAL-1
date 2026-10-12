# Venta rápida completa y Gestión de pedidos

Rama `feat/pos-sales` (desde `feat/pos-ops`). Ruta `/pos`. Todo lo nuevo de pedidos, precios por volumen y atajos de
catálogo es **PROPUESTA y vive en el dispositivo**: no hay contrato, reglas aprobadas ni backend para ello.

## Plan de diseño (resumen)
- **Color y tipografía:** los de la marca ya integrada (tokens `--app-*`, navy, azul primario AA, semántica de estado AA).
  No se introdujo paleta nueva: el brief pide minimalismo funcional y consistencia con el resto del POS.
- **Jerarquía (3 zonas de atención):** catálogo a la izquierda; cliente + resumen + cobro a la derecha; barra de
  navegación operativa arriba. Lo demás (detalle, volumen, pedido, cliente nuevo) vive en diálogos o paneles.
- **Elemento memorable:** el semáforo de pedidos. Cuatro contadores grandes que son también filtros (pendiente, en
  proceso, con faltante, listos); es lo único con color saturado en la pantalla.
- **Escritorio / tablet / móvil:** dos columnas ≥ 900 px; en móvil, catálogo primero y botón "Ver carrito".

## Cobertura de las 8 secciones
V visual · I interactiva · M funcional con mocks · P probada · Prod lista para producción.
**Nada está lista para producción.**

| # | Sección | V | I | M | P | Estado y pendiente |
|---|---|---|---|---|---|---|
| 01 | Header operativo | ✔ | ✔ | ✔ | ✔ | sede, caja, turno, conexión; alertas reales pendientes (F12 aún no se consume aquí) |
| 02 | Navegación operativa | ✔ | ✔ | ✔ | ✔ | Venta rápida, Suspendidas, Cobros pendientes, Pedidos, Mi turno, Más; conserva el carrito |
| 03 | Catálogo y búsqueda | ✔ | ✔ | ✔ | ✔ | texto, código de barras, SKU, categoría, disponibilidad, frecuentes, lista/cuadrícula. **Falta:** marca, presentación, historial reciente (el contrato de producto no tiene marca ni presentaciones) |
| 04 | Detalle y volumen | ✔ | ✔ | ✔ | ✔ | identificación, existencias por sede, escalones por volumen. **Los escalones son un ejemplo derivado y solo informativo**: el servidor decide el precio; sin listas ni promociones |
| 05 | Cliente | ✔ | ✔ | ✔ | ✔ | selección, alta rápida en modal, cupo y saldo. **Falta:** buscar por NIT/teléfono en el selector, editar, direcciones guardadas, recálculo por lista del cliente |
| 06 | Carrito | ✔ | ✔ | ✔ | ✔ | + duplicar. **Falta:** cambio de unidad, advertencia de stock por línea |
| 07 | Resumen fijo | ✔ | ✔ | ✔ | ✔ | impuestos estimados; el servidor es la autoridad. **Falta:** cargos adicionales y "pagado/saldo" en la pantalla principal |
| 08 | Finalización | ✔ | ✔ | ✔ | ✔ | Cobrar ahora y Crear pedido / Programar entrega |

## Gestión de pedidos
| Función | V | I | M | P |
|---|---|---|---|---|
| Bandeja con semáforo, búsqueda, "mis pedidos", por cobrar, historial | ✔ | ✔ | ✔ | ✔ |
| Crear pedido (sin cobrar) y programar entrega de una venta cobrada | ✔ | ✔ | ✔ | ✔ |
| Detalle, tomar, empaque parcial y corrección | ✔ | ✔ | ✔ | ✔ |
| Faltantes: reportar y resolver; control de calidad | ✔ | ✔ | ✔ | ✔ |
| Pago: registrar abono; **cobrar en caja sin reconstruir el carrito** | ✔ | ✔ | ✔ | ✔ |
| Despacho, entrega y cancelación con motivo | ✔ | ✔ | ✔ | ✔ |
| Compras de faltantes, proveedores y precios históricos | ✘ | ✘ | ✘ | ✘ |
| Entrega parcial | ✘ | ✘ | ✘ | ✘ |

Distinción de negocio respetada: **cobrar y entregar después** crea un pedido ya pagado y vinculado a la venta
(sin cobrar de nuevo); **crear pedido y cobrar después** no registra venta ni factura.

## Máquina de estados de pedido
`pendiente → en-proceso → listo → despachado → entregado`; `en-proceso ⇄ problema` (faltante); `cancelado` solo antes
de despachar y sin pagos. No se despacha con saldo salvo crédito (`SALDO_PENDIENTE`).

## Archivos
Nuevos: `features/pos/orders/{orders.ts,useOrders.ts,OrdersBoard.tsx,OrderDetailDialog.tsx,CreateOrderDialog.tsx}`,
`features/pos/{PosNav,ProductDetailPanel,NewCustomerDialog}.tsx`, `priceTiers.ts`, `catalog-extras.css`,
`shared/ui/toast-contrast.css`; pruebas `pos-orders.test.ts`, `pos-orders-ui.test.tsx`, `pos-catalog-ui.test.tsx`,
`pos-price-tiers.test.ts`; `e2e/pos-sales.spec.ts`; capturas `docs/qa/audit/pos-sales/`.
Modificados: `PosPage.tsx` (barra de navegación y vistas), `QuickSale.tsx` (precarga de pedido, Crear pedido, Programar
entrega, filtros, detalle, cliente nuevo, duplicar), `CatalogPanel.tsx`, `SalePanel.tsx`, `useHeldSales.ts` (estado
compartido para el contador), `pos.css`, `shared/ui/tokens.css` (importa el contraste de avisos), `pos-history.test.tsx`
(Historial ahora está bajo "Más").

## Resultados (medidos)
typecheck y lint sin errores · Vitest **370/370** (32 archivos) · build correcto ·
Playwright **97/97** (toda la suite, incluido el recorrido crear pedido → preparar → cobrar en caja → pagado, y axe sin
violaciones serias, sin desborde y controles ≥ 44 px a 1366×768, 768 y 375).
Corregido en el núcleo: contraste AA del texto de los avisos (`.p-toast-detail`).

## Pendiente, riesgos y límites
- **Backend de pedidos inexistente:** los pedidos viven en `localStorage` por sede; no se comparten entre equipos ni
  terminales y no hay concurrencia. Hace falta contrato (pedido, líneas, estados, pagos, despacho).
- **Cobrar un pedido con envío:** la venta cubre los productos; el envío queda como saldo del pedido (PROPUESTA).
- **Compras de faltantes y proveedores:** requieren integrar con Compras; los módulos no se importan entre sí, hace falta
  un contrato compartido.
- **Precios por volumen y listas:** sin contrato; informativos. Un precio mostrado puede diferir del cobrado.
- **Crédito autorizado en pedidos:** solo se compara con el cupo del cliente en la interfaz; la autorización real es del servidor.
- **No verificado:** concurrencia entre cajas, lectores de pantalla, hardware de código de barras, navegadores distintos de
  Chromium, volumen real de pedidos y catálogo.
