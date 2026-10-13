## Actualización documental — 2026-10-12

La presente documentación histórica se conserva por trazabilidad. Para decisiones funcionales posteriores, consultar primero [PROJECT-STATE.md](PROJECT-STATE.md), [Registro de decisiones](decisions/2026-10-12-DECISION-REGISTER.md) y [Handoff Codex](PROJECT-HANDOFF-CODEX.md). En particular, el modelo financiero vigente es **estándar empresarial**; el frontend local Vite/PrimeReact requiere auditar su working tree. Ningún enlace de esta sección implica aprobación de contratos API, fiscalidad o pruebas reales.

# GitHub Tracking Index

This file maps the canonical plan to the GitHub tracking issues.

## Important

The current GitHub connector does **not expose native Milestone creation**. Therefore, milestones are represented as explicit tracker issues named `[MILESTONE M#]`.

This is intentional and reversible. If native GitHub Milestones are created later, these tracker issues remain useful as milestone descriptions and checklists.

## Master roadmap

- #17 — **[ROADMAP] ERP/POS — seguimiento maestro**

## Milestone trackers

| Stage | Issue | Purpose |
|---|---:|---|
| M0 | #1 | Validate Frappe / ERPNext |
| M1 | #8 | Freeze MVP and architecture |
| M2 | #9 | POS Core vertical slice |
| M3 | #10 | Distributor + Hardware Store MVP |
| M4 | #11 | Offline + synchronization |
| M5 | #12 | Productization, security, operations |
| M6 | #13 | Real pilots and stabilization |
| M7 | #14 | Commercial POS V1 |
| M8 | #15 | Restaurant profile |
| M9 | #16 | ERP modular expansion |

## M0 validation issues

| Issue | State | Scope |
|---:|---|---|
| #2 | CLOSED / PASS | V0 environment + baseline |
| #3 | OPEN / ACTIVE | V1 functional POS model |
| #4 | OPEN | V2-V3 API + extensibility |
| #5 | OPEN | V4-V7 multitenancy / consistency / idempotency / permissions |
| #6 | OPEN | V8-V13 volume / performance / concurrency / cost |
| #7 | OPEN | V14-V18 tests / backup / upgrades / failure recovery / maintainability |

## Current active work

**Issue #3 — M0/V1**

Current next validation:

```text
V1.1
  -> POS Warehouse
  -> Item
  -> Item Price
  -> stock before
  -> Material Receipt +20
  -> submit Stock Entry
  -> Bin actual_qty
  -> Stock Ledger Entry
```

After that:

```text
Customer
 -> POS Profile
 -> POS Opening Entry
 -> first POS Invoice
 -> stock immediately after sale
 -> POS Closing Entry
 -> return
 -> final ledger verification
```

## Backlog rule

Do not expand these trackers into hundreds of speculative tasks.

Create a concrete issue when:

1. the work is understood enough to define acceptance criteria;
2. a real bug/risk/decision has appeared;
3. a validation produces a follow-up action;
4. implementation work is actually ready to start.

The tracker issues describe outcomes and exit gates. Concrete issues describe current work.
