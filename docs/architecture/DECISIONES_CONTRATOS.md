# Decisiones de contratos (congeladas 2026-10-12)

Origen: informe `docs/qa/AUDITORIA_CONTRATOS.md` y decisiones del dueño del producto. Orden de trabajo obligatorio:
**contrato → adapter → UI.** No se agregan endpoints fuera de `contracts/openapi.yaml`.

## 0. Estado de una operación (estricto)

Dos ejes independientes, ambos declarados en cada operación del OpenAPI y verificados por `openapi.test.ts`:

| Eje | Valores | Significado |
|---|---|---|
| `x-approval` | `approved` · `proposed` | ¿La regla de negocio está aprobada por el dueño? |
| `x-status` | `simulated` · `real` | ¿Quién responde? `simulated` = mock MSW. `real` = backend verificado por conformidad (hoy ninguno) |

Reglas:
1. Una operación `proposed` **nunca** puede ser `real`.
2. **No se construye funcionalidad productiva sobre `proposed`.** La UI puede consumirla solo como *simulación visible*
   (insignia «PROPUESTA»/«Simulado»), no cuenta como terminada y no se presenta como real.
3. `simulated` no es "hecho": significa que existe un mock, nada más.
4. Hoy: 25 operaciones `approved`, 36 `proposed`, 61 `simulated`, 0 `real`.

## 1. Turnos — un único modelo: `Shift` del contrato

- `Shift` (`POST/GET /pos/shifts…`, aprobado) es la única fuente de verdad del turno.
- `ShiftRecord` (`features/pos-ops`) pasa a **adapter temporal**: `ShiftRecord = Shift + estado de interfaz`
  (`paused`, revisión de cierre, incidencias, bitácora local). No almacena estado propio del turno y se elimina cuando
  esos datos tengan contrato.
- `pos-access` (`CashRegister`, `Terminal`, `CashierSession`) **no define turno**: solo referencia `Shift`.
- Los estados `pausado`/`finalizando` no son estados del turno del servidor: son estado de interfaz hasta que el dueño
  apruebe ampliarlos.
- `startSimulatedShift` se retira como creador de turnos locales.

## 2. Aprobaciones — un solo mecanismo y un solo vocabulario

- Se mantiene **un** recurso de aprobación. No coexisten `/auth/supervisor-approvals` y `/pos/authorizations`.
- Recomendación (pendiente de confirmar, ver §7): el canónico parte del mecanismo **aprobado**
  (`/auth/supervisor-approvals`, BR-VEN-04/05/14) y adopta como vocabulario el que ya está aprobado
  (`discount`, `negative_stock`, `below_cost`, `credit_exception`); lo que hoy solo existe en la variante propuesta
  (solicitud asíncrona, relevo, anulación, vencimiento) entra como **extensión `proposed`** del mismo recurso, no como
  segundo recurso.
- Hasta que se resuelva, `/pos/authorizations` queda congelado: sin ampliaciones.

## 3. Pagos — nueve canales explícitos

El contrato declara un catálogo cerrado `PaymentChannel` con los nueve canales que usa la UI; ninguno se oculta dentro
de otro. `PaymentMethod` (aprobado) se conserva como clasificación contable **derivada** del canal.

| `channel` | Etiqueta | `method` derivado | Exige comprobante |
|---|---|---|---|
| `efectivo` | Efectivo | efectivo | no |
| `nequi` | Nequi | nequi | sí |
| `daviplata` | DaviPlata | daviplata | sí |
| `bancolombia` | Bancolombia | transferencia | sí |
| `otros-bancos` | Otros bancos | transferencia | sí |
| `bre-b` | Bre-B | transferencia | sí |
| `datafono` | Tarjeta / datáfono | tarjeta | no (voucher) |
| `credito` | Crédito | credito | no |
| `pse` | PSE / pasarela | transferencia | sí |

- `Payment.channel` pasa de `string` libre a este enum (cambio **`proposed`**, v0.7.0).
- Los reportes agrupan por `channel`; `method` queda para la contabilidad.
- El catálogo configurable (cuentas destino, campos exigidos) es dato de referencia **`proposed`**; mientras no exista,
  los 9 canales son la lista contractual fija.

## 4. Comprobantes — cuatro cosas separadas

| Concepto | Qué es | Contrato | Estado hoy | Puede decirse «fiscal» |
|---|---|---|---|---|
| **Recibo operativo** | Constancia interna de la venta (`SaleReceipt`) | `SaleReceipt` | simulado | **No**, nunca |
| **Documento fiscal** | Factura electrónica / documento equivalente POS | **sin contrato** (reservado) | no existe | Solo con backend + DIAN verificados |
| **Evidencia** (`proofId`) | Foto/archivo del pago; prueba, no confirmación | `PaymentProof` (`proposed`) | relay DEV | No aplica |
| **Impresión** | Salida física/PDF del recibo o documento | **sin contrato** (reservado) | `reprints.ts` local | Solo con hardware verificado |

- Elegir tipo de documento en el POS es **selección**, no emisión.
- Ningún texto de interfaz puede decir "factura emitida", "fiscal" o "impreso" sin backend/hardware verificado; usar
  «Recibo operativo (simulado)».
- El bloque `document` de la venta, cuando exista, es opaco y lo completa el backend; el frontend no inventa campos DIAN.

## 5. Backend: contrato y adapter antes que UI

Para cada cambio: (1) OpenAPI + Zod + `contract-types` + ejemplo; (2) handler MSW + conformidad; (3) adapter en
`shared/api`; (4) recién entonces la UI. Una UI que necesite algo sin contrato **se detiene y pide el contrato**.

## 6. Hecho en este paso
- `x-approval: approved` explícito en las 25 operaciones aprobadas (antes era implícito por ausencia).
- Tres gates en `openapi.test.ts`: toda operación declara `x-approval` y `x-status`; ninguna `proposed` es `real`.
- Sin cambios de UI, mocks ni esquemas.

## 7. Decisiones que siguen abiertas (necesito confirmación antes de tocar contratos)
1. **Mecanismo de aprobación canónico**: ¿`/auth/supervisor-approvals` extendido (recomendado) o `/pos/authorizations`
   promovido? En ambos casos se elimina el otro.
2. **Idioma del vocabulario de máquina**: recomendado conservar el ya aprobado (`open/closed`, `discount`…) y dejar el
   español para etiquetas de UI; el vocabulario español de `pos-ops` se renombra al aprobado.
3. **`SaleCreate.documentType`**: ¿opcional con valor por defecto, u obligatorio?
4. **Caja/terminal**: ¿se aprueba un recurso `register` de solo lectura para que `pos-access` deje de usar escenarios?
