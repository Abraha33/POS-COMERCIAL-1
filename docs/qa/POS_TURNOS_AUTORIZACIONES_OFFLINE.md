# POS-F03 Turnos · POS-F12 Autorizaciones · POS-F13 Offline

Rama `feat/pos-ops` (desde `feat/pos-access`). Ruta `/pos/turno` (permiso `pos.sell`). Código en
`frontend/src/features/pos-ops/`. **Todo es simulación en el dispositivo**: ningún dato existe aún en el backend.

## 1. Auditoría de lo existente
| Capacidad | Dónde | Estado |
|---|---|---|
| Turno real (abrir, cerrar, movimientos) | `shared/api/pos.ts`, mocks, `features/pos` | integrado; no tiene pausa, relevo ni incidencias |
| Apertura por denominaciones | `features/pos-access` (F01/F02) | simulada, no persiste |
| Carritos suspendidos | `useHeldSales` (localStorage por caja) | local, funcional |
| Aprobación de supervisor | `/auth/supervisor-approvals` (PIN → token de un solo uso) | solo descuento / stock negativo / bajo costo |
| Idempotencia de venta | `clientOperationId` = `Idempotency-Key` | integrada |
| Indicador de red | `useOnlineStatus` (`navigator.onLine`) | solo red del dispositivo |
| Cola offline, política, bandeja, relevo | — | **no existía** |

## 2. Cobertura (niveles de terminación)
V = visual · I = interactiva · M = funcional con mocks · P = probada · Prod = lista para producción.
**Ninguna función está lista para producción**: dependen de mocks y de contratos que no existen.

| Función | V | I | M | P | Prod |
|---|---|---|---|---|---|
| F03 Turno activo (datos, estado, base) | ✔ | ✔ | ✔ | ✔ | ✘ |
| F03 Recuperar turno propio / rechazar caja ocupada | ✔ | ✔ | ✔ | ✔ | ✘ |
| F03 Pausar, bloquear, reanudar con reautenticación | ✔ | ✔ | ✔ | ✔ | ✘ |
| F03 Bloqueo por inactividad (configurable) | ✔ | ✔ | ✔ | ✔ (lógica) | ✘ |
| F03 Relevo (transferir / cerrar-e-iniciar, conteo, diferencia, autorización) | ✔ | ✔ | ✔ | ✔ | ✘ |
| F03 Incidencias (registrar, resolver) | ✔ | ✔ | ✔ | ✔ | ✘ |
| F03 Finalizar: revisión y paso a F10 (no cierra aquí) | ✔ | ✔ | ✔ | ✔ | ✘ |
| F03 Historial por rol | ✔ | ✔ | ✔ | parcial | ✘ |
| F12 Solicitar, bandeja, detalle, aprobar/rechazar | ✔ | ✔ | ✔ | ✔ | ✘ |
| F12 Cancelar, vencer, un solo uso, invalidar por cambio, sin autoaprobación | ✔ | ✔ | ✔ | ✔ | ✘ |
| F12 Auditoría por solicitud | ✔ | ✔ | ✔ | ✔ | ✘ |
| F13 Indicador y panel de sincronización | ✔ | ✔ | ✔ | ✔ | ✘ |
| F13 Política por operación (matriz) | ✔ | ✔ | ✔ | ✔ | ✘ |
| F13 Cola persistente, idempotencia, dependencias | — | ✔ | ✔ | ✔ | ✘ |
| F13 Resultado incierto, reintento, conflicto, revisión | ✔ | ✔ | ✔ | ✔ | ✘ |
| F13 Recarga/cierre durante envío, almacenamiento lleno | — | ✔ | ✔ | ✔ | ✘ |
| Integración con Venta rápida (descuento, cobro, suspender) | — | ✘ | ✘ | ✘ | ✘ |

## 3. Máquinas de estados
```
Turno:        activo ⇄ pausado → (activo|pausado) → finalizando → cerrado   (cerrado lo marca F10)
Autorización: pendiente → aprobada → ejecutada | pendiente → rechazada|cancelada|vencida | aprobada → vencida
Cola:         pendiente → enviando → confirmada | rechazada | revision | incierto | reintentable
              incierto → (consulta por clave) confirmada | reintentable ; enviando tras recarga → incierto
Conectividad: sincronizado · pendientes · sin-conexion · reconectando · sincronizando · con-errores · incierto
```

## 4. Permisos
| Acción | Cajero | Admin / Propietario |
|---|---|---|
| Operar y pausar su turno, relevar, incidencias | ✔ (solo el suyo) | ✔ |
| Solicitar autorización | ✔ | ✔ |
| Decidir autorizaciones | ✘ | ✔ (nunca la propia) |
| Ver bandeja completa / historial completo | solo lo suyo | ✔ |
Regla: la aprobación no concede permisos; solo habilita esa operación con esa huella, una vez.

## 5. Política offline (inicial, conservadora)
| Operación | Sin conexión |
|---|---|
| Buscar catálogo, preparar y suspender carrito | permitir |
| Venta en efectivo | condicionada: turno válido + política habilitada + fiscal validado (apagada por defecto) |
| Movimiento de efectivo | condicionado: turno válido |
| Transferencia, tarjeta, crédito nuevo, documento fiscal, autorización, apertura/relevo | **bloquear** |
La cola no guarda PIN, contraseñas, tokens ni datos de tarjeta.

## 6. Archivos
Nuevos: `features/pos-ops/{types,store,shift,authorization,offline,simulator,useOps}.ts`,
`{PosOpsPage,ShiftPanel,AuthPanel,SyncPanel}.tsx`, `pos-ops.css`, `index.ts`;
pruebas `src/tests/pos-ops-{shift,authorization,offline}.test.ts`, `pos-ops-ui.test.tsx`; `e2e/pos-ops.spec.ts`;
capturas `docs/qa/audit/pos-ops/`.
Modificados: `src/routes/index.tsx` (ruta), `src/shared/ui/components.css` (cierre de diálogos ≥ 44 px, antes parcheado
en tres módulos).

## 7. Resultados (medidos)
typecheck y lint sin errores · Vitest **339/339** (27 archivos; 51 nuevos) · build correcto ·
Playwright: pos-ops 4/4 (tres anchos con axe sin serias, controles ≥ 44 px, sin desborde, y flujo cajero→supervisor→cajero),
smoke y acceso 7/7.

## 8. Contratos de backend pendientes (Capa 5: no iniciada)
No se creó ningún endpoint ficticio. Hace falta definir y verificar:
1. Turnos: relevo, pausa/bloqueo, incidencias y su historial; unicidad de turno por caja (concurrencia entre terminales).
2. Autorizaciones: solicitud, decisión, ejecución única y verificación **en el servidor** de la huella; vigencias;
   evitar autoaprobación; auditoría; autenticación real del supervisor (no un código en pantalla).
3. Sincronización: endpoint idempotente por clave, consulta de resultado por clave, política de conflictos, aislamiento por
   empresa y sede, y estado fiscal (DIAN) de lo vendido offline.
4. Integración en Venta rápida: sustituir el PIN actual por solicitudes F12 donde aplique y encolar con F13.

## 9. Defectos, riesgos y límites
- **IndexedDB no usado**: la persistencia es `localStorage` (síncrono, ~5 MB, sin transacciones). Aceptable para prototipo;
  insuficiente para volumen real de ventas offline.
- Reautenticación y código de supervisor son **simulaciones de interfaz**: cualquier código de 4+ dígitos pasa.
- El efectivo esperado del relevo es editable y simulado (el turno real vive en `features/pos`; sin enlace entre ambos).
- Sin sincronización entre pestañas ni dispositivos reales: la bandeja "compartida" solo funciona dentro del mismo navegador
  y de la misma caja.
- "Resultado remoto" lo decide un simulador: no se verificó ningún comportamiento de red real.
- No verificado: concurrencia entre terminales reales, lectores de pantalla, navegadores distintos de Chromium,
  rendimiento con colas grandes, cuota de almacenamiento real.
- Venta rápida **no** consume aún F12 ni F13: el módulo es autónomo y no se modificó el flujo de venta.
