# POS — contratos de componentes

| Componente | Responsabilidad | Datos/estados clave |
|---|---|---|
| `PosHeader` | Contexto operativo y navegación de nivel POS. | sesión, sede, caja, turno, conexión, contadores. |
| `ProductSearch` | Encontrar producto sin modificar la venta. | consulta, estrategia, resultados, loading, vacío, error. |
| `ProductCatalog` | Mostrar resultados y agregar producto. | producto, stock, precio presentado, frecuencia, filtros. |
| `ProductDetailPanel` | Resolver presentación/atributos/cantidad antes de agregar. | 0..1 producto activo; presentación y stock. |
| `CartLine` | Editar una línea del carrito. | cantidad, descuento, precio mostrado, disponibilidad, error por línea. |
| `CartPanel` | Componer líneas, cliente, resumen y acciones. | 0..n líneas; una venta confirmable requiere >=1. |
| `CustomerSelector` | Buscar/crear/seleccionar cliente. | selección 0..1; crédito/entrega condicionan obligatoriedad. |
| `PaymentDialog` | Capturar 1..n pagos y validar cobertura. | canal, método derivado, referencia, destino, evidencia, error. |
| `SupervisorPinDialog` | Obtener autorización de corta vigencia. | acción, motivo, PIN; nunca expone token. |
| `ReceiptView` | Mostrar recibo operativo y reimpresión simulada. | venta confirmada; no etiqueta fiscal. |
| `OrderIndicator` | Mostrar semáforo de pedidos. | pendientes, proceso, faltantes, listos; no sustituye tablero. |

## Reglas comunes

- Los componentes reciben datos tipados desde adapters/hooks; no importan handlers MSW ni inventan endpoints.
- Los textos pasan por i18n; los códigos de backend no se muestran como texto final.
- Estados loading, vacío, error y disabled son parte del contrato, no casos excepcionales.
- Componentes de negocio no deben depender de posición física: la plantilla decide la región.
