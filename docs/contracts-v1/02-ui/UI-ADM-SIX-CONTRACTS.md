# UI-ADM — Seis contratos de interfaz: Empresa, sedes, permisos, medios y periféricos

**Etapa 2 · v0.1 de contratos derivados para revisión técnica; no implementación ni pruebas.** **Dependencia funcional:** ../01-functional/ADM-POS-OPERATIONS-CONFIG.md + ../../architecture/UI-CONTRACTS-AND-WORKTREES.md. Aplica [UI Foundation](UI-FOUNDATION-SIX-CONTRACTS.md). **Excluye:** PED/F08 y F13 Offline como alcance de esta iteración (cualquier referencia es límite de integración externo). Un documento por dominio con seis secciones evita multiplicar 43 subflujos en pantallas.

## FLOW
1. ADM-01/02: registrar empresa/contexto, sedes, cajas, terminales, bodegas y zonas → validar dependencias → versionar configuración.
2. ADM-03/04: usuario/roles/ámbitos/umbrales → simulación de permisos → aprobar cambio → auditar.
3. ADM-05/06: medios/cuentas/QR, responsables bancarios y periféricos → previsualización → activar con fecha efectiva.
4. ADM-07..09: contabilidad/fiscal delegadas, capacidades por empresa y migraciones iniciales por importación con dry-run.

**Invariante:** actor/empresa/sede/documento/revisión/permisos/errores en cada comando; registros publicados jamás se editan desde componentes; estados financieros inciertos no vuelven a borrador.

## SCREEN
- SettingsWorkspace con categorías: Empresa/Sedes, Roles, Caja/Terminales, Bancos/QR, Periféricos, Catálogo/Inventario, Integraciones.
- Listado configuración izquierda + formulario contextual + banner estado activa/borrador, auditoría de cambios y fecha efectiva.
- Permisos como matriz rol×acción/ámbito, no solo lista de nombres; confirmación detallada para cambio de banco/privilegios.
**Regiones y tareas:** ContextHeader (P1 contexto), ActionToolbar (P1 búsqueda/acción), WorkList (P1 selección), DetailWorkspace (P1 edición/revisión), SummaryRail (P1 importes/alertas), OverlayHost (P1 confirmaciones/autorizaciones), AuditTrail (P2 trazabilidad). P3: vistas avanzadas según permiso, nunca ocultar dato necesario para confirmar una operación.

## TEMPLATE
- SettingsWorkspace universal para editar configuración versionada.
- WorkspaceListDetail para usuarios/dispositivos.
- TransactionalWorkbench para importación inicial por lote y activación/rollback controlado.
Contenedor de capa pública reusa UI Foundation; el template no guarda único estado de operación ni implementa reglas de dominio.

## COMPONENTS
Componentes funcionales propuestos y contratos de eventos (props/esquemas definitivos en etapa 3):
- `ContextHierarchyPicker(tenant,site,register) → choose`
- `RolePermissionMatrix(caps,limits) → requestChange`
- `BankDestinationForm(account,verification) → requestActivation`
- `DeviceCapabilityList(devices,bindings) → assign`
- `SettingsVersionDiff(old,new) → publish`
- `InitialImportDryRun(mapping,errors) → execute`
**Cardinalidad:** listas paginadas/virtualizadas cuando el volumen lo exija, diálogos únicos, sin controles duplicados de aprobación; acciones explícitas con idempotencyKey cuando se publiquen. Componentes de PrimeReact se eligen después de auditar versión local; nombres anteriores son interfaces de dominio no código.

## RESPONSIVE
- 1366: navegación lateral y formulario+preview, 768: categorías como desplegable y formulario central, 375: categorías paginadas y campos completos; never horizontal role matrix global.
- Permisos avanzados en móvil por rol/capacidad progresivos, no tabla 20 columnas con scroll.
Objetivos de revisión 1366/768/375 px, zoom 200 % y viewport bajo; no certificar responsive sin QA. Estados loading/empty/error/forbidden/unknown deben conservar contexto y CTA de recuperación segura.

## ACCESSIBILITY
- Cada autorización requiere explicación de alcance/importe y motivo; foco en permiso denegado.
- Los datos bancarios sensibles enmascarados por defecto, controles de mostrar/copy autorizados.
- Cambios de dispositivo/perfil tienen mensajes de consecuencia, no icono únicamente.
Todos los formularios con labels reales, ayudas, errores programáticos y foco restaurado. Objetivo WCAG 2.2 AA sujeto a pruebas axe + teclado + contraste en etapa 4; no usar solo color.

## Casos de error y recuperación UI
- Empresa/sede sin permisos, caja abierta bloquea borrado, cuenta destino modificada mientras hay pagos, configuración obsoleta, usuario revocado, dispositivo no soportado.
- No guardar fiscalidad no validada como lista para emisión DIAN.

## Contrato de handoff
Los comandos y queries asociados se especifican en `../03-data/OPERATION-MATRIX.md`, DTO/Zod lógico en `../03-data/SCHEMA-CATALOG.md`, permisos y máquinas en `../03-data/STATE-AND-PERMISSION-CONTRACTS.md`. Agente implementador debe comprobar nombres y capacidades actuales del frontend antes de crear componentes nuevos y **no puede afirmar que estas pantallas existan**.

