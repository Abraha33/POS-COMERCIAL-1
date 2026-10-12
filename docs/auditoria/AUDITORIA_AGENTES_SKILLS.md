# Auditoría de agentes y skills

## 1. Agentes (medido en los registros de la sesión)

15 lanzamientos (`Agent`): 14 `general-purpose` y 1 `Explore`. Fases:

| Fase | Agentes | Archivos propios | Resultado |
|---|---|---|---|
| Carriles de pantallas | A POS, B productos/inventario, C compras, D clientes/cartera, E1 reportes, E2 administración | `features/<módulo>` y su test, sin cruces | 6 de 6 fusionados; sin conflictos de merge |
| QA transversal | F | `frontend/e2e`, `docs/qa` | fusionado; 85 pruebas, 9 `test.fail` |
| Contrato v0.5.0 | 1 | `contracts/`, `shared/`, `mocks/` | fusionado en `integration`; 247/247 tests |
| Rediseño | núcleo + 5 por módulo | `shared/ui`, `app/`; `features/<módulo>` | núcleo fusionado; **5 de 5 módulos sin fusionar** |

Hallazgos:
- **Archivos compartidos:** no hubo choques entre carriles (propiedad por carpeta funcionó) [C]. Sí hubo choque
  de `shared/`/`mocks/` entre contrato y núcleo de diseño (`SessionProvider`, `ScreenTemplate`) [C].
- **Investigación duplicada:** cada agente repitió instalación de dependencias, lectura de `CLAUDE.md` y de la
  documentación, y reconstruyó helpers de prueba (`vi.setConfig` de timeouts en 6 archivos) [C].
- **Peticiones repetidas:** 5 de 7 informes pidieron subir `testTimeout` global y 4 pidieron `useBranches` [C]:
  el coordinador tardó en resolverlo, y cada agente pagó el problema.
- **Resultados largos:** informes de 700 a 1 200 palabras, útiles pero costosos al reinsertarse [P].
- **Coordinador:** reinterpretó cada informe y redactó resúmenes para el usuario; no hay evidencia de que
  releyera el código de los agentes (3 `Read` en total) [C].
- **Concurrencia:** 5 a 7 agentes a la vez alcanzaron el límite de uso. **No hay evidencia de que más
  paralelismo diera más velocidad**: los commits de los 6 carriles se concentran entre 13:38 y 14:10, mientras que los 5
  rediseños no llegaron a fusionarse con un gasto mayor (≈ 49,6 M frente a ≈ 49 M de los 6 carriles) [C para los datos, P para la causalidad].

**Recomendación:** 2 a 3 agentes concurrentes. Un integrador (el coordinador) y como máximo dos agentes de
módulo con carpetas disjuntas. QA corre al final, no en paralelo con construcción.

## 2. Skills (inventario real)

- `~/.claude/skills` (30): `ponytail*` (6), `storybook-setup`, `web-perf`, y familias Cloudflare, Comfy, Sandbox,
  Streamlit. **Ninguna es de arquitectura frontend, PrimeReact, accesibilidad ni Playwright.**
- `~/.claude/plugins` instalados: `gitkraken-hooks`, `warp`. Los skills `frontend-design`, `design:*`,
  `engineering:*` figuraban como disponibles al planear [P], pero no aparecen en el listado actual de la sesión: **[N]**.
- Uso real: **0 llamadas a `Skill`** en la sesión principal.

| Necesidad | Skill disponible hoy | Costo de contexto | Veredicto |
|---|---|---|---|
| Auditoría de arquitectura | ninguno específico; `ponytail-audit` revisa sobreingeniería | bajo | usar `ponytail-audit` una vez sobre `frontend/src` |
| Reutilización PrimeReact | ninguno | — | crear skill propio |
| Plantillas funcionales | ninguno | — | crear `screen-builder` |
| Accesibilidad UX/UI | ninguno instalado (axe vía Playwright ya cubre lo automático) | — | crear `ux-audit` basado en `docs/qa` y axe |
| Playwright | ninguno (config propia ya existe) | — | script del repo, no skill |
| Pruebas | ninguno | — | `frontend-qa` propio con el comando único |
| Revisión y simplificación | `ponytail-review`, `ponytail` | bajo | útil antes de fusionar un carril |

No instalar skills de terceros indiscriminadamente: los de Cloudflare, Comfy y Sandbox no aplican a este proyecto
y solo añaden descripciones al contexto [P].

## 3. Skills propios recomendados (pequeños, con función verificable)

1. **`screen-builder`** — entrada: nombre del módulo, recurso del contrato, columnas, filtros, permiso. Salida:
   pantalla con `DataTablePage`/`FormDialog`, test Vitest base y entrada en `routes`. Verificable: `pnpm typecheck && pnpm test <módulo>`.
2. **`ux-audit`** — lista fija: touch ≥ 44 px, contraste AA, 3 anchos, teclado, estados vacío/error. Salida: tabla
   en `docs/qa/FINDINGS.md`. Verificable: axe + capturas.
3. **`frontend-qa`** — un único comando que corre typecheck, lint, tests del módulo y E2E de ese módulo y emite
   un resumen de ≤ 10 líneas. Verificable: código de salida.

Cada uno ≤ 60 líneas, con la regla "resultado en ≤ 15 líneas".

## No verificado

Costo de contexto real de cada skill (no hay medición), plugins de organización no instalados, y si los
skills de diseño mencionados al planear siguen disponibles.
