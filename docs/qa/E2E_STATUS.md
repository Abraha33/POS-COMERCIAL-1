# Estado E2E / QA (agente F)

Fecha: 2026-10-11 · `DEV_PORT=5197 pnpm exec playwright test` desde `frontend/` (Chromium, mocks MSW).
Resultado de la última corrida completa: **85 pruebas "pasan"**, de las cuales **9 están marcadas `test.fail`**
(fallos conocidos que se esperan; ver `FINDINGS.md`). 76 pasan de verdad; 0 fallan inesperadamente.

## Cómo se aísla el estado
La base de mocks vive en memoria del navegador: cada `page` nueva parte del seed (cada prueba es independiente).
Dentro de un recorrido se cambia de rol con el selector "Rol simulado" y se navega por el menú (SPA) para NO
recargar y conservar el estado. El rol inicial se fija con `sessionStorage` (`helpers.ts: startAs`).

## Recorridos multi-módulo (`e2e/journeys.spec.ts`)
| # | Recorrido | Estado |
|---|---|---|
| a | cajero abre turno, vende Arroz en efectivo, ve recibo POS-0004; bodeguero ve stock 40 a 39 en `/inventory` | pasa |
| b | venta a crédito (Tienda La Esquina) aparece en `/receivables` (saldo 300.000 + total, 2 filas) y en `/reports` (estado Crédito) | pasa |
| c | abono de 50.000 baja el saldo 300.000 a 250.000 (resumen y fila) | pasa |
| c2 | abono mayor al saldo queda bloqueado con mensaje | pasa |
| d | compras: crear, enviar, recibir; panel "stock +10 (40 a 50)", inventario 50, segunda cuenta por pagar de Distribuidora Andina | pasa |
| e | cierre con diferencia: botón deshabilitado hasta escribir nota; luego cierra y vuelve "Abrir turno" | pasa |
| e2 | servidor responde 422 `CASH_NOTE_REQUIRED` sin nota | pasa |
| e3 | cierre sin diferencia no pide nota | pasa |
| f | lector: código de barras + Enter agrega línea, repetir suma cantidad, F9 cobra | pasa |
| f2 | código inexistente avisa y no agrega | pasa |

## Estados y errores (`e2e/states.spec.ts`, `e2e/error-states.spec.ts`)
| Prueba | Estado |
|---|---|
| stock insuficiente, PIN 1234, venta registrada y "Stock negativo" en reportes | pasa |
| crédito sin cupo: aviso con texto de negocio y sin código técnico | `test.fail` (F-03) |
| crédito sin cliente se previene en el formulario | `test.fail` (F-04) |
| 12 combinaciones rol/ruta devuelven `access-denied` y sin ítem de menú | pasan |
| cartera ve "Abonar" | pasa |
| axe en diálogos (caja, abono, nueva orden, detalle orden, POS con carrito) a 1280/768/375 | pasan, salvo POS con carrito a 375 (`test.fail`, F-02) |
| 8 pantallas con todas las lecturas GET en 500 muestran `role=alert` y "Reintentar" | pasan |

## axe y desbordes en todas las rutas (`e2e/a11y-routes.spec.ts`)
Rutas: las 9 de módulo + 404 (`/ruta-inexistente`) a 1280, 768, 375 = 30 pruebas; WCAG 2.0/2.1 A y AA, falla con
serious/critical o desborde horizontal de la página. 24 pasan; 6 `test.fail`:

| Ruta | Anchos | Causa |
|---|---|---|
| `/administration` | 1280, 768, 375 | `color-contrast` serious en título de pestaña (F-05) |
| `/payables` | 768, 375 | desborde horizontal, ancho 865 px (F-01) |
| `/customers` | 375 | desborde horizontal, 391 px (F-06) |

Sin violaciones critical en ninguna ruta. Datos por ruta/ancho: `docs/qa/audit/final/data/*.json`; capturas
de página completa: `docs/qa/audit/final/*.png`; estados con diálogos: `docs/qa/audit/final/states/`.

## Humo previo (`e2e/smoke.spec.ts`): 3 pruebas, pasan.

## Qué NO se verificó
- Backend real (Frappe/ERPNext), DIAN/facturación electrónica, concurrencia (dos cajas, doble envío real),
  idempotencia más allá del mock, offline real (cola/sincronización), rendimiento con volumen real de datos,
  impresora, lector físico (solo se emula con teclado + Enter), cajón monedero.
- Autenticación real: no hay pantalla de login; se usó el selector de rol simulado (solo DEV).
- Lectores de pantalla reales (NVDA/VoiceOver): solo axe automático, que cubre una parte de WCAG. Orden de foco,
  trampa de foco de diálogos y operación 100 % por teclado de cada pantalla no se recorrieron completos.
- Otros navegadores (Firefox/WebKit) y dispositivos táctiles reales; solo Chromium con viewport emulado.
- Contraste en estados hover/focus/disabled y en modo oscuro (no existe); animaciones y `prefers-reduced-motion`.
- Flujos no recorridos: devoluciones/anulaciones, traslados y ajustes de inventario, ventas suspendidas,
  aprobación bajo costo (solo propietario), CRUD de productos/clientes/empleados/proveedores, paginación con más
  de 10 filas, filtros de reportes por fecha/sede, programación semanal de pagos con varias semanas.
- Mora real: el reloj de los mocks está fijo en 2026-10-11; el cálculo con fecha real no se probó.
- `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm conformance` y `core:check` de `src/` no se ejecutaron en
  esta tarea (solo se tocó `e2e/` y `docs/qa/`).
- El servidor de otros carriles (p. ej. 5188) no se tocó; el 5197 lo levanta y detiene Playwright (`webServer`).
