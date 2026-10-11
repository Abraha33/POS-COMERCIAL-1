---
description: Audita una pantalla del frontend (jerarquía, teclado, a11y, responsive) y propone/aplica mejoras
argument-hint: <ruta, p. ej. /pos>
---

Audita la pantalla `$ARGUMENTS` del frontend en el worktree actual. No pidas aprobación entre iteraciones.

1. Lee el código de la pantalla y los hooks que usa; identifica qué tarea debe lograr el usuario y qué información es clave.
2. Ejecútala (`pnpm dev` con `DEV_PORT`) y captura a 1280, 768 y 375 px; corre axe (`frontend/scripts/audit.mjs`).
3. Evalúa: jerarquía, redundancia, pasos innecesarios, teclado/foco, objetivos táctiles ≥ 44 px, contraste, estados
   vacío/error/carga, prevención y recuperación de errores, rendimiento percibido.
4. Implementa las mejoras en tu carpeta de feature (no en `shared/`, `app/`, `contracts/`).
5. Vuelve a ejecutar, captura y corrige hasta que no queden defectos.
6. Resume: qué cambió, evidencia (capturas/resultados), qué no pudiste verificar.
Etiqueta cualquier regla de negocio nueva como PROPUESTA.
