# Traspaso del proyecto (2026-10-12)

Para cualquier herramienta o persona que retome el trabajo (Claude, ChatGPT/Codex, OpenCode). Léelo junto con
`AGENTS.md` (reglas), `docs/PROJECT-STATE.md` (decisiones funcionales vigentes),
`docs/qa/CONTRACT-MATURITY-AUDIT-2026-10-12-V2.md` (medición y brechas) y
`docs/architecture/ENTORNO_OFICIAL.md` (carpetas y puertos).

## 1. Dónde estamos

| | |
|---|---|
| Carpeta oficial | `D:\POS-COMERCIAL-WORKTREES\pos-proofs` |
| Rama | `feat/pos-proofs` |
| Último commit al corte documental | `1ee25ac` (persistencia de borrador POS por caja) |
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

Las decisiones más recientes y su estado están en
`docs/decisions/2026-10-12-DECISION-REGISTER.md`; las decisiones de integración
ya congeladas continúan en `docs/architecture/DECISIONES_CONTRATOS.md`. Resumen:
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

## Actualización (2026-10-12, rama `codex/parallel-readiness`)

**Dónde están los cambios:** los 13 commits nuevos están en `codex/parallel-readiness` (último: `681040f`). La rama
oficial `feat/pos-proofs` sigue en `0e2d946`. **No hay fusión ni push.** Fusionar a `feat/pos-proofs` requiere orden explícita.

Hecho en esta ronda (todo sobre mocks):
- **Carrito y borrador:** `sale-draft/` (dueño: Carrito) con la venta en curso por caja.
- **Cobro:** `payment-session/` es dueña de `clientOperationId` y del estado. Transiciones: envío, rechazo definitivo (misma
  clave), UNKNOWN (reintento con la misma clave, bloquea Vaciar) y completado. El cierre digital solo con confirmado o excepción.
- **Comprobantes:** el estado lo decide `/pos/payment-proofs` (contrato, PROPUESTA: `channelLabel`, `requestedBy`). La foto va
  aparte (`/dev-relay/images`) y no se persiste. En desarrollo, el almacén de comprobantes es compartido entre computador y
  teléfono (`/dev-relay/payment-proofs`). Es un simulador de desarrollo, no un endpoint del contrato.
- **Reimpresión:** `POST /pos/sales/{id}/reprints` registra la COPIA; no altera venta, caja ni stock.
- **Canales:** pago mixto, conciliación e ingreso del turno leen canales del CountryPack (`usePosChannels`).
- **Dueños en paralelo:** `docs/architecture/MODULE_OWNERSHIP.md` (sección "Subáreas del POS").

Verificación al cierre: typecheck ✓, lint ✓, Vitest 475/475 ✓, conformidad 44/44 ✓. Playwright: pos-access, pos-ops, pos-sales,
pos-proofs, carrito y journeys pasan (incluido el desborde a 375 px, corregido en `681040f`).

Pendiente que sigue abierto:
- i18n por módulo y traducciones fr, ru, hi (sin revisión humana).
- `defaultChannels` y `documentOptions` siguen existiendo solo como datos de prueba; la UI no los usa.
- La prueba de deriva `country-pack-drift.test.ts` cubre denominaciones de escenarios; se retira cuando esos escenarios
  también salgan del paquete de país.
- Historial de comprobantes y método viven solo en la sesión de la pantalla (no en el servidor).
- Todo corre sobre mocks: sin backend real, DIAN, banco, cámara ni impresora.

## Actualización (2026-10-12, noche): D-005 e integración con GitHub

- **D-005 implementado (contrato → UI):** una transferencia admite varias fotos con "Repetir"; "Enviar" pasa la verificación
  al responsable de la cuenta; solo ese responsable (o un supervisor) verifica, confirma o rechaza. El cajero que solicitó el
  comprobante espera. Contrato: `evidences[]`, estado `sent_to_verifier`, `verifierId`, `DELETE .../evidence/{id}` y
  `POST .../submit`. Commit `4e20bd2`.
- **Documentación de GitHub sincronizada** (`265cb8c`): 59 archivos de `docs/` de las ramas de Codex (PRs #19 a #24). No se
  importó código: el `main` remoto es una app Next.js con otra historia y **no** comparte ancestro con este repositorio.
- **Pendiente real:** la app del responsable (verificar desde su teléfono). Hoy verifica un supervisor desde el panel del POS.
- **Pendiente de decisión:** cómo reconciliar historias con GitHub (rama nueva en remoto, `--allow-unrelated-histories` o
  reconstruir). Las ramas `codex/*` y `feat/*` locales no tienen fusión.
