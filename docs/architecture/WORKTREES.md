# Worktrees por carril

> **Vigente:** el proyecto oficial es `pos-proofs` / `feat/pos-proofs` (puerto 8082). Ver `AGENTS.md` y
> `docs/architecture/ENTORNO_OFICIAL.md`. La tabla de abajo es histórica.

Cada carril trabaja en su propio directorio (git worktree) y su propia rama. Raíz: `D:\POS-COMERCIAL-WORKTREES\`.
El repo principal (`D:\POS-COEMRCIAL-1`, rama `main`) lo usa el integrador.

| Worktree | Rama | Carril | Puerto (`DEV_PORT`) |
|---|---|---|---|
| `integration` | `integration` | integrador (junta carriles) | 5188 |
| `feat-pos` | `feat/pos` | F1 POS | 5191 |
| `feat-products-inventory` | `feat/products-inventory` | F2 productos e inventario | 5192 |
| `feat-purchases` | `feat/purchases` | F3 compras | 5193 |
| `feat-customers-ledger` | `feat/customers-ledger` | F4 clientes y cartera | 5194 |
| `feat-administration` | `feat/administration` | F5 administración | 5195 |
| `feat-reports` | `feat/reports` | F6 reportes | 5196 |
| `be-auth` | `be/auth` | B1 auth y aprobaciones | — |
| `be-shifts` | `be/shifts` | B2 caja y turnos | — |
| `be-sales` | `be/sales` | B3 ventas | — |
| `be-inventory` | `be/inventory` | B4 inventario y traslados | — |

B0 (instancia de desarrollo) no tiene rama propia: se resuelve primero y se comparte con los carriles `be/*`.

## Trabajar en un carril
```bash
cd /d/POS-COMERCIAL-WORKTREES/feat-pos/frontend
DEV_PORT=5191 pnpm dev        # app con mocks en su propio puerto
pnpm test && pnpm lint        # antes de cada PR
```
Backend contra su instancia:
```bash
cd /d/POS-COMERCIAL-WORKTREES/be-sales/frontend
API_BASE_URL=http://localhost:8000/api/v1 pnpm conformance
```

## Mantenerse al día
```bash
git rebase integration    # desde el worktree del carril; las ramas son locales, no hace falta remoto
```
Regla: solo se integra a `integration` con `pnpm test`, `pnpm lint` y `pnpm typecheck` en verde; `main` solo recibe
`integration` cuando `pnpm core:check` pasa.

## Gestión
```bash
git worktree list
git worktree remove ../POS-COMERCIAL-WORKTREES/feat-pos   # al terminar el carril (la rama se conserva)
```
Cada worktree tiene su propio `node_modules`; `pnpm install` reutiliza el store, así que es rápido.
