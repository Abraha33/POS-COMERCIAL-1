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

## 3. Pagos — canales explícitos por paquete de país

> Corrige la primera versión de este ADR («enum cerrado de 9 canales»): con varios países el catálogo no puede ser
> global. Lo que sigue vigente es la regla del dueño: **ningún medio distinto se esconde dentro de otro**.

- El contrato define tipos genéricos de medio (`cash`, `wallet`, `bank_transfer`, `instant_key`, `card_terminal`,
  `gateway`, `credit`). `PaymentMethod` (aprobado) se conserva como clasificación contable derivada.
- `Payment.channel` es un `channelId` que **referencia el catálogo del paquete de país** (conjunto abierto validado
  contra el catálogo, no un enum global). Cambio `proposed`.
- Paquete **CO** (los 9 canales de la UI actual), cada uno explícito:

| `channelId` | Etiqueta (es-CO) | Tipo | `method` derivado | Exige comprobante |
|---|---|---|---|---|
| `efectivo` | Efectivo | cash | efectivo | no |
| `nequi` | Nequi | wallet | nequi | sí |
| `daviplata` | DaviPlata | wallet | daviplata | sí |
| `bancolombia` | Bancolombia | bank_transfer | transferencia | sí |
| `otros-bancos` | Otros bancos | bank_transfer | transferencia | sí |
| `bre-b` | Bre-B | instant_key | transferencia | sí |
| `datafono` | Tarjeta / datáfono | card_terminal | tarjeta | no (voucher) |
| `credito` | Crédito | credit | credito | no |
| `pse` | PSE / pasarela | gateway | transferencia | sí |

- Los reportes agrupan por `channelId`; `method` queda para la contabilidad.

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

## 7. Decisiones

**Confirmadas por el dueño (2026-10-12)**
- Caja/terminal: recurso `GET /pos/registers` de solo lectura → `x-approval: approved`.
- `SaleCreate.documentType`: obligatorio, con valor por defecto del paquete de país o la empresa (nunca bloquea).
- Principio de pruebas: ningún flujo puede quedar bloqueado por una precondición que la UI no pueda crear
  (p. ej. cierre de caja sin base). Ver §9.
- Idiomas objetivo iniciales: **español, inglés, hindi, francés, ruso** (ver §8).

**Propuestas pendientes de OK**
1. Mecanismo de aprobación canónico `Approval` (modos `pin` y `request`; se elimina `/pos/authorizations`; vocabulario
   de máquina neutro en inglés técnico): `discount`, `negative_stock`, `below_cost`, `credit_exception`, `price_override`,
   `void_sale`, `return`, `cash_difference_opening`, `cash_difference_closing`, `shift_handover`, `cash_movement`,
   `other`; estados `pending|approved|rejected|expired|cancelled|executed`.
2. Tres capas: código de máquina (sin idioma) · idioma/locale · paquete de país.
3. Dependencia nueva **FormatJS (`react-intl`)** para ICU MessageFormat.

## 8. Idiomas y personalización por país

| Idioma | Locale inicial | Escritura | Notas que el diseño debe cubrir |
|---|---|---|---|
| Español | `es-CO` | LTR, latina | Base actual; mensajes del mock están en español |
| Inglés | `en` | LTR, latina | Primer idioma de validación de la tubería |
| Francés | `fr` | LTR, latina | Textos ~20–30 % más largos; espacio antes de `:` `;` `?`; separador decimal coma |
| Ruso | `ru` | LTR, cirílica | **3 formas de plural**; textos largos; fuente con cirílico |
| Hindi | `hi-IN` | LTR, devanagari | Fuente con devanagari; agrupación de miles india (lakh/crore); sin mayúsculas |

- **Ninguno de los cinco es RTL.** La infraestructura se diseña igualmente para `dir` (CSS lógico en código nuevo) para no
  cerrar la puerta a árabe/hebreo, pero no se prueba RTL en esta fase.
- Idioma ≠ país: `fr` puede ser Francia, Bélgica, Senegal…; `en` es muchos países. La moneda, canales, impuestos y
  documentos vienen del **paquete de país**, no del idioma.
- Datos que dependen del país (paquete): canales de pago, moneda y decimales, redondeo, impuestos, documentos de identidad
  y fiscales, formatos de dirección y teléfono, textos legales, unidades.
- Contrato: `Session`/`Company` incorporan `countryCode`, `locale`, `currency`, `direction`; los errores devuelven
  `code` + `params` (el cliente traduce); el dinero se expresa en la unidad menor de la moneda con exponente del país.
- Infra pendiente (paso 3): catálogos por idioma, `Intl` para formatos, locale de PrimeReact por idioma, `html lang/dir`,
  fuentes con cobertura cirílico/devanagari, pseudo-locale para detectar texto fijo.

## 9. «Todos los flujos, en todos los estados»
- Una regla de negocio se valida **y siempre tiene salida desde la UI** (cierre sin base: se permite base 0 con motivo).
- Panel de escenarios (solo DEV) para precargar estados: caja sin base, con diferencia, ocupada, sin conexión, crédito sin
  cupo, etc.
- Matriz flujo × estado en Playwright; cada celda debe poder completarse.
