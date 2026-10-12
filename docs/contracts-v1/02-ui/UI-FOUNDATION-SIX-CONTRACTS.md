# Etapa 2 — Base UI y seis contratos compartidos

**Tipo:** especificación UI, no React/TS/CSS ejecutable. **Tecnología objetivo:** React+TS+Vite, biblioteca PrimeReact (verificar versión real), TanStack Router/Query/Table donde aplique. **Ámbito:** POS F01–F06/F12, CAT, INV, COM, CLI, F07, F-FIN, REP, ADM; excluye PED/F08 y F13 offline. **Fuente:** arquitectura UI vigente en ../architecture/UI-CONTRACTS-AND-WORKTREES.md (ruta desde docs: `../../architecture/UI-CONTRACTS-AND-WORKTREES.md`).

## 1. FLOW — Contrato de interacción
Toda acción importante declara:
- `flowId`, `actor`, `tenant/site/context`, `capability`, `preconditions`, `input`, `command`, `result`, `recoverableErrors`, `auditEvent`, `postconditions`.
- Distinguir **borrador editable**, **pendiente de aprobación**, **publicado**, **rechazado**, **incierto** y **revertido por documento** según entidad. No codificar un único status universal.
- `Submit` deshabilitado durante operación en curso y protegido por idempotencia de servidor; si timeout tras posible procesamiento, mostrar **Verificando resultado**, no botón de duplicar transacción.
- Datos remotos refrescados/invalidación de Query vs estado transaccional durable; pantalla/modal NO es dueño único del draft.

## 2. SCREEN — Regiones
- `ContextHeader`: empresa/sede, rol y período/turno cuando aplique. Solo información y navegación contextual; no cálculos de dominio.
- `ActionToolbar`: buscar, filtros rápidos, nueva operación, exportar según permisos.
- `WorkList`: tabla o filas densas con estados/urgencias visibles, paginación y búsqueda.
- `DetailWorkspace`: ficha, wizard corto/drawer/diálogo según importancia y riesgo.
- `SummaryRail`: total, diferencias, alertas, acciones confirmación.
- `OverlayHost`: un único dueño de diálogos, confirmaciones y autorizaciones para evitar overlay anidado y pérdida de foco.
- `AuditTrailPanel`: read-only para perfiles permitidos, ID origen, usuario, hora, revisión y consecuencias.

## 3. TEMPLATE — Composición reutilizable
- `WorkspaceListDetail` para catálogo, clientes, proveedores e historial; filtros + lista + detalle contextual.
- `TransactionalWorkbench` para recepción, devolución, ajuste, gasto/egreso y abono; editor de líneas + totales + validaciones + acción protegida.
- `ReconciliationWorkbench` para conteos, arqueo X/Z, conciliación, incidentes; esperado/real/diferencia + pendientes + autorizar.
- `SettingsWorkspace` para empresa/caja/permisos/medios; navegación lateral + formulario versionado + auditoría.
- `OperationalDashboard` para tareas pendientes/KPIs, semáforos con etiqueta y fecha de actualización.
- Cada template define `headerSlot`, `filtersSlot`, `listSlot`, `detailSlot`, `summarySlot`, `errorsSlot`, `primaryActionSlot`, `auditSlot`, además de ancho mínimo/contexto de scroll.
- Nuevas pantallas componen templates; ninguna requiere componente especial de PrimeReact si ya existe equivalente estable verificado.

## 4. COMPONENTS — Primitivos/adaptadores, no duplicar
**Candidatos PrimeReact a validar en repo:** Button, InputText, AutoComplete, Dropdown/Select, DataTable, Dialog/Drawer, InputNumber, Calendar/DatePicker, FileUpload, Toast, ConfirmDialog, Toolbar, Skeleton, Tag/Message. No fijar API de PrimeReact 10.9.9 sin comprobar instalación.

Componentes propios sólo para lenguaje de dominio:
- `StatusLabel`: texto+ícono+color, sin depender solo de color.
- `MoneyBreakdown`, `DenominationCounter`, `StockAvailability`, `UomPicker`, `PriceRuleExplanation`.
- `EvidenceCaptureQueue`, `PermissionGate` (solo UX; servidor valida), `ApprovalRequest`, `EntityAuditTrail`.
- `ZonePriorityQueue`, `CountLineEditor`, `DiscrepancyReview`, `AllocationGrid`, `ReconciliationMatchList`, `ReportCutHeader`.

Contrato de componente funcional: identidad/props, datos observables, estados (idle/loading/empty/error/forbidden/uncertain), eventos (request/confirm/cancel/retry-safe), slots, cardinalidad, límites, validación, a11y/teclado y breakpoints. Los números calculados los produce el servicio; UI solo formatea.

## 5. RESPONSIVE — comportamiento por región
Puntos de revisión **propuestos**: 1366 px desktop, 768 px tablet, 375 px móvil; probar también zoom 200 %, ventana reducida y modo horizontal, no asumir que tres tamaños certifican responsive.
- Desktop: lista y detalle lado a lado, resumen contextual persistente.
- Tablet: filtros compactos, detalle como panel, resumen accesible, sin scroll horizontal global.
- Móvil: explorador → detalle → confirmación progresiva; resumen/CTA anclado cuando proceda; tabla densa pasa a filas/tarjetas o desplazamiento **local claramente indicado**, jamás recortar acciones.
- DataTable con columnas priorizadas según tarea, filtros en panel colapsable, acciones críticas siempre disponibles al finalizar.
- Botón principal se fija según seguridad/caso, no confirma compra/ajuste sin ver discrepancias necesarias.
- Cantidades/importe siempre con formato y precisión de moneda/UOM; etiquetas y mensajes legibles.
- Pantallas largas preservan foco/scroll al cerrar modal; sin crear dos estados de formulario.

## 6. ACCESSIBILITY — contrato verificable
- Objetivo WCAG 2.2 AA **sujeto a prueba**, no certificación. Navegación teclado, etiquetas, error junto al control, foco restaurado, contraste, zoom 200 %, no depender sólo color.
- Atajos de caja/barcode no interceptan controles de texto, ni generan doble submit por scanner.
- Diálogos: foco inicial apropiado, atrapamiento/restauración de foco, Escape solo si estado permite salir sin perder datos.
- Mensajes live status para éxito/error/verificando, sin exceso de anuncios; acciones destructivas con nombre claro, no solo ícono.
- Dinero, diferencias, conteos y estados inciertos se leen en texto; semáforo 'rojo/urgente' accesible también sin percepción de colores.
- Evidencias/fotos requieren descripción relevante, no OCR automático como confirmación financiera.

## 7. Responsabilidades de estado y navegación
- `DomainStore` durable solo para drafts/operaciones en curso; Queries solo lecturas, sin copiar estado remoto arbitrariamente.
- `OperationSession` con id/revision y `idempotencyKey` al confirmar, modelo independiente de montaje visual; cambio de ruta/módulo no destruye operaciones.
- Dialogo nunca es autoridad para marcar dinero/stock confirmado. UI de "aprobado" deriva exclusivamente respuesta autorizada.
- Listas/filtros pueden conservarse en ruta y estado de sesión; drafts de operación con reanudación explícita y política de expiración.

## 8. Gates UI (documental)
Cada dominio debe especificar FLOW+SCREEN+TEMPLATE+COMPONENTS+RESPONSIVE+ACCESSIBILITY (paquetes hermanos) y casos para vacío/carga/error/permiso/UNKNOWN. Los contratos en `docs/pos-proofs/v0.1` se conservan históricos; no se reescriben. Las pruebas E2E, visual regression y axe quedan para etapa 4 y NO se ejecutan aquí.

