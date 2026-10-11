# Inventario de pantallas y auditoría

Auditoría del **estado real** (código + app ejecutada a 1280/768/375 px con axe; capturas y resultados en
`docs/qa/audit/`, reproducible con `node frontend/scripts/audit.mjs`). Fecha: 2026-10-11, commit base `b149659`.

Leyenda de **origen**: `REQ` requisito aprobado (reglas BR-XXX / mensajes del dueño) · `REC` recomendación mía ·
`SUP` supuesto a validar. Estado: completa / parcial / ausente / defectuosa.

## Hallazgos transversales (medidos)
| # | Hallazgo | Evidencia | Estado | Acción |
|---|---|---|---|---|
| T1 | **Desborde horizontal en tableta y teléfono en las 9 rutas** | `scrollWidth > innerWidth`; encabezado 1126 px y menú 1117 px a 375 px de ancho | defectuosa | Drawer/menú colapsable y encabezado responsivo (Fase 2.1) |
| T2 | **Contraste insuficiente (serious) en las 9 rutas** | Primario del tema `#3b82f6` con blanco = 3,67:1 (mín. 4,5); `Tag` verde `#22c55e` = 2,27:1 | defectuosa | Tokens de color accesibles que respetan `lara-light-blue` (Fase 2.1) |
| T3 | Solo 1 `@media` en toda la app; sin diseño táctil | `app-shell.css` | defectuosa | Tokens táctiles ≥44 px, densidad POS |
| T4 | Teclado: un solo atajo (`F2` en Productos); sin mapa de atajos ni foco gestionado | `useHotkey` solo en `ProductsPage` | parcial | `useHotkeys` + ayuda visible + foco en POS |
| T5 | Sin pantalla de login ni manejo de sesión expirada (401); rol simulado con selector | `SessionProvider` | ausente | Login + guard (Fase 2.3) |
| T6 | Sin selector empresa/sucursal; `branchId` fijo en la sesión simulada | `SessionProvider.buildSession` | ausente | Contexto empresa/sucursal (Fase 2.2) |
| T7 | Tablas sin paginación del servidor, filtros por columna ni acciones | `DataTablePage` | parcial | Ampliar `DataTablePage` (Fase 2.4) |
| T8 | Estados vacío/error genéricos; errores `ApiError.code` sin mapa a acciones | `StateBlock.tsx` | parcial | `shared/api/errors.ts` (Fase 2.5) |
| T9 | Sin flujos de escritura salvo productos y los hooks de POS/inventario sin UI | features | ausente | Agentes A–E |
| T10 | Ruido de duplicación bajo: 8 páginas son el mismo patrón de lista de 25–28 líneas | `features/*/*Page.tsx` | parcial | Consolidar en plantilla + acciones |

## Inventario por módulo
| Módulo | Pantalla / flujo | Objetivo del usuario | Funcionalidades actuales | Componentes | Estados | Dependencias | Estado actual | Mejora propuesta | Origen |
|---|---|---|---|---|---|---|---|---|---|
| POS | Venta rápida | Cobrar rápido con teclado/lector | — (solo lista de ventas) | `DataTablePage` | carga/vacío/error | `useCreateSale`, `useCurrentShift`, `computeTotals` | **ausente** (hay lista, no venta) | Pantalla completa de venta con líneas editables, pago mixto, PIN, cambio | REQ |
| POS | Apertura / cierre de caja | Abrir turno, registrar movimientos, cuadrar | — | — | — | `useOpenShift`, `useCloseShift`, `useAddShiftMovement` | ausente | Flujo de turno con diferencia y nota obligatoria | REQ |
| POS | Ventas suspendidas / devolución | Pausar una venta; devolver parcial | — | — | — | contrato v0.4.0 | ausente | `hold/resume`, `returns` | REC (PROPUESTA) |
| POS | Historial de ventas | Consultar/anular ventas | Lista simple | `DataTablePage` | carga/vacío/error | `useSales`, `useVoidSale` | parcial | Filtros, detalle, anulación con motivo | REQ |
| Productos | Lista + formulario | Mantener catálogo | Lista, alta, edición, IVA, `F2`, toast | `DataTable`, `Dialog`, `InputNumber` | carga/vacío/error, validación | `useProducts`, `useSaveProduct` | **parcial** (mejor pantalla) | Variantes, importación, desactivar, paginación, a11y de contraste | REQ/REC |
| Inventario | Existencias | Ver stock por sede/bodega | Lista de niveles | `DataTablePage` | carga/vacío/error | `useStockLevels` | parcial | Nombres de producto, mínimos, tránsito, filtros por sede | REQ |
| Inventario | Kardex / movimientos | Auditar entradas/salidas | — (hook existe) | — | — | `useStockMovements` | ausente | Tabla por producto/fecha | REC |
| Inventario | Traslados | Enviar y recibir entre sedes | — (hooks existen) | — | — | `useTransfers`, `useCreateTransfer`, `useReceiveTransfer` | ausente | Flujo de dos pasos con estado | REQ (BR-INV-03) |
| Inventario | Alertas / conteos / ajustes | Corregir stock negativo, contar, ajustar | — | — | — | `useInventoryAlerts`; conteos/ajustes sin contrato | ausente | Panel de alertas; conteos y ajustes | REQ (alertas) / REC |
| Compras | Órdenes de compra | Abastecer | Lista | `DataTablePage` | carga/vacío/error | `usePurchaseOrders` | parcial | Crear, enviar, recibir con costo promedio | REC (PROPUESTA) |
| Compras | Proveedores | Mantener proveedores | — | — | — | `useSuppliers` | ausente | CRUD | REC |
| Clientes | Lista / ficha | Gestionar clientes y cupo | Lista | `DataTablePage` | carga/vacío/error | `useCustomers` | parcial | Ficha con documento DIAN, cupo, saldo, mora | REQ (BR-CLI-07) |
| Cartera | Cuentas por cobrar | Cobrar y abonar | Lista | `DataTablePage` | carga/vacío/error | `useReceivables` | parcial | Abonos a la más antigua, estado de cuenta | REQ (BR-CLI-05) |
| Cartera | Cuentas por pagar | Programar pagos | Lista | `DataTablePage` | carga/vacío/error | `usePayables` | parcial | Pagos y programación | REC (PROPUESTA) |
| Reportes | Panel del propietario | Ver el negocio | 2 tarjetas (ventas, total) | `Card` | carga/vacío/error | `useSales` | parcial | Filtros fecha/sede, gráficos, caja, stock bajo, cartera | REC |
| Admin | Empleados | Gestionar personal | Lista | `DataTablePage` | carga/vacío/error | `useEmployees` | parcial | Usuarios, roles y permisos (matriz), empresas, sucursales | REC (PROPUESTA) |
| Transversal | Login / sesión | Entrar al sistema | Selector de rol simulado | `select` | — | `useLogin` | ausente | Pantalla de login, expiración | REQ (auth en contrato) |
| Transversal | Shell / navegación | Moverse por módulos | Menú lateral, selector de rol | `AppShell` | — | `SessionProvider` | **defectuosa** en < 900 px | Drawer responsivo, empresa/sucursal | REQ |

## Contratos faltantes para el backend (a definir en v0.4.0, como PROPUESTA)
Ventas suspendidas, devoluciones, bodegas, conteos, ajustes, variantes de producto, crear/enviar/recibir orden de compra,
alta/edición de proveedores y clientes, abonos y pagos, estado de cuenta, usuarios/roles/empresas/sucursales,
endpoints de reportes agregados, paginación/filtros en listados.

## Lo que no pude comprobar
Rendimiento con volúmenes reales, lector de códigos físico, impresión de tickets, comportamiento offline real, y dispositivos
táctiles reales (solo emulación de viewport).
