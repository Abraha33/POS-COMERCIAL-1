# ERP/POS — Master Plan

> Canonical roadmap for building, validating, launching and expanding the ERP/POS platform.
>
> **Repository:** `Abraha33/ERP-POS-Holamigo`  
> **Validation branch:** `experiment/frappe-validation`  
> **Working principle:** evidence first. We do not program a major layer until the underlying assumptions have been validated.

---

## 0. Product direction

We are building a **commercial web POS first**, designed so that additional ERP modules can be added later without rebuilding the POS.

Initial commercial focus:

1. **Distributors**
2. **Hardware stores**
3. **Restaurants later**, after the common POS Core is stable

Long-term platform:

- POS
- inventory
- purchasing
- accounts receivable
- accounts payable
- reports
- payroll
- additional sector profiles

### Core technical direction to validate

```text
CUSTOM WEB FRONTEND
React + TypeScript + Vite + Storybook
          |
          v
POS CORE
our product logic / API boundary
          |
          v
FRAPPE + ERPNEXT
business engine
          |
          v
MariaDB + Redis
```

The frontend is ours. ERPNext is not intended to be the user-facing POS.

---

# 1. Delivery philosophy

The project is developed and maintained by **one person**, assisted heavily by AI.

Rules:

- small vertical slices;
- one uncertainty -> one test -> evidence -> decision;
- do not modify ERPNext core directly;
- reuse mature ERPNext behavior where it fits;
- custom behavior belongs in our own `pos_core` app;
- automated tests from the beginning;
- no large module is accepted merely because it “works on my machine”;
- each stage has an exit gate;
- future issues are created when the real work is understood; the base issues in GitHub are intentionally high-level.

---

# 2. Master roadmap

```text
M0  Validate Frappe / ERPNext
          |
          v
M1  Freeze MVP + architecture
          |
          v
M2  Build POS Core vertical slice
          |
          v
M3  Distributor + Hardware Store profiles
          |
          v
M4  Offline + synchronization
          |
          v
M5  Productization / security / operations
          |
          v
M6  Real pilots
          |
          v
M7  Commercial POS V1
          |
          +----> M8 Restaurant profile
          |
          +----> M9 ERP expansion modules
```

---

# M0 — Frappe / ERPNext technical validation

## Objective

Decide with evidence whether Frappe/ERPNext is a suitable engine for our commercial POS before committing the product architecture to it.

## Decision model

Every validation ends as:

- **PASS** — suitable as tested.
- **CONDITIONAL** — suitable with a documented compensating layer in POS Core or infrastructure.
- **FAIL** — unsuitable for the requirement.

## Validation program

### V0 — Environment and baseline

Validate:

- Docker / Compose;
- CPU, RAM and storage;
- clean Frappe / ERPNext environment;
- services healthy;
- HTTP access;
- idle CPU / RAM baseline;
- absence of critical errors.

### V1 — Functional POS model

Validate end-to-end:

- company;
- warehouse;
- item;
- UOM;
- price list and item price;
- initial stock;
- customer;
- POS Profile;
- POS Opening Entry;
- POS Invoice;
- payment;
- immediate inventory behavior;
- POS Closing Entry;
- return;
- stock after return;
- ledger effects.

Main question:

> Can ERPNext correctly represent the minimum business transaction model required by our POS?

### V2 — API suitability

Validate:

- login/session;
- API token alternative;
- CRUD;
- RPC / whitelisted methods;
- response sizes;
- error model;
- transaction boundaries;
- latency of frequent operations;
- ability for an independent React frontend to use the engine without Desk.

### V3 — Extensibility

Create a real custom Frappe app and validate:

- `bench new-app pos_core`;
- custom DocType;
- custom API;
- hooks;
- overrides only where justified;
- migrations;
- tests;
- app installation/removal;
- upgrade compatibility.

Main question:

> Can we build our product without patching ERPNext core?

### V4 — Multitenancy

Validate at least two tenants/sites:

- separate databases;
- tenant routing;
- user isolation;
- API isolation;
- backups per site;
- restore per site;
- resource implications.

### V5 — Transactions and consistency

Force failures during business operations and verify:

- commit;
- rollback;
- partial transaction prevention;
- inventory consistency;
- payment consistency.

### V6 — Duplicate requests / idempotency

Test:

- repeated sale POST;
- network timeout and retry;
- concurrent duplicate requests.

Expected outcome may be CONDITIONAL:

> If Frappe does not provide the required business idempotency, POS Core must own an idempotency key / operation registry.

### V7 — Authorization and permissions

Attempt unauthorized operations through the API:

- cashier changing prices;
- cashier changing configuration;
- cross-user access;
- cross-tenant access;
- direct API bypass attempts.

### V8 — Data volume

Prepare repeatable datasets:

| Scenario | Products | Customers | Sales / movements |
|---|---:|---:|---:|
| Small | 1,000 | 500 | 10,000 |
| Medium | 10,000 | 5,000 | 100,000 |
| Large | 50,000 | 20,000 | 500,000 |
| Stress | 100,000 | 50,000 | 1,000,000+ |

These are test scenarios, not assumptions about every customer.

### V9 — Operation benchmarks

Measure at minimum:

- login;
- product lookup;
- barcode lookup;
- price;
- stock;
- customer lookup;
- create sale;
- payment;
- retrieve sale;
- return;
- close cash session.

Capture:

- min;
- average;
- p50;
- p95;
- p99;
- max;
- errors;
- requests/sec;
- HTTP payload sizes;
- CPU;
- RAM;
- database behavior.

Internal interactive target to investigate: roughly **150–200 ms** for common POS interactions where technically reasonable. This is a product target, not a claimed Frappe guarantee.

### V10 — Concurrency

Test increasing load:

- 1 active register;
- 5;
- 10;
- 25;
- 50.

Find the actual breakpoint rather than assuming capacity.

### V11 — Low-cost / 8 GB server scenario

Repeat representative tests on the low-cost laptop/server candidate.

Do not extrapolate from the current 32 GB development computer.

### V12 — Cheap VPS

Repeat representative benchmarks on a small inexpensive VPS and compare cost/performance.

### V13 — Heavy reports vs POS

Run long/heavy reports while concurrent registers sell.

Determine whether heavy jobs can be separated using background workers so interactive POS latency remains acceptable.

### V14 — Automated testing

Validate:

- Frappe test runner;
- app-level tests;
- CI execution;
- fixture strategy;
- repeatability.

### V15 — Backup and restore

Test:

```text
create data
 -> backup
 -> destroy/recreate environment or site
 -> restore
 -> verify business data
```

A backup feature is not considered validated until restore succeeds.

### V16 — Upgrades / migrations

Validate:

- Frappe upgrade;
- ERPNext upgrade;
- `bench migrate`;
- custom app compatibility;
- automated regression tests after upgrade.

### V17 — Failure recovery

Intentionally interrupt:

- backend;
- worker;
- Redis;
- MariaDB;
- server/container runtime.

Record:

- data loss;
- automatic recovery;
- manual steps;
- recovery time.

### V18 — One-person maintainability

Measure actual operational burden:

- create tenant;
- deploy;
- update;
- backup;
- restore;
- diagnose failure;
- restart;
- monitor;
- migrate.

A technically capable stack can still fail our project if routine maintenance is too manual.

## M0 exit gate

Frappe/ERPNext may be accepted only when we can write a decision record containing:

- what passed;
- what failed;
- what is conditional;
- which responsibilities belong to POS Core;
- realistic infrastructure needs;
- realistic operational burden for one maintainer.

---

# M0 current status

As of this branch:

| Validation | Status | Evidence / note |
|---|---|---|
| V0.1 Hardware discovery | PASS | Development PC: ~31.87 GB physical RAM, i7-7700 4C/8T, NVMe available; Docker has ~15.55 GiB |
| V0.2 Existing environment | INVALID / contaminated | Old persistent MariaDB system tables were incompatible with MariaDB 11.8 |
| V0.2B Clean environment | PASS | Clean rebuild; DB healthy; all persistent services up; HTTP 200 |
| V0.3 Idle baseline | PASS | About 650 MiB total container memory, stable across 12 samples; no critical errors |
| V1.0 ERPNext base setup | PASS | Company `POS Validation SAS`, COP, Colombia, FY2026 and warehouses verified by API |
| API helper microtest | PASS | Session + `fields` + dictionary `filters` verified |
| V1.1 Product/price/stock | IN PROGRESS | Next active validation |

Important incident already learned:

- PowerShell arrays piped into `ConvertTo-Json` caused malformed Frappe `fields`; fixed by passing the complete array with `-InputObject`.
- This was a test-script defect, not a Frappe failure.

---

# M1 — Product definition and architecture freeze

Start only after M0 gives enough evidence to commit to Frappe/ERPNext.

## Scope

Freeze the commercial MVP for:

- distributor;
- hardware store.

Restaurant remains later unless evidence changes the plan.

## Define

- primary user roles;
- complete cashier flow;
- owner/admin minimum flow;
- product/search rules;
- price rules;
- discount rules;
- negative stock policy;
- cash opening/closing;
- payment methods;
- returns;
- inventory behavior;
- tenant/company/site strategy;
- deployment model;
- offline boundary;
- security model.

## Architecture artifacts

Create:

- `docs/MVP-SCOPE.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA-MODEL.md`
- `docs/API-CONTRACTS.md`
- `docs/OFFLINE-SYNC.md`
- `docs/SECURITY.md`
- `docs/TEST-STRATEGY.md`
- ADRs for important architectural decisions.

## Target frontend stack

Current planned stack:

- React;
- TypeScript;
- Vite;
- TanStack Router;
- TanStack Query;
- TanStack Table;
- shadcn/ui;
- Tailwind CSS;
- React Hook Form;
- Zod;
- Vitest;
- Playwright;
- Storybook.

### Storybook role

Storybook becomes the living UI laboratory:

```text
tokens
 -> components
 -> states/stories
 -> patterns
 -> pages
 -> production React
```

Penpot is optional for visual exploration, not required as the canonical implementation source.

## M1 exit gate

We can describe, without improvising:

> From login to closing cash, what exactly can a cashier do in the MVP, what data changes, and which layer is responsible for each rule?

---

# M2 — POS Core vertical slice

## Objective

Build the smallest complete sale from browser to ERP engine.

## Architecture

```text
React frontend
      |
      v
POS Core API / service layer
      |
      v
Frappe / ERPNext
```

React should not be tightly coupled to raw ERPNext document structures.

## Build order

### C1 Identity/context

- login;
- tenant/company;
- branch;
- warehouse;
- POS/register;
- user role.

### C2 Product lookup

Search by:

- name;
- SKU/code;
- barcode;
- reference.

Return a compact POS-facing DTO.

### C3 Pricing

Resolve:

- price list;
- UOM;
- price;
- applicable basic rules.

### C4 Cart

- add;
- remove;
- quantity;
- UOM;
- discount within permissions;
- totals.

### C5 First real sale

```text
search
 -> cart
 -> payment
 -> submit sale
 -> inventory result
 -> receipt
```

This is the first major product milestone.

### C6 Idempotency

A second `COBRAR` for the same operation must not produce a second sale.

### C7 Cash session

- open;
- sell;
- payment mix;
- close;
- expected vs counted.

### C8 Customer

- final consumer;
- identified customer;
- basic commercial information.

### C9 Returns

- retrieve original sale;
- select lines/qty;
- create return;
- verify inventory/accounting consequences.

### C10 Permissions

Minimum roles:

- cashier;
- administrator.

Authorization must be enforced server-side.

## M2 exit gate

A test can reliably execute:

```text
login
 -> open register
 -> search item
 -> add item
 -> select customer
 -> pay
 -> submit
 -> correct stock
 -> receipt
 -> return
 -> close register
```

---

# M3 — Distributor + Hardware Store MVP profiles

Profiles extend one Core; they are not separate products.

## Distributor profile

Initial capabilities:

- unit/package/case;
- price lists;
- simple volume pricing;
- many line items per sale;
- customer-based price context;
- fast product search.

Explicitly defer advanced:

- routes;
- pre-sales;
- picking/dispatch;
- complex credit;
- logistics.

## Hardware Store profile

Initial capabilities:

- unit;
- meter;
- kilogram;
- case;
- decimal quantities;
- variants;
- barcode;
- fast stock lookup.

Explicitly defer advanced:

- tool rental;
- project/job costing;
- complex quotes;
- special-order workflows.

## M3 exit gate

The same POS Core can operate both profiles with configuration/profile-specific behavior rather than duplicated sale code.

---


---

# Arquitectura componible: núcleo, dominios, capacidades y perfiles

Decisión canónica:

```text
NÚCLEO COMÚN DE PLATAFORMA
empresa | usuarios | permisos | sedes | bodegas | auditoría | multitenancy | configuración
        ↓
DOMINIOS
POS | Inventario | Precios | Compras | CRM | CxC | CxP | Reportes | etc.
        ↓
CAPACIDADES / SUBDOMINIOS
mesas | pedidos abiertos | venta por peso | venta por metro | modificadores | listas de precios | crédito | etc.
        ↓
PERFILES DE NEGOCIO
Ferretería | Distribuidora | Restaurante | Farmacia | etc.
        ↓
CONFIGURACIÓN DE CADA EMPRESA
activar/desactivar capacidades + reglas + límites + composición visual
        ↓
EXTENSIONES A MEDIDA
capacidades adicionales sin romper el núcleo ni duplicar el producto
```

Reglas:

1. El **POS Core** es el núcleo funcional del dominio POS, no el núcleo completo de toda la plataforma.
2. El núcleo común de plataforma debe servir también a inventario, compras, CRM, CxC, CxP y futuros dominios.
3. Un **perfil de negocio es una plantilla inicial componible**, no una jaula ni un tipo rígido.
4. La lógica no debe depender de condicionales globales como `if business_type == "hardware_store"`; debe consultar capacidades habilitadas y configuración.
5. Una empresa puede mezclar capacidades normalmente asociadas a otros perfiles. Ejemplo: una ferretería puede activar mesas/pedidos abiertos si su operación lo requiere.
6. Las diferencias solo visuales deben resolverse con composición/configuración de UI. Las diferencias que cambian reglas o ciclo transaccional pueden justificar una capacidad/subdominio.
7. Los desarrollos a medida deben agregarse como extensiones/capacidades, evitando forks por cliente.

Por tanto, M3 no significa construir POS separados para Distribuidora y Ferretería. Significa construir los primeros perfiles predeterminados sobre una arquitectura componible de dominios/capacidades.

# M4 — Offline and synchronization

## Objective

A register can continue selling during an internet outage and safely reconcile later.

## Components

- local IndexedDB data;
- locally cached catalog subset;
- local operation IDs;
- durable pending-operation queue;
- sync engine;
- retry/backoff;
- server idempotency;
- conflict policy;
- observable sync status;
- manual recovery path.

## Required failure cases

Test:

- internet disappears before submit;
- disappears after local confirmation;
- server receives request but client times out;
- app/tab closes with pending operations;
- browser/device restarts;
- price changes while offline;
- stock changes while offline;
- item disabled while offline;
- user loses permission;
- duplicate sync.

## M4 exit gate

No accepted local sale may silently disappear or be duplicated after reconnect.

---

# M5 — Productization, security and operations

Software becomes a maintainable SaaS product.

## Productization

- automated onboarding;
- tenant/company provisioning;
- branch/warehouse/register setup;
- CSV/Excel migration path;
- user creation;
- reset/recovery flows;
- configuration defaults.

## Security

- tenant isolation;
- server-side authorization;
- secrets;
- session/token strategy;
- audit events;
- rate limiting where necessary;
- dependency scanning;
- security regression tests.

## Reliability

- backups;
- tested restore;
- monitoring;
- logs;
- health checks;
- job/queue visibility;
- disk alerts;
- database alerts;
- sync failure alerts.

## Performance

Establish repeatable benchmark suite and budgets.

## Deployment

- staging;
- production;
- rollback;
- migrations;
- upgrade procedure.

## M5 exit gate

A new customer can be provisioned and operated without bespoke server work, and common incidents have documented/automated recovery paths.

---

# M6 — Real pilots

Do not scale sales yet.

## Pilot sequence

1. one distributor;
2. one hardware store;
3. expand to 3–5 businesses.

## Measure

- latency;
- failures;
- cashier confusion;
- onboarding time;
- support contacts;
- print/hardware problems;
- inventory discrepancies;
- cash-closing discrepancies;
- offline behavior;
- sync errors;
- time spent by the sole maintainer.

## Exit gate

At least several real businesses can operate daily without requiring constant manual intervention from the developer.

---

# M7 — Commercial POS V1

## Required product capabilities

- signup/onboarding strategy;
- plans/subscription strategy;
- tenant provisioning;
- user management;
- POS operation;
- basic inventory visibility;
- updates;
- backup/restore;
- monitoring;
- support path;
- documentation;
- migration/import;
- basic commercial analytics.

## Scale path

```text
5 customers
 -> 10
 -> 25
 -> 50
 -> 100
```

Infrastructure is scaled from measured demand, not estimates alone.

## Exit gate

The product can add customers without operational work growing linearly with every customer.

---

# M8 — Restaurant profile

Restaurant is intentionally later because its workflow differs substantially.

Initial restaurant MVP:

```text
table / counter
 -> open order
 -> add products
 -> simple modifiers
 -> reopen/edit
 -> pay
 -> close table/order
```

Reuse from Core:

- users;
- products;
- prices;
- payments;
- cash;
- permissions;
- customers where relevant;
- inventory primitives.

Initially exclude:

- delivery aggregators;
- advanced kitchen display;
- complex recipe costing;
- complex split bills;
- advanced reservations;
- multi-station production.

---

# M9 — ERP expansion modules

Build after POS V1 proves itself.

Preferred sequence:

```text
POS
 -> advanced inventory
 -> purchasing
 -> accounts receivable / credit
 -> accounts payable
 -> reports
 -> payroll
```

## Advanced inventory

- receipts/issues;
- adjustments;
- stock counts;
- transfers;
- min/max;
- inventory health;
- rotation;
- last count.

## Purchasing

- supplier;
- purchase order;
- receipt;
- cost;
- inventory impact;
- accounts payable link.

## Accounts receivable

- credit sale;
- balance;
- installments;
- payments;
- limits/rules;
- portfolio status.

## Accounts payable

- supplier obligation;
- payment;
- status.

## Reports

By user need:

- cashier;
- administrator;
- owner.

## Payroll

Separate domain, added only when the platform foundation is mature.

---

# 3. Issue-management rules

The issues initially created from this plan are **base tracking issues**, not a frozen backlog.

Rules:

1. Base issues describe outcomes, gates and major work streams.
2. When we learn the real implementation work, create smaller current issues.
3. Never treat the initial issue list as an exhaustive specification.
4. Close or rewrite obsolete issues when evidence changes the architecture.
5. Validation evidence should be linked from the relevant issue.
6. Important decisions become ADRs, not buried only in issue comments.
7. Another chat should read this file plus the current tracker issue before continuing.

---

# 4. Branch strategy

Current research:

`experiment/frappe-validation`

Suggested future branches:

- `docs/product-definition`
- `feature/pos-core-vertical-slice`
- `feature/profile-distributor`
- `feature/profile-hardware-store`
- `feature/offline-sync`
- `release/pos-v1`

Exact branch names may change; keep `main` protected from experiments.

---

# 5. Current next action

We are currently inside **M0 / V1 functional validation**.

Completed:

- clean environment;
- idle baseline;
- ERPNext base company;
- API list fields/filters validation.

Next:

**V1.1 — validate warehouse + Item + Item Price + initial stock + Stock Ledger entirely from PowerShell/API.**

After V1.1:

- customer;
- POS Profile;
- POS Opening Entry;
- first POS sale;
- stock before/after sale;
- close session;
- return;
- final ledger verification.

Only after M0 has enough evidence do we begin product programming.
