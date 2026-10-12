# Estabilización del frontend ERP/POS — Fase 1

Rama de trabajo: `integration` (worktree `D:\POS-COMERCIAL-WORKTREES\integration`). `main` no se tocó.
Todas las cifras de este informe son mediciones de esta sesión, salvo donde se indica.

## 1. Estado de las ramas (verificado con `git`)

| Rama | Relación con `integration` |
|---|---|
| `integration` | 19 commits por delante de `main`, 0 por detrás: **fast-forward posible** |
| `design/core`, `contract/v0.5.0`, `qa/ux` | integradas |
| `ui/pos`, `ui/inv`, `ui/pur`, `ui/adm`, `ui/led` | integradas (todas con commit propio) |
| `feat/*` (carriles originales) | ya estaban en `main` |
| `be/*` | sin trabajo propio (en `9cfc2a6`) |

`main` (`d93ac4c`) no contiene el contrato v0.5.0, el rediseño ni la estabilización.
El árbol de `main` tiene **110 cambios sin commitear ajenos** (otra sesión): `AppShell`, `routes`, `main.tsx`,
`SessionProvider`, `openapi.yaml`, `vite.config.ts`, `features/auth`, `features/tracking`, `dashboard/`, `backend/`.
No se tocaron. Antes de fast-forward, esa sesión debe commitearlos o moverlos: git rechazaría sobrescribirlos.

## 2. Módulos

| Módulo | Estado |
|---|---|
| POS (venta, caja, suspendidas, historial, devolución, anulación) | consolidado, rediseñado |
| Productos e inventario | consolidado, rediseñado |
| Compras y proveedores | consolidado, rediseñado |
| Clientes, cuentas por cobrar y por pagar | consolidado, rediseñado |
| Reportes y administración | consolidado, rediseñado |
| Inicio y login con PIN (núcleo de diseño) | consolidado |

Pendiente (no es de esta fase): consumir en la UI lo nuevo del contrato v0.5.0 (ajustes/conteos, abonos con
imputación, cancelar orden, reportes agregados, `company`), arqueo por denominación, contrato de acceso por PIN.

## 3. Resultados de verificación (en `integration`, máquina ociosa)

| # | Verificación | Resultado | Duración |
|---|---|---|---|
| 1 | `pnpm typecheck` | sin errores | 13,6 s |
| 2 | `pnpm lint` | sin errores | 5,6 s |
| 3 | `vitest` completo, workers por defecto | **21 archivos, 270/270** | 56 s |
| 3b | `vitest` con `--maxWorkers=4` | 21 archivos, 270/270 | 64 s |
| 4 | `pnpm conformance` | 36/36 | 6,6 s |
| 5 | `pnpm build` (tsc + vite) | correcto | 14,6 s |
| 6 | Playwright completo, 1 worker (`DEV_PORT=5231`) | **85 pasan, 0 omitidas, 0 fallan** | 3,9 min |
| 7 | `pnpm core:check` (8 gates, incluye `storybook build`) | **CORE READY, 8/8** (con `DEV_PORT=5231`) | 4,4 min |

Desglose de Playwright: smoke 3, recorridos 10, axe por ruta 30 (10 rutas × 3 anchos), estados 34, errores 8.
`core:check` con el puerto por defecto (5188) falla en los gates 1 y 7 porque un proceso ajeno (pid 21572) lo ocupa; con `DEV_PORT=5231` pasa 8/8.

## 4. Inestabilidad: timeouts y puerto 5188

- **Timeouts de Vitest — causa: saturación del entorno, no fallos del código.** Con agentes y servidores
  concurrentes fallaban 6 tests por timeout (medido antes en `integration`); con la máquina ociosa la misma suite
  pasa 270/270 con workers por defecto y con 4. No se subió ningún timeout (`testTimeout: 20_000` ya existía).
  La máquina tiene 8 núcleos; 19 jsdom en paralelo bajo carga agotaban los 20 s.
- **Puerto 5188:** estaba ocupado por un servidor ajeno (proceso `node vite` de otra sesión) durante `core:check`.
  Esta vez estuvo libre y Playwright arrancó su propio servidor. `reuseExistingServer: false` lo hace fallar
  cuando alguien lo ocupa: es la causa, no un defecto del código.

## 5. Errores corregidos (todos mínimos; sin cambiar la experiencia visual)

| Archivo | Cambio | Naturaleza |
|---|---|---|
| `src/shared/ui/components.css` | quitado `opacity` del contador de `SegmentedTabs` | **bug real**: contraste AA en compras, clientes, cartera y pagos |
| `src/shared/ui/MiniBars.tsx` | tabla accesible dentro de `div.sr-only` | **bug real**: desborde horizontal de `/reports` (1437 px a 1280) |
| `src/features/purchases/purchases.css` | `.purch__proposal` usa `--app-text-muted` | **bug real**: contraste AA |
| `src/tests/app.test.tsx` | acota el formulario al diálogo | deriva de test (etiqueta repetida) |
| `e2e/helpers.ts`, `journeys`, `states` | textos y flujo nuevo de cobro (diálogo "Cobrar venta" → "Confirmar pago"), "Apertura de caja", "Venta completada", cantidad como `input`, etiquetas por nombre | deriva de test tras el rediseño; la funcionalidad existe |
| `e2e/a11y-routes.spec.ts` | eliminado `KNOWN_FAILURES`: F-01, F-05, F-06 ya no se reproducen | hallazgos resueltos por el rediseño |
| `e2e/states.spec.ts` | F-02 y F-04 resueltos; bodeguero ve `/purchases` (BR-COM-01, contrato v0.5.0) | hallazgos resueltos / permiso nuevo |

Además `vite.config.ts` **no** se modificó.

## 6. Errores pendientes

| Gravedad | Pendiente |
|---|---|
| — | **F-03 resuelto y verificado**: la prueba se reescribió al nuevo flujo y pasa (el error de cupo se explica en el diálogo, sin código técnico) |
| Media | `main` no contiene nada de esto; depende de resolver los cambios ajenos |
| Baja | PIN de login: el contrato solo tiene usuario/contraseña; en mocks solo funciona esa pestaña |
| Baja | hallazgos F-07 (sede por id en reportes), F-12 (404 de turno), F-13 (encabezado a 375), F-15 (`InputNumber` con dictado) no re-verificados |
| Baja | PROPUESTAS sin aprobación del dueño (BR-DEV, BR-COM, BR-CAR, BR-ADM, ajustes, conteos, reportes) |

## 7. Riesgos y bloqueos

1. **Integración a `main` bloqueada por cambios ajenos sin commitear.** No es un conflicto de código: son los mismos archivos
   (`AppShell`, `routes`, `SessionProvider`, `main.tsx`) que `integration` también modificó. Requiere decisión humana.
2. **Cobertura E2E depende de textos**: dos rondas de deriva tras el rediseño; conviene `data-testid` estables.
3. **No verificado en absoluto:** backend real, DIAN, concurrencia, offline real, rendimiento con volumen, hardware
   (lector e impresora solo emulados), lectores de pantalla reales, navegadores distintos de Chromium.

## 8. Recomendación

El frontend **está listo para la fase 2 desde el punto de vista técnico**: compila, 270/270 unitarias, 36/36
conformidad, 84/84 E2E ejecutadas y 0 violaciones axe serias en las 10 rutas × 3 anchos.
Única condición abierta: decidir qué hacer con los cambios ajenos de `main` y hacer fast-forward de `integration`
(esta fase tiene prohibido fusionar a `main`). `core:check` pasa 8/8 y F-03 está verificado.
