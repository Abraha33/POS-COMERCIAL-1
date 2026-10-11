# Caja y turnos

> Estado: **APROBADA** (ver `00-convenciones.md`).

| ID | Regla |
|----|-------|
| BR-CAJ-01 | Una caja (`register`) tiene como máximo **un turno abierto** (`SHIFT_ALREADY_OPEN`, 409). |
| BR-CAJ-02 | Abrir turno requiere `openingCash ≥ 0` (base inicial) y permiso `pos.sell`. |
| BR-CAJ-03 | El turno pertenece al cajero que lo abre; otro usuario no vende en él salvo permiso de supervisor. |
| BR-CAJ-04 | `expectedCash = openingCash + ventas en efectivo (netas de cambio) − anulaciones en efectivo + ingresos − egresos`. |
| BR-CAJ-05 | Cerrar turno exige `countedCash`; `difference = countedCash − expectedCash`. |
| BR-CAJ-06 | **Descuadre permitido: $0.** Cualquier diferencia (sobrante o faltante) exige `note` de justificación (`CASH_NOTE_REQUIRED`, 422). La diferencia se registra, no se corrige. |
| BR-CAJ-07 | Un turno cerrado es inmutable. |
| BR-CAJ-08 | Cerrar turno con ventas offline sin sincronizar se bloquea. |
| BR-CAJ-09 | **Movimientos de caja:** `ingreso` (`base`, `sencillo`) y `egreso` (`pago_proveedor`, `transporte`, `sangria`, `otro`). Toda salida es tipificada y afecta el efectivo esperado. |

Errores: `SHIFT_ALREADY_OPEN`, `SHIFT_NOT_OPEN`, `SHIFT_CLOSED`, `CASH_COUNT_REQUIRED`, `CASH_NOTE_REQUIRED`.
