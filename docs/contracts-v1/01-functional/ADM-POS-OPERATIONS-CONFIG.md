# ADM/F14 — Configuración empresarial y operación POS

**Etapa 1: propuesta funcional, contratos en etapa 2/3.** Cobertura ADM-01..ADM-09 y POS F14. Sin implementación. Integración con ADR-001 capacidades, CAJ, TES, CAT, INV, COM y REP. **No incluir PED ni OFFLINE en este paquete**.

| ID | Flujo | Responsables/controles |
|---|---|---|
| ADM-01 | Alta y edición empresa: identidad fiscal, país, moneda, zona horaria, políticas y capacidades | Admin autorizado; cambios fiscales sensibles versionados/validados |
| ADM-02 | Sedes, bodegas, terminales, cajas y zonas → asignación y desactivación segura | No cambiar dueño de caja abierta sin relevo; zonas ≠ bodegas automáticamente |
| ADM-03 | Empleados/usuarios/roles/perfiles; invitar, activar, desactivar y asignar sedes | Permisos por acción + sede/caja/importe; no borrar rastro de exusuario |
| ADM-04 | Matriz autorizaciones: ejecutor, custodio, aprobador, verificador bancario, conciliador y auditor | Dos personas cuando política exige separación; excepción auditada |
| ADM-05 | Medios y destino: efectivo, bancos/Nequi/Daviplata/Bre-B, cuenta titular/QR/llave; responsables de verificación | QR/destino autorizado, cambios sensibles requieren revisión y vigencia |
| ADM-06 | Impresoras, escáneres, terminales/datáfonos y adaptadores de dispositivo | Inventariar capacidades, fallas/permisos; no asumir impresión exitosa tras enviar job |
| ADM-07 | Reglas fiscales y contables por empresa/país (delegadas) | Solo administradores con especialista; no validar DIAN mediante UI ficticia |
| ADM-08 | Habilitación de capacidades por perfil/empresa: caja, crédito, multi-UOM, conteo por zonas, recepción rápida | ADR-001: no usar business_type rígido |
| ADM-09 | Configuración e importación inicial: clientes, productos, precios, inventario y cuentas | Preview/dry-run, conflictos, migración idempotente, auditoría |

## Políticas de configuración
- Cambio en configuración no modifica transacciones ya publicadas: versionado y **fecha efectiva**.
- Contexto obligatorio para operaciones: empresa/sede/terminal/caja/turno/actor según dominio.
- Usuario puede operar en varias sedes sólo si autorizado; nunca filtrar datos de otra empresa.
- Cambiar la cuenta destino durante un pago iniciado no altera el PaymentAttempt existente; preservar snapshot de cuenta y mostrar advertencia.
- No permitir eliminar bodega/caja con stock, fondo o turnos activos; desactivar con procedimiento controlado.
- Dos clases de validación: sintáctica/configuración (backend) y legal/proveedor (externa) para fiscal/bancos.
- Configuración de conteos por zona: frecuencia, urgencia, permisos, restricciones, programaciones diarias, prioridad y corte temporal.
- Umbrales comerciales y financieros sin cifras hardcodeadas; reglas por empresa, rol, sucursal, fecha de vigencia.

## Excepciones
Cuenta receptora invalidada, supervisor desconectado, configuración parcial, cambio de sede activo, impresora no compatible, múltiples terminales una caja, permisos delegados vencidos, modificación concurrente de regla, importación incompleta.

## Criterios de aceptación
- Empresa nueva puede configurar sede+bodega+caja+terminal+roles+medio de pago sin editar código.
- Cambiar cuenta de banco no modifica pagos ya iniciados ni comprobantes asociados.
- Usuario sin privilegio no ve datos sensibles y **backend** rechaza acceso directo a comando.
- Zona de inventario puede cambiar período de revisión y semáforo sin alterar stock.
- Caja con turno abierto no puede desaparecer; cambio de responsable queda auditado.
- Periférico desconectado no altera venta ni emisión fiscal.
- Permisos actualizados aplican en la siguiente acción autorizable, incluyendo revocación; no confiar en flags de frontend cacheados.
- Importación inicial repetida no crea duplicados ni borra histórico.

## Validaciones pendientes
Cumplimiento fiscal por país, protección de datos, modelo exacto de tenant (site Frappe), compatibilidad hardware, matrices de rol y tratamiento de permisos offline (este último fuera de alcance de la iteración).

