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

## Sistema de diseño (fase 1 del rediseño)
Fuente única: `frontend/src/shared/ui/tokens.css` (colores, radios, sombras, tipografía) y `components.css` (estilos de
componentes compartidos, solo con variables). Referencia visual: `docs/design/reference/ref-1..5.webp`.

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `--app-navy-900` | `#0b2545` | barra superior, menú lateral, fondo de login | blanco 15:1 |
| `--app-on-navy-muted` | `#cbd5e1` | texto secundario sobre navy | 9,6:1 |
| `--primary-color` | `#2563eb` | acción primaria, ítem activo | blanco 5,2:1 |
| `--app-charge` | `#15803d` | botón Cobrar (`.app-charge-button`) | blanco 5,0:1 |
| `--app-{success,warning,danger,info,neutral}-{bg,fg}` | tenue + oscuro | `StatusTag`, avisos | ≥ 6:1 por par |
| `--app-bg / --app-surface / --app-border / --app-text(-muted)` | superficies y texto | páginas y tarjetas | texto 7,5:1+ |
| `--app-radius(-sm/-lg/-pill)`, `--app-shadow-card/overlay`, `--app-font-size-*`, `--app-touch-min` 44 px | forma y tamaño | — | — |

Componentes (todos desde `@/shared/ui`): `PageHeader`, `KpiCard`, `StatusTag`, `MoneyText`, `MoneyInput`, `EmptyState`,
`ErrorState`, `ShortcutBar`, `ConfirmAction`, `FormDialog`, `SegmentedTabs`, `MiniBars`, más `ScreenTemplate`,
`DataTablePage` y `FormField` (props anteriores intactas). Stories: `Shared/Sistema de diseño`.

Shell (`app/layouts/AppShell.tsx`): barra superior navy con módulo actual, sucursal, caja/turno (`useCurrentShift`),
cajero y rol, indicador En línea/Sin conexión (`navigator.onLine`), búsqueda global (visual, atajo `/`), notificaciones
(sin datos todavía) y menú de usuario. Menú lateral agrupado por `app/config/navigation.ts`. Bajo 900 px: drawer y barra
inferior (Inicio, Venta, Productos, Más). `/login` se renderiza sin shell. El selector de rol simulado sigue solo en DEV.

Pantallas del núcleo: `/` Inicio (KPI y gráfico derivados de `useSales`/`useProducts`/`useCustomers`; cálculos marcados
PROPUESTA) y `/login` (PIN táctil o usuario/contraseña, ambos por `useLogin`; PROPUESTA: contrato de acceso por PIN).
