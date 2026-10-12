# Alcance de etapas 1–3 y exclusiones

**Instrucción del usuario:** elaborar definición funcional (etapa 1), arquitectura UI (etapa 2) y contratos de datos/adapters/estados/mocks (etapa 3). **No etapa 4:** NO desarrollar componentes, migraciones, schemas Zod compilables, MSW handlers, ejecución de pruebas o integraciones reales. Para Codex/OpenCode los documentos son especificaciones, no evidencia de código.

## Dentro del alcance
- POS F01–F07, F09–F12, F14; mayor profundidad: F07, F09, F10 y F11.
- CAT 01–08, INV 01–10, COM 01–08, CLI 01–06, REP 01–09, ADM 01–09.
- F-FIN: CAJ 01–07, TES 01–06, CON 01–05, con límites de validación contable y fiscal.
- UI por dominio: FLOW, SCREEN, TEMPLATE, COMPONENTS, RESPONSIVE y ACCESSIBILITY de forma reutilizable.
- Datos lógicos, operaciones de API **propuestas**, validación Zod descriptiva, fixtures/MSW como catálogo de escenarios, invariantes, máquinas de estado, autorización y errores.

## Fuera del alcance — preservados sin modificar
- **F08 / PED-01..08** Pedidos, gestión logística, prioridades y entregas: definidos antes, en backlog separado; **no** crear nuevos UI packs, adapters, mocks o modelos definitivos de Pedidos en esta iteración.
- **F13** Offline y sincronización: no diseñar flujo offline, cola, conflictos ni política transaccional sin conexión ahora; conservar advertencia de que una falla de red produce incertidumbre y no doble efecto.
- **Etapa 4:** construcción real frontend/backend, pruebas E2E, implementación Zod/MSW, Frappe/ERPNext, DIAN, banco y dispositivos.

## Regla de dependencia
Cuando una operación dentro del alcance mencione un pedido/entrega o situación offline, enlazarla como **dependencia externa pendiente** sin definir PED/F13 ni inferir su comportamiento. Para red no confiable sólo especificar estado UNKNOWN, consulta de autoridad y deduplicación segura de solicitud; esto es integridad financiera transversal, no implementar offline.

## Estado de decisiones
Reglas A existentes de GitHub siguen vigentes. Nuevos detalles de F07, CLI, ADM y F09–F11 son **propuestas de especificación derivadas** por el asistente para revisión técnica; su publicación no convierte automáticamente nuevos umbrales, normas fiscales ni diseño UI en decisiones aprobadas. Ninguna modificación de histórico; cualquier conflicto se anota para ratificación.

