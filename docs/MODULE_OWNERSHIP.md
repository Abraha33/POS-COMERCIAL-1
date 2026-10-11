# Propiedad de módulos

Cada agente trabaja **solo** dentro de su carpeta `src/features/<módulo>/` y de su archivo de handlers
en `src/mocks/handlers/`. Todo lo demás es del integrador.

| Agente | Módulos | Carpetas | Pantalla ancla |
|--------|---------|----------|----------------|
| 1 | `pos` | `src/features/pos` | `/pos` |
| 2 | `products`, `inventory` | `src/features/products`, `src/features/inventory` | `/products`, `/inventory` |
| 3 | `purchases` | `src/features/purchases` | `/purchases` |
| 4 | `customers`, `receivables`, `payables` | `src/features/customers`, `receivables`, `payables` | `/customers`, `/receivables`, `/payables` |
| 5 | `administration` | `src/features/administration` | `/administration` |
| 6 | `reports` | `src/features/reports` | `/reports` |
| Integrador | núcleo | `src/app`, `src/shared`, `src/routes`, `src/mocks/{seed,db}.ts`, `src/tests`, `docs`, configuración | — |

## Qué NO puede tocar un agente
- `src/shared/**`, `src/app/**`, `src/routes/**`, `src/mocks/seed.ts`, `package.json`, configs.
- Otras features. ESLint lo bloquea (`pnpm lint`): una feature no importa de otra; comparte vía `src/shared`.

## Cómo pedir un cambio al núcleo
Abrir PR pequeño a `integration` con el prefijo `core:` y describir el contrato o componente necesario.
El integrador lo revisa antes de que otros agentes dependan de él.

## Referencia
El slice `src/features/products` es la plantilla: ruta → hook → plantilla de tabla → formulario → mutación → toast → test.
