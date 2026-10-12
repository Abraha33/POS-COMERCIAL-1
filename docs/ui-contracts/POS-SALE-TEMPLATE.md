# POS — plantilla y mapa de regiones

## Principio

Una sola plantilla sirve a cajero, supervisor y propietario. Los permisos cambian las acciones visibles, no la arquitectura base. Desktop, tablet y teléfono usan la misma plantilla con distinta disposición.

## Regiones

```text
┌──────────────────────────────── PosHeader (1) ────────────────────────────────┐
├────────────────────────────── PosActionBar (1) ────────────────────────────────┤
│ ProductCatalog (1)                                  │ CartPanel (1)           │
│ búsqueda, filtros, resultados, detalle              │ cliente, líneas, total  │
│                                                      │ acciones de carrito     │
├─────────────────────────────────────────────────────┴──────────────────────────┤
│ CheckoutPanel (0..1 activo) · pago · documento · entrega · confirmar          │
└──────────────────────────────── PosStatusBar (1) ─────────────────────────────┘
```

## Cardinalidad y responsabilidades

| Región | Cardinalidad | Responsabilidad |
|---|---:|---|
| `PosHeader` | 1 | Sede, caja, turno, conexión, usuario y acceso a ayuda. |
| `PosActionBar` | 1 | Suspendidas, cobros pendientes, pedidos, devoluciones y acciones no destructivas. |
| `ProductCatalog` | 1 | Descubrimiento y selección de productos; no cobra. |
| `ProductDetail` | 0..1 | Presentaciones, stock, atributos y decisión de agregar. |
| `CartPanel` | 1 | Líneas, cantidades, descuentos, cliente y resumen temporal. |
| `CustomerPanel` | 0..1 | Selección, alta rápida y datos necesarios para crédito/documento/entrega. |
| `CheckoutPanel` | 0..1 | Pagos, documento elegido, entrega y confirmación. |
| `DeliveryPanel` | 0..1 | Pedido/entrega programada; siempre `PROPOSED` hasta contrato aprobado. |
| Modal crítico | 0..1 | PIN, confirmación, error crítico o acción irreversible. |

## Jerarquía de acciones

- **Primarias:** agregar al carrito, cobrar, confirmar venta.
- **Secundarias:** cliente, descuento, suspender, crear pedido.
- **Contextuales:** historial, conciliación, reimpresión, configuración y supervisor.
- **Peligrosas:** reiniciar, anular, devolver, cerrar turno; siempre requieren confirmación y permiso.

## Restricciones

- `ProductCatalog` no debe contener la lógica de pagos.
- `CartPanel` no debe inventar precio, stock ni autorización; usa datos/reglas del contrato.
- `CheckoutPanel` no aparece sin al menos una línea, salvo una vista informativa sin capacidad de confirmar.
- Los paneles no se duplican por rol ni viewport; se reordenan mediante layout responsive.
