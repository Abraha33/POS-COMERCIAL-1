## Actualización documental — 2026-10-12

La presente documentación histórica se conserva por trazabilidad. Para decisiones funcionales posteriores, consultar primero [PROJECT-STATE.md](PROJECT-STATE.md), [Registro de decisiones](decisions/2026-10-12-DECISION-REGISTER.md) y [Handoff Codex](PROJECT-HANDOFF-CODEX.md). En particular, el modelo financiero vigente es **estándar empresarial**; el frontend local Vite/PrimeReact requiere auditar su working tree. Ningún enlace de esta sección implica aprobación de contratos API, fiscalidad o pruebas reales.

# Handoff — ERP/POS Frappe Validation

Use this file to resume work from another chat without reconstructing the project history.

## Repository / branch

- Repository: `Abraha33/ERP-POS-Holamigo`
- Active research branch: `experiment/frappe-validation`
- Canonical roadmap: `docs/MASTER-PLAN.md`

## Current project direction

Build a commercial **web POS first**, then expand into ERP modules.

Initial sectors:

1. distributor;
2. hardware store;
3. restaurant later.

Planned frontend:

- React + TypeScript + Vite;
- TanStack Router / Query / Table;
- shadcn/ui + Tailwind;
- React Hook Form + Zod;
- Vitest + Playwright;
- Storybook as the living UI/component laboratory.

Candidate backend/business engine:

- Frappe + ERPNext.

Architecture is not considered final until the current validation program is completed.

## Validation method

```text
uncertainty
 -> reproducible test
 -> evidence
 -> PASS / CONDITIONAL / FAIL
 -> decision
 -> next uncertainty
```

Do not start implementing the production POS until the current Frappe validation has produced enough evidence.

## Current environment

Local Frappe Docker path:

`D:\frappe_docker`

Clean evaluation stack based on `pwd.yml`.

Current versions observed:

- Frappe 16.34.0
- ERPNext 16.35.0
- MariaDB 11.8

Development PC observed:

- Intel i7-7700
- 4 cores / 8 logical processors
- ~31.87 GB physical RAM
- Docker available memory ~15.55 GiB
- NVMe SSD available

This is **not** the separate ~8 GB laptop/server candidate. That machine must be benchmarked later in V11.

## Completed validation

### V0.1 — Hardware/environment

PASS.

### V0.2 — Existing old environment

Invalid for benchmarking.

Reason: persistent MariaDB system tables from an older version were incompatible with current MariaDB 11.8.

Important: this was not classified as a Frappe product failure.

### V0.2B — Clean environment

PASS.

Clean volumes were recreated.

Verified:

- DB healthy;
- backend up;
- frontend up;
- Redis up;
- workers up;
- scheduler up;
- websocket up;
- site `frontend` exists;
- HTTP localhost:8080 returned 200.

### V0.3 — Idle baseline

PASS.

12 idle samples:

- total container memory roughly 650 MiB;
- memory stable;
- almost all CPU at/near idle;
- occasional DB CPU spikes but no sustained load;
- no critical error matches at end of test.

Do not interpret 650 MiB as the complete host requirement; it measures container memory, not all Docker Desktop/WSL/host overhead.

### V1.0 — ERPNext setup/base model

PASS.

Verified by PowerShell/API:

- login as Administrator;
- company: `POS Validation SAS`;
- abbreviation: `PVS`;
- currency: COP;
- country: Colombia;
- fiscal year: 2026;
- standard warehouses exist.

### API helper microvalidation

PASS.

Validated Frappe list requests from PowerShell:

- session authentication;
- JSON `fields`;
- dictionary `filters`.

A prior JSONDecodeError was traced to our PowerShell serializer usage, not Frappe. Fix: pass the complete array to `ConvertTo-Json -InputObject`.

## Current active validation

### V1.1 — Product + price + inventory

IN PROGRESS.

Next test should create/verify entirely through PowerShell/API:

- `POS Warehouse - PVS`;
- item code `TEST-COCA-400`;
- item name `Coca Cola 400 ml`;
- item group `Products`;
- stock UOM selected from available UOMs;
- Standard Selling price = COP 3,500;
- stock before receipt;
- Material Receipt of 20 units;
- submitted Stock Entry;
- Bin actual quantity;
- Stock Ledger Entry.

Expected deterministic result:

```text
stock before = 0
receipt       = +20
stock after  = 20
ledger       = confirms +20
```

If the item already has stock other than 0 or 20, stop rather than silently changing test state.

## After V1.1

Continue in this order:

1. customer;
2. POS Profile;
3. POS Opening Entry;
4. first POS sale;
5. inspect stock immediately after sale, before closing;
6. POS Closing Entry;
7. inspect stock/ledgers again;
8. return;
9. verify final inventory and ledger effects.

Do not assume how ERPNext handles stock during an open POS session; this is one of the questions V1 exists to answer.

## GitHub tracking policy

The initial issues are intentionally **base/tracker issues**, not the final backlog.

As real work is discovered:

- create smaller concrete issues;
- update/close obsolete assumptions;
- link evidence to the relevant validation issue;
- record architectural decisions as ADRs.

The canonical complete plan is always:

`docs/MASTER-PLAN.md`


## GitHub tracking

Use these as the navigation entrypoints:

- #17 — master roadmap
- #1 — M0 Frappe/ERPNext validation tracker
- #3 — current active V1 functional validation
- `docs/GITHUB-TRACKING.md` — issue/milestone index

Milestone tracker issues:

- #1 M0 validation
- #8 M1 MVP/architecture
- #9 M2 POS Core
- #10 M3 Distributor + Hardware Store
- #11 M4 Offline/sync
- #12 M5 Productization/security/ops
- #13 M6 Pilots
- #14 M7 Commercial POS V1
- #15 M8 Restaurant
- #16 M9 ERP expansion

The connector used to set this up did not expose native GitHub Milestone creation, so `[MILESTONE M#]` tracker issues are the canonical milestone containers for now. Do not mistake that for a lack of roadmap structure.


## Decisión arquitectónica: perfiles componibles

La arquitectura objetivo no usa tipos de negocio rígidos.

```text
núcleo común de plataforma
 -> dominios
 -> capacidades/subdominios
 -> perfiles de negocio
 -> configuración por empresa
 -> extensiones a medida
```

Puntos clave:

- `POS Core` = núcleo del dominio POS, no núcleo total de la plataforma.
- El núcleo común también soportará Inventario, Compras, CRM, CxC, CxP, Reportes y futuros dominios.
- Ferretería, Distribuidora, Restaurante, etc. son **plantillas iniciales**, no límites.
- Una ferretería puede activar capacidades de restaurante (por ejemplo mesas/pedidos abiertos) si el negocio lo requiere.
- El sistema debe consultar capacidades habilitadas, no depender de `business_type` rígido.
- Diferencias visuales se resuelven con composición/configuración UI; diferencias de reglas/ciclo transaccional pueden ser capacidades/subdominios.
- Desarrollos a medida deben agregarse como extensiones sin duplicar/forkear el producto.

Ver también `docs/ADR-001-COMPOSABLE-PROFILES.md`.
