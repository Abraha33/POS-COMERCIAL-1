# Hito: dos carriles en paralelo, otra herramienta y un conflicto real

Prepara tres pruebas que hoy faltan en `docs/qa/PARALLEL_READINESS.md`:

1. **Otra herramienta** (OpenCode) trabaja un carril de punta a punta.
2. **Dos carriles a la vez** terminan pidiendo cambiar el **mismo archivo compartido**.
3. El integrador **resuelve un conflicto real** de Git en ese archivo y las compuertas siguen en verde.

El archivo compartido es `frontend/src/routes/index.tsx`: todas las rutas nuevas se agregan en una sola línea,
`rootRoute.addChildren([...])`. Dos rutas nuevas desde ramas distintas chocan ahí sin remedio.

## Estado de partida (2026-10-13)

| Carril | Carpeta | Rama | Puerto | Herramienta sugerida |
|---|---|---|---:|---|
| `pos-proofs` | `D:\POS-COMERCIAL\POS-COMERCIAL-WORKTREES\lane-pos-proofs` | `lane/pos-proofs` | 8103 | **OpenCode** |
| `inventory` | `D:\POS-COMERCIAL\POS-COMERCIAL-WORKTREES\lane-inventory` | `lane/inventory` | 8108 | Codex |

Ambas ramas parten de la troncal `feat/pos-proofs` con `lane/reports` ya integrado. El puerto 8082 es del servidor oficial:
ningún carril lo usa.

## Reglas comunes (para los dos prompts)

- Abre la herramienta **dentro de la carpeta del carril**, no en `pos-proofs`.
- Un carril solo edita lo que `lanes.json` le asigna. `routes/`, `contracts/`, `shared/` y `mocks/seed.ts` son del integrador:
  se piden por escrito.
- Nadie hace push, merge ni rebase sobre la troncal. Nadie borra archivos.
- Si el sandbox de la herramienta impide `git commit`, se deja sin commit y se dice en el informe.

---

## Prompt A · OpenCode · carril `pos-proofs`

```text
Eres el agente del carril `pos-proofs` del ERP/POS Holamigo. Trabajas en paralelo con otro agente; no eres el integrador.
Estás en D:\POS-COMERCIAL\POS-COMERCIAL-WORKTREES\lane-pos-proofs, rama lane/pos-proofs, con dependencias instaladas.
No ejecutes `pnpm lane:new` ni reinstales dependencias.

LEE PRIMERO, en este orden: AGENTS.md, docs/architecture/PARALLEL_STRATEGY.md, docs/lanes/pos-proofs.md,
docs/lanes/TEMPLATE.md y la entrada `pos-proofs` de lanes.json. Después, la decisión D-005 en
docs/decisions/2026-10-12-DECISION-REGISTER.md.

COMPRUEBA: `git branch --show-current` dice lane/pos-proofs. En frontend/ corre `pnpm typecheck && pnpm lint` y anota el resultado.

TAREA: pantalla del responsable de la cuenta (D-005).
Cuando el cajero pulsa "Enviar al responsable", el comprobante queda en estado `sent_to_verifier` con un `verifierId`.
Hoy el responsable solo puede verificar desde el panel del POS. Construye una pantalla propia, pensada para el teléfono:
1. Se abre por enlace directo con el id del comprobante: ruta `/pos/comprobantes/$id`.
2. Muestra el comprobante (medio de pago, monto, canal, quién lo solicitó) y TODAS sus fotos, con la posibilidad de ampliarlas.
3. Acciones del responsable: marcar "verificando", "Confirmar pago" y "Rechazar" (con motivo). Solo las ve la persona
   asignada como `verifierId` o un supervisor (`admin`, `propietario`); cualquier otro ve un mensaje claro de permiso denegado.
4. Estados de carga, comprobante inexistente y error con acción útil. Estado final visible (confirmado / rechazado).
5. La foto no confirma el pago: confirmar es una acción explícita y separada.
Reutiliza `features/pos/proofs/gateway.ts` y los hooks existentes; no agregues fetch propio. Imágenes solo en memoria
(no persistas base64). Dinero en COP entero; colores solo con tokens del tema.

LO QUE PUEDES TOCAR (de lanes.json): frontend/src/features/pos/proofs/**, mocks/proofStore*.ts, mocks/handlers/paymentProofs.ts,
tests pos-proofs*, payment-proofs-receipts*, sale-reprint, pos-recon, e2e pos-proofs y pos-recon, más
docs/qa/requests/lane-pos-proofs.md y docs/lanes/pos-proofs.md. Nada más: `pnpm lane:check` falla si tocas otra cosa.

LO QUE NO PUEDES TOCAR Y NECESITAS (obligatorio, es parte del ensayo):
la ruta no puede registrarla tú. Escribe en docs/qa/requests/lane-pos-proofs.md una solicitud con:
- el id de ruta `/pos/comprobantes/$id`, el permiso que debe exigir y qué componente exporta tu carril;
- el parche EXACTO para frontend/src/routes/index.tsx: el `lazy(...)` de tu página, el `createRoute(...)` y cómo queda la
  línea `rootRoute.addChildren([...])`;
- qué operaciones del contrato usa tu pantalla (las que hoy están `proposed`), para que el integrador decida si las aprueba.
Mientras no exista la ruta, prueba tu componente en un test montándolo directamente.

REGLAS: no inventes reglas de negocio (lo no aprobado se marca PROPUESTA). Todo corre sobre MSW: no lo presentes como real.
No borres nada. No hagas push, merge ni rebase sobre la troncal. Commits pequeños en lane/pos-proofs
(`feat(pos-proofs): ...`, `test(pos-proofs): ...`) si tu herramienta puede; si no puede, deja los cambios sin commit y dilo.

ANTES DE ENTREGAR, en frontend/:
     pnpm typecheck && pnpm lint && pnpm test && pnpm conformance && pnpm lane:check
Si fallan 1 a 3 pruebas de POS (pos-catalog-ui, pos-history, pos-proofs-ui) por tiempo de espera, repítelas solas con
`pnpm vitest run <archivo>` y reporta ambos resultados; no las edites.
Para verla: en PowerShell `$env:DEV_PORT=8103; pnpm dev`. Nunca el 8082.

INFORME FINAL (texto): 1) archivos tocados y commits; 2) resultado de cada compuerta; 3) qué cumple de los 5 puntos;
4) la solicitud al integrador; 5) qué NO verificaste (backend real, revisión visual a 1280/768/375, axe, hardware);
6) todo tropiezo de entorno o de Git, aunque lo hayas resuelto, con comando y error. Dime también qué herramienta eres y
con qué permisos corre tu sandbox: es lo que se está ensayando.
```

---

## Prompt B · Codex · carril `inventory`

```text
Eres el agente del carril `inventory` del ERP/POS Holamigo. Trabajas en paralelo con otro agente; no eres el integrador.
Estás en D:\POS-COMERCIAL\POS-COMERCIAL-WORKTREES\lane-inventory, rama lane/inventory, con la troncal ya integrada.
No ejecutes `pnpm lane:new`, no uses `codex exec` ni lances otro agente. No reinstales dependencias salvo que `pnpm` lo
exija; si se atasca en "verify deps", detente y repórtalo.

LEE PRIMERO: AGENTS.md, docs/architecture/PARALLEL_STRATEGY.md, docs/lanes/inventory.md, docs/lanes/TEMPLATE.md y la
entrada `inventory` de lanes.json. Reglas aprobadas: BR-AJU-01..04 y BR-CNT-01..03 en
docs/business-rules/08-v0.5-ajustes-conteos-cartera-reportes.md (decisión D-066).

COMPRUEBA: `git branch --show-current` dice lane/inventory. En frontend/ corre `pnpm typecheck && pnpm lint` y anota el resultado.

TAREA: ajuste manual y conteo físico, en su versión simple aprobada.
Hoy la pantalla de inventarios tiene existencias, movimientos, traslados y alertas, pero no ajustes ni conteos. Los hooks
ya existen en frontend/src/shared/api/inventory.ts (createStockAdjustment y createInventoryCount): úsalos, no agregues fetch.
1. Ajuste: producto, sede, cantidad entera con signo distinta de 0 y motivo obligatorio. Muestra el error STOCK_INSUFFICIENT
   (el ajuste no puede dejar la existencia bajo 0) y FORBIDDEN (el bodeguero solo ajusta en su sede) con mensajes útiles.
2. Conteo: por sede, líneas con lo contado; al enviar muestra todas las líneas con `difference = counted − systemQuantity`
   y cuáles generaron ajuste. Un producto no puede repetirse. Conteo parcial permitido.
3. Estados de carga, vacío y error útiles; permiso `inventory.adjust` aplicado; teclado completo; objetivos de 44 px; legible
   a 1280, 768 y 375 px (el conteo se hace de pie, con el teléfono).
4. NO construyas conteo por zonas, semáforo ni aprobación de ajustes: no están en el contrato (D-042 y D-038 esperan).
Las tabs nuevas se integran en frontend/src/features/inventory/InventoryPage.tsx.

REQUISITO DEL ENSAYO (obligatorio): para que el bodeguero abra el conteo desde un enlace directo en el teléfono, tu pantalla
de conteo debe poder abrirse en la ruta propia `/inventory/conteo`. No puedes registrar esa ruta tú: escríbela como solicitud
en docs/qa/requests/lane-inventory.md con:
- el id de ruta, el permiso que debe exigir y el componente que exporta tu carril;
- el parche EXACTO para frontend/src/routes/index.tsx: el `lazy(...)`, el `createRoute(...)` y cómo queda la línea
  `rootRoute.addChildren([...])`.
Otro carril pide otra ruta en esa misma línea a la vez: es el conflicto que se quiere provocar. No intentes evitarlo ni
editar el archivo; solo escribe tu parche exacto.

LO QUE PUEDES TOCAR: frontend/src/features/inventory/**, frontend/src/tests/inventory-screens.test.*, más
docs/qa/requests/lane-inventory.md y docs/lanes/inventory.md. Nada más: `pnpm lane:check` lo verifica.

REGLAS: no inventes reglas de negocio. Todo corre sobre MSW: no lo presentes como real. No borres nada. No hagas push,
merge ni rebase sobre la troncal. Si tu sandbox no puede hacer commit, deja los cambios sin commit y dilo.
Tus pruebas nuevas verifican cifras concretas con los datos del mock, no solo que aparezcan títulos.

ANTES DE ENTREGAR, en frontend/:
     pnpm typecheck && pnpm lint && pnpm test && pnpm conformance && pnpm lane:check
Si fallan 1 a 3 pruebas de POS por tiempo de espera, repítelas solas con `pnpm vitest run <archivo>` y reporta ambos
resultados. Para verla: `$env:DEV_PORT=8108; pnpm dev`. Nunca el 8082.

INFORME FINAL (texto): 1) archivos tocados; 2) resultado de cada compuerta; 3) qué cumple de BR-AJU y BR-CNT;
4) la solicitud al integrador con su parche exacto; 5) qué NO verificaste; 6) todo tropiezo de entorno o de Git, aunque
lo hayas resuelto, con comando y error.
```

---

## Qué hace el integrador cuando los dos entregan

1. **Por carril:** repetir las compuertas y `lane:check`, mirar la pantalla a 375 px, devolver observaciones (igual que en `reports`).
2. **El conflicto:** crear dos ramas desde la troncal, `core/ruta-pos-comprobantes` y `core/ruta-inventory-conteo`, y aplicar en
   cada una el parche pedido sobre `frontend/src/routes/index.tsx`.
3. Fusionar la primera en la troncal; fusionar la segunda. Git se detiene en la línea `rootRoute.addChildren([...])`.
4. Resolver conservando **las dos rutas**, correr `pnpm typecheck && pnpm lint && pnpm test && pnpm conformance`, y recién
   entonces fusionar los carriles.
5. Registrar en `docs/qa/PARALLEL_READINESS.md` qué pasó de verdad: si el conflicto se resolvió, cuánto costó, qué falló.

## Qué mide cada resultado

| Si ocurre | Cuenta como |
|---|---|
| OpenCode entrega en su carril sin salirse de su propiedad | Otra herramienta ensayada (+2) |
| Los dos parches chocan y se resuelven con las compuertas en verde | Conflicto real resuelto (+1) |
| Algo se rompe | **Hallazgo**: se documenta tal cual; no cuenta como fallo del ensayo |
