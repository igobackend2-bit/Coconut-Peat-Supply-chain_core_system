# Coco Pith Factory — Changelog

Format per `MASTER_PROMPT.md` §22. Every meaningful change records:
Date, Version, Module, Change, Reason, Developer/Agent, Affected Files,
Database Changes, API Changes, Migration, Tests, Risk, Status.

---

## 2026-09-29 — v0.0.1 — Scaffolding

**Module:** Repository / Documentation
**Change:** Initialized the Coco Pith Factory master documentation
structure (`/docs`, `MASTER_PROMPT.md`, `docs/project-state.md`,
`docs/decisions.md`) and the `/ai`, `/database`, `/src`, `/tests`
directory skeleton inside the existing `Coconut-Peat-Supply-chain_core_system`
repository, per the user's decision to have this repo supersede the
legacy Go/gRPC system.
**Reason:** User provided a full product/architecture/design/agents/
actions/memory specification and a master AI-development prompt, and
asked for the system to be scaffolded following the spec's own
"documentation-first" rule (MASTER_PROMPT.md §3) before any application
code is written.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `MASTER_PROMPT.md` (new)
- `docs/product-requirements.md`, `docs/agents.md`, `docs/design.md`,
  `docs/architecture.md`, `docs/actions.md`, `docs/memory.md` (new —
  copied/adapted from user-supplied specification)
- `docs/decisions.md` (new — ADR-001, ADR-002)
- `docs/project-state.md` (new)
- `docs/{database-schema,api,workflows,permissions,security,
  integrations,testing,deployment,configuration,environment,roadmap,
  setup,troubleshooting}.md` (new — stubs, not yet filled in)
- `/ai/{agents,prompts,tools,policies,memory,workflows}/` (new, empty
  directory skeleton)
- `/database/{migrations,seeds,functions}/` (new, empty directory
  skeleton)
- `/src/{modules,components,pages,services,hooks,lib,types}/` (new,
  empty directory skeleton)
- `/tests/{unit,integration,e2e,ai,security}/` (new, empty directory
  skeleton)
**Database Changes:** None yet. No migrations exist.
**API Changes:** None yet.
**Migration:** None.
**Tests:** None yet — no application code exists to test.
**Risk:** Low (documentation and empty directories only; no changes to
existing Go application behavior).
**Status:** Implemented and verified (directory/file creation confirmed
by listing). Application code is **not implemented** — this is
scaffolding only, consistent with MASTER_PROMPT.md §3's
documentation-first rule.

---

## 2026-09-29 — v0.0.2 — Backend/frontend/ORM stack decisions

**Module:** Architecture / Documentation
**Change:** Locked in three technology decisions that were left open
after the initial scaffolding, and recorded them as ADR-003, ADR-004,
ADR-005 in `docs/decisions.md`:
- ADR-003: NestJS as the backend web framework.
- ADR-004: Drizzle ORM for database access/migrations.
- ADR-005: Vite + React SPA (React Router) instead of Next.js for the
  frontend.
**Reason:** These were flagged as blocking "Open Decisions" in
`docs/project-state.md` after Phase 0 scaffolding. The user reviewed a
comparison of alternatives (Express/Fastify/NestJS;
Prisma/Drizzle/Knex+node-pg-migrate; Next.js/Vite SPA) and approved the
recommended options.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `docs/decisions.md` (ADR-003, ADR-004, ADR-005 added)
- `docs/project-state.md` (Architecture Status updated; these three items
  removed from Open Decisions; Next Priorities #2/#5 updated to reference
  NestJS/Drizzle/Vite specifically instead of "TBD")
- `docs/architecture.md` §2 (Technology Decisions section updated to name
  the concrete framework/ORM choices instead of generic placeholders)
**Database Changes:** None yet — no schema exists.
**API Changes:** None yet — no API exists.
**Migration:** None.
**Tests:** None yet — no application code exists to test.
**Risk:** Low (documentation only; no code written against these
decisions yet, so nothing to break).
**Status:** Implemented and verified (ADRs and cross-references confirmed
present in the three files listed above). No project scaffolding
(NestJS/Drizzle/Vite init) has been generated yet — that remains
`project-state.md` Next Priorities #2 and #5.

---

## 2026-09-29 — v0.0.3 — NestJS + Drizzle backend skeleton

**Module:** Backend / Database
**Change:** Stood up `/apps/api`, a working NestJS backend (ADR-003)
with Drizzle ORM (ADR-004) wired to PostgreSQL (ADR-002). Recorded the
monorepo layout split (`/apps/api`, `/apps/web`) as ADR-006, retiring the
flat root `/src` from the Phase 0 scaffold since NestJS and Vite each
need their own independent project root. Added a first-cut `audit_events`
Drizzle schema matching `docs/actions.md` §4, generated its migration
into `database/migrations/`, and added `GET /health` / `GET /health/db`
endpoints.
**Reason:** User asked to stand up the NestJS + Drizzle skeleton next
(Next Priority #2 from the previous session). Building it surfaced a
genuine architecture conflict — a single shared `/src` can't host two
independent Node build roots — which is documented and resolved in
ADR-006 rather than silently worked around.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `docs/decisions.md` (ADR-006 added)
- `docs/project-state.md` (Architecture/Database/Testing Status and Next
  Priorities updated to reflect verified reality)
- Root `/src` removed (superseded by ADR-006)
- `apps/api/` created: `package.json`, `tsconfig.json`,
  `tsconfig.build.json`, `nest-cli.json`, `.eslintrc.js`, `.gitignore`,
  `.env.example`, `drizzle.config.ts`, `README.md`,
  `src/main.ts`, `src/app.module.ts`,
  `src/db/{drizzle.provider.ts,drizzle.module.ts,schema/audit-events.schema.ts,schema/index.ts}`,
  `src/health/{health.controller.ts,health.controller.spec.ts}`
- `apps/web/` created as an empty placeholder root (not yet scaffolded)
**Database Changes:** New `audit_events` table (see
`database/migrations/0000_optimal_miek.sql`). Applied to a local
`coco_pith_factory` PostgreSQL dev database during verification. Not
wired to any interceptor yet — no application code writes to it.
**API Changes:** New `GET /health`, `GET /health/db` endpoints.
**Migration:** `database/migrations/0000_optimal_miek.sql` (generated by
`drizzle-kit generate`, applied by `drizzle-kit migrate`).
**Tests:** 1 Jest unit test added and passing
(`apps/api/src/health/health.controller.spec.ts`). No integration/E2E
tests yet.
**Risk:** Low. Purely additive — no existing Go application code or
behavior was touched. `npm install` pulled 730 packages with 27 known
vulnerabilities reported by `npm audit` (mostly moderate, some high) in
transitive dependencies of the NestJS/Drizzle toolchain, not yet
reviewed or remediated — should be triaged before any production use.
**Status:** Implemented and verified. `npm install`, `npm run build`,
`npm test`, `npm run lint` all ran successfully; `npm run db:generate`
produced correct SQL; the built server was actually started against a
real local PostgreSQL database and both health endpoints were hit with
curl, including a real round-trip query through Drizzle. Not yet
integrated with CI, and the flagged `npm audit` vulnerabilities have not
been reviewed.

---

## 2026-09-29 — v0.0.4 — Audit-logging interceptor + append-only enforcement

**Module:** Backend / Governance (Audit)
**Change:** Implemented the audit-logging pipeline required by
`docs/actions.md`: an `@AuditLog()` decorator to mark which endpoints
produce audit records, a global `AuditInterceptor` (registered via
`APP_INTERCEPTOR`) that writes `audit_events` rows on both success
(`COMPLETED`) and failure (`FAILED`), and a database-level append-only
enforcement (`BEFORE UPDATE`/`BEFORE DELETE` triggers that raise an
exception) so the append-only rule from `docs/actions.md` §7 holds even
outside the application layer. A demo controller
(`/audit-demo/ping`, `/audit-demo/fail`) proves the pipeline end-to-end
and should be removed once a real business module uses `@AuditLog` for
real.
**Reason:** User asked to implement the audit-logging interceptor next
(`project-state.md` Next Priority #3 from the previous session) — this
was explicitly called out as required before any business module, since
`docs/actions.md` requires every mutating operation to be logged from day
one.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/api/src/common/audit/audit-log.decorator.ts` (new)
- `apps/api/src/common/audit/audit.interceptor.ts` (new)
- `apps/api/src/common/audit/audit.interceptor.spec.ts` (new, 4 tests)
- `apps/api/src/common/audit/audit-demo.controller.ts` (new — POC only)
- `apps/api/src/common/audit/audit.module.ts` (new)
- `apps/api/src/app.module.ts` (imports `AuditModule`)
- `database/migrations/0001_enforce_audit_events_append_only.sql` (new)
**Database Changes:** Added `prevent_audit_events_mutation()` trigger
function and `audit_events_no_update` / `audit_events_no_delete` triggers
on `audit_events`.
**API Changes:** New `POST /audit-demo/ping`, `POST /audit-demo/fail`
(proof-of-concept only, not a real business endpoint).
**Migration:** `database/migrations/0001_enforce_audit_events_append_only.sql`,
applied to the local `coco_pith_factory` dev database.
**Tests:** 4 new Jest unit tests for `AuditInterceptor` (pass-through
when unannotated; COMPLETED write on success; FAILED write with reason on
error; header-based request/correlation ID propagation). All passing —
5/5 total across the `apps/api` suite. `npm run build` and `npm run lint`
both clean.
**Risk:** Low-medium. The interceptor writes as a separate statement, not
inside the same DB transaction as a business write (documented as a known
limitation in the interceptor's own doc comment) — a business write could
in principle succeed with its audit write failing, or vice versa, until
real business modules wire transactional coupling themselves. An
audit-write failure is caught and logged rather than surfaced to the
caller, so it fails safe for users but could silently produce a gap in
the audit trail if the DB is unreachable at that instant.
**Status:** Implemented and verified against a real running server and
real PostgreSQL database, not just unit-tested:
- Applied the append-only migration with `drizzle-kit migrate`.
- Via `psql`: inserted a test row, then confirmed both `UPDATE` and
  `DELETE` against it raised `audit_events is append-only: ... is not
  permitted` and the row was left unchanged.
- Started the built server against the real DB and sent
  `POST /audit-demo/ping` with an `x-conversation-id` header, and
  `POST /audit-demo/fail`.
- Queried `audit_events` afterward and confirmed both requests produced
  correct rows: the ping row has `status=COMPLETED`, the
  `x-conversation-id` header value correctly stored in `conversation_id`,
  an auto-generated `request_id`, and the response body captured in
  `after_state`; the fail row has `status=FAILED` and
  `reason='intentional demo failure'`.
- Not yet done: wiring `@AuditLog` onto any real business endpoint (none
  exist yet), and CI integration.

---

## 2026-09-29 — v0.0.5 — Identity + Master Data database schema

**Module:** Database / Identity / Master Data
**Change:** Implemented the Identity domain (`users`, `roles`,
`permissions`, `role_permissions`, `user_roles`, `user_sessions`,
`service_accounts`) and an expanded Master Data domain (`departments`,
`units_of_measure`, `employees`, `warehouses`, `locations`, `machines`,
`packaging_types`, `products`, `product_grades`, `qc_parameters`,
`product_grade_qc_specs`, `suppliers`, `customers`, `vendors`,
`tax_configurations`, `price_lists`, `price_list_items`) — 24 tables
total — as Drizzle schema, generated into a real migration, and applied
to a local PostgreSQL database.
**Reason:** User asked for the Identity/Master Data database schema next
(`project-state.md` Next Priority #1). Master Data was expanded beyond
`architecture.md`'s original minimal list to match
`product-requirements.md` §4.1's fuller scope (raw materials, vendors,
units of measure, packaging types, QC parameters, departments, tax
config, price lists), and `architecture.md` §3 was updated to match.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/api/src/db/schema/enums.ts` (new — `entity_status`,
  `uom_category`, `product_category`, `qc_data_type`)
- `apps/api/src/db/schema/master-data.schema.ts` (new — 17 tables)
- `apps/api/src/db/schema/identity.schema.ts` (new — 7 tables)
- `apps/api/src/db/schema/index.ts` (exports the new schema files)
- `database/migrations/0002_identity_and_master_data.sql` (new)
- `docs/architecture.md` §3 (Master domain table list reconciled with
  what was actually built)
- `docs/database-schema.md` (written for real — was a stub)
**Database Changes:** 24 new tables (see `docs/database-schema.md` for
the full list and relationships).
**API Changes:** None — schema only, no endpoints yet.
**Migration:** `database/migrations/0002_identity_and_master_data.sql`,
generated by `drizzle-kit generate`, applied by `drizzle-kit migrate` to
the local `coco_pith_factory` dev database (dropped and recreated
mid-session — see "Risk" below for why).
**Tests:** No new Jest unit tests (schema-only change; existing 5 tests
still pass, build and lint still clean). Verification was done via real
SQL against a real database (see "Status").
**Risk:** Low, but a real correctness bug was caught and fixed before
being left in place: the first version of this schema declared
`UNIQUE(tenant_id, code)`-style composite constraints on every
code/SKU/email column. Testing found that PostgreSQL treats `NULL` as
distinct from `NULL` for uniqueness, so with `tenant_id` NULL on every
row (multi-tenancy is still an open decision), these constraints did
**not** reject duplicate codes — a duplicate SKU insert silently
succeeded. Caught by testing (not by review), fixed by switching to
single-column uniqueness (see `database-schema.md`'s "Cross-cutting
design decisions" for the full explanation and future migration path),
and the fix was itself regression-tested. Because this was caught before
anything was committed to git, the flawed migration
(`0002_identity_and_master_data.sql`, first version) was deleted and
regenerated clean rather than patched with a follow-up migration — the
local dev database was dropped and recreated to test the corrected
version from scratch.
**Status:** Implemented and verified against a real running PostgreSQL
database:
- `drizzle-kit generate` produced correct SQL for all 24 tables.
- `drizzle-kit migrate` applied cleanly to a fresh database.
- Built a full realistic insert chain end-to-end: unit of measure →
  product → product grade → QC parameter → QC threshold spec, and
  department → employee → user → role → permission → role-permission →
  user-role, then joined both chains together in one query with correct
  results.
- Found, fixed, and regression-tested the uniqueness bug described above.
- `npm run build`, `npm test` (5/5 passing), `npm run lint` all clean
  after the schema changes.
- Not yet done: any API endpoints reading/writing these tables, RBAC
  enforcement code, seed data, Drizzle `relations()` definitions.

---

## 2026-09-29 — v0.0.6 — Vite + React frontend skeleton

**Module:** Frontend
**Change:** Stood up `/apps/web`: a Vite + React + TypeScript SPA
(ADR-005) with React Router, an `AppShell` implementing the left
navigation from `docs/design.md` §2/§3 (all 19 modules, driven by a
single `navigation.ts` source of truth shared with the route table), a
`Dashboard` page that calls the live NestJS API's `GET /health` and
renders the result, and a `PlaceholderPage` for every other
not-yet-built module. Added `app.enableCors()` to `apps/api/src/main.ts`
so the frontend can actually call the backend cross-origin. Added
`.claude/launch.json` with `web`/`api` dev-server configs.
**Reason:** User asked for the Vite frontend skeleton next
(`project-state.md` Next Priority #5). Verifying it required a live
frontend↔backend connection, which needed CORS enabled on the API — a
small, clearly-scoped backend change made in service of that
verification, not scope creep.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/web/` — full Vite scaffold (`npm create vite@latest . --
  template react-ts`) plus: `src/app/navigation.ts`, `src/app/routes.tsx`,
  `src/components/AppShell.tsx` + `.module.css`,
  `src/pages/{Dashboard,PlaceholderPage}.tsx`, `src/lib/api.ts`,
  `src/vite-env.d.ts`, `src/index.css` (replaced template styles),
  `vite.config.ts` (added Vitest config), `src/test/setup.ts`,
  `.env.example`, `README.md`; template-only files removed
  (`App.tsx`/`.css`, unused template assets)
- `apps/api/src/main.ts` (`app.enableCors()` added)
- `apps/api/.env` (new, local-only, gitignored — `PORT=3001` to avoid an
  unrelated process already on 3000 on this machine)
- `apps/web/.env.local` (new, local-only, gitignored — points at
  `http://localhost:3001`)
- `.claude/launch.json` (new)
**Database Changes:** None.
**API Changes:** None (CORS is transport-level, not a new endpoint).
**Migration:** None.
**Tests:** 5 new Vitest tests, all passing (`src/app/routes.spec.tsx`
×3, `src/pages/Dashboard.spec.tsx` ×2). `npm run build` (tsc + vite
build) and `npm run lint` (oxlint) both clean. Caught and fixed one real
TypeScript issue during build: `apps/web`'s `erasableSyntaxOnly` compiler
option rejects constructor parameter-property shorthand (`constructor(public
status: number)`), which `ApiError` originally used — rewritten as an
explicit field assignment.
**Risk:** Low. Purely additive frontend app; the one backend change
(CORS) is currently wide open (`app.enableCors()` with no origin
restriction) since there's no auth to scope it against yet — flagged in
`apps/web/README.md` and `apps/api/README.md` as something to revisit
once `docs/security.md` is written for real, not left silent.
**Status:** Implemented and verified in a real browser, not just
build/test:
- Started both `apps/api` (port 3001) and `apps/web` (port 5173) dev
  servers via `.claude/launch.json`.
- Loaded the app in the browser: sidebar correctly lists all 19 modules
  from `docs/design.md` §3.
- Clicked a module nav link and confirmed the URL, active-link
  highlighting, and rendered `PlaceholderPage` content all updated
  correctly.
- Confirmed the Dashboard's live health check actually worked:
  `read_network_requests` showed 4× `GET http://localhost:3001/health →
  200 OK` (React StrictMode double-invokes effects in dev, explaining the
  4 rather than 1), and `read_console_messages` showed zero errors.
- Not yet done: any real business screens beyond the Dashboard's health
  check, a chosen component library, auth-aware UI, CI integration.

---

## 2026-09-29 — v0.0.7 — Identity + Master Data API endpoints (auth, RBAC, Products CRUD)

**Module:** Backend / Identity / Master Data / Governance (Audit)
**Change:** Implemented real Identity API endpoints
(`POST /auth/register`, `POST /auth/login`, `POST /auth/logout`,
`GET /auth/me`) with bcrypt password hashing and opaque session-token
auth (SHA-256 hash stored, not the raw token); an RBAC mechanism
(`SessionAuthGuard` + `PermissionsGuard` + `@RequirePermissions`) reading
the `users → user_roles → roles → role_permissions → permissions` join
built in the previous schema session; and a first real Master Data CRUD
module (`GET/POST/PATCH /products`) using `@AuditLog` for real. Removed
the `audit-demo` proof-of-concept controller now that a real endpoint
proves the pattern. Added a baseline RBAC seed
(`database/seeds/001-rbac-baseline.sql`).
**Reason:** User asked for the Identity/Master Data API endpoints next
(`project-state.md` Next Priority #4).
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/api/src/modules/identity/` (new — `auth.service.ts`,
  `auth.controller.ts`, `identity.module.ts`, `types.ts`,
  `dto/{register-user,login}.dto.ts`,
  `guards/{session-auth,permissions}.guard.ts` (+ specs),
  `decorators/{require-permissions,current-user}.decorator.ts`)
- `apps/api/src/modules/master-data/products/` (new —
  `products.service.ts`, `products.controller.ts`, `products.module.ts`,
  `dto/{create-product,update-product}.dto.ts`)
- `apps/api/src/common/audit/audit-log.decorator.ts`
  (`redactResponseFields` option added)
- `apps/api/src/common/audit/audit.interceptor.ts` (redaction applied
  before writing `after_state`)
- `apps/api/src/common/audit/auth-failure-audit.filter.ts` (new)
- `apps/api/src/common/audit/audit.module.ts` (registers the new global
  filter alongside the existing interceptor)
- `apps/api/src/common/audit/audit-demo.controller.ts` (deleted)
- `apps/api/src/main.ts` (`ValidationPipe` added globally)
- `apps/api/src/app.module.ts` (imports `IdentityModule`, `ProductsModule`)
- `database/seeds/001-rbac-baseline.sql` (new)
- `docs/api.md`, `docs/permissions.md`, `docs/security.md` (written for
  real — were stubs)
**Database Changes:** None (schema already existed from the previous
session) — only data, via the new seed file.
**API Changes:** New `/auth/*` and `/products*` endpoints — see
`docs/api.md`.
**Migration:** None.
**Tests:** 10 new Jest unit tests (15 total, up from 5):
`session-auth.guard.spec.ts` (3), `permissions.guard.spec.ts` (4),
`auth-failure-audit.filter.spec.ts` (2), plus 1 new redaction test in
`audit.interceptor.spec.ts`. `AuthService`/`ProductsService` (DB-heavy)
were verified live instead of with mocked-DB unit tests — see "Status".
**Risk:** Medium, because two real vulnerabilities were found during
implementation and fixed before shipping, not left as theoretical risk:
1. **Session-token leak into the audit log.** The generic
   `AuditInterceptor` captures the full response body as `after_state`.
   `POST /auth/login`'s response contains the raw session token — left
   as-is, every login would have written its plaintext bearer token into
   `audit_events`, readable by anyone with audit-log access, defeating
   the point of only storing a hash in `user_sessions`. Fixed by adding
   `redactResponseFields` to `@AuditLog` and applying it to the login
   endpoint (`redactResponseFields: ['token']`).
2. **Guard rejections invisible to the audit trail.** NestJS's pipeline
   runs Guards before Interceptors, so when `SessionAuthGuard` or
   `PermissionsGuard` reject a request (401/403), `AuditInterceptor`
   never runs — access-denied attempts left zero trace in
   `audit_events`. Verified concretely: an unprivileged user's `403`
   attempt on `POST /products` produced the correct HTTP response but
   zero matching audit rows, before the fix. Fixed with a new global
   `AuthFailureAuditFilter` (`@Catch(UnauthorizedException,
   ForbiddenException)`) that writes a
   `module: SECURITY, entityType: access_attempt` row and then re-emits
   the exact original response body via `exception.getResponse()` — the
   client-visible behavior is unchanged, only the audit coverage is.

   Both were caught by live testing during this session, not by code
   review — underscoring why the "verified live" testing this project
   has been doing throughout is load-bearing, not optional.
**Status:** Implemented and verified against a real running server and
database, end-to-end, not just unit-tested:
- Registered an admin user, manually assigned `SUPER_ADMIN` (per the
  seed's documented bootstrap step), logged in, and confirmed
  `GET /auth/me` returned the correct roles/permissions from the real
  join query.
- `POST /products` without a token → `401`. With the admin token → `201`,
  correct row. `GET`/`PATCH` on that id worked. A duplicate-SKU `POST` →
  `409`.
- Registered a second, unprivileged user; confirmed `GET /products`
  succeeded (read needs only auth) while `POST /products` correctly
  returned `403 Forbidden` with a clear message.
- Queried `audit_events` after all of the above and confirmed every
  action — including the two failure classes described in "Risk" — was
  correctly recorded: `IDENTITY`/`user`/`CREATE`, `IDENTITY`/
  `user_session`/`LOGIN` (with `after_state.token = "[REDACTED]"`,
  confirmed via `after_state->>'token'`), `MASTER_DATA`/`product`/
  `CREATE`/`UPDATE`, a `FAILED` row with the exact conflict reason for
  the duplicate SKU, and — after the `AuthFailureAuditFilter` fix — two
  `SECURITY`/`access_attempt`/`REJECT`/`FAILED` rows for the 401 and 403
  cases, with correct `actor_type`/`actor_id` (`SYSTEM`/null for the
  unauthenticated 401, `USER`/the real user id for the authenticated
  403).
- `npm run build`, `npm test` (15/15), `npm run lint` all clean.
- Not yet done: role/permission management API, self-service admin
  bootstrap, frontend wiring to these endpoints, any Master Data module
  beyond Products.

---

## 2026-09-29 — v0.0.8 — Suppliers/Customers/Warehouses CRUD + project-state.md staleness fixes

**Module:** Backend / Master Data / Documentation
**Change:** Replicated the Products CRUD pattern (from v0.0.7) for three
more Master Data entities: `SuppliersModule`, `CustomersModule`,
`WarehousesModule`, each with its own service/controller/DTOs, gated by
`SessionAuthGuard` + `PermissionsGuard`, audited via `@AuditLog`. Added 6
new permission codes to `database/seeds/001-rbac-baseline.sql`
(`master_data.{supplier,customer,warehouse}.{read,write}`). Also: found
and fixed several stale sections of `docs/project-state.md` (Current
Version/Phase, Completed Modules, Blocked, and the "Stub Documentation
Files" list all still said things that stopped being true several turns
ago — e.g. "no application code exists yet" and a stub-files list that
still named `api.md`/`permissions.md`/`security.md`/`database-schema.md`,
all four of which had already been written for real in earlier turns).
**Reason:** User re-asked "Identity/Master Data API endpoints next" —
since that was already done for Products last turn, interpreted as
continuing to replicate the pattern per `project-state.md` Next Priority
#8's explicit list (suppliers, customers, warehouses). Separately, the
user asked that every code/config change, including local-only files, be
logged in `docs/changelog.md` going forward (saved as a standing
preference in this session's memory) — auditing `project-state.md` for
staleness while updating it surfaced the drift described above, worth
fixing rather than compounding.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/api/src/modules/master-data/suppliers/` (new —
  `suppliers.service.ts`, `suppliers.controller.ts`,
  `suppliers.module.ts`, `dto/{create-supplier,update-supplier}.dto.ts`)
- `apps/api/src/modules/master-data/customers/` (new — same shape;
  `customers.service.ts` additionally handles the `creditLimit`
  number↔string conversion for Drizzle's `numeric` column type via a
  `toColumns()` helper)
- `apps/api/src/modules/master-data/warehouses/` (new — same shape)
- `apps/api/src/app.module.ts` (imports the three new modules)
- `database/seeds/001-rbac-baseline.sql` (6 new permission codes added)
- `docs/api.md` (new "Master Data → Suppliers, Customers, Warehouses"
  section)
- `docs/permissions.md` (starter permission catalog table extended,
  live-verification note about permissions being looked up fresh per
  request rather than cached at login)
- `docs/project-state.md` (Architecture/Testing Status updated for the
  new modules; the staleness fixes described above)
**Database Changes:** None (schema already existed) — only data, via the
extended seed file (6 new `permissions` rows, 6 new `role_permissions`
grants to `SUPER_ADMIN`).
**API Changes:** New `/suppliers*`, `/customers*`, `/warehouses*`
endpoints — see `docs/api.md`.
**Migration:** None.
**Tests:** No new unit tests — consistent with the existing project
pattern of verifying DB-heavy services live rather than with mocked-DB
unit tests (see `project-state.md` Testing Status for the explicit
rationale). Existing 15 Jest tests still pass; `npm run build` and
`npm run lint` both clean after adding the three modules.
**Risk:** Low. Purely additive, same guard/audit pattern already proven
correct for Products. One thing worth flagging rather than treating as
free: Drizzle's `numeric` column type defaults to a `string` TS type (to
avoid float precision loss on money), so `CreateCustomerDto.creditLimit`
(a JSON number, for API ergonomics) has to be explicitly converted to a
string before being passed to Drizzle's `.values()` — done via
`CustomersService.toColumns()`, verified live (see "Status") rather than
just asserted to work from reading the types.
**Status:** Implemented and verified against a real running server and
database:
- Re-ran the extended seed; confirmed 6 new permission rows and 6 new
  `SUPER_ADMIN` grants inserted.
- Logged in as the existing `admin@example.com` (a session created
  *before* the new permissions were seeded) and confirmed
  `GET /auth/me` immediately listed all 6 new permission codes — proving
  permissions are resolved per-request from the DB, not cached at login.
- `POST /suppliers` → `201`; `PATCH` → `200` with updated status;
  duplicate `code` → `409`.
- `POST /customers` with `creditLimit: 150000.50` → `201` with
  `"creditLimit":"150000.50"` in the response (correct
  number→Postgres-numeric round-trip, confirmed again via a follow-up
  `GET`).
- `POST /warehouses` → `201`.
- All three `GET /<entity>` list endpoints returned correctly-shaped
  arrays.
- Registered/logged in as a second, unprivileged user: `GET /suppliers`
  → `200` (read needs only auth), `POST /suppliers` → `403 Forbidden`
  with the correct missing-permission message.
- Queried `audit_events` and confirmed correct rows for every action
  above, including the `SECURITY`/`access_attempt`/`REJECT` row for the
  403 (proving the `AuthFailureAuditFilter` from v0.0.7 generalizes to
  new entities without any per-entity wiring).
- `npm run build`, `npm test` (15/15), `npm run lint` all clean.
- Not yet done: remaining Master Data entities (machines, locations,
  departments, employees, units of measure, packaging types, QC
  parameters, tax configurations, price lists), a generic CRUD
  abstraction (deliberately not built yet — not justified with only 4
  entities), role/permission management API, frontend wiring.

---

## 2026-09-29 — v0.0.9 — Architecture finalized + full ERP roadmap

**Module:** Documentation
**Change:** Finalized `docs/architecture.md` to mark every domain's real
implementation status (✅/🚧/⬜) instead of presenting a static aspirational
table list, and added the three domains the original list was missing
entirely (Gate & Weighment, Raw Material, Packing, Export, Workforce —
required by `product-requirements.md` but absent from `architecture.md`
§3's original domain list). Rewrote `docs/roadmap.md` from a 9-line draft
stub into a full phase-by-phase implementation plan (Phases 2–8) for the
complete ERP, each phase listing concrete deliverables, dependencies, and
a definition of done, all following the build pattern already proven
across 8 prior changelog entries.
**Reason:** User asked to "make the architecture perfect" and get a
"plan for full ERP" — interpreted as: finalize `architecture.md` against
what's actually been built (it had drifted — see the `vendors` correction
below), and write the long-horizon roadmap the earlier stub explicitly
deferred ("this file should hold the longer-horizon phase plan once
Phase 1 is underway" — Phase 1 now has real, verified progress).
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `docs/architecture.md` (§1 diagram updated to show `apps/api`/`apps/web`
  concretely with status markers; §3 every domain annotated with ✅/🚧/⬜
  and its roadmap phase; 5 missing domains added: Gate & Weighment, Raw
  Material, Packing, Export, Workforce)
- `docs/roadmap.md` (full rewrite — Phases 2 through 8 detailed, plus an
  "Explicitly deferred / not phased" section for multi-tenancy and the
  generic-CRUD-abstraction question)
- `docs/project-state.md` (Next Priorities section now points to
  `roadmap.md` as the authoritative long-horizon plan; "Stub
  Documentation Files" list corrected again — `roadmap.md` moved to
  "done", and a note added that this list has now gone stale twice,
  worth checking on every future documentation-adjacent turn)
**Database Changes:** None.
**API Changes:** None.
**Migration:** None.
**Tests:** None applicable (documentation only).
**Risk:** Low, but one real inaccuracy was caught and fixed before
shipping: a first draft of the `architecture.md` edit claimed `vendors`
"not yet added to `master-data.schema.ts` despite being in this list" —
checked against the actual file
(`apps/api/src/db/schema/master-data.schema.ts`) before finalizing, found
`vendors` genuinely does exist there (built in the Identity/Master Data
schema session, v0.0.5), and corrected the claim before it was left in
the docs. A reminder that even documentation-only changes benefit from
the same "verify before asserting" discipline used for code.
**Status:** Implemented and verified — verification here means checking
documentation claims against the actual filesystem/codebase rather than
against a running server (nothing executable changed):
- Confirmed via `grep` that `vendors` exists in `master-data.schema.ts`
  before finalizing the architecture doc's claim about it.
- Confirmed via `find` that only Products/Suppliers/Customers/Warehouses
  have API modules under `apps/api/src/modules/master-data/`, backing
  every other Master Data entity's "API ⬜" status marker in
  `architecture.md`.
- Cross-checked `roadmap.md`'s Phase 1 "remaining items" list against
  `docs/permissions.md`'s starter permission catalog and
  `docs/api.md`'s endpoint list to avoid re-listing anything already
  done.
- Not yet done: this is a planning/documentation turn — no Phase 2+ code
  exists yet. Next concrete step is either finishing Phase 1's remaining
  Master Data entities or starting Phase 2 (Procurement/Gate &
  Weighment/Raw Material), per `roadmap.md`.

---

## 2026-09-29 — v0.1.0 — Phase 2: Procurement, Gate & Weighment, Raw Material

**Module:** Backend / Procurement / Gate & Weighment / Raw Material / Governance
**Change:** Implemented Phase 2 of the ERP roadmap: `GateWeighmentModule`
(Vehicles, Drivers, Gate Entries, Weighments), `ProcurementModule`
(Purchase Orders with a real threshold-based approval workflow, Goods
Receipts), `RawMaterialModule` (Raw Material Lots), and the Governance
domain's first table, `approvals`. 8 new tables total. Deferred (not on
the critical path, documented not silently dropped): Purchase
Requisitions, Supplier Rates, Supplier Documents, partial goods receipts,
weighbridge hardware integration.
**Reason:** User asked to start Phase 2 per `docs/roadmap.md`.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/api/src/db/schema/{enums,governance,gate-weighment,procurement,raw-material}.schema.ts` (new/extended), `schema/index.ts` updated
- `database/migrations/0003_phase2_procurement_gate_weighment_raw_material.sql` (new)
- `apps/api/src/modules/gate-weighment/**` (new — vehicles, drivers, gate-entries, weighments, each with dto/service/controller, one `GateWeighmentModule`)
- `apps/api/src/modules/procurement/**` (new — purchase-orders incl. approve/reject, goods-receipts, one `ProcurementModule`)
- `apps/api/src/modules/raw-material/**` (new — lots, one `RawMaterialModule`)
- `apps/api/src/app.module.ts` (imports the three new modules)
- `database/seeds/001-rbac-baseline.sql` (8 new permission codes)
- `docs/api.md`, `docs/permissions.md`, `docs/database-schema.md`, `docs/architecture.md`, `docs/roadmap.md`, `docs/project-state.md` (all updated for real)
**Database Changes:** 8 new tables — see `docs/database-schema.md`.
**API Changes:** New `/vehicles*`, `/drivers*`, `/gate-entries*`, `/weighments*`, `/purchase-orders*` (incl. `/approve`, `/reject`), `/goods-receipts*`, `/raw-material-lots*` — see `docs/api.md`.
**Migration:** `0003_phase2_procurement_gate_weighment_raw_material.sql`, generated and applied to the local dev DB.
**Tests:** No new unit tests (DB-heavy services, verified live per established project pattern). Existing 15 Jest tests still pass; build and lint clean.
**Risk:** Low-medium. PO approval threshold (₹100,000) is hardcoded, not configurable yet (documented TODO). Raw FK-violation errors (e.g. a nonexistent `vehicleId`) surface as unhandled 500s, not clean 4xx — a pre-existing gap, now more visible with more FK-heavy endpoints; documented in `database-schema.md`, not fixed this turn.
**Status:** Implemented and verified live against a real running server and database — full chain built via real curl calls (not raw SQL): vehicle → driver → gate entry → weighment (duplicate-weighment correctly rejected two ways: DB `UNIQUE` constraint and service-level check; invalid tare≥gross correctly rejected) → purchase order (both auto-approved-under-threshold and pending-approval-over-threshold paths, the latter through a real `/approve` call, double-approval correctly rejected) → goods receipt (correctly blocked against a non-approved PO) → raw material lot (correctly derives product/supplier from the PO, not from caller input; duplicate lot per receipt correctly rejected). A single SQL join from `raw_material_lots` back through `goods_receipts → purchase_orders` and `weighments → gate_entries → vehicles` confirmed correct backward traceability end-to-end. Every success and failure case confirmed present in `audit_events` with correct actor/status/reason. RBAC confirmed: an unprivileged user correctly 403'd on `POST /vehicles`. Not yet done: anything in "Deferred" above, plus Production (Phase 3) which will consume these raw material lots.

---

## 2026-09-29 — v0.1.1 — Unified application start script

**Module:** DevOps / Documentation
**Change:** Added `start.sh` at the repo root — starts `apps/api` and
`apps/web` dev servers together, stops both together on exit. Wrote
`docs/setup.md` for real (was a stub): prerequisites, repo setup, env
vars, DB setup, starting the app, common dev commands, migrations.
**Reason:** User asked to "implement the application start."
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `start.sh` (new, executable)
- `docs/setup.md` (written for real — was a stub)
**Database Changes:** None. **API Changes:** None. **Migration:** None.
**Tests:** N/A (shell script + docs). `apps/api` build/test still clean
(15/15) after these changes — confirmed, not assumed.
**Risk:** Low, but a real bug was found and fixed before the script was
left in its first form: a `trap cleanup EXIT INT TERM; cleanup() { kill 0; }`
approach (kill the script's own process group) was tried first and
**did not** actually stop the underlying `node` processes — verified
twice, by actually starting the script, confirming both servers
responded (curl to `/health` and to `5173/`), sending the equivalent of
Ctrl+C, and finding both `node` processes still bound to their ports
afterward. Root cause: each dev server is
`bash subshell → npm → nest/vite → node`, several process layers deep,
and `SIGINT` doesn't reliably propagate through all of them outside an
interactive terminal. Fixed by killing whatever is bound to the actual
configured ports instead of relying on process-group signal propagation
— verified that the fixed kill-by-port logic itself works correctly
(used directly, standalone, to clean up the very leftover processes the
buggy version produced).
**Status:** Partially verified — being precise about the boundary rather
than overclaiming:
- **Verified live:** `start.sh` actually starts both servers together
  (confirmed via `curl` to both `http://localhost:3001/health` — the
  full Phase 1+2 route table logged correctly — and
  `http://localhost:5173/`), and the kill-by-port cleanup mechanism
  itself correctly terminates a process bound to a given port (used
  directly multiple times during this session's testing to clean up).
- **Not fully verified:** genuine interactive Ctrl+C-in-a-terminal
  behavior. Testing that specific path within this session hit a
  tooling constraint — signals sent to a backgrounded process from a
  *separate* sandboxed tool call did not reliably reach the process at
  all (even the original buggy version showed no reaction to repeated
  `kill -INT`), which reads as a cross-tool-call signal-delivery
  limitation of this environment, not evidence about how the script
  behaves under a real interactive Ctrl+C. The fix is the more robust
  design regardless (kill-by-port doesn't depend on process-group
  semantics at all), but this specific claim — "Ctrl+C in your own
  terminal cleanly stops both servers" — should be treated as
  logically-sound-but-not-empirically-confirmed-in-this-session, and is
  flagged as such in `docs/setup.md` rather than asserted as verified.

---

## 2026-09-29 — v0.1.2 — Phase 3: Production, Quality (core deliverables)

**Module:** Backend / Production / Quality / Governance
**Change:** Implemented Phase 3's core deliverables per `docs/roadmap.md`:
`ProductionModule` (Production Batches with a full status lifecycle,
Batch Inputs consuming raw material lots, Batch Outputs) and
`QualityModule` (QC Samples, QC Results with automatic spec-checking
against Master Data's `product_grade_qc_specs`). The `approvals`
mechanism built for Purchase Orders in Phase 2 was reused unchanged for
QC-driven batch holds. 5 new tables. Deliberately deferred (documented,
not silently dropped): `production_orders`, `process_steps` (needs its
own design — configurable per-product process templates), `machine_runs`,
`wastage_records`, `qc_plans`, a distinct `qc_tests` entity, `corrective_actions`,
a dedicated `qc_decisions` table.
**Reason:** User asked to start Phase 3 per `docs/roadmap.md`.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/api/src/db/schema/{enums,production,quality}.schema.ts` (new/extended), `schema/index.ts` updated
- `database/migrations/0004_phase3_production_quality.sql` (new)
- `apps/api/src/modules/production/**` (new — batches with inputs/outputs/complete/release/reject/close, one `ProductionModule`)
- `apps/api/src/modules/quality/**` (new — samples/results, one `QualityModule`)
- `apps/api/src/app.module.ts` (imports the two new modules)
- `database/seeds/001-rbac-baseline.sql` (4 new permission codes)
- `docs/api.md`, `docs/permissions.md`, `docs/database-schema.md`, `docs/architecture.md`, `docs/roadmap.md`, `docs/project-state.md` (all updated for real)
**Database Changes:** 5 new tables — see `docs/database-schema.md`.
**API Changes:** New `/production-batches*` (incl. `/inputs`, `/outputs`, `/complete`, `/release`, `/reject`, `/close`) and `/qc-samples*` (incl. `/results`) — see `docs/api.md`.
**Migration:** `0004_phase3_production_quality.sql`, generated and applied to the local dev DB.
**Tests:** No new unit tests (DB-heavy services, verified live per established project pattern). Existing 15 Jest tests still pass; build and lint clean.
**Risk:** Low-medium. Batch input consumption does not yet follow the ledger model (`architecture.md` §4) — it directly marks a raw material lot `CONSUMED` rather than writing a `stock_ledger` entry, because `stock_ledger` doesn't exist yet (Inventory, Phase 4). This is the documented, deliberate simplification the roadmap itself flagged as a real future retrofit, not an oversight.
**Status:** Implemented and verified live against a real running server and database — the full chain built via real curl calls: production batch created → blocked from completing with zero outputs (400) → raw material lot consumed as batch input (lot correctly flipped to CONSUMED; reusing the same lot correctly 409'd) → output recorded → batch completed → QC sample created → an out-of-spec result recorded (measured 2.5 against a 0.5–1.0 spec) → batch correctly auto-transitioned to ON_HOLD with a PENDING approval created → an unprivileged user's release attempt correctly 403'd → the admin's release correctly resolved the approval to APPROVED and moved the batch to RELEASED → a second release attempt correctly 409'd → batch closed. A single SQL join confirmed the full traceability chain — supplier → raw material lot → production batch → output → QC result — resolves correctly end-to-end. Every success and failure case, including the RBAC 403, confirmed present in `audit_events` with correct actor/status/reason. Not yet done: anything in "Deferred" above, plus Inventory (Phase 4) which owes the real ledger-backed consumption model.

---

## 2026-09-29 — v0.2.0 — Full frontend UI for every implemented module

**Module:** Frontend
**Change:** Built real, working screens for every backend module built so
far (Master Data, Gate & Weighment, Procurement, Raw Material,
Production, Quality) — the frontend was previously just a routed shell
with placeholders everywhere except the Dashboard health check. Added
session-based auth (login/logout, `RequireAuth` route guard), a generic
`ResourceListPage` component for the ~10 modules that are plain
list+create resources, and dedicated pages for Purchase Orders
(approve/reject workflow) and Production Batches (full multi-step
lifecycle) since those have real business logic the generic component
doesn't try to cover. Added a "Master Data" nav item (not in the
original `docs/design.md` §3 list — Products/Suppliers/Customers/
Warehouses needed a home).
**Reason:** User asked to "implement all modules" after seeing the
running application was API-only with no clickable UI.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/web/src/lib/auth.ts` (new — localStorage session)
- `apps/web/src/lib/api.ts` (rewritten — adds `apiPost`/`apiPatch`,
  bearer-token header, 401 auto-clears session)
- `apps/web/src/pages/Login.tsx` (new)
- `apps/web/src/app/RequireAuth.tsx` (new)
- `apps/web/src/components/AppShell.tsx` (+`.module.css`) — user info +
  logout added
- `apps/web/src/components/ResourceListPage.tsx` (+`.module.css`, new
  — generic list+create)
- `apps/web/src/components/Tabs.tsx` (+`.module.css`, new)
- `apps/web/src/pages/{MasterData,GateWeighment,Procurement,RawMaterials,Production,Quality}Page.tsx`
  (new)
- `apps/web/src/app/navigation.ts` (added `master-data`)
- `apps/web/src/app/routes.tsx` (rewritten — real pages wired in,
  `/login` public, everything else behind `RequireAuth`)
- `apps/web/src/app/routes.spec.tsx` (updated — auth-redirect test
  replaces the old direct-render assumption; route count 19 → 20;
  placeholder test moved to `/inventory`, since `/production` is now
  real)
- `apps/web/README.md` (rewritten — real status, not a skeleton
  description)
**Database Changes:** None. **API Changes:** None — frontend only, no
backend endpoints added or changed.
**Migration:** None.
**Tests:** `routes.spec.tsx` updated and passing (5/5 total, unchanged
count — one test rewritten, one retargeted). `npm run build` and
`npm run lint` both clean (3 non-blocking `oxlint` warnings about the
standard fetch-on-mount `useEffect` pattern in the three custom pages —
exit code 0, not a real issue, noted rather than silently ignored).
**Risk:** Low-medium. `QualityPage` requires typing a raw QC-parameter
UUID (no `/qc-parameters` API exists yet) — said plainly in the page's
own description rather than hidden, but it's a real UX gap until that
endpoint is built. `ResourceListPage`'s reference-field options silently
stay empty if their endpoint fails to load (documented trade-off — a
failed reference list shouldn't block the rest of the form from working).
**Status:** Implemented and verified in a real browser against the real
running backend, clicking through actual flows, not just build/test:
- Logged in as `admin@example.com` — redirected correctly from `/` to
  `/login` when unauthenticated, then to `/` on success.
- **Master Data**: existing products (created via curl in earlier
  sessions) rendered correctly in the table; created a brand-new product
  (`UI-TEST-001`) through the UI form — it appeared in the table
  immediately after submit, with zero console errors.
- **Procurement**: existing POs rendered with correct status; created a
  fresh ₹300,000 PO through the UI — it correctly landed
  `PENDING_APPROVAL` with **Approve/Reject buttons appearing only on
  that row** (verified other rows with different statuses correctly show
  no buttons); clicked Approve — status flipped to `APPROVED` and the
  buttons correctly disappeared.
- **Production**: existing CLOSED batch rendered correctly; clicking
  "Manage" on it correctly showed the terminal "This batch is closed."
  state rather than any action buttons (status-conditional rendering
  verified for at least one real state).
- Reference-field dropdowns (supplier/product selects in the PO form)
  correctly loaded real data from their respective APIs, including the
  product just created moments earlier in the same session.
- Logout correctly cleared the session and redirected to `/login`.
- Zero console errors observed across every page visited.
- Not yet done: Inventory/Packing/Sales/Dispatch/Export/Maintenance/
  Workforce/Finance/Reports/AI Agents/Audit & Activity/Memory/Settings
  screens (no backend exists for any of them yet — see
  `docs/roadmap.md`), a `/qc-parameters` picker, component library
  choice, automated E2E tests for any of today's new pages (verification
  was live/manual, consistent with this project's established pattern,
  not automated).

---

## 2026-09-29 — v0.2.1 — Dashboard + app-wide visual revamp

**Module:** Frontend
**Change:** Replaced the health-check-only Dashboard with a real KPI
dashboard (live counts for Products/Suppliers/Customers/Warehouses, POs
Pending Approval, Batches In Progress/On Hold, each fetched
independently and linking to its module) plus a "Needs Attention" panel
listing actual pending POs and held batches with quick links. Resolved
the long-open "component library" decision as ADR-007: a custom design
system (expanded CSS token set, global button/input/select base styles,
a new `Badge` component for consistent status coloring, a new `StatCard`
for KPI tiles) rather than adopting a third-party UI library. Retrofitted
`Badge` into every status column across the app (`ResourceListPage`'s
generic tables, Procurement, Production, Quality) so the whole app shares
one visual language, not just the new Dashboard.
**Reason:** User invoked `/engineering:system-design` asking to "make
dashboard and app more better, fully revamp." Followed the skill's
framework (requirements → high-level design → trade-off analysis,
adapted for a frontend/UX pass rather than backend system design) before
implementing.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `docs/decisions.md` (ADR-007 added)
- `docs/project-state.md` (component-library Open Decision resolved)
- `apps/web/src/index.css` (expanded token set; global `button`/`input`/`select` base styles)
- `apps/web/src/components/Badge.tsx` (+`.module.css`, new)
- `apps/web/src/components/StatCard.tsx` (+`.module.css`, new)
- `apps/web/src/components/AppShell.module.css` (nav active-state, spacing polish using new tokens)
- `apps/web/src/components/ResourceListPage.tsx` (auto-renders `Badge` for any `status`-keyed column)
- `apps/web/src/pages/Dashboard.tsx` (rewritten — real KPIs + Needs Attention, `.module.css` new)
- `apps/web/src/pages/Dashboard.spec.tsx` (rewritten for the new multi-endpoint fetch pattern)
- `apps/web/src/pages/{Procurement,Production,Quality}Page.tsx` (status displays switched to `Badge`)
**Database Changes:** None. **API Changes:** None — frontend-only, reuses existing endpoints.
**Migration:** None.
**Tests:** `Dashboard.spec.tsx` rewritten (3 tests: connected+counts,
unreachable error, empty-attention state) — all passing, one more test
than before (6/6 total across the suite, up from 5). `npm run build` and
`npm run lint` clean (same 3 pre-existing non-blocking warnings, exit 0).
**Risk:** Low. Purely visual/frontend, no API contract changes, so
nothing on the backend could regress. The one real trade-off (no
component library → no built-in accessibility primitives for future
complex widgets) is written into ADR-007 rather than left implicit.
**Status:** Implemented and verified live in the browser against the
real running backend:
- Dashboard: confirmed real counts rendered (5 products, 2 suppliers, 1
  customer, 1 warehouse, 0 pending POs, 0 in-progress/held batches — all
  matching actual DB state), "Needs Attention" correctly showed its
  empty state, zero console errors.
- Procurement: confirmed all three existing POs rendered with correctly
  color-coded `Badge`s (APPROVED/RECEIVED → green), zero console errors.
- Viewport had to be explicitly resized mid-session to see the full
  layout (the Browser pane's default responsive width in this session
  was narrow) — not an app bug, a tooling/pane-sizing quirk, noted so
  it's not mistaken for a real issue later.
- Not yet done: Badge/StatCard usage in the remaining custom pages'
  finer details (e.g. Production's inline status text next to the batch
  number was converted, but no broader layout redesign beyond what's
  listed here), no dark/light theme toggle UI (relies on OS
  `prefers-color-scheme` only, as before), no responsive/mobile pass.

---

## 2026-09-29 — v0.2.2 — Remaining Master Data entities: API + UI

**Module:** Backend / Frontend / Master Data
**Change:** Implemented API + UI for the 7 remaining Master Data
entities from `architecture.md` §3 that had schema but no API:
Departments, Employees, Locations, Machines, Units of Measure, Packaging
Types, QC Parameters. Each follows the exact established pattern
(service/controller/DTO/module, one `.write` permission, `@AuditLog`,
`ResourceListPage` tab in `MasterDataPage`). Also upgraded
`QualityPage`'s "Add Result" form from a hand-typed QC parameter UUID
(a gap flagged in an earlier session — `/qc-parameters` didn't exist
yet) to a real dropdown, and the QC Results table now resolves parameter
IDs to readable `CODE — Name` labels instead of truncated UUIDs.
**Reason:** User asked to "full module implement." Interpreted as
continuing the highest-value, lowest-risk remaining chunk — these 7
entities already had schema and were explicitly listed as "Phase 1
remaining items" in `project-state.md`, and QC Parameters specifically
closed a UX gap already on record — rather than attempting Phase 4+
(Inventory/Sales/Finance/etc., a much larger undertaking) in the same
pass and risking running out of budget mid-way, as flagged as a real
risk earlier in this session.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/api/src/modules/master-data/{departments,employees,locations,machines,units-of-measure,packaging-types,qc-parameters}/**`
  (new — 7 modules, each with dto/service/controller/module)
- `apps/api/src/app.module.ts` (imports all 7 new modules)
- `database/seeds/001-rbac-baseline.sql` (7 new permission codes)
- `apps/web/src/pages/MasterDataPage.tsx` (7 new tabs)
- `apps/web/src/pages/QualityPage.tsx` (QC parameter UUID input → real dropdown; results table resolves parameter names)
- `docs/api.md`, `docs/permissions.md`, `docs/architecture.md`, `docs/project-state.md` (updated for real)
**Database Changes:** None — schema already existed from the Phase 1
Identity/Master Data migration; this turn only added API/UI on top of it.
**API Changes:** New `/departments`, `/employees`, `/locations`,
`/machines`, `/units-of-measure`, `/packaging-types`, `/qc-parameters`
(all `GET`/`POST`) — see `docs/api.md`.
**Migration:** None.
**Tests:** No new unit tests (consistent with this project's established
pattern of verifying DB-heavy CRUD services live rather than with
mocked-DB unit tests). Existing suites still pass: `apps/api` 15/15,
`apps/web` 6/6. Both `npm run build` and `npm run lint` clean on both apps.
**Risk:** Low. Purely additive, same guard/audit/permission pattern
already proven correct 4+ times over (Products, Suppliers, Customers,
Warehouses, and now these 7).
**Status:** Implemented and verified live against a real running server
and database:
- Confirmed all 7 new routes exist and are correctly guarded (401, not
  404) on the running dev server without a restart (NestJS watch mode
  picked up the new modules automatically).
- Built a full FK-dependency chain via real curl calls: Department →
  Employee; Unit of Measure → QC Parameter; Warehouse → Location →
  Machine; Unit of Measure → Packaging Type — every relationship
  resolved correctly in the response bodies.
- Verified duplicate-code rejection (409) and RBAC (403 for a user
  without `master_data.department.write`) on a representative entity.
- Confirmed all 8 creates correctly appear in `audit_events` with
  `status: COMPLETED`, and the duplicate-code attempt with
  `status: FAILED` and the exact conflict reason.
- Live in the browser: Master Data page shows all 11 tabs (4 original +
  7 new), QC Parameters tab correctly lists both the pre-existing `EC`
  parameter and the new `TEST-MOISTURE` one created via curl. Quality
  page's historical out-of-spec result (from the Phase 3 verification
  session) now correctly displays `EC — Electrical Conductivity`
  instead of a truncated UUID, and the "Add Result" form's parameter
  field is a real populated dropdown, not a text box.
- Not yet done: `vendors` API/UI (schema exists, still a real gap),
  Product Grades/Tax Configurations/Price Lists (deliberately deferred),
  Phase 4+ domains (Inventory, Packing, Sales/Logistics, Export,
  Maintenance, Workforce, Finance, AI, Memory) — see `docs/roadmap.md`.

## 2026-09-30 — v0.2.3 — Phase 4 core: Inventory (stock ledger) + Vendors API

**Module:** Backend / Frontend / Inventory / Master Data
**Change:** Implemented the Inventory domain's core (`stock_ledger`,
append-only, plus computed `stock_balances`) and closed the last
remaining Master Data gap (`vendors` API). Retrofitted `stock_ledger`
writes into two existing services that previously mutated state without
a ledger trail: `ProductionBatchesService.addInput()` (now writes a
negative `RAW_MATERIAL_CONSUMPTION` entry alongside marking the lot
`CONSUMED`) and `addOutput()` (writes a positive `PRODUCTION_OUTPUT`
entry). While live-testing that retrofit, found a real bug: raw
material receipts never credited the ledger, so any consumed raw
material's computed balance went permanently negative with no way to
recover. Fixed by adding a `RAW_MATERIAL_RECEIPT` movement type
(migration 0007) and having `RawMaterialLotsService.createFromGoodsReceipt()`
write the missing credit entry. `VendorsModule` mirrors `SuppliersModule`
exactly (service providers — transport/maintenance/contract labour —
distinct from raw-material suppliers; schema already existed from Phase 1).
**Reason:** User asked to "implement all module fully analysis make more
better" — interpreted as: close the two remaining, already-scoped gaps
from `project-state.md`'s "Next Priorities" (`vendors` API, and Phase 3's
documented ledger debt in `production.schema.ts`'s doc comment) rather
than starting a new phase shallowly, and specifically look for
correctness issues while doing so (the "make more better" emphasis) —
which is how the one-sided-ledger bug was found and fixed rather than
shipped silently broken.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/api/src/db/schema/inventory.schema.ts` (new — `stock_ledger`)
- `apps/api/src/db/schema/enums.ts` (`stockMovementTypeEnum`, incl. the
  follow-up `RAW_MATERIAL_RECEIPT` addition)
- `apps/api/src/db/schema/index.ts` (barrel export)
- `apps/api/src/modules/inventory/{inventory.service.ts,inventory.controller.ts,inventory.module.ts}` (new — read-only)
- `apps/api/src/modules/master-data/vendors/{dto/create-vendor.dto.ts,vendors.service.ts,vendors.controller.ts,vendors.module.ts}` (new)
- `apps/api/src/modules/production/batches/production-batches.service.ts` (retrofit: `addInput`/`addOutput` write ledger entries)
- `apps/api/src/modules/raw-material/lots/raw-material-lots.service.ts` (retrofit: `createFromGoodsReceipt` writes the receipt credit)
- `apps/api/src/app.module.ts` (imports `InventoryModule`, `VendorsModule`)
- `database/seeds/001-rbac-baseline.sql` (`master_data.vendor.write`)
- `apps/web/src/pages/InventoryPage.tsx` (new — Balances/Ledger tabs, read-only by design)
- `apps/web/src/pages/MasterDataPage.tsx` (new Vendors tab)
- `apps/web/src/app/routes.tsx` (`inventory` wired to `InventoryPage`)
- `apps/web/src/app/routes.spec.tsx` (retargeted placeholder test from `/inventory` to `/packing`, since `/inventory` is real now)
- `docs/api.md`, `docs/permissions.md`, `docs/database-schema.md`, `docs/architecture.md`, `docs/roadmap.md`, `docs/project-state.md` (updated for real)
**Database Changes:**
- `0005_phase4_inventory_stock_ledger.sql` — creates `stock_ledger`.
- `0006_enforce_stock_ledger_append_only.sql` — `BEFORE UPDATE`/`BEFORE DELETE`
  triggers raising an exception, same pattern as `audit_events`.
- `0007_add_raw_material_receipt_movement_type.sql` — adds
  `RAW_MATERIAL_RECEIPT` to the `stock_movement_type` enum (found missing
  via live testing, not designed up front).
**API Changes:** New read-only `GET /stock-ledger`, `GET /stock-balances`
(computed, `id` synthesized as `productId:locationId`); new
`GET/POST /vendors` — see `docs/api.md`.
**Migration:** 0005, 0006, 0007 applied and verified against the local
PostgreSQL database.
**Tests:** No new unit tests (consistent with this project's established
pattern of verifying DB-heavy services live). Existing suites still pass:
`apps/api` 15/15, `apps/web` 6/6 (after retargeting the stale placeholder
test). Both `npm run build` and `npm run lint` clean on both apps.
**Risk:** Low-medium. The ledger write is retrofitted into two existing,
already-tested services rather than being a new isolated module, so the
main risk was regressing Production's batch flow — verified unaffected
by re-running the full PO→GoodsReceipt→Lot→Batch chain end-to-end.
**Status:** Implemented and verified live against a real running server
and database:
- Built a full chain via real curl calls: Purchase Order → Goods Receipt
  → Raw Material Lot (200kg) → Production Batch input consumption →
  output — confirmed `stock_ledger` rows written with correct signs at
  each step.
- Found the one-sided-ledger bug this way: after consumption, `GET
  /stock-balances` showed `-200.000` for the raw material product with no
  offsetting receipt entry, because `createFromGoodsReceipt()` predated
  the fix. Documented as an honest artifact of retrofitting mid-flight on
  data that predates the fix, not hidden or silently corrected.
- Fixed and re-verified: added `RAW_MATERIAL_RECEIPT`, retrofitted the
  service, then received a fresh 50kg lot of the same product — balance
  correctly moved from `-200.000` to `-150.000`.
- Created a vendor via curl (`VEN-001`, Speedy Transport, `TRANSPORT`),
  confirmed it appears correctly and confirmed the 409 on a duplicate
  code.
- Live in the browser (after restarting both dev servers, which had
  stopped between sessions): navigated to `/inventory`, confirmed the
  Balances tab shows SKU-resolved rows matching curl exactly (`CPB-001:
  250.000`, `HUSK-RAW-001: -150.000`), confirmed the Ledger tab shows all
  4 entries with correct movement types and signed, colored quantities;
  navigated to `/master-data` → Vendors tab, confirmed `VEN-001` renders
  correctly. Zero console errors throughout.
- Not yet done: Inventory's `lots`/`pallets`/`packaging_inventory`, a
  manual `ADJUSTMENT` write endpoint, and everything else in Phase 4+
  (Packing, Sales/Logistics, Export, Maintenance, Workforce, Finance, AI,
  Memory) — see `docs/roadmap.md`. The legacy Go system's hardcoded
  credentials (Docker Hub password, Ethereum private key, MQTT password)
  also remain unfixed — see "Known Bugs" in `docs/project-state.md`.

## 2026-09-30 — v0.2.4 — Phase 4: Packing (packing orders + lots)

**Module:** Backend / Frontend / Packing
**Change:** Implemented the Packing domain's core: `packing_orders`
(converts a production batch's finished-good output into packaged units
of a given packaging type) and `packing_lots` (individual packed lots
recorded against an order). A packing order can only be created against
a production batch whose `status` is `RELEASED` — enforced server-side
in `PackingService.create()` with a 409 otherwise, not just a UI-level
restriction, so packing can't be used to route around the Quality gate
built in Phase 3. Order status lifecycle: `PENDING → IN_PROGRESS` (on
the first lot) `→ COMPLETED` (locks out further lots). Lot numbers are
server-generated (`PKG-<date>-<random>`, same scheme as production batch
numbers) and globally unique.
**Reason:** Continuing "implement all modules," scoped per this
session's established pattern to the next concrete item on
`docs/roadmap.md` — Phase 4's Packing deliverable, which had schema-less
placeholder status. Chose the RELEASED-batch gate as a real domain rule
(not a stub) because the whole point of Phase 3's QC hold/release
mechanism is defeated if packing can happen on unreleased output — this
mirrors the same reasoning already applied to Production's approval gate
and Raw Material's origin-derivation-not-caller-supplied rule.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/api/src/db/schema/packing.schema.ts` (new — `packing_orders`, `packing_lots`)
- `apps/api/src/db/schema/enums.ts` (`packingOrderStatusEnum`, `packingLotQcStatusEnum`)
- `apps/api/src/db/schema/index.ts` (barrel export)
- `apps/api/src/modules/packing/{packing.service.ts,packing.controller.ts,packing.module.ts,dto/create-packing-order.dto.ts,dto/create-packing-lot.dto.ts}` (new)
- `apps/api/src/app.module.ts` (imports `PackingModule`)
- `database/seeds/001-rbac-baseline.sql` (`packing.order.write`, `packing.lot.write`)
- `apps/web/src/pages/PackingPage.tsx` (new — custom page, same reasoning as `ProductionPage.tsx`: real multi-step workflow, not a plain CRUD list)
- `apps/web/src/app/routes.tsx` (`packing` wired to `PackingPage`)
- `apps/web/src/app/routes.spec.tsx` (retargeted placeholder test from `/packing` to `/sales`, since `/packing` is real now)
- `docs/api.md`, `docs/permissions.md`, `docs/database-schema.md`, `docs/architecture.md`, `docs/roadmap.md`, `docs/project-state.md` (updated for real)
**Database Changes:** `0008_naive_morlocks.sql` (drizzle-kit
auto-generated name, kept as-is per the `0000_optimal_miek.sql`
precedent) — creates `packing_lot_qc_status` and `packing_order_status`
enums, `packing_orders`, `packing_lots`, their FKs and indexes.
**API Changes:** New `GET/POST /packing-orders`, `GET /packing-orders/:id`,
`GET/POST /packing-orders/:id/lots`, `POST /packing-orders/:id/complete`
— see `docs/api.md` "Packing".
**Migration:** 0008 applied and verified against the local PostgreSQL
database; `001-rbac-baseline.sql` re-run to grant the 2 new permission
codes to `SUPER_ADMIN` (idempotent `ON CONFLICT`/cross-join, no new rows
needed for existing codes).
**Tests:** No new unit tests (consistent with this project's established
pattern of verifying DB-heavy services live). Existing suites still
pass: `apps/api` 15/15, `apps/web` 6/6 (after retargeting the stale
placeholder test). Both `npm run build` and `npm run lint` clean on both
apps (`apps/web`'s lint shows the same pre-existing `set-state-in-effect`
warning pattern already present in `ProductionPage.tsx`/`QualityPage.tsx`/
`ProcurementPage.tsx` — not a new issue, and not an error).
**Risk:** Low. Additive module following the exact
service/controller/DTO/module + `@RequirePermissions` + `@AuditLog`
pattern proven correct across every prior module this session.
**Status:** Implemented and verified live against a real running server
and database:
- Registered a fresh test user (`packing-test@example.com`), granted
  `SUPER_ADMIN` via the seed file's documented manual-assignment SQL
  (no plaintext credentials for the pre-existing `admin@example.com`
  were available this session, and creating a disposable test account
  is the same approach already documented for prior sessions' "dummy
  user" request).
- Built a full chain via real curl calls: Purchase Order → Goods Receipt
  → Raw Material Lot → Production Batch → input (300kg) → output (180kg)
  → complete → release (batch reaches `RELEASED`).
- Confirmed the domain rule: `POST /packing-orders` against an
  `IN_PROGRESS` batch correctly 409'd; against the `RELEASED` batch it
  correctly created a `PENDING` order.
- Added 2 packing lots — confirmed the order auto-flipped
  `PENDING → IN_PROGRESS` on the first one, both lots got unique
  server-generated lot numbers, `GET .../lots` listed both correctly.
- `POST .../complete` correctly moved the order to `COMPLETED`; a
  further `POST .../lots` against the now-`COMPLETED` order correctly
  409'd.
- Confirmed `audit_events` rows for every action, `status: FAILED` on
  both rejected attempts (the non-RELEASED-batch order and the
  post-completion lot) and `status: COMPLETED` on every successful one.
- Live in the browser: logged in as the test user, navigated to
  `/packing`, confirmed the order created via curl renders with the
  correct batch number, packaging type code, status badge, and planned
  quantity; clicked "Manage," confirmed both lots render with the
  correct lot number, resolved product SKU, quantity, net weight, and QC
  status badge; opened the "New Packing Order" form and confirmed its
  batch dropdown correctly lists only the one `RELEASED` batch (the two
  `IN_PROGRESS` batches and one `CLOSED` batch are correctly excluded
  client-side too, matching the backend's 409 gate). Zero console
  errors throughout.
- Not yet done: QR code generation, pallet/container linkage (Inventory's
  `pallets` table, itself deferred), Sales/Logistics, Dispatch, Export,
  and everything in Phase 5+ (Maintenance, Workforce, Finance, AI,
  Memory) — see `docs/roadmap.md`. The legacy Go system's hardcoded
  credentials also remain unfixed — see "Known Bugs" in
  `docs/project-state.md`.

## 2026-09-30 — v0.2.5 — Phase 4: Sales (sales orders + credit-limit check)

**Module:** Backend / Frontend / Sales
**Change:** Implemented the Sales domain's core: `sales_orders` and
`sales_order_items`. An order builds up in `DRAFT` — line items can be
added freely, with `lineTotal` server-computed per item
(`quantity * unitPrice`) and the parent order's `totalAmount`
recomputed via `SUM(line_total)` after every add, never trusted from the
client. The customer's credit-limit check happens only at
`POST /:id/confirm`: computed as `SUM(totalAmount)` over the customer's
other `CONFIRMED` orders plus this order's total, checked against
`customers.credit_limit` (a schema field that had sat unused since
Phase 1 — this closes that gap). A breach is a hard 409 naming the exact
projected exposure and limit, not an approval-workflow gate — Procurement's
PO-threshold `approvals` mechanism was deliberately not reused here,
since a credit-limit override wasn't asked for and would be scope
creep; documented as a natural follow-up if it turns out to be needed.
**Reason:** Continuing "implement all modules," scoped to the next
concrete Phase 4 item on `docs/roadmap.md`. Did a short web search first
(competitor/industry ERP research, at the user's direction) confirming
the standard shape — quotation → sales order → dispatch → invoice →
payment, with credit exposure checked at commitment — which matched
what `product-requirements.md`/`architecture.md` already specified, so
no design change resulted; it confirmed the credit-limit-at-confirm
placement rather than changing it.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/api/src/db/schema/sales.schema.ts` (new — `sales_orders`, `sales_order_items`)
- `apps/api/src/db/schema/enums.ts` (`salesOrderStatusEnum`)
- `apps/api/src/db/schema/index.ts` (barrel export)
- `apps/api/src/modules/sales/{sales.service.ts,sales.controller.ts,sales.module.ts,dto/create-sales-order.dto.ts,dto/create-sales-order-item.dto.ts}` (new)
- `apps/api/src/app.module.ts` (imports `SalesModule`)
- `database/seeds/001-rbac-baseline.sql` (`sales.order.write`, `sales.order.confirm`)
- `apps/web/src/pages/SalesPage.tsx` (new — custom page, same reasoning as `ProductionPage.tsx`/`PackingPage.tsx`)
- `apps/web/src/app/routes.tsx` (`sales` wired to `SalesPage`)
- `apps/web/src/app/routes.spec.tsx` (retargeted placeholder test from `/sales` to `/dispatch`, since `/sales` is real now)
- `docs/api.md`, `docs/permissions.md`, `docs/database-schema.md`, `docs/architecture.md`, `docs/roadmap.md`, `docs/project-state.md` (updated for real)
**Database Changes:** `0009_strange_devos.sql` (drizzle-kit
auto-generated name, kept as-is per the established precedent) —
creates `sales_order_status` enum, `sales_orders`, `sales_order_items`,
their FKs and indexes.
**API Changes:** New `GET/POST /sales-orders`, `GET /sales-orders/:id`,
`GET/POST /sales-orders/:id/items`, `POST /sales-orders/:id/confirm`,
`POST /sales-orders/:id/cancel` — see `docs/api.md` "Sales".
**Migration:** 0009 applied and verified against the local PostgreSQL
database; `001-rbac-baseline.sql` re-run to grant the 2 new permission
codes to `SUPER_ADMIN`.
**Tests:** No new unit tests (consistent with this project's established
pattern of verifying DB-heavy services live). Existing suites still
pass: `apps/api` 15/15, `apps/web` 6/6 (after retargeting the stale
placeholder test). Both `npm run build` and `npm run lint` clean on both
apps.
**Risk:** Low. Additive module following the exact
service/controller/DTO/module + `@RequirePermissions` + `@AuditLog`
pattern proven correct across every prior module this session. The one
genuinely new piece of logic — the credit-exposure SQL sum — was tested
against both a passing and a failing case, not just the happy path.
**Status:** Implemented and verified live against a real running server
and database:
- Reused the existing test admin session; found one seeded customer
  (`CUST-001`, credit limit ₹150,000.50).
- Created SO1, added a 100-unit line item at ₹900 (₹90,000 total),
  confirmed `totalAmount` was correctly recomputed server-side, then
  confirmed the order successfully — under the limit.
- Created SO2 against the same customer, added an identical ₹90,000
  line item (combined exposure ₹180,000 > ₹150,000.50 limit), and
  confirmed `POST /:id/confirm` correctly 409'd with the exact message
  `"...would bring customer CUST-001's exposure to 180000.00, exceeding
  their credit limit of 150000.50"`.
- Verified `cancel()` on SO2, then confirmed adding a further item to
  the now-`CANCELLED` order correctly 409'd, and confirming a freshly
  created order with zero line items correctly 400'd.
- Confirmed `audit_events` rows for every action, with `status: FAILED`
  on both rejected attempts and `status: COMPLETED` on every successful
  one.
- Live in the browser: logged in, navigated to `/sales`, confirmed all
  three curl-created orders render with the correct order number,
  customer code, status badge, and total; opened the `CONFIRMED` order
  and confirmed its line item resolves with the correct product SKU,
  quantity, price, and line total, and that only a "Cancel Order"
  control is shown (no add-item/confirm controls) for a non-DRAFT order.
  Zero console errors throughout.
- Not yet done: `quotations`, `invoices`, price list lookup, a
  credit-limit-breach approval override, Dispatch, Export, and
  everything in Phase 5+ (Maintenance, Workforce, Finance, AI, Memory)
  — see `docs/roadmap.md`. The legacy Go system's hardcoded credentials
  also remain unfixed — see "Known Bugs" in `docs/project-state.md`.

## 2026-09-30 — v0.2.6 — Phase 4: Dispatch (dispatch records + a found-and-fixed constraint bug)

**Module:** Backend / Frontend / Dispatch
**Change:** Implemented the Dispatch domain's core: a `dispatches` row
per sales order tracking the physical outbound movement (vehicle,
driver, status), reusing Phase 2's Gate & Weighment `vehicles`/`drivers`
tables directly rather than duplicating them. A dispatch can only be
created against a sales order whose status is `CONFIRMED` (mirrors
Packing's RELEASED-batch gate). Status lifecycle:
`PENDING → DISPATCHED → DELIVERED`, cancellable from `PENDING` or
`DISPATCHED` (a recall before delivery is a legitimate case, so
`DISPATCHED` isn't locked). Delivery confirmation is folded into
`deliveredAt`/`deliveryNotes` on the same row rather than a separate
`delivery_confirmations` table.

**Found and fixed a real bug mid-implementation, via live testing, not
code review**: the first version enforced "one dispatch per order" with
a hard `UNIQUE(sales_order_id)` database constraint. Live-testing the
full lifecycle (create → dispatch → cancel) showed the cancelled row
permanently blocking any future dispatch of that same order — cancel-
and-redispatch is completely normal and this broke it. Fixed by
dropping the column-level unique constraint (migration
`0011_foamy_husk.sql`) and moving "at most one **active** (non-
CANCELLED) dispatch per order" to a service-level `WHERE status !=
'CANCELLED'` check, backed by a plain index instead of a uniqueness
guarantee. Re-verified live both directions: a fresh dispatch for an
order whose prior one was cancelled now correctly succeeds (201), and
attempting a second dispatch while one is still active still correctly
409s.
**Reason:** Continuing "implement all modules," the user asked directly
for Dispatch next (along with Export/Maintenance/etc., which are noted
as the honest remainder below rather than attempted shallowly in the
same pass — Finance specifically needs the IGO ERP integration protocol
discovered first per `docs/roadmap.md` Phase 5, and AI/Memory need their
own Phase 6 design passes, so building stub screens for those now would
be fake UI, the same reasoning applied throughout this session).
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/api/src/db/schema/dispatch.schema.ts` (new — `dispatches`)
- `apps/api/src/db/schema/enums.ts` (`dispatchStatusEnum`)
- `apps/api/src/db/schema/index.ts` (barrel export)
- `apps/api/src/modules/dispatch/{dispatch.service.ts,dispatch.controller.ts,dispatch.module.ts,dto/create-dispatch.dto.ts,dto/deliver-dispatch.dto.ts}` (new)
- `apps/api/src/app.module.ts` (imports `DispatchModule`)
- `database/seeds/001-rbac-baseline.sql` (`dispatch.record.write`)
- `apps/web/src/pages/DispatchPage.tsx` (new — custom page, same reasoning as `ProductionPage.tsx`/`PackingPage.tsx`/`SalesPage.tsx`)
- `apps/web/src/app/routes.tsx` (`dispatch` wired to `DispatchPage`)
- `apps/web/src/app/routes.spec.tsx` (retargeted placeholder test from `/dispatch` to `/export`, since `/dispatch` is real now)
- `docs/api.md`, `docs/permissions.md`, `docs/database-schema.md`, `docs/architecture.md`, `docs/roadmap.md`, `docs/project-state.md` (updated for real)
**Database Changes:** `0010_redundant_molecule_man.sql` (auto-generated
name, kept as-is per established precedent) — creates `dispatch_status`
enum and `dispatches` with its original (later-fixed) unique constraint.
`0011_foamy_husk.sql` — drops that constraint, adds a plain
`dispatches_sales_order_idx` index instead, applied same-session after
the bug was caught.
**API Changes:** New `GET/POST /dispatches`, `GET /dispatches/:id`,
`POST /dispatches/:id/dispatch`, `POST /dispatches/:id/deliver`,
`POST /dispatches/:id/cancel` — see `docs/api.md` "Dispatch".
**Migration:** 0010 and 0011 both applied and verified against the local
PostgreSQL database; `001-rbac-baseline.sql` re-run to grant the new
permission code to `SUPER_ADMIN`.
**Tests:** No new unit tests (consistent with this project's established
pattern of verifying DB-heavy services live). Existing suites still
pass: `apps/api` 15/15, `apps/web` 6/6 (after retargeting the stale
placeholder test). Both `npm run build` and `npm run lint` clean on both
apps.
**Risk:** Low-medium. The constraint bug was a real correctness issue
that would have blocked a normal operational flow in production — caught
and fixed within the same implementation pass because of the verify-live
discipline, not shipped and discovered later.
**Status:** Implemented and verified live against a real running server
and database:
- Confirmed the CONFIRMED-order-only gate: dispatch creation against a
  DRAFT sales order correctly 409'd; against a CONFIRMED order it
  correctly created a PENDING dispatch.
- Confirmed the duplicate-active-dispatch guard: a second dispatch
  attempt against an order that already had one correctly 409'd.
- Confirmed the full status machine: deliver-before-dispatch correctly
  409'd; dispatch (PENDING→DISPATCHED) succeeded; a second sales
  order's dispatch went cleanly through the full PENDING→DISPATCHED→
  DELIVERED happy path with delivery notes recorded.
- Found the constraint bug live: cancelling the first dispatch and then
  trying to create a new one for the same order incorrectly 409'd
  ("already has a dispatch record"). Fixed and re-verified: the same
  sequence now correctly succeeds, and the still-active-dispatch guard
  was re-checked to confirm it wasn't accidentally weakened by the fix.
- Confirmed `audit_events` rows for every action, `status: FAILED` on
  every rejected attempt and `status: COMPLETED` on every successful
  one, across both the buggy and fixed versions.
- Live in the browser: navigated to `/dispatch` (session persisted from
  the prior turn), confirmed both curl-created dispatch records render
  correctly — the CANCELLED one with resolved vehicle/driver, the
  DELIVERED one with its delivery notes. Zero console errors.
- Not yet done: `shipments`/`delivery_confirmations` as separate tables,
  `gate_entries.direction = OUTBOUND` integration, Export, and
  everything in Phase 5+ (Maintenance, Workforce, Finance, AI, Memory)
  — see `docs/roadmap.md`. The legacy Go system's hardcoded credentials
  also remain unfixed — see "Known Bugs" in `docs/project-state.md`.

## 2026-10-05 — v0.3.0 — Remaining modules (Export → Settings) and front-end redesign

**Module:** Backend / Frontend / Export, Maintenance, Workforce, Finance, Memory, AI, Reports, Audit & Activity, Identity (users/roles), all screens
**Change:** Built every module that was still a placeholder, so all 20
navigation entries now have a real API and screen: **Export** (customer →
proforma → commercial invoice → container → milestones), **Maintenance**
(breakdowns suspend machines; plans, work orders, spare parts, machine
history), **Workforce** (shifts, attendance, labour allocation),
**Finance** (cost centres, expenses with segregation of duties, payments,
receivables/payables, material-only batch costing), **Memory** (typed,
versioned, sensitivity-filtered), **AI Agents** (A01–A12 registry; 8
rule-based analyzers that only propose findings), **Reports** (overview,
yield, sales by customer, batch traceability), **Audit & Activity**
(filterable view over the audit log) and **Settings** (profile, change
password, users, roles, permission catalog). Redesigned the whole front
end (ADR-010): Geist/Geist Mono and Phosphor icons, warm neutrals with one
accent, grouped navigation, KPI-strip dashboard, skeleton/empty/error
states, sentence case, 404 page, collapsible mobile menu, route-level code
splitting (main bundle 547 kB → 425 kB), and a brand favicon replacing the
stock Vite bolt.
**Reason:** User asked to "start pending all module and redesign all, make
perfectly." Previous turns scoped "all modules" down because Finance, AI and
Memory need decisions that don't exist yet. This turn made those decisions
explicit rather than skipping them: Finance is operational-only because the
IGO ERP protocol is unknown (ADR-009); AI is rule-based because no LLM is
chosen (ADR-008). Both are stated on the screens themselves.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- `apps/api/src/db/schema/{export,maintenance,workforce,finance,memory,ai}.schema.ts` (new) and `enums.ts`, `index.ts`
- `apps/api/src/modules/{export,maintenance,workforce,finance,memory,ai,reports,activity}/**` (new)
- `apps/api/src/modules/identity/{users.service.ts,users.controller.ts,dto/change-password.dto.ts,dto/assign-role.dto.ts}` (new), `auth.service.ts`, `auth.controller.ts`, `identity.module.ts`
- `apps/api/src/app.module.ts`
- `database/migrations/0012_dark_sabretooth.sql`, `database/seeds/001-rbac-baseline.sql` (+21 permission codes), `database/seeds/002-ai-agents.sql` (new)
- `apps/web/src/index.css`, `public/favicon.svg`, `app/{navigation.ts,routes.tsx,RequireAuth.tsx,routes.spec.tsx}`
- `apps/web/src/components/{AppShell,Badge,Tabs,ResourceListPage,ui,ActionButton}.*` (new/rewritten); `StatCard` and `PlaceholderPage` removed (unused)
- `apps/web/src/lib/{format.ts,useLookup.ts,auth.ts,api.ts}`
- `apps/web/src/pages/{Export,Maintenance,Workforce,Finance,Reports,AiAgents,AuditActivity,Memory,Settings,NotFound}*` (new), `Dashboard.*`, `Login.*` (rewritten); existing pages adopt the new header/variants
- `apps/web/package.json` (+`@fontsource-variable/geist`, `@fontsource-variable/geist-mono`, `@phosphor-icons/react`)
- `docs/{api,permissions,database-schema,architecture,roadmap,decisions,project-state}.md`
**Database Changes:** `0012_dark_sabretooth.sql` — 20 tables (Export 6,
Maintenance 4, Workforce 3, Finance 3, Memory 1, AI 3) and their enums.
64 public tables total.
**API Changes:** New endpoints for every module above; `POST
/auth/change-password`, `GET /users|/roles|/permissions`, `POST|DELETE
/users/:id/roles`, `POST /users/:id/status`. See `docs/api.md`.
**Migration:** 0012 applied; both seed files re-run (55 permissions; 12 agents).
**Tests:** `apps/api` 15/15 (unchanged). `apps/web` 9/9 (was 6): rewrote the
Dashboard tests for the new dashboard and the route tests for the 404 page /
no-placeholder invariant. Build and lint clean on both apps (lint shows only
the existing `set-state-in-effect` warning pattern, no errors).
**Risk:** Medium — the largest single change set so far, and it touched shared
components every page depends on. Mitigated by keeping the old class names
that hand-built pages import, and by exercising the UI end to end.
**Status:** Implemented and verified live.
- **API, 133 live checks** (curl against the running server and database),
  covering the happy path and the failure paths of every new module: 132
  passed first time; the one miss was my own wrong assertion (`3000.0` vs
  JSON `3000`). A rerun passed all but three checks that assume yesterday's
  data doesn't exist (attendance hours doubled by the earlier run; the sales
  order was already fully paid, so the payment cap correctly returned 409
  "outstanding 0.00") — environment state, not defects.
- **Rules proved**, not just written: proforma can't be converted twice;
  milestones can't go backwards or continue after `DELIVERED`; breakdown →
  machine `SUSPENDED` → resolved → `ACTIVE`; completing a preventive order
  moves the plan's next due date exactly +30 days; spare parts can't go
  below zero; attendance is unique per day; labour needs attendance and
  respects the 12h/6h caps; the submitter gets 403 approving their own
  expense (and it lands in the audit log as a `SECURITY` event); a payment
  can't exceed the outstanding balance; confidential memory is hidden from a
  restricted user (404, not 403) and visible to a permitted one; a revision
  creates v2 and supersedes v1; re-running an agent doesn't duplicate
  pending findings; unimplemented agents refuse to run; the audit log
  rejects a user without `audit.event.read`.
- **Browser (real clicks):** created a proforma, added a line item (the
  parent row's total refreshed to 1,250.00), issued it (actions changed,
  items locked), converted it, and saw the new commercial invoice with its
  "Mark paid" action; revised a memory item and viewed its version history;
  tried a wrong current password (inline error, session kept); attempted to
  approve my own expense (segregation-of-duties message shown beside the
  button); logged out and back in; checked the 404 page, dark mode, and a
  375px phone layout.
- **Bugs found and fixed this turn**, each by looking at the running app
  or the live API rather than by review:
  1. `npm run build` run while `nest start --watch` was live wiped `dist/`
     and crashed the dev server (process error, not a code bug; don't do it).
  2. `PermissionsGuard` ignores class-level `@RequirePermissions`, which
     would have left the audit log readable by any signed-in user. Moved the
     decorator onto each handler and verified a no-role user gets 403.
  3. A wrong current password returned **401**, and the web client logs the
     user out on any 401. Changed to **400**.
  4. The login profile cached in `localStorage` never refreshed, so newly
     granted permissions (e.g. Memory's Revise/Archive) were invisible until
     re-login. `RequireAuth` now re-reads `/auth/me` once per page load (and
     so also detects a dead token up front).
  5. Title Case from `text-transform: capitalize` ("Parts At Reorder
     Level") replaced with sentence case.
  6. Self-approval error text was clipped by an inherited `nowrap`; fixed.
  7. The audit log showed raw user ids and `POST /path` as the "operation";
     it now resolves names (when permitted) and hides route-derived text.
  8. Mobile: the stacked sidebar took a quarter of the screen; now collapses
     behind a menu button.
- **Not done / honest limits:** no LLM (4 of 12 agents can't run); Finance
  has no ledger, tax or IGO ERP sync, and batch cost excludes labour,
  machine and overhead; export documents lack HS codes, bill of lading,
  customs and FX; a batch can't be traced forward to a customer; Memory has
  no embeddings or conflict records; `POST /auth/register` is still open;
  the legacy Go system's hardcoded secrets are still unfixed; there is no
  committed integration test suite. All listed in `docs/project-state.md`.

## 2026-10-05 — v0.3.1 — Security hardening, integration tests, traceability to the customer

**Module:** Security / Identity / Dispatch / Reports / CI / Legacy Go system
**Change:** Fixed the open security issues, then audited the rest.
**Security:** (1) removed five hardcoded credentials from the legacy system
(Docker Hub password in `plugin.sh`, MQTT password in `docker-compose.yml` and
both Kubernetes manifests, Ethereum private key in `server/blockchain.go`) in
favour of environment variables / a Kubernetes Secret; (2) closed
`POST /auth/register` (first-run bootstrap only, atomic) and added admin-only
`POST /users` plus an Add user form; (3) accounts with no roles get nothing but
their own profile; `finance.read` added for money views; (4) deactivated users
lose all sessions immediately and cannot log in; (5) per-IP rate limiting,
`helmet` headers, CORS scoped to configured origins, password length bounds,
constant-time login for unknown users; (6) `PermissionsGuard` now reads
class-level as well as handler-level permissions; (7) confidential memory is no
longer copied into the audit log; (8) production dependencies brought to 0
known vulnerabilities (NestJS 10→11, drizzle-orm 0.36→0.45).
**Other:** `dispatch_lots` links packed lots to dispatches, so a batch traces
forward to its customer and an order traces back to every supplier (recall
view); Dispatch rebuilt on the shared list component with a lot-linking panel;
Reports gains customer columns and a "Customer recall" tab; a committed
**integration test suite (43 tests)** against a disposable real database; CI
workflow for the Node apps; secret scanner; web lint at zero warnings; docs
(`security.md`, `environment.md`, `testing.md` were stubs or stale).
**Reason:** User asked to "fix the security issues first and check all issues and
fix." The previous turn listed the open ones; this works through them in
priority order and then looks for more rather than stopping at the known list.
**Developer/Agent:** Claude (interactive session), approved by user.
**Affected Files:**
- Legacy: `plugin.sh`, `docker-compose.yml`, `kube-config/{core-system,grading-plugin}.yaml`, `server/blockchain.go`, `.env.example` (new), `.gitignore`, `.github/workflows/ci-cd.yml`
- New tooling: `scripts/check-secrets.sh`, `.githooks/pre-commit`, `.github/workflows/node-ci.yml`
- API: `src/app.setup.ts` (new), `main.ts`, `app.module.ts`, `db/drizzle.module.ts`; `modules/identity/{auth.service,auth.controller,users.service,users.controller,identity.module}.ts`, `dto/{register-user,create-user,change-password,login,assign-role}.dto.ts`, `guards/permissions.guard.{ts,spec.ts}`; `modules/memory/memory.controller.ts`, `modules/finance/finance.controller.ts`; `modules/dispatch/**`, `modules/reports/**`; `db/schema/dispatch.schema.ts`; `database/migrations/0013_puzzling_ultimo.sql`; `database/seeds/001-rbac-baseline.sql` (+`finance.read`)
- API tests (new): `test/e2e/{jest-e2e.config.js,env.ts,provision.ts,global-setup.ts,helpers.ts,security,bootstrap,throttle,rules,traceability}.e2e-spec.ts`
- API deps: `@nestjs/{common,core,platform-express,testing}` 11, `@nestjs/config` 4, `drizzle-orm` 0.45.3, `drizzle-kit` 0.31, `+@nestjs/throttler`, `+helmet`, `+@types/supertest`
- Web: `pages/{DispatchPage,ReportsPage,SettingsPage}.tsx`, `pages/Dispatch.module.css`, `app/{routes.tsx,lazyPages.ts}`, five older pages (lint), `components/ResourceListPage.module.css`
- Docs: `security.md`, `environment.md`, `testing.md`, `api.md`, `permissions.md`, `database-schema.md`, `architecture.md`, `roadmap.md`, `project-state.md`
**Database Changes:** `0013` — `dispatch_lots` (65 public tables). The dev database
also had its throwaway accounts deactivated and de-privileged (passwords made
unusable, roles removed, sessions revoked).
**API Changes:** new `POST /users`, `GET|POST|DELETE /dispatches/:id/lots`,
`GET /dispatches/:id/available-lots`, `GET /reports/traceability/sales-order/:id`;
`/auth/register` is now bootstrap-only; forward trace now reaches customers.
**Migration:** 0013 applied; seeds re-run.
**Tests:** API unit 18/18 (was 15), **API integration 43/43 (new)**, web 9/9;
typecheck and lint clean on both apps; web lint has no warnings.
**Risk:** Medium-high — it changes authentication/authorisation and upgrades the
framework. Mitigated by the integration suite, which was run after every
dependency step, and by mutation checks (below).
**Status:** Implemented and verified.
- **Mutation checks:** re-introduced three vulnerabilities one at a time (role-less
  access allowed; confidential content unredacted in the audit log; deactivated
  users able to log in). Each made exactly its own test fail; code restored; suite green.
- **Live against the dev server:** no `X-Powered-By`; HSTS/CSP/nosniff present; CORS
  header only for `http://localhost:5173`; register → 403; a role-less account gets
  200 on `/auth/me` and 403 on customers/finance/memory; 12 rapid bad logins → nine
  401s then 429s.
- **In the browser:** linked a packed lot to a pending dispatch through the new
  panel (picker then excluded it); the Customer recall tab traced order
  `SO-…07196F` → CUST-001 → supplier SUP-RM-01 → lot → batch → PO → receipt;
  created a user through Settings and confirmed it is least-privilege (production
  data readable; finance, audit log and user admin all 403).
- **Bugs found by the new tests/checks and fixed:** (a) forward-trace `LEFT JOIN`
  returned an extra empty row for a lot cancelled off one dispatch and re-shipped
  (caught by the traceability test); (b) drizzle 0.45 wraps driver errors, so
  two DB-trigger assertions had to read `error.cause` (no application code
  depended on the old shape); (c) the compose change would have broken the legacy
  CI image build (variables are required even for `build`) — placeholders added;
  (d) I again ran `npm run build` against a live `nest --watch` and crashed the
  dev server.
- **Tried and rejected:** NestJS 12 (ESM-only; this codebase is CommonJS — a large
  migration for no security gain); `@nestjs/schematics` 12 (needs TypeScript 6).
- **Not done / needs a human:** **rotate the leaked credentials** — they are still in
  git history (see `docs/security.md`); purging history is destructive and was not
  done; 47 dev-tooling advisories remain (not shipped); the Go service could not be
  built here (generated protobuf files are not in the repo) — only the changed file
  was syntax-checked and the scanner/compose/Kubernetes files validated; the
  documented residual risks (token in `localStorage`, in-memory limiter, no MFA).

---

<!-- Add new entries above this line, most recent first. -->
