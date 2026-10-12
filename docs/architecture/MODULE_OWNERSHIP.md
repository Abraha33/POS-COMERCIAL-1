# Propiedad de módulos

Cada agente trabaja **solo** dentro de su carpeta `frontend/src/features/<módulo>/` y de su archivo de handlers
en `frontend/src/mocks/handlers/`. Todo lo demás es del integrador.

| Agente | Módulos | Carpetas | Pantalla ancla |
|--------|---------|----------|----------------|
| 1 | `pos` | `frontend/src/features/pos` | `/pos` |
| 2 | `products`, `inventory` | `frontend/src/features/products`, `frontend/src/features/inventory` | `/products`, `/inventory` |
| 3 | `purchases` | `frontend/src/features/purchases` | `/purchases` |
| 4 | `customers`, `receivables`, `payables` | `frontend/src/features/customers`, `receivables`, `payables` | `/customers`, `/receivables`, `/payables` |
| 5 | `administration` | `frontend/src/features/administration` | `/administration` |
| 6 | `reports` | `frontend/src/features/reports` | `/reports` |
| Integrador | núcleo | `frontend/src/app`, `frontend/src/shared`, `frontend/src/routes`, `frontend/src/mocks/{seed,db}.ts`, `frontend/src/tests`, `contracts/`, `docs/`, configuración | — |

## Qué NO puede tocar un agente
- `frontend/src/shared/**`, `frontend/src/app/**`, `frontend/src/routes/**`, `frontend/src/mocks/seed.ts`, `frontend/package.json`, configs, `contracts/`.
- Otras features. ESLint lo bloquea (`pnpm lint`): una feature no importa de otra; comparte vía `frontend/src/shared`.

## Cómo pedir un cambio al núcleo
Abrir PR pequeño a `integration` con el prefijo `core:` y describir el contrato o componente necesario.
El integrador lo revisa antes de que otros agentes dependan de él.

## Referencia
El slice `frontend/src/features/products` es la plantilla: ruta → hook → plantilla de tabla → formulario → mutación → toast → test.

## Mocks por carril (frontend)
Cada agente edita **solo su archivo de handlers** en `frontend/src/mocks/handlers/` y mantiene `contracts/openapi.yaml`
coherente vía PR `contract:`:

| Archivo | Carril |
|---|---|
| `auth.ts` | integrador |
| `sales.ts`, `shifts.ts` | F1 `pos` |
| `products.ts`, `inventory.ts` | F2 |
| `readonly.ts` | F3–F6 (lo dividen al implementar escrituras) |

## Carriles del backend
Definidos en `docs/architecture/PARALLEL_WORKPLAN.md` (B0–B5). El backend vive en `backend/` y se valida con
`pnpm conformance`; no modifica `contracts/` ni `frontend/` salvo PR `contract:`.

## Subáreas del POS (vigente desde 2026-10-12)

El módulo `pos` tiene varios equipos. Cada subárea tiene un dueño exclusivo: nadie más edita sus archivos sin
pasar por ese dueño o por el integrador.

| Subárea | Dueño exclusivo | Archivos |
|---|---|---|
| Carrito y contexto de venta (`SaleDraft`) | Carrito | `frontend/src/features/pos/sale-draft/**` |
| Cobro, mixtos, crédito e intentos (`PaymentSession`) | Cobro | `frontend/src/features/pos/payment-session/**`, `frontend/src/features/pos/mixed/**` |
| Comprobantes, reimpresión y recibo | Comprobantes | `frontend/src/features/pos/proofs/**`, `frontend/src/features/pos/reprints.ts`, `frontend/src/features/pos/SaleDetailDialog.tsx`, `frontend/src/mocks/proofStore*.ts`, `frontend/src/mocks/handlers/paymentProofs.ts` |
| Composición de pantalla de venta | Integrador POS | `frontend/src/features/pos/QuickSale.tsx`, `frontend/src/features/pos/PosPage.tsx` |
| Contratos, Zod, MSW y fixtures | Integrador de contratos | `contracts/**`, `frontend/src/shared/contracts/**`, `frontend/src/shared/api/**`, `frontend/src/mocks/handlers/**` (salvo lo de Comprobantes) |
| Conformidad, E2E y regresión | QA | `frontend/e2e/**`, `frontend/src/conformance/**`, `docs/qa/**` |

### Reglas de la subárea
- `QuickSale.tsx` y `PosPage.tsx` solo orquestan la UI: el negocio vive en `sale-draft`, `payment-session` y `proofs`.
- Los canales y los documentos vienen del **CountryPack** (`usePosChannels`, `channelsFromCountryPack`, `useCountryPack`). No
  se agregan listas locales de medios de pago ni de documentos.
- Un pago **UNKNOWN** no es aprobado: conserva la misma `clientOperationId` y bloquea otra venta equivalente.
- Una evidencia o foto **no confirma** el pago: queda pendiente de verificación o excepción autorizada.
- Reimprimir registra una **COPIA** y no altera venta, caja ni inventario.
- Un cambio de contrato entra por PR `contract:` al integrador, con su Zod, su mock y su prueba de conformidad.

### Pendiente conocido de esta división
- Denominaciones de apertura de caja (`features/pos-access/scenarios.ts`) siguen siendo constantes locales; migrar a `useCountryPack`.
- Desborde horizontal a 375 px en `/pos` y tablas de datos (documentado en `TRASPASO.md`).
