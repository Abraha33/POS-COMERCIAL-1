> DOCUMENTO HISTÓRICO (v0.1.0, 2026-10-12). Este contrato se conserva íntegro para trazabilidad. Sus avisos de «no subido» y «no aprobado» describen su estado al ser redactado. Para las decisiones vigentes consultar `docs/PROJECT-STATE.md` y `docs/decisions/2026-10-12-DECISION-REGISTER.md`. No asumir implementación.

# POS-SALE-TEMPLATE — Contrato de layout y propiedad del shell POS

**Versión:** 0.1.0 · **Estado:** BORRADOR PARA VALIDACIÓN · **Sistema:** PrimeReact 10.9.9 (debe verificarse en working tree).

## 1. Fronteras y reglas no negociables

`PosPage` (o nombre actual) es un **compositor**, no el dueño de carrito, cliente, sesión de cobro, reglas de precios ni autorizaciones. `SaleDraft` y `PaymentSession` sobreviven al desmontaje de `QuickSale`. No usar estados duplicados entre contexto global y carrito hijo. Props/eventos descienden/ascenden; el estado transaccional se consulta mediante store + comandos de dominio.

No reconstruir equivalentes básicos de PrimeReact. Reutilizar `ScreenTemplate`, `FormField`, `FormDialog`, `DataTablePage`, componentes de estados y permisos solo cuando estén en el frontend vigente (según auditoría, sin verificación de archivo actual).

## 2. Árbol funcional de composición (nombres ilustrativos)

```text
PosRoute / PosWorkspace
 ├─ PosOperationalHeader             [shell de POS]
 ├─ PosWorkNavigation                [Venta / Suspendidas / Cobros / Pedidos / Turno / Más]
 └─ SaleWorkspace
     ├─ ProductExplorer               [buscador, filtros, resultados]
     │   └─ ProductDetailPanel        [presentaciones/precios/stock]
     └─ SaleCheckoutColumn
         ├─ CustomerContextBar        [arriba del carrito]
         ├─ CartLineList
         ├─ CartActions               [suspender / reiniciar / duplicar]
         ├─ SaleTotals
         └─ SaleFinalizationActions   [Cobrar / Crear pedido]

 OverlayHost (único, a nivel workspace)
 ├─ CustomerQuickEditor
 ├─ DiscountAuthorizationDialog
 ├─ CheckoutDialog / PaymentDetailsPanels
 ├─ SuspendedSalesPanel
 ├─ PendingPaymentsPanel
 ├─ ScheduledDeliveryPanel
 └─ OperationRecoveryDialog
```

**No** montar dos CheckoutDialog con reglas diferentes en variantes de pantalla. Menú, drawers y overlays se renderizan desde una sola capa visual (host) con un registro de overlays; no se modifican estados financieros con estados internos efímeros del diálogo.

## 3. Slots de plantilla

| Slot | Obligatorio | Altura/ancho conceptual | Responsabilidad | Restricciones |
|---|---|---|---|---|
| `header` | Sí | compacto, ocupa una fila | sesión/caja/conectividad | sin gráficos ni datos comerciales extensos |
| `primaryNav` | Sí | banda de navegación breve | vínculos entre flujos | navega sin perder draft |
| `productExplorer` | Sí | flexible, dominante en desktop | búsqueda y resultados | lista puede virtualizarse si hay muchos resultados |
| `customerContext` | Sí | antes del carrito | cliente/fiscal/lista | siempre visible en workspace de venta |
| `cartLines` | Sí | scroll interno cuando sea necesario | detalle agregado y acciones por línea | jamás perder acceso a total o CTA |
| `cartOperations` | Sí | compacta | suspender/reiniciar, acciones secundarias | reglas por estado de pago |
| `totals` | Sí | anclado | subtotal/impuestos/total/saldo | totales de servicio, no cálculo duplicado en JSX |
| `finalization` | Sí | anclado | cobrar/pedido | doble CTA claramente diferenciada |
| `status` | Sí | discreto | errores críticos/offline | accesible, sin mensajes repetidos |
| `overlayHost` | Sí | capa contextual | modales y paneles | gestiona foco y retorno |

## 4. Límites de contenido y reglas de desbordamiento

- Catálogo: con 0 productos estado vacío; con cientos, paginación/virtualización de resultados sin render innecesario; las fotos son secundarias u opcionales.
- Carrito: 0 líneas = estado vacío, 1–100+ líneas = área scrolleable; mantener visible total y CTA al desplazarse. Nunca truncar cantidad/precio total; nombres largos con tooltip/expansión accesible.
- Cliente: un identificador corto visible; ampliar en diálogo; información fiscal sensible con permiso.
- Notificaciones: mostrar solo bloqueos o pendientes accionables; agrupar avisos; no desplazar permanentemente resumen.
- Modales: scroll interno; no modales anidados de manera que se rompa foco/teclado.
- Estado: indicadores mediante texto y pictograma además del color.

## 5. Dueños exclusivos de archivos y contratos (propuesta de trabajo paralelo)

| Área | Dueño de cambios | Otros agentes |
|---|---|---|
| `PosPage`, router, `PosWorkspace`, `OverlayHost`, navegación | **Integrador UI** | no editan archivos compartidos |
| `pos/domain/**`, tipos, servicios y estado de `SaleDraft` | **Arquitecto dominio** | consumen interfaz congelada |
| `catalog/**`, `pricing/**` | **Equipo catálogo** | no modifica store ni shell |
| `customer/**` | **Equipo clientes** | no modifica shell |
| `cart/**` | **Equipo carrito** | no modifica motor de pago |
| `payments/**` | **Equipo cobro** | no modifica tienda de carrito ni shell |
| `orders/**` | **Equipo pedidos** | no implementa cobro nuevo |
| `pos/tests/e2e/**` y pruebas de integración | **QA/integrador** | entrega fallos reproducibles |

Rutas anteriores son **fronteras lógicas**, no paths comprobados. Ajustarlos después de inspeccionar el working tree. Los equipos no deben crear archivos paralelos tipo `PosPageV2`, `NewCheckout`, `PaymentDialog2` sin aprobación.

## 6. Contrato de interacción shell → funcionalidades

El shell recibe propiedades derivadas y no las muta:

```ts
interface PosWorkspaceViewModel {
  activeDraftId: string;
  shift: { id: string; status: 'open'|'paused'|'closed'|'unknown' };
  connection: 'online'|'offline'|'reconnecting'|'degraded';
  unsyncedCount: number;
  suspendedCount: number;
  pendingPaymentsCount: number;
  orderWorkCount: number;
}
interface PosWorkspaceActions {
  openOverlay(name: 'customer'|'checkout'|'productDetail'|'suspended'|'pendingPayments'|'delivery'|'authorization'): void;
  navigateTo(target: 'sale'|'orders'|'shift'|'history'|'returns'): void;
  requestStartSale(): void;
}
```

La navegación no llama a `resetCart` por defecto. Se restauran borradores por ID; rehidratar al volver. Nunca usar `useEffect(() => resetDraft(), [route])` para navegación de módulos.

## 7. Fallos y recuperación

Overlay de checkout cerrado: no significa pago cancelado. Ruta cambia: store permanece. Revisión de autorización: cambios de monto hacen expirar la autorización. Error de sincronización: lista de pendientes sin tocar intentos confirmados. Error de impresora: reimprimir documento, no crear nueva venta.

## 8. Contrato de pruebas

- Montar/desmontar `SaleWorkspace` 10 veces: `SaleDraft` inalterado.
- Cambiar Venta → Pedidos → Venta con carrito y selección de cliente: estado intacto.
- Cambiar en mitad de cobro con intento en estado incierto: rehidratación, sin duplicar operación.
- 100 líneas de carrito: CTA accesible y listas legibles sin scroll global bloqueante.
- Ningún módulo integra estado local con diferencias entre el valor visible y el store.

## 9. Pendiente

Confirmar estructura y nombres actuales en el frontend PrimeReact, versión de router, estado disponible, shell y composición de diálogos. No aprobar sin validar riesgo P0 de desmontaje reportado el 12/10/2026.