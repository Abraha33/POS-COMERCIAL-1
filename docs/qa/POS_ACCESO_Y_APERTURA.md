# POS-F01 Acceso al POS y POS-F02 Apertura de caja (capas 1–3)

Rama `feat/pos-access` (desde `integration`). Ruta `/pos/acceso` (permiso `pos.sell`). Todo es **simulación de interfaz**:
no llama a servicios, no abre turnos reales y no persiste datos.

## Archivos
Nuevos, en `frontend/src/features/pos-access/`: `model.ts` (tipos), `scenarios.ts` (denominaciones y 7 escenarios),
`opening.ts` (cálculos puros), `AccessView.tsx` (F01), `OpeningView.tsx` (F02), `dialogs.tsx` (revisión y autorización),
`PosAccessPage.tsx` (estado y simulación), `pos-access.css`, `index.ts`.
Pruebas: `src/tests/pos-access-opening.test.ts` (cálculos), `src/tests/pos-access.test.tsx` (14 escenarios de interfaz),
`e2e/pos-access.spec.ts` (3 anchos + flujo). Capturas: `docs/qa/audit/pos-access/`.
Modificado: `src/routes/index.tsx` (una ruta nueva). **Venta rápida y `features/pos` no se tocaron.**

## Verificación por capa
| Capa | Comprobación | Resultado |
|---|---|---|
| 1 Layout y skeleton | typecheck, lint, render de la ruta | OK |
| 2 Responsive | Playwright a 1366×768, 768 y 375: sin desborde, controles ≥ 44 px, axe sin serias | OK (3/3) |
| 3 Interacciones | 14 pruebas de interfaz + 4 de cálculo + 4 E2E (3 anchos y flujo completo con doble clic) | OK |
Global: typecheck, lint, Vitest 288/288, build correcto.

## Escenarios obligatorios
1 caja cerrada ✔ · 2 turno propio ✔ · 3 caja ocupada y relevo simulado ✔ · 4 sin permiso ✔ · 5 base exacta ✔ ·
6 faltante ✔ · 7 sobrante ✔ · 8 base cero (exige motivo) ✔ · 9 cantidad inválida ✔ · 10 error de confirmación ✔ ·
11 doble confirmación (una sola) ✔ · 12 sin conexión y pérdida al confirmar (no asume apertura) ✔.

## Decisiones
- Sesión, caja física y turno son tipos separados; el turno es el `Shift` del contrato y el resultado es un `ShiftOpen`
  válido (`registerId`, `openingCash`), comprobado con los esquemas Zod del contrato.
- Moneda y billete de $1.000 son denominaciones distintas (`moneda-1000`, `billete-1000`).
- Base cero y diferencia ≠ 0 exigen motivo y autorización (regla BR-CAJ de descuadre con nota; la base cero es PROPUESTA).
- El código de supervisor es un campo `password` en memoria, se descarta al cerrar y no se registra.

## Pendiente / no verificado
- **No integrado con el turno real:** `/pos` sigue usando `OpenShiftCard`; el flujo por denominaciones no escribe en el mock.
  Conectarlo requiere decidir si `ShiftOpen` admite el desglose de denominaciones (contrato) y una autorización real.
- Sin backend de cajas/terminales, relevo ni autorización de apertura; sin enlace desde el menú (solo URL directa).
- Denominaciones fijas en código (configurables a nivel de datos, sin pantalla de configuración).
- Offline real (cola, reconciliación) y lectores de pantalla no verificados; el botón de cerrar de los diálogos se anuncia
  según el locale de PrimeReact.
- Capas 4–6 no iniciadas, como se pidió.
