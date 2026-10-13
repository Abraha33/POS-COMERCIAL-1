# Arquitectura UI ERP/POS y estrategia de construcción

**Corte:** 2026-10-12. **Objetivo aprobado:** Flow-first + Contract-driven + vertical slices, minimizar intervención del usuario que define flujos y del cajero que opera POS. **Estado de código:** por auditar en rama local vigente.

## 1. Seis capas de trabajo
1. **Núcleo:** contratos de dominio/API, reglas, permisos, estados, errores, tokens visuales, regiones, accesibilidad.
2. **Componentes reutilizables:** PrimeReact como base (sin rehacer átomos); componentes funcionales Holamigo con props/eventos/estados/cardinalidad/a11y.
3. **Plantillas funcionales:** shell/contexto, slots, composición, breakpoints y overlays únicos; no 73 pantallas aisladas.
4. **Flujos + mocks:** escenarios, recuperaciones y errores verificables con datos de demo marcados.
5. **Integración:** Frappe/ERPNext POS Core, pagos, fiscal externo, stock y bancos; transacciones reales después de validación.
6. **QA:** unit, E2E, accesibilidad, permisos, offline/idempotencia, responsividad y rendimiento.

Secuencia práctica para frontend: audit/skeleton → responsive → interacción → flujo con mocks → integraciones → QA, con pruebas en cada etapa. No posponer invariantes de negocio críticos hasta la capa de integración.

## 2. Estructura principal
```text
PosRoute/PosWorkspace
  ├─ OperationalHeader [solo información/situación]
  ├─ Navigation [Venta, Suspendidas, Cobros pendientes, Pedidos, Mi turno, Más]
  ├─ FeatureWorkspace (venta u otro flujo)
  │   ├─ ProductExplorer [búsqueda/filtros/resultados]
  │   ├─ ProductDetailContext [ficha + UOM + precio por volumen]
  │   └─ CheckoutColumn
  │       ├─ CustomerContext [encima del carrito]
  │       ├─ CartLines + CartCommands
  │       ├─ SaleTotals
  │       └─ ChargeNow / CreateOrder
  └─ OverlayHost único [cliente, producto, pago, captura, autorización, entrega]

Domain / State Layer:
  SaleDraftStore + PaymentSessionStore + OrdersState + AuthorizationService
  Commands/events/services + backend adapters + persisted recovery
```
Los nombres son ilustrativos, no asegurar rutas antes de auditar. **Header informa; navegación conecta; workspace ejecuta**. No incrustar lógica de pago o inventario en Header, carrito visual o pantalla principal. Shell/Router no debe poseer el único estado transaccional.

## 3. Contratos UI
Seis contratos históricos del POS se conservan en `docs/pos-proofs/v0.1/`:
FLOW, SCREEN, TEMPLATE, COMPONENTS, RESPONSIVE, ACCESSIBILITY.
Contienen reglas útiles, pero son **BORRADOR v0.1** y no incorporan por sí solos todas las decisiones posteriores; el registro de decisiones y docs vigentes tienen prioridad.

Estructura de nuevos contratos por flujo:
- ID, alcance/actores, precondiciones y resultados.
- estados/events/commands con errores de recuperación;
- contrato de pantalla con regiones, tareas P1/P2/P3 y permisos;
- plantilla con slots y límites de contenido/scroll;
- componentes con props + emisión de eventos, PrimeReact versus custom;
- reglas responsive por región, teclado/escáner, foco/a11y;
- fixtures/mocks y casos de aceptación.
Usuario revisa **flujo, reglas importantes y experiencia visual**; Claude/arquitecto derivan contratos; OpenCode implementa piezas. Evitar revisión manual línea por línea de los seis contratos por el propietario salvo decisiones sensibles.

## 4. Propiedad del estado (P0)
Problema reportado por auditoría suministrada: `QuickSale` se desmonta al navegar y puede perder carrito/checkout. **No afirmamos que siga ocurriendo** hasta inspeccionar working tree vigente.
Invariantes a implementar/probar:
- SaleDraft y PaymentSession identificados durablemente fuera de pantalla y overlays.
- Tenant/site/terminal/shift/usuario asociados para no cruzar ventas entre empresas/cajas.
- El mismo intento incierto conserva identificador aun con reload o pérdida temporal de red.
- Cambiar entre Venta, Pedidos, Mi turno, clientes o diálogo de pago no borra cobros.
- UI solo manda comandos; servicios calculan impuestos/precios/transiciones.
- Una venta o documento confirmado no se vuelve borrador editable.

## 5. PrimeReact y responsive
PrimeReact 10.9.9 fue **reportado** por una auditoría externa del usuario; verificar dependencia instalada en `capa-2-responsive`. Reutilizar componentes maduros (ScreenTemplate, FormField, FormDialog, DataTablePage, permisos) solo si realmente existen en esa rama. Limitar CSS duplicado y diálogos de pago paralelos. UI compacta, monocromática en skeleton; no obligar a descargar imágenes.
- Desktop: buscador/catalogo principal y cliente/carrito/totales lateral.
- Tablet: mismos componentes, filtros/paneles colapsables y resumen accesible.
- Móvil: catálogo y carrito en vistas progresivas; total/CTA persistentes, cobro full-screen cuando necesario.
- Ajustes con zoom, lector de barra, teclado y táctil; objetivo WCAG 2.2 AA solo tras tests.
- Pedidos visible vía navegación; botón flotante como variante propuesta no congelada.

## 6. Trabajo paralelo seguro
- **Claude/arquitecto:** auditar, fijar contratos, conflictos y QA; NO suponer que chat es fuente íntegra por sí solo.
- **OpenCode A:** catálogo/búsqueda/atributos/ficha/precios.
- **OpenCode B:** cliente/carrito/borradores suspendidos.
- **OpenCode C:** checkout, pago parcial, fotos y verificación.
- **OpenCode D:** caja/turno/administrador (según dependencias).
- **Un integrador único:** store principal, router, OverlayHost, interfaces compartidas y merges.

Usar ramas/worktrees independientes, PR pequeños y ownership por archivo. No abrir cuatro agentes editando `PosPage`, estado central o firmas compartidas a la vez. Mantener mocks explícitos cuando API real no exista; test E2E antes de merge.

## 7. Auditoría de evidencia y contradicción de repositorios
Repos `Abraha33/ERP-POS-Holamigo`: rama consultada `experiment/frappe-validation` en GitHub contiene código antiguo Next 15/shadcn. `docs/MASTER-PLAN.md` prevé Vite, Frappe/ERPNext y experimentos. El usuario menciona rama local `capa-2-responsive` no encontrada en ramas GitHub conectadas al 12/10. No modificar/atribuir código de la rama nueva hasta obtener acceso al working tree o que se publique. `openapi.yaml` con 38 operaciones, matriz 86 funciones, reglas 00–07 y P0 de QuickSale provienen de auditoría proporcionada; requieren revalidación directa.

## 8. Gate de inicio
**Permitido ahora:** construir frontend con mocks y contratos congelados por vertical slice, en rama local correcta, manteniendo estado y errores de cobro.
**Antes de paralelizar:** inspección árbol vigente + owners + store/UI contracts compartidos + detección de conflictos.
**Antes de producción:** prueba ERPNext/Frappe, permisos en servidor, fiscalidad, banco, inventario, concurrencia, seguridad y QA.
