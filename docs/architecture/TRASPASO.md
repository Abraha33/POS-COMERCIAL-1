# Traspaso del proyecto (2026-10-12)

Para cualquier herramienta o persona que retome el trabajo (Claude, ChatGPT/Codex, OpenCode). Léelo junto con
`AGENTS.md` (reglas) y `docs/architecture/ENTORNO_OFICIAL.md` (carpetas y puertos).

## 1. Dónde estamos

| | |
|---|---|
| Carpeta oficial | `D:\POS-COMERCIAL-WORKTREES\pos-proofs` |
| Rama | `feat/pos-proofs` |
| Último commit | `3797967` (infraestructura i18n) |
| Puerto de desarrollo | `8082` |
| Estado de `main` | **Sin fusionar.** No hacer merge ni push sin orden explícita del dueño. |

Verificación al cierre de este traspaso (todo sobre mocks):
- `pnpm typecheck` y `pnpm lint` limpios.
- Conformidad (`pnpm conformance`): 44/44.
- Vitest: 457/457.
- Playwright: pasan los e2e de turno (`pos-ops`), acceso (`pos-access`), conciliación, comprobantes, smoke y shell.
- **Fallo conocido, no del último cambio:** axe/desborde a 375 px en varias rutas (ver §5).

## 2. Qué está hecho y verificado

| Tema | Estado | Dónde |
|---|---|---|
| Operaciones con estado explícito (`x-approval`, `x-status`) | Hecho; gates en tests | `contracts/openapi.yaml`, `tests/openapi.test.ts` |
| Caja/terminal `GET /pos/registers` | `approved`, con mock y conformidad | `shared/api/registers.ts`, `mocks/handlers/registers.ts` |
| Paquete de país `GET /pos/country-pack` (CO: 9 canales) | `proposed`, con mock y conformidad | `mocks/handlers/countryPack.ts`, `shared/api/countryPack.ts` |
| `Session.regional` y `SaleCreate.documentType` obligatorio | `proposed` | `shared/contracts/platform.ts`, `session.ts`, `pos.ts` |
| Aprobación única: `pin` + `request`, un solo vocabulario (`ApprovalAction`) | `approved` (pin) + `proposed` (request); `/pos/authorizations` eliminado | `shared/api/approvals.ts`, `features/pos-ops/authSync.ts` (adapter) |
| Acceso al POS sobre datos reales (caja, turno, apertura a `POST /pos/shifts`) | Hecho; escenarios solo con `?escenario=` | `features/pos-access/useAccessData.ts`, `PosAccessPage.tsx` |
| Turno activo derivado del `Shift` del servidor | Hecho; `ShiftRecord` es estado de interfaz (adapter) | `features/pos-ops/shift.ts` (`fromServerShift`, `uiStateOf`) |
| Sin "crear turno simulado" ni "simular cierre" en la UI | Hecho | `features/pos-ops/ShiftPanel.tsx` |
| Relevo: receptor filtrado por `pos.sell` (misma regla que el servidor) | Hecho | `features/pos-ops/ShiftPanel.tsx` |
| Infraestructura i18n: 5 idiomas, selector en cabecera, `lang`/`dir`, formato COP por locale | Hecho | `app/i18n/` |
| Pantalla de acceso traducida a `t()` (es, en) | Hecho; fr/ru/hi caen al español | `features/pos-access/AccessView.tsx` |

Contraseña de prueba unificada: `1234` (mocks, fixtures, contrato de ejemplo, conformidad). Solo para desarrollo.

## 3. Decisiones vigentes (no reabrir sin el dueño)

Están en `docs/architecture/DECISIONES_CONTRATOS.md`. Resumen:
- **Un solo modelo de turno:** `Shift` del contrato; `ShiftRecord` es adapter temporal.
- **Un solo mecanismo de aprobación**, con un solo vocabulario de máquina en inglés técnico.
- **Canales de pago:** explícitos por paquete de país (CO: 9). Ninguno oculto dentro de otro.
- **Comprobantes:** recibo operativo, documento fiscal, evidencia (`proofId`) e impresión, separados.
- **Estado de operaciones:** `approved`, `simulated`, `proposed`. No construir producción sobre `proposed`.
- **Backend:** primero contrato y adapter, después UI. Sin endpoints fuera de OpenAPI.
- **Idiomas objetivo:** es, en, fr, ru, hi (no RTL en esta fase). Idioma ≠ país.
- **Pruebas:** ningún flujo puede quedar bloqueado por una precondición que la UI no pueda crear.

## 4. Pendientes, en orden recomendado

1. **i18n por módulos.** Hoy solo la pantalla de acceso usa `t()`. Pendiente: ~69 archivos JSX y ~458 atributos
   visibles con texto en español. Hacerlo módulo a módulo, empezando por POS (venta rápida, turno, pedidos), con su
   catálogo. Cada módulo: extraer → catálogo `es` (base) → traducir `en` → fr/ru/hi cuando haya revisión.
2. **Traducciones fr, ru, hi.** Los catálogos están vacíos a propósito (caen al español). No traducir sin revisión
   humana de los textos de negocio.
3. **Paquete de país en la UI.** La UI aún usa constantes locales de canales, documentos y denominaciones
   (`features/pos/proofs/channels.ts`, `documents.ts`, `features/pos-access/scenarios.ts`). Migrar a `useCountryPack`.
   La prueba `tests/country-pack-drift.test.ts` impide la deriva mientras tanto y se retira al migrar.
4. **`ShiftRecord` como adapter.** Quitar el estado que el servidor ya tiene; mantener solo pausa, incidencias y
   bitácora de interfaz.
5. **Errores con `code` + `params`.** El cliente debe traducir códigos (p. ej. `SHIFT_ALREADY_OPEN`), no mostrar el
   texto del servidor.
6. **Desborde a 375 px** (§5).
7. **Pendientes del dueño:** aprobar las operaciones `proposed` que se quieran usar en producción; decidir fusión a
   `main`; decidir si `unificado` y `capa-2-responsive` (ver `ENTORNO_OFICIAL.md`) se archivan.

## 5. Problemas conocidos (no escondidos)

- **Desborde horizontal a 375 px** en `/products`, `/inventory`, `/customers`, `/purchases`, `/receivables`,
  `/payables`, `/reports`, `/administration`: la causa es la **tabla de datos** (`table right≈722 px`). Ya existía
  antes del i18n. Solución de fondo: contenedor con scroll horizontal o vista de tarjetas en móvil.
- **Desborde a 375 px en `/pos`:** la barra operativa (`PosNav`) mide `right≈542 px`. Ya existía antes del i18n.
- El selector de idioma **no** causa desborde: la cabecera termina en `right≈367 px` a 375 px.
- **Un test de pedidos** (`pos-orders-ui`, "cobrar un pedido…") falló una vez dentro de la suite completa y pasó en
  3 de 3 ejecuciones aisladas y en la siguiente suite completa. Riesgo de prueba intermitente; no se ha corregido.
- La suite de conformidad usa la contraseña `1234` para los usuarios de prueba: no apuntar a un backend real con ella.

## 6. Cómo verificar antes de dar algo por terminado

```bash
cd frontend
pnpm typecheck && pnpm lint && pnpm exec vitest run
pnpm conformance
pnpm exec playwright test   # usa su propio puerto (8090)
```

Reglas de Git (ver `AGENTS.md`): `git add` con rutas explícitas; no commitear capturas regeneradas en
`docs/qa/audit` (restaurar con `git checkout -- docs/qa/audit`); no tocar `frontend/src/method` (archivo suelto sin
dueño, pendiente de decisión).

## 7. Lo que NO está verificado (honestidad)

Todo lo anterior corre sobre **mocks**. No hay backend real, DIAN, banco, cámara, impresora, lector de código de
barras, concurrencia real entre cajas, ni rendimiento con datos reales. Las pantallas de idioma distinto del español
están parcialmente traducidas: fr, ru y hi muestran el español en casi todo el texto.
