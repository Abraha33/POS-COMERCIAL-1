# Plan de optimización (propuesta; no implementado)

## Comparación de estrategias

| Dimensión | Actual (carriles + maquetas después) | Propuesta (núcleo congelado + fábrica) |
|---|---|---|
| Diseño | llega tarde; rehace pantallas | guía visual congelada antes de construir |
| Pantalla | escrita a mano por agente | definición declarativa + plantilla; solo POS/caja a mano |
| Agentes | 5 a 7 simultáneos | 2 a 3, carpetas disjuntas |
| Contexto del coordinador | historial de 300 k a 590 k | sesión corta por fase, estado en archivos |
| Verificación | cada agente corre todo, varias veces | un comando por carril + `core:check` al integrar |
| Integración | `main` compartido con otra sesión | `integration` y fast-forward a `main` |

## Arquitectura propuesta

1. **Núcleo congelado:** tokens, 8 componentes compartidos (ya en `design/core`), shell, sesión, errores, reloj.
2. **Capa declarativa** `shared/screens`: `defineListScreen({ resource, columns, filters, actions, permission, form })`
   que usa `DataTablePage` y `FormDialog`. Aplica a productos, proveedores, clientes, empleados, órdenes,
   cuentas, traslados. El POS y la caja quedan como código propio.
3. **Contratos:** `openapi.yaml` v0.5.0 ya integrado; las pantallas leen derivados del servidor, no los calculan.
4. **Pruebas:** un test de humo por definición (renderiza, estados vacío/error, permiso) generado por la plantilla.

## Cantidad de agentes

- Coordinador (sesión corta por fase) + **2 agentes** de módulo como máximo.
- QA al final, un agente, sin construcción concurrente.

## Experimento pequeño y medible (antes de migrar)

Construir **dos pantallas equivalentes** por estrategias distintas, en worktrees separados, sesión nueva cada una:

- **A (actual):** agente `general-purpose` con brief libre: "Proveedores: lista, alta, edición".
- **B (propuesta):** agente con `defineListScreen` y el skill `screen-builder`: misma pantalla.

Repetir con otra pantalla simple (por ejemplo "Sedes"). Medir en ambas:

| Métrica | Cómo medirla |
|---|---|
| Tokens por pantalla aceptada | suma de `usage` del subagente (entrada nueva + escritura + lectura de caché) por separado |
| Tiempo por pantalla funcional | diferencia de commits de inicio y fin |
| Reutilización de componentes | `grep` de importaciones de `@/shared/ui` y líneas propias de CSS |
| Errores y retrabajo | número de ejecuciones de `typecheck`/`test` hasta verde y `test.fail` abiertos |
| Costo de coordinación | tokens del coordinador durante la tarea y longitud del informe |
| Resultados de pruebas | tests pasan, axe 0 serias, sin desborde a 375 px |

Criterio de decisión **fijado de antemano**: adoptar B si, a igual resultado de pruebas, usa menos tokens y menos
líneas propias en las dos pantallas. Con n = 2 es una señal, no una prueba estadística.

## Plan de implementación priorizado

| Prio | Acción | Esfuerzo | Depende de |
|---|---|---|---|
| P0 | Decidir destino de los cambios ajenos en `main` (otra sesión) y fusionar `integration` por fast-forward | bajo | usuario |
| P0 | Subir `testTimeout` y fijar `maxWorkers`; liberar puerto 5188 | bajo | — |
| P0 | Fusionar lo ya hecho en `ui-pos`, `ui-inv`, `ui-pur`, `ui-adm` (commits existentes) tras `typecheck` y tests | medio | P0 anterior |
| P1 | Correr el experimento A/B con 2 pantallas simples | medio | núcleo en `integration` |
| P1 | Crear `screen-builder`, `ux-audit`, `frontend-qa` (≤ 60 líneas cada uno) | bajo | — |
| P2 | Terminar `ui-led` (clientes y cartera) y consumir lo nuevo del contrato (ajustes, conteos, abonos con imputación, cancelar orden) | medio | P0 |
| P2 | Correr `core:check` completo sobre el código rediseñado | bajo | P0 |
| P3 | `defineListScreen` para las pantallas de lista restantes si el experimento favorece B | medio | experimento |

## Honestidad

Sin porcentajes: no hay línea base repetible, porque el coordinador y los agentes comparten contexto y el
registro de salida de subagentes no es confiable. No verificado: efecto real de bajar de 6 a 3 agentes y de
las sesiones cortas sobre tokens; solo el experimento puede mostrarlo.
