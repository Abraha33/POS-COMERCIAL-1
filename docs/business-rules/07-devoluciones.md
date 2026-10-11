# Devoluciones, compras, cartera y administración (v0.4.0)

> Estado: **PROPUESTA — pendiente de aprobación del dueño.** Implementadas en mocks y marcadas
> `x-approval: proposed` en `contracts/openapi.yaml`.

## Devoluciones de venta
| ID | Regla |
|----|-------|
| BR-DEV-01 | Devolución **parcial** por línea; la cantidad devuelta acumulada no supera lo vendido (`RETURN_EXCEEDS_SOLD`, 409). |
| BR-DEV-02 | Exige `reason`. La venta no puede estar anulada. |
| BR-DEV-03 | Reingresa stock a la sede de la venta (movimiento `entrada`, referencia `DEV-xxxx`). |
| BR-DEV-04 | El valor devuelto es el precio de línea menos el descuento proporcional a la cantidad devuelta. |
| BR-DEV-05 | Si el turno de la venta sigue abierto, el efectivo devuelto (hasta el efectivo cobrado) sale de la caja esperada. |
| BR-DEV-06 | Ventas a crédito: pendiente (¿reduce la cuenta por cobrar?). **SUP** |

## Compras
| ID | Regla |
|----|-------|
| BR-COM-01 | Orden: `borrador` → `enviada` → `recibida`. Solo comprador/admin/propietario crean y envían; también bodeguero recibe. |
| BR-COM-02 | Recibir suma stock en la sede del usuario y **recalcula el costo promedio ponderado** (BR-PRO-06). |
| BR-COM-03 | Recibir abre una cuenta por pagar por el total, con vencimiento a `paymentTermsDays` del proveedor. |
| BR-COM-04 | Recepción parcial: no soportada (todo o nada). **SUP** |

## Cartera
| ID | Regla |
|----|-------|
| BR-CAR-01 | Abonos y pagos se aplican a la factura indicada; no pueden superar el saldo (`PAYMENT_EXCEEDS_BALANCE`). |
| BR-CAR-02 | Medios: efectivo, tarjeta, transferencia, Nequi, Daviplata (no crédito). |
| BR-CAR-03 | Un abono en efectivo no afecta el turno de caja (**SUP**: ¿debería?). |

## Administración
| ID | Regla |
|----|-------|
| BR-ADM-01 | Solo `admin` y `propietario` crean/editan empleados. |
| BR-ADM-02 | El empleado pertenece a una sede existente; el rol define permisos (matriz en `frontend/src/app/config/permissions.ts`). |
| BR-ADM-03 | Proveedor: documento único (`SUPPLIER_DUPLICATED`). Cliente: tipo+documento único (`CUSTOMER_DUPLICATED`). |
