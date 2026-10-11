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
