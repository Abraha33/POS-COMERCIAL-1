# Auditoría de consumo de tokens

Fuente: registros locales de Claude Code
(`C:\Users\acace\.claude\projects\D--POS-COEMRCIAL-1\`). Solo se sumaron los campos `usage`; no se copió
contenido ni credenciales. **Medido** = leído del registro. **Estimado** = derivado. **No disponible** = no hay dato.

## 1. Medido

### Sesión principal (`0285cdf9…jsonl`, modelo `claude-sonnet-5-5`)

| Métrica | Valor |
|---|---|
| Turnos del asistente | 736 |
| Entrada nueva (sin caché) | 1 530 |
| Escritura de caché | 6 837 988 |
| **Lectura de caché** | **219 576 136** |
| Salida | 1 950 878 |
| Contexto medio por turno (lectura + escritura) | ≈ 298 000 |
| Contexto máximo en un turno | 590 771 |
| Compactaciones | 1 |
| Rango temporal de registros | 14:03Z a 23:24Z (reloj, incluye esperas) |

Relación lectura de caché / salida ≈ **113 a 1**. El consumo lo domina releer un historial largo, no generar
código.

### Subagentes (15 archivos en `subagents/`)

| Métrica | Valor |
|---|---|
| Turnos | 1 082 |
| Lectura de caché | 165 293 385 |
| Escritura de caché | 7 466 924 |
| Contexto medio por turno | ≈ 153 000 |
| Más caro: contrato v0.5.0 | 144 turnos, 35,2 M de lectura de caché, 1,4 M escritura |
| 2.º y 3.º: POS (rediseño), núcleo de diseño | 20,2 M y 18,6 M de lectura |
| F (QA) | 12,4 M de lectura, 81 turnos |

Por tarea (lectura de caché): contrato 35,2 M · POS rediseño 20,2 M · núcleo diseño 18,6 M · QA 12,4 M ·
POS carril 11,3 M · clientes/cartera 10,8 M · productos 10,2 M · productos rediseño 8,4 M · clientes rediseño 7,4 M ·
compras 7,4 M · reportes rediseño 7,1 M · compras rediseño 6,4 M · reportes 5,2 M · administración 4,4 M.

**Los 5 rediseños por módulo (incluidos los detenidos) sumaron ≈ 49,6 M de lectura de caché (suma de
las cinco cifras de arriba) y ninguno está fusionado ni verificado.**

### Total

Lectura de caché: ≈ **385 M** (principal + subagentes). Escritura de caché: ≈ **14,3 M**.
El tamaño del archivo `edd12fdd…jsonl` (8,5 MB) es casi idéntico al de `0285cdf9…jsonl` (8,9 MB): parece ser
la misma conversación antes de continuar, así que **no se sumó** para no duplicar. [N] no confirmado.

## 2. Estimado y no disponible

- Salida de subagentes: los registros solo muestran 34 386 tokens en total, muy inferior a lo que reportan las
  notificaciones (`subagent_tokens` de 140 k a 370 k por agente). Son métricas distintas: **no sumar**; el dato
  de salida de subagentes es **no confiable**.
- Costo monetario: **no disponible**. `/cost` y `/usage` son comandos interactivos del terminal y no hay
  precios en los registros; no se estima un valor en dinero.
- Modelo de los subagentes: no figura en los `usage`; se asume el mismo que la sesión (`claude-sonnet-5-5`). [P]

## 3. Qué lo explica

| Hallazgo | Evidencia | Clasificación |
|---|---|---|
| Contexto de 300 k a 590 k por turno en el coordinador | medido arriba | [C] |
| Subagentes arrancan con ≈ 150 k de contexto efectivo (CLAUDE.md, docs, instalación, salidas de test) | 153 k de media por turno | [C] |
| Salidas largas de `vitest`/`core:check` entran al contexto | 46 `typecheck`, 27 `vitest`, 22 `core:check` en el coordinador | [P] (no se midió el tamaño de cada salida) |
| Informes finales de subagentes de 700 a 1 200 palabras reinsertados en el coordinador | 15 informes | [P] |
| Relanzar agentes tras el límite de uso | 7 agentes caídos (429), luego detenidos | [C] |
| Capturas de pantalla en contexto | 14 acciones `computer` y 5 imágenes de maqueta | [P] pequeño |
| Releer los mismos archivos | solo 3 `Read` en el coordinador: **no** es relectura de archivos | [C] |

Conclusión: el costo no viene de leer archivos repetidamente, sino de **conversación larga y agentes
concurrentes con contexto grande**.

## 4. Qué NO se puede afirmar

Ningún porcentaje de ahorro. Cualquier cifra de mejora debe salir del experimento de `PLAN_OPTIMIZACION.md`.
