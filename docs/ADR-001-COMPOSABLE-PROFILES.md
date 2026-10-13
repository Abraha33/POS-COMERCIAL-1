# ADR-001 — Arquitectura componible de dominios, capacidades y perfiles

## Estado

Accepted.

## Contexto

La plataforma debe servir a negocios muy distintos y, al mismo tiempo, permitir combinaciones no convencionales. Un negocio puede querer capacidades que normalmente pertenecerían a otro perfil. Por ejemplo, una ferretería puede querer usar mesas o pedidos abiertos.

Si el sistema se diseña con tipos rígidos de negocio, estas combinaciones obligarían a introducir condicionales por sector, duplicación de lógica o forks por cliente.

## Decisión

Usar una arquitectura componible:

```text
Núcleo común de plataforma
 -> Dominios
 -> Capacidades/subdominios
 -> Perfiles de negocio
 -> Configuración por empresa
 -> Extensiones a medida
```

### Núcleo común de plataforma

Responsabilidades transversales:

- empresa/tenant;
- usuarios;
- permisos;
- sedes;
- bodegas;
- auditoría;
- configuración;
- identidad/contexto;
- capacidades habilitadas.

### Dominios

Ejemplos:

- POS;
- Inventario;
- Precios;
- Compras;
- CRM;
- CxC;
- CxP;
- Reportes.

### Capacidades/subdominios

Un dominio puede exponer capacidades configurables.

Ejemplos dentro de POS:

- venta rápida;
- mesas;
- pedidos abiertos;
- venta por peso;
- venta por metro;
- modificadores;
- devoluciones;
- caja;
- pagos.

### Perfiles

Un perfil es una plantilla de configuración inicial.

Ejemplo:

```text
Ferretería
- POS rápido: ON
- cantidades decimales: ON
- venta por metro: ON
- mesas: OFF

Restaurante
- pedidos abiertos: ON
- mesas: ON
- modificadores: ON
- venta por metro: OFF
```

Una empresa puede modificar esa combinación dentro de límites seguros.

## Regla de diseño

Evitar:

```text
if business_type == "hardware_store"
```

Preferir:

```text
capabilities.tables = true
capabilities.open_orders = true
capabilities.fractional_quantities = true
```

## UI

Una diferencia meramente visual no crea un nuevo dominio. Se resuelve con composición/configuración de UI.

Una diferencia que cambia reglas de negocio o ciclo transaccional puede justificar una capacidad/subdominio.

## Extensiones a medida

Los desarrollos específicos de cliente deben implementarse como extensiones/capacidades cuando sea posible, sin modificar el núcleo ni crear una versión separada del producto.

## Consecuencias

- mayor flexibilidad entre sectores;
- perfiles reutilizables;
- menor duplicación;
- más fácil agregar nuevos sectores;
- requiere disciplina en boundaries y contratos entre dominios;
- el sistema de capabilities/configuración se vuelve una pieza arquitectónica importante.
