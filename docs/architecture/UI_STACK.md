# Stack de interfaz (decidido)

| Decisión | Valor | Quién la fija |
|---|---|---|
| Librería de componentes | **PrimeReact 10.9.9** (no 11 alpha) | dueño del proyecto |
| Tema | **`lara-light-blue`** (sin tema propio ni modo oscuro por ahora) | dueño del proyecto |
| Iconos | `primeicons` | — |
| Layout utilitario | `primeflex` | — |

## Reglas para los carriles
1. **No cambiar el tema ni la versión** de PrimeReact. Los cambios van por PR `core:` al integrador (el tema se importa en
   `frontend/src/main.tsx` y `.storybook/preview.tsx`).
2. **Usar componentes PrimeReact** antes de escribir HTML propio; si PrimeReact no tiene el componente, justificarlo en el PR.
3. Colores y espaciados con las variables del tema (`var(--primary-color)`, `var(--surface-card)`…) y utilidades de PrimeFlex;
   **sin colores hex sueltos**. Así un tema propio futuro se aplica sin reescribir pantallas.
4. **Accesibilidad:** el `Dropdown` de PrimeReact genera un `<select>` oculto sin nombre (axe lo marca crítico). Usar
   `<select>` nativo con `p-inputtext` o verificar el componente con axe antes de adoptarlo.
5. **Gráficos:** `Chart` requiere `chart.js` (no instalado). Se añade en el carril F6 con PR `core:` y `pnpm add chart.js`.
6. Objetivos táctiles de caja: botones y filas de al menos 44 px de alto en el POS.

## Fuera de alcance por ahora
Tema de marca, modo oscuro, internacionalización de componentes (`locale` de PrimeReact aún en inglés por defecto).
