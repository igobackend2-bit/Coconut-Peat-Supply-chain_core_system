# Coco Pith Factory — Master Project State

**This file is the continuation point for every future AI coding session.**
Per `MASTER_PROMPT.md` §31 (Session Start Protocol), read this file first,
then `product-requirements.md`, `architecture.md`, `decisions.md`, and
`changelog.md`, before doing anything else. Do not assume prior work was
completed — verify it against the actual code and database state.

Last updated: 2026-10-05

## Current Version

v0.3.1 (pre-alpha — see `docs/changelog.md` for the version-by-version
history)

## Current Phase

**Phases 0–5 core complete; Phase 6 partial.** Every one of the 20
navigation modules now has a real, verified screen and API. Inbound,
Production/Quality, Inventory, Packing, Sales, Dispatch and Export are done
to "core" depth (see `docs/roadmap.md` for what each deliberately defers);
Maintenance and Workforce are done; Finance is **operational only** (no
general ledger, no IGO ERP integration — ADR-009); Memory is done without
embeddings; the AI layer is **rule-based analyzers that only propose, with
no LLM connected** (ADR-008). Reports, Audit & Activity and Settings (users,
roles, change password) exist. The front end was redesigned (ADR-010).

## Completed Modules

This section's header was stale ("None. No application code exists
yet.") for several turns after application code was actually added —
fixed now. Application modules implemented and live-verified (see
"Architecture Status" below for the verification detail on each):
- Audit logging (`AuditInterceptor`, `AuthFailureAuditFilter`,
  `@AuditLog`) — append-only `audit_events`, enforced at the DB level.
- Identity: register/login/logout/me, session-token auth, RBAC
  (`SessionAuthGuard` + `PermissionsGuard`).
- Master Data: Products, Suppliers, Customers, Warehouses (CRUD, RBAC-
  gated writes, audited).
- Frontend skeleton (`apps/web`): AppShell, routing for all 19
  `docs/design.md` §3 modules, a Dashboard that talks to the live API.

Documentation scaffolding completed:
- `MASTER_PROMPT.md`
- `docs/product-requirements.md`
- `docs/agents.md`
- `docs/design.md`
- `docs/architecture.md`
- `docs/actions.md`
- `docs/memory.md`
- `docs/decisions.md` (ADR-001 through ADR-006 — see "Architecture Status"
  below)
- `docs/changelog.md`
- `docs/project-state.md` (this file)
- Stub files for the remaining required docs (see "Open Decisions" below —
  these need real content, not just headings)
- Directory skeleton: `/ai`, `/database`, `/tests`, and `/apps/api`,
  `/apps/web` (per ADR-006 — supersedes the original flat `/src` layout
  from the Phase 0 scaffold)

## In Progress

Nothing is currently in progress. This is a stopping point awaiting the
next task — see "Next Priorities" below for the live list.

## Blocked

Nothing is blocked. All of Phase 1's foundational pieces (backend
skeleton, frontend skeleton, DB schema, audit pipeline, identity/RBAC,
first Master Data modules) are in place; later modules build on them
without any known blocker.

## Known Bugs

Open:
- **Rotate the legacy secrets.** The hardcoded Docker Hub password, HiveMQ MQTT
  password and Ethereum private key are removed from the working tree (v0.3.1)
  but are **still in git history** and must be treated as compromised — rotate
  them (see `docs/security.md`). `.kilo/worktrees/hot-nickel` still holds old copies.
- **Batch cost is material-only** (no wage/machine/overhead data) — shown as such.
- **Session token in `localStorage`** (XSS exposure); no SPA-level CSP.
- **Rate limiting is in-memory, per IP** — needs a shared store for >1 API instance.
- **`/reports/*` is role-gated, not `finance.read`-gated** (finance KPIs show on the dashboard).
- Dev-tooling advisories (47, all dev dependencies) — not shipped; production
  dependencies have 0.
- `PRODUCTION_MANAGER` (seeded by hand early on) holds only
  `production.batch.approve`, a code no route uses, so that role can read but not
  write anything.
- The dev database contains throwaway data and one dev account,
  `packing-test@example.com` (SUPER_ADMIN, password set during development) —
  change its password or deactivate it.

Fixed in v0.3.1: unauthenticated registration; role-less accounts reading business
data; deactivated users still able to authenticate; permission guard ignoring
class-level metadata; confidential memory copied into the audit log; no rate
limiting, headers or CORS scoping; legacy hardcoded secrets in the tree; forward
traceability stopping at packing; no committed integration tests; vulnerable
production dependencies; lint warnings.

## Architecture Status

**Implemented and verified (v0.3.0):** the remaining modules — Export,
Maintenance, Workforce, Finance, Memory, AI Agents, Reports, Audit &
Activity, Settings/users — plus a front-end redesign. Verification: 132 of
133 live API checks passed on the first run (the one miss was my own wrong
assertion); a rerun passed everything except three checks that depend on
the first run's data not existing; the whole Export chain, Memory
versioning, Settings and Finance's self-approval rejection were driven
through the real UI. Honest limits: no LLM; Finance has no ledger or ERP
sync; export traceability ends at the product; see "Known Bugs".


**Implemented and verified:** Dispatch core — `dispatches`, reusing
Gate & Weighment's `vehicles`/`drivers` tables directly. Can only be
created against a `CONFIRMED` sales order; status
`PENDING → DISPATCHED → DELIVERED`, cancellable from `PENDING` or
`DISPATCHED`. **Found and fixed a real bug via live testing**: the first
version's hard `UNIQUE(sales_order_id)` DB constraint meant a single
cancelled dispatch permanently blocked ever redispatching that order —
an entirely normal operational flow. Fixed by dropping the column-level
constraint and moving "at most one active dispatch per order" to a
service-level check (migration `0011_foamy_husk.sql`). Re-verified live
both ways post-fix: redispatch-after-cancel now succeeds, a second
concurrent active dispatch still correctly 409s. Full lifecycle also
verified: DRAFT-sales-order rejection, duplicate-active-dispatch
rejection, deliver-before-dispatch rejection (409), the full
PENDING→DISPATCHED→DELIVERED happy path with delivery notes, and
audit_events rows for every action. Deferred: `shipments`/
`delivery_confirmations` as separate tables, `gate_entries.direction =
OUTBOUND` integration — see `docs/changelog.md` v0.2.6.

**Implemented and verified:** Sales core — `sales_orders` and
`sales_order_items`. `DRAFT` orders build up freely; credit-limit
exposure (`SUM` of the customer's other `CONFIRMED` orders + this
order's total) is only checked at `confirm()`, a hard 409 naming the
exact projected exposure and limit — not an approval-workflow gate like
Procurement's PO threshold. `totalAmount` is server-recomputed after
every item add, never trusted from the client. Verified live end-to-end
via curl: one order under the customer's ₹150,000.50 limit confirmed
correctly, a second that would push combined exposure to ₹180,000
correctly 409'd with the exact numbers in the error; cancel, the
DRAFT-only item-add guard, and the zero-items confirm guard (400) all
verified; and in the browser (all three curl-created orders render with
correct status/total, the CONFIRMED order's line item resolves with the
correct SKU, zero console errors). Deferred: `quotations`, `invoices`,
price list lookup, a credit-limit-breach approval override — see
`docs/changelog.md` v0.2.5.

**Implemented and verified:** Packing core — `packing_orders` and
`packing_lots`. A packing order can only be created against a `RELEASED`
production batch (server-enforced 409, not a UI-only rule), status
lifecycle `PENDING → IN_PROGRESS → COMPLETED`, lot numbers server-
generated and unique. Verified live end-to-end via curl (full PO → Goods
Receipt → Raw Material Lot → Production Batch → Release → Packing Order
→ 2 Lots → Complete chain, plus the 409 against a non-RELEASED batch and
against adding a lot to a COMPLETED order) and in the browser (both
curl-created lots render correctly with resolved SKU, the create form's
batch dropdown correctly only lists RELEASED batches). Deferred: QR code
generation, pallet/container linkage — see `docs/changelog.md` v0.2.4.

**Implemented and verified:** Phase 4 core — Inventory's `stock_ledger`
(append-only, DB-trigger enforced) and computed `stock_balances`, plus
the last remaining Master Data gap, `vendors` API. Retrofitted ledger
writes into Production's batch input/output and Raw Material's goods-
receipt lot creation; found and fixed a real bug in the process (raw
material receipts weren't crediting the ledger, so consumed stock's
computed balance went permanently negative — see `docs/changelog.md`
v0.2.3 for the full transcript). Read-only by design at the API/UI level
— stock only ever moves as a side effect of a real business operation,
never via a direct write endpoint.

**Implemented and verified:** The remaining 7 Master Data entities now
have full API + UI: Departments, Employees, Locations, Machines, Units
of Measure, Packaging Types, QC Parameters. All Master Data entities
from `architecture.md` §3 now have working CRUD except `vendors`
(schema exists, no API/UI yet — the one remaining Master Data gap) and
Product Grades/Tax Configurations/Price Lists (deliberately deferred to
later phases). Closed a real, previously-flagged gap: Quality's "Add
Result" form used to require a hand-typed QC parameter UUID because
`/qc-parameters` didn't exist — it now has a real dropdown, verified
live against a real historical result (`EC — Electrical Conductivity`
resolved correctly instead of showing a truncated UUID). Full FK-chain
verified live via curl: unit of measure → QC parameter, warehouse →
location → machine, unit → packaging type, department → employee — all
correct, plus RBAC/audit confirmed for the new permission codes.

**Implemented and verified:** Real frontend UI (not placeholders) for
every backend module built so far — Master Data, Gate & Weighment,
Procurement (incl. the Approve/Reject workflow), Raw Material,
Production (full batch lifecycle), Quality — plus session-based auth
(login/logout/route guard). Verified live in a real browser: login,
create a product through the UI, create a real over-threshold PO and
watch Approve/Reject appear only for it, approve it, logout. See
`apps/web/README.md` and `docs/changelog.md` v0.2.0 for the full
transcript. Modules with no backend yet still correctly show
`PlaceholderPage`.

Documented (`docs/architecture.md`). Six ADRs recorded:
- **ADR-001:** Backend will be TypeScript/Node.js (supersedes the legacy
  Go/gRPC core for new modules; legacy Go code is retained, not deleted).
- **ADR-002:** Database will be plain self-hosted PostgreSQL (no Supabase;
  RLS/auth/storage/realtime to be implemented directly).
- **ADR-003:** Backend web framework will be NestJS.
- **ADR-004:** Database access/migrations will use Drizzle ORM.
- **ADR-005:** Frontend will be a Vite + React SPA (React Router), not
  Next.js.
- **ADR-006:** Monorepo layout is `/apps/api` (NestJS) + `/apps/web`
  (Vite), superseding the flat `/src` from the Phase 0 scaffold.

**Implemented and verified:** Phase 3 (Core Production) core deliverables
— Production Batches (full lifecycle: `IN_PROGRESS → COMPLETED →
(ON_HOLD →) RELEASED/REJECTED → CLOSED`) and Quality (QC Samples/Results
with server-side spec checking). The `approvals` mechanism from Phase 2
(Purchase Orders) was reused unchanged for QC-driven batch holds —
verified live with a real out-of-spec result correctly auto-holding a
batch, an unprivileged user correctly 403'ing on release, and an admin
correctly resolving the approval and releasing it. `process_steps` is
the one Phase 3 deliverable left undone by design (needs its own design
decision, not a stub — see `docs/roadmap.md` Phase 3). See `docs/api.md`,
`docs/permissions.md`, `docs/database-schema.md`, and `docs/changelog.md`
for full detail.

**Implemented and verified:** Phase 2 (Inbound) — Gate & Weighment
(Vehicles, Drivers, Gate Entries, Weighments), Procurement (Purchase
Orders with a real threshold-based approval workflow, Goods Receipts),
and Raw Material (Raw Material Lots). The full `Supplier → Vehicle →
Weighment → Raw Material Lot` traceability chain from
`product-requirements.md` §1 was built via the live API and confirmed
correct with a single SQL join. Duplicate-weighment prevention verified
two ways (DB `UNIQUE` constraint + service-level check). See
`docs/roadmap.md` Phase 2, `docs/api.md`, `docs/permissions.md`,
`docs/database-schema.md`, and `docs/changelog.md` for full detail.
Deferred from this phase (documented, not silently dropped): Purchase
Requisitions, Supplier Rates, Supplier Documents, partial goods
receipts, weighbridge hardware integration.

**Implemented and verified:** Identity API (register/login/logout/me,
session-token auth) and RBAC (`SessionAuthGuard` + `PermissionsGuard`),
plus four real Master Data CRUD modules — `/products`, `/suppliers`,
`/customers`, `/warehouses` — all using `@AuditLog` for real. The
`audit-demo` proof-of-concept controller has been removed. Two real
security issues were found by testing and fixed before being left in
place: a session-token leak into the audit log (fixed via `@AuditLog`'s
`redactResponseFields`), and a gap where 401/403 rejections were
invisible to `audit_events` because NestJS runs Guards before
Interceptors (fixed via a global `AuthFailureAuditFilter`). See
`docs/api.md`, `docs/permissions.md`, `docs/security.md` (all filled in
for real, no longer stubs) and `docs/changelog.md` for full detail and
the live verification transcripts (register → assign role → login →
CRUD with correct 401/403/409 → audit_events rows confirmed for every
case, including the two fixed gaps; and, for the Suppliers/Customers/
Warehouses follow-up, confirmed permission checks work per-entity and
that an already-logged-in session sees newly seeded permissions
immediately, without re-login).

**Implemented and verified:** `/apps/web` Vite + React + TypeScript SPA
(ADR-005) with React Router. Verified live in a real browser (not just
build/test): started both `apps/api` and `apps/web` dev servers, loaded
`http://localhost:5173`, confirmed the sidebar renders all 19 modules
from `docs/design.md` §3, clicked into a module route and saw the URL,
active-nav highlighting, and page content all update correctly, and
confirmed the Dashboard's live `GET /health` call to the NestJS API
succeeded cross-origin (4 requests, all 200 OK, zero console errors) —
this required adding `app.enableCors()` to `apps/api/src/main.ts`, a
small necessary backend change. 5 Vitest tests passing, `npm run build`
and `npm run lint` (oxlint) both clean.

**Implemented and verified:** `/apps/api` NestJS + Drizzle skeleton.
Verified by actually running it: `npm install`, `npm run build`,
`npm test` (1 passing unit test), `npm run lint` (clean), and
`npm run db:generate` (produced a real SQL migration at
`database/migrations/0000_optimal_miek.sql`). Migration was applied with
`drizzle-kit migrate` to a local `coco_pith_factory` PostgreSQL database
and the running server's `GET /health` and `GET /health/db` endpoints
were hit with curl — `/health/db` round-tripped a real query through
Drizzle to PostgreSQL and returned `{"status":"ok","db":{"ok":1}}`.
`/apps/web` is not yet started.

## Database Status

**65 tables exist** across 17 domains (public schema): Governance (`audit_events`,
`approvals`), Identity (7 tables), Master Data (17 tables), Gate &
Weighment (4 tables), Procurement (2 tables), Raw Material (1 table),
Production (3 tables), Quality (2 tables), Inventory (1 table,
`stock_ledger`), Packing (2 tables, `packing_orders`/`packing_lots`),
Sales (2 tables, `sales_orders`/`sales_order_items`), Dispatch (1 table,
`dispatches`), Export (6), Maintenance (4), Workforce (3), Finance (3),
Memory (1), AI (3) — see `docs/database-schema.md` for the full
breakdown. Verified with real
inserts/API calls across the
whole FK graph, spanning the Phase 1 Master Data chain (unit → product →
grade → QC spec; department →
employee → user → role → permission) and the Phase 2 traceability chain
(vehicle → gate entry → weighment → PO → goods receipt → raw material
lot), the latter joined back to confirm correct backward traceability.

A real bug was found and fixed in Phase 1: composite
`UNIQUE(tenant_id, code)` constraints were silently unenforced while
`tenant_id` is NULL for every row (NULL ≠ NULL in Postgres uniqueness).
Fixed to single-column uniqueness; regression-tested (duplicate SKU now
correctly rejected). Phase 2's duplicate-weighment prevention was
designed correctly from the start based on that earlier lesson (a
service-level check layered on top of, not instead of, a DB constraint).

`audit_events` (schema at `apps/api/src/db/schema/audit-events.schema.ts`,
migration `database/migrations/0000_optimal_miek.sql`) is **append-only,
enforced at the database level** by `BEFORE UPDATE`/`BEFORE DELETE`
triggers (`database/migrations/0001_enforce_audit_events_append_only.sql`,
per `docs/actions.md` §7) — verified via `psql`: a manual `UPDATE`/`DELETE`
against a test row both raised `audit_events is append-only: ... is not
permitted` and the row remained unchanged.

The audit-logging interceptor (`apps/api/src/common/audit/`) is
implemented and verified: a decorator (`@AuditLog`) marks which endpoints
produce audit rows, a global `AuditInterceptor` writes them on
success (`COMPLETED`) and failure (`FAILED`). Verified end-to-end against
the live server — `POST /audit-demo/ping` and `POST /audit-demo/fail`
both produced correct rows in `audit_events` (`conversation_id` picked up
from a request header, `request_id` auto-generated, response body
captured in `after_state`, error message captured in `reason` on
failure). See `changelog.md` for the exact commands/output.

`/database/seeds` has one file, `001-rbac-baseline.sql` (permission
catalog + `SUPER_ADMIN` role, re-run whenever new permission codes are
added — idempotent). `/database/functions` remains empty.
`docs/database-schema.md` is filled in for Identity, Master Data,
Governance, Gate & Weighment, Procurement, Raw Material, Production,
Quality, Inventory (core: `stock_ledger`), Packing (core:
`packing_orders`/`packing_lots`), Sales (core:
`sales_orders`/`sales_order_items`), and Dispatch (core: `dispatches`)
— Export, Maintenance, Workforce, Finance, AI, and Memory domains are
still to
come (see `docs/roadmap.md` Phases 4–6).

## AI Agent Status

Not started. `docs/agents.md` defines the 12-agent registry (A01–A12) and
governance rules. No agent runtime, tools, or policies exist yet under
`/ai`. This is expected to come after core transactional modules (Master
Data, Procurement, Production, Inventory) have working APIs and a real
audit-event pipeline, since every agent action must produce an auditable
event per `docs/actions.md` §4.

## Testing Status

`/tests/{unit,integration,e2e,ai,security}` (repo-root, cross-app) exist
as empty directories still — `docs/testing.md` is a stub.

`apps/api` has its own Jest setup with 18 passing unit tests across 5
suites (plus **43 integration tests** against a real database — see
`docs/testing.md`): `health.controller.spec.ts` (1), `audit.interceptor.spec.ts` (5
— including the redaction test), `auth-failure-audit.filter.spec.ts` (2),
`session-auth.guard.spec.ts` (3), `permissions.guard.spec.ts` (4). No
integration/E2E tests exist yet — `AuthService`/`ProductsService`/
`SuppliersService`/`CustomersService`/`WarehousesService`, and now the
Phase 2 services (`VehiclesService`, `DriversService`,
`GateEntriesService`, `WeighmentsService`, `PurchaseOrdersService`,
`GoodsReceiptsService`, `RawMaterialLotsService`) — all DB-heavy — were
instead verified live against a real running server and database (see
`changelog.md`), not via mocked-DB unit tests. This is a consistent,
deliberate choice for this project so far (not an oversight) — worth
reconsidering once there are enough DB-heavy services that the
live-verification time cost outweighs writing a shared DB-mocking test
helper. Still 15 unit tests total (Phase 2 added zero — pure-logic pieces
like guards already have coverage; Phase 2 had no new pure-logic pieces
of that kind).

`apps/web` has its own Vitest setup with 9 passing tests:
`src/app/routes.spec.tsx` (5 — redirect to login without a session, a
not-found page for unknown addresses, every navigation entry has a real
screen, route table covers every entry plus the fallback, navigation is
grouped into the seven sections) and `src/pages/Dashboard.spec.tsx` (4 —
API status and KPIs, only non-zero attention items listed, API-unreachable
error, empty state), both with `fetch` mocked so they don't depend on a
running backend.

## Deployment Status

Not started for the new system. The legacy Go system has a working
Docker Compose + K3s/kube-config deployment path (see root `docker-compose.yml`,
`kube-config/`, `core.dockerfile`) which remains as-is. `docs/deployment.md`
is a stub and needs a Node.js-based deployment story once Phase 1 code
exists.

## Next Priorities

**Current (as of v0.3.1), in order:**
1. **Rotate the leaked legacy credentials** (Docker Hub, HiveMQ, the Ethereum
   key) — only the owner can; then decide whether to purge git history.
2. **Phase 8 hardening that remains**: shared rate-limit store, HttpOnly-cookie
   sessions + CSRF (or an SPA CSP), MFA, backups, tenant isolation.
3. **Broaden the integration suite**: role × module × action permission matrix,
   per-mutation audit assertions, browser E2E.
4. **Resolve the two external unknowns** — the IGO ERP integration protocol
   (unblocks real Finance) and an LLM provider ADR (unblocks A01/A02/A07/A12).
5. Remaining deferred items listed per module in `docs/roadmap.md`
   (quotations/invoices, pallets, QR codes, process steps, tax, price lists).


**A full phase-by-phase implementation plan for the entire ERP now
exists at `docs/roadmap.md`** — read that first for anything beyond the
immediate next task; the numbered list below is the older, finer-grained
carry-over list and should be read as "Phase 1's remaining items,"
folded into `roadmap.md`'s Phase 1 section (which is now the
authoritative version of items #6–#10 below; kept here too so this
file's history stays intact rather than silently dropping items).

1. ~~Fill in `docs/database-schema.md` for Identity + Master Data~~ —
   **done**, see "Database Status" above and `docs/database-schema.md`.
2. ~~Stand up the NestJS project skeleton~~ — **done**, see "Architecture
   Status" and "Database Status" above (`apps/api`, verified working).
3. ~~Implement an audit-logging interceptor~~ — **done and verified**,
   see "Database Status" and "Testing Status" above. Known gap: it is not
   yet applied to any real business endpoint (only the `audit-demo`
   proof-of-concept controller uses `@AuditLog`), and it writes as a
   separate statement rather than inside the same transaction as a
   business write — see the "Known limitations" comment in
   `apps/api/src/common/audit/audit.interceptor.ts` for the documented
   trade-off. Revisit once real business modules exist.
4. ~~Build the Identity module API + RBAC + a first real Master Data CRUD
   module~~ — **done and verified live**, see "Architecture Status" and
   "Testing Status" above. `api.md`, `permissions.md`, `security.md` all
   filled in for real.
5. ~~Stand up the Vite + React SPA skeleton~~ — **done and verified**,
   see "Architecture Status" and "Testing Status" above (`apps/web`). The
   component library choice is still open — placeholder pages and the
   AppShell use plain CSS modules for now, not a design system.
6. Fix or formally deprecate the flagged hardcoded-credential issues in
   the legacy Go system (see "Known Bugs" above).
7. Consider adding Drizzle `relations()` definitions once real query
   patterns (e.g. "product with its grades") are needed — not done yet,
   see `docs/database-schema.md` "Not yet done".
8. ~~Replicate the Products CRUD pattern for other Master Data
   entities~~ — **Suppliers, Customers, Warehouses done and verified
   live**, see "Architecture Status" and `docs/api.md`. Remaining Master
   Data entities (machines, locations, departments, employees, units of
   measure, packaging types, QC parameters, tax configurations, price
   lists) or moving to a different domain (Procurement, Gate &
   Weighment) are both reasonable next steps.
9. A role/permission management API (currently direct-SQL only — see
   `docs/permissions.md`) and a self-service "first user becomes admin"
   bootstrap flow.
10. Wire the frontend (`apps/web`) to the real auth endpoints — it only
    calls `GET /health` so far (see `changelog.md`'s "Vite frontend
    skeleton" entry).

## Open Decisions

Needs a decision (and an ADR once decided) before Phase 1 implementation
can proceed cleanly:

- ~~Component library / design system~~ — **resolved: ADR-007**, custom
  design system (CSS tokens + `Badge`/`StatCard` components), not a
  third-party library, chosen for time-to-visible-result under a
  deadline. ADR-007 explicitly flags this for revisiting once the app
  grows past its current ~10 screens.
- Multi-tenancy model: `docs/architecture.md` includes `tenant_id` on
  every domain table, but the product requirements don't yet state
  whether this is genuinely multi-tenant (multiple factories/companies)
  or single-tenant with `tenant_id` reserved for future use.
- Whether/when to retire the legacy Go core, and what "functional parity"
  means concretely for the grading/cutting workflows it currently serves.
- LLM provider(s) for the AI Orchestration layer (`docs/architecture.md`
  §2 mentions "Ollama/local models where appropriate" and "Cloud LLM
  gateway where approved" — no specific provider has been chosen).

## Stub Documentation Files (need real content)

`database-schema.md`, `api.md`, `permissions.md`, `security.md`, and now
`roadmap.md` have since been written for real (this list keeps going
stale — three of these were filled in over prior turns and not removed
here until the next audit; fixed again now, `roadmap.md` added to the
"done" side this time). Remaining stubs, to be written as their modules
are implemented, not all at once, per MASTER_PROMPT.md §3:

`workflows.md`, `integrations.md`, `testing.md`, `deployment.md`,
`configuration.md`, `environment.md`, `setup.md`,
`troubleshooting.md`.
