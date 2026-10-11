# Hallazgos QA/UX (agente F, rama qa/ux)

Fuente: recorridos Playwright + axe a 1280/768/375 sobre mocks MSW. Estado de las pruebas: `docs/qa/E2E_STATUS.md`.
Los hallazgos con prueba `test.fail` en `frontend/e2e/` se vuelven pruebas normales al corregirlos.
Los hallazgos de UI se resuelven dentro del rediseño por módulo (ver `docs/design/reference`).

## Alta
| ID | Hallazgo | Dueño |
|----|----------|-------|
| F-01 | `/payables` desborda la página a 768 y 375 (`.ledger__summary`, 4 tarjetas = 865 px). `/receivables` no. | Clientes y cartera |
| F-02 | `/pos` con líneas en el carrito desborda a 375; el título queda en ~70 px porque las acciones (Suspender/Suspendidas/Caja) se apilan a su lado. | POS |

## Media
| ID | Hallazgo | Dueño |
|----|----------|-------|
| F-03 | Toasts de error del POS usan `error.code` como título ("CREDIT_LIMIT_EXCEEDED", "VALIDATION_ERROR"). | POS |
| F-04 | Crédito sin cliente: "Cobrar" habilitado y falla con VALIDATION_ERROR; debe prevenirse. | POS |
| F-05 | `/administration`: contraste serious en `.p-tabview-title` (3 anchos); compras lo parchea local. Corregir en tokens/tema. | Núcleo + Admin |
| F-06 | `/customers` a 375: barra superior 391 px, "Nuevo cliente" cortado; la tabla recorta Saldo/Mora sin indicio de scroll. | Clientes |
| F-07 | `/inventory` mostraba IDs crudos y sin alertas de mínimo/negativo (corregido en el carril B tras el informe); `/reports` aún muestra `br-001` en "Sede". | Inventario / Reportes |

## Baja
| ID | Hallazgo | Dueño |
|----|----------|-------|
| F-08 | POS: resultados `<button role="listitem">` (pierde rol botón). | POS |
| F-09 | Icono de lupa se superpone al placeholder en búsquedas (DataTablePage, clientes, admin). | Núcleo |
| F-10 | A 375 tablas de compras/clientes/admin recortan columnas y acciones. | Compras, Clientes, Admin |
| F-11 | Consola `/reports`: "Invalid ARIA attribute ariaLabel" (BarChart). | Reportes |
| F-12 | `GET /pos/shifts/current` responde 404 sin turno → error rojo en consola; preferible 200 `null` (contract). | Contrato |
| F-13 | Encabezado a 375: "Comercial D…" truncado, se pierde sede/caja. | Núcleo (AppShell) |
| F-14 | Errores de negocio accionables en toasts que se auto-descartan; mostrar en línea/persistentes. | POS / Núcleo |
| F-15 | `InputNumber` solo cambia con teclas reales (filtro `originalEvent`); dictado/autocompletado/IME que solo dispara `input` no actualiza. Probar teclado Android. | Núcleo |
| F-16 | `/payables` duplica `PaymentDialog` y `ledger.ts` de `/receivables` (ya divergen); candidato a `shared/ui`. | Clientes y cartera |

## Observaciones
- No hay login real: el usuario es el selector "Rol simulado" (solo DEV). La sesión muestra sede `br-001` fija (se corrige en contrato v0.5.0).
- Compras: antes→después de stock usa `session.branch.id`; con sede real del usuario debe re-verificarse.
- Reportes: sección "Caja" pendiente (requiere `useShifts`).
- Colores: solo 2 hex en `src/features` (`reports/BarChart.tsx` FALLBACK_COLOR y un comentario en `purchases.css`).
- `/purchases`: 2 controles interactivos < 44 px a los 3 anchos (no identificados).
- Consistencia: compras, cartera y reportes usan CSS propio (`.purch__`, `.ledger__`, `.reports__`) con tablas/tabs distintas.

## No verificado
Backend real, DIAN, concurrencia, offline, rendimiento con datos reales, hardware (lector/impresora solo emulados), login real,
lectores de pantalla reales, trampa de foco, Firefox/WebKit, táctil real, hover/focus/disabled, paginación > 10 filas,
filtros de reportes, mora con fecha real.
