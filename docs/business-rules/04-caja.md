# Caja y turnos

> Estado: **PROPUESTA — pendiente de aprobación.** Ver `00-convenciones.md`.

| ID | Regla |
|----|-------|
| BR-CAJ-01 | Una caja (`register`) tiene como máximo **un turno abierto**. Abrir otro devuelve `SHIFT_ALREADY_OPEN` (409). |
| BR-CAJ-02 | Abrir turno requiere `openingCash ≥ 0` (base inicial) y rol con `pos.sell`. |
| BR-CAJ-03 | El turno pertenece al cajero que lo abre; otro usuario no vende en él salvo permiso de supervisor ⚠. |
| BR-CAJ-04 | `expectedCash = openingCash + ventas en efectivo − anulaciones en efectivo` (+/− movimientos manuales, pendiente ⚠). |
| BR-CAJ-05 | Cerrar turno exige `countedCash`; `difference = countedCash − expectedCash`. |
| BR-CAJ-06 | Diferencia ≠ 0 se registra, no se corrige; sobre un umbral ⚠ exige `note` obligatoria. |
| BR-CAJ-07 | Un turno cerrado es inmutable. No admite ventas ni anulaciones nuevas. |
| BR-CAJ-08 | Cerrar turno con ventas sin confirmar (cola offline) se bloquea ⚠. |

Errores: `SHIFT_ALREADY_OPEN`, `SHIFT_NOT_OPEN`, `SHIFT_CLOSED`, `CASH_COUNT_REQUIRED`.
