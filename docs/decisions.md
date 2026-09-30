# Coco Pith Factory — Architecture Decision Records

Format follows `MASTER_PROMPT.md` §23. Never silently change architecture —
every entry here must be reflected in `architecture.md` and, if it changes
direction, in `project-state.md`.

---

# ADR-001

**Title:** Backend implementation language — TypeScript/Node.js
**Date:** 2026-09-29
**Status:** Accepted

**Context:**
The pre-existing repository (`Coconut-Peat-Supply-chain_core_system`) implements
a Go/gRPC plugin-based microservice architecture for a narrower coco-peat
processing workflow (grading, cutting). The new Coco Pith Factory
specification (`docs/architecture.md`) calls for a much larger ERP + AI
Operating System and recommends "TypeScript/Node.js or equivalent" for the
API layer.

**Decision:**
The new system's backend/API layer will be built in TypeScript on Node.js,
exposing REST/JSON APIs, per the spec's own recommendation. This supersedes
the Go/gRPC approach for all new modules.

**Alternatives considered:**
- Keep Go for the backend (leverages existing team Go experience and the
  working gRPC plugin runtime) — rejected because the spec's AI agent
  orchestration, memory pipeline, and audit/action architecture are most
  directly supported by the Node/TS ecosystem the spec was written against,
  and because the user explicitly chose to follow the spec here.

**Reason:**
User decision, made explicitly when scaffolding began (see conversation
that produced this ADR). Chosen to follow `architecture.md` as written
rather than diverge from the documented source of truth.

**Consequences:**
- The existing Go core (`server/`, `plugins/`, `proto/`) is not deleted. It
  remains functional and in the repository until the new system reaches
  functional parity for grading/cutting workflows; its eventual removal
  requires separate approval and a `changelog.md` entry.
- All new application code under `/src` (per the master documentation
  structure) will be TypeScript.
- `docs/setup.md`, `docs/environment.md`, and CI/CD will need a Node.js
  toolchain in addition to (or eventually instead of) the Go toolchain.

**Affected Modules:** All new modules (Master Data, Procurement, Production,
QC, Inventory, Packing, Sales, Dispatch, Export, Maintenance, Workforce,
Finance, AI Agents).

---

# ADR-002

**Title:** Database platform — plain self-hosted PostgreSQL (no Supabase)
**Date:** 2026-09-29
**Status:** Accepted

**Context:**
`architecture.md`'s diagram lists "PostgreSQL / Supabase" and recommends
Supabase's managed RLS/auth/storage/realtime as an option. The team needs to
decide between a managed Postgres platform (Supabase) and a plain
self-hosted PostgreSQL instance.

**Decision:**
Use plain self-hosted PostgreSQL. Authentication, Row Level Security,
object storage, and realtime notification concerns will be implemented
directly in the application/database layer rather than delegated to a
managed platform.

**Alternatives considered:**
- Supabase (managed Postgres + auth + RLS + storage + realtime) — rejected
  to avoid a vendor dependency and to keep full control over the database,
  consistent with the user's explicit choice.

**Reason:**
User decision, made explicitly when scaffolding began. Full control over
data and infrastructure was prioritized over faster initial auth/RLS/storage
setup.

**Consequences:**
- RBAC, RLS-equivalent row access, session management, MFA, and object
  storage must each be designed and implemented explicitly (see
  `docs/security.md`, `docs/permissions.md`, to be filled in as those
  modules are built).
- No Supabase-specific SDKs, edge functions, or realtime channels will be
  used; any realtime requirements will use a self-managed mechanism
  (e.g. WebSockets/Redis pub-sub), to be decided when that requirement is
  concretely needed.
- Database migrations live under `/database/migrations` and must be
  runnable against any standard PostgreSQL instance without platform
  lock-in.

**Affected Modules:** Identity/Auth, Governance (audit_events, approvals),
Memory, and every module with row-level access rules.

---

# ADR-003

**Title:** Node.js web framework — NestJS
**Date:** 2026-09-29
**Status:** Accepted

**Context:**
ADR-001 committed the backend to TypeScript/Node.js but left the specific
web framework open. `MASTER_PROMPT.md` §19 requires every API request to
follow a fixed pipeline (authentication → authorization → validation →
business logic → transaction → audit event → response), and the system
spans 20+ business modules each needing consistent RBAC enforcement,
audit-event emission, and approval-policy checks (per `agents.md` §3 and
`actions.md`).

**Decision:**
Use NestJS as the backend web framework.

**Alternatives considered:**
- **Express** — minimal and familiar, but enforces no structure; a
  20+ module system would need to hand-build (and keep consistent) its
  own conventions for auth/RBAC/audit middleware across every module,
  with nothing stopping drift between modules over time.
- **Fastify** — faster than Express and has built-in schema validation,
  but still leaves module structure, DI, and cross-cutting concerns
  (guards/interceptors) to be designed from scratch.

**Reason:**
NestJS's guards, pipes, and interceptors map directly onto the mandatory
per-request pipeline in `api.md`/`MASTER_PROMPT.md` §19 — authorization
guards, validation pipes, and an audit-event interceptor can be written
once and applied uniformly across all modules, rather than reimplemented
per-route. For a system this size, enforced structure reduces the risk of
a module silently skipping audit logging or an RBAC check.

**Consequences:**
- All backend code under `/src/services` (and wherever the Nest project
  root lands) follows Nest's module/controller/provider/guard/pipe
  conventions.
- Slightly more boilerplate and a steeper initial learning curve than
  Express for simple endpoints.
- `docs/setup.md` and `docs/api.md` should be written assuming Nest's
  conventions (e.g. DTOs via `class-validator`, guards for permission
  checks) once Phase 1 backend work starts.

**Affected Modules:** All backend modules (every item in `architecture.md`
§3).

---

# ADR-004

**Title:** Database access / migration tool — Drizzle ORM
**Date:** 2026-09-29
**Status:** Accepted

**Context:**
ADR-002 committed to plain self-hosted PostgreSQL. A tool is still needed
for schema migrations and type-safe queries. The system has several
places where staying close to raw SQL matters: the append-only
`audit_events` table (must never be updated, only inserted), the
`stock_ledger` model (`architecture.md` §4: "never directly manipulate
stock balances without generating a stock movement"), and eventual
partitioning of high-volume tables.

**Decision:**
Use Drizzle ORM (with its migration tooling) for schema migrations and
database access from the Node.js/TypeScript backend.

**Alternatives considered:**
- **Prisma** — very mature, large ecosystem, full generated client, but
  its query abstraction can fight complex/raw SQL (window functions,
  partial indexes, ledger-style constraints) that this system is expected
  to need for `stock_ledger` and `audit_events`.
- **Knex + node-pg-migrate** — maximum raw-SQL control, but no generated
  TypeScript types, meaning type safety would need a separate codegen
  step maintained by hand.

**Reason:**
Drizzle stays close to real SQL (its query builder mirrors SQL directly)
while still generating TypeScript types from the schema, which fits a
system where several core tables (audit, ledger) are deliberately
SQL-shaped rather than ORM-shaped, without giving up type safety
elsewhere.

**Consequences:**
- `/database/migrations` will hold Drizzle migration files.
- `docs/database-schema.md` should be written as Drizzle schema
  definitions (TypeScript) plus the generated SQL, not as a
  framework-agnostic spec only.
- Smaller community/ecosystem than Prisma — fewer third-party guides
  exist if the team hits an edge case.

**Affected Modules:** All modules with persisted data; most directly the
Governance (`audit_events`) and Inventory (`stock_ledger`) domains.

---

# ADR-005

**Title:** Frontend framework — Vite + React SPA (not Next.js)
**Date:** 2026-09-29
**Status:** Accepted

**Context:**
`architecture.md` recommends "React, TypeScript, Responsive PWA" without
pinning a specific build/routing framework. `design.md` §1 states the
interface should prioritize speed, clarity, and low click count for
factory operators, not public-facing concerns.

**Decision:**
Use Vite as the build tool with a client-side-rendered React SPA (React
Router for routing), not Next.js.

**Alternatives considered:**
- **Next.js** — SSR/SSG, file-based routing, and React Server Components
  are strong for public/SEO-sensitive sites, but this system is an
  internal, always-authenticated operations tool (per
  `product-requirements.md` §3's role list — there is no anonymous/public
  audience). SSR's main benefits don't apply, and it adds deployment and
  data-fetching complexity (server/client component boundaries) that
  isn't needed here.

**Reason:**
An internal, auth-gated SPA has a simpler operational and mental model
under Vite: no server-rendering pipeline to run/scale, faster local dev
iteration, and no server/client component boundary to reason about for
what is fundamentally a dashboard-and-forms application.

**Consequences:**
- `/src/pages` will be React Router route components, not Next.js
  file-based routes.
- PWA support (offline-friendly mobile workflows, per
  `product-requirements.md` §6) will be added via a Vite PWA plugin
  rather than Next.js's PWA integrations.
- If a future requirement genuinely needs SSR (e.g. a public marketing
  page, which is out of scope today), that would need its own ADR rather
  than retrofitting Next.js onto this SPA.

**Affected Modules:** Entire frontend (`/src/pages`, `/src/components`,
`/src/hooks`).

---

# ADR-006

**Title:** Monorepo layout — split `/apps/api` and `/apps/web` instead of a
shared `/src`
**Date:** 2026-09-29
**Status:** Accepted

**Context:**
`MASTER_PROMPT.md` §2 specifies a single `/src` directory with
`modules/components/pages/services/hooks/lib/types` shared across the
whole application. ADR-003 (NestJS) and ADR-005 (Vite + React SPA)
committed to two independent tools that each require their own project
root: NestJS needs its own `package.json`, `tsconfig.json`,
`nest-cli.json`, and `src/main.ts` entry point; Vite needs its own
`package.json`, `vite.config.ts`, `index.html`, and `src/main.tsx` entry
point. Two separate Node projects cannot safely share one `/src` — their
build tools, dependency trees, and TypeScript configs would collide.

This is a direct conflict between the literal master documentation
structure and the concrete tool choices already approved in ADR-003/005.
Per `MASTER_PROMPT.md` §4, this is being stopped, documented, and
resolved here rather than silently deviating from the doc structure.

**Decision:**
Restructure into a monorepo with two independent app roots:

```text
/apps
├── api/    (NestJS backend — ADR-003, ADR-004)
│   └── src/{modules,common,db,...}
└── web/    (Vite + React frontend — ADR-005)
    └── src/{pages,components,hooks,lib,types}
```

The root-level `/src` from the original Phase 0 scaffold is retired in
favor of this structure. `/database`, `/docs`, `/ai`, `/tests` remain at
the repository root as originally scaffolded — only the application code
split under `/src` is affected.

**Alternatives considered:**
- **Keep a single root `/src`, run NestJS and Vite as siblings inside it**
  — rejected: both tools expect to own their project root; nesting one
  inside `src/api` and the other inside `src/web` while still calling it
  "one `/src`" is the same structure as `/apps/*` with extra indirection
  and no benefit.
- **Single combined package.json / Nx or Turborepo workspace** — a real
  option for later if build-orchestration pain shows up, but adds tooling
  overhead not justified yet for a two-app monorepo. Can be revisited as
  its own ADR if/when it becomes worth it.

**Reason:**
This is a mechanical consequence of ADR-003 and ADR-005, not a new
preference — two independently-buildable Node projects need two roots.
`/apps/api` and `/apps/web` is the standard, low-overhead way to express
that without introducing a workspace-orchestration tool before it's
needed.

**Consequences:**
- `docs/setup.md`, `docs/deployment.md`, and CI must run two separate
  install/build/test steps (one per app) once they're written for real.
- The Phase 0 stub READMEs previously placed at root `/src/*` are removed
  (superseded by this ADR); their guidance is preserved here and in the
  new `/apps/api/README.md` / `/apps/web/README.md` (the latter created
  when the Vite skeleton is stood up).
- `project-state.md` and `MASTER_PROMPT.md`'s own structure description
  are both updated to reflect this (see changelog entry for this ADR).

**Affected Modules:** All application code (backend and frontend); no
effect on `/docs`, `/ai`, `/database`, `/tests`, which remain as
originally scaffolded.

---

# ADR-007

**Title:** Frontend design system — custom (CSS tokens + a handful of
shared components), not a third-party UI library
**Date:** 2026-09-29
**Status:** Accepted

**Context:**
`docs/project-state.md` has carried "component library / design system"
as an Open Decision since Phase 1 — placeholder pages and the AppShell
used plain CSS modules with no consistent visual language. The user
asked for a full visual revamp of the Dashboard and the app under time
pressure ("fully revamp... within 2 hours" framing from the preceding
session).

**Decision:**
Resolve the Open Decision as: no third-party UI library (no Tailwind,
MUI, Ant Design, shadcn/ui, etc.). Instead, a small custom design system:
an expanded CSS custom-property token set in `index.css` (richer color
palette incl. semantic tones for status — positive/warning/negative/
info/neutral — spacing/radius/shadow scale), global base styles for
`button`/`input`/`select` so every page gets consistent form controls for
free, and two new shared components — `Badge` (color-codes any
status/enum value consistently everywhere it's used) and `StatCard`
(dashboard KPI tiles).

**Alternatives considered:**
- **Adopt a component library now** (e.g. shadcn/ui, which the
  `ui-ux-pro-max` skill listing shows is available) — rejected for this
  pass specifically because of the stated time constraint: introducing a
  library means setup, theming configuration, and a learning curve
  before the first pixel changes, which works against "revamp it now."
  Not rejected permanently — worth revisiting once the app has enough
  screens that hand-rolled consistency becomes the more expensive path
  (see Consequences).

**Reason:**
The app was small enough (≈10 screens) that a token system plus two
shared components could visibly and consistently improve every existing
page in one pass, without adding a dependency, a build-config change, or
time spent learning an unfamiliar library's API under a tight deadline.

**Consequences:**
- `Badge` is retrofitted into `ResourceListPage` (auto-applies to any
  column keyed `status`) and into the two custom pages (`ProcurementPage`,
  `ProductionPage`, `QualityPage`'s pass/fail column) — one component,
  consistent everywhere, verified live with real data (see
  `docs/changelog.md`).
- This is a real trade-off, not a free win: no component library means
  no built-in accessibility primitives (focus trapping, ARIA-complete
  dialogs/comboboxes, etc.), no pre-built complex components (date
  pickers, multi-select, rich data tables with sorting/filtering built
  in) — those would need to be hand-built if/when needed.
- **Revisit this ADR** once the app grows substantially past its current
  ~10 screens, or once accessibility/complex-interaction requirements
  exceed what hand-rolled components reasonably cover — the custom
  approach's maintenance cost grows roughly linearly with screen count,
  while a library's setup cost is roughly fixed.

**Affected Modules:** `apps/web` only — `index.css`, `components/Badge.tsx`,
`components/StatCard.tsx`, `components/AppShell.module.css`,
`components/ResourceListPage.tsx`, `pages/Dashboard.tsx`, and the status
displays in `pages/ProcurementPage.tsx`/`ProductionPage.tsx`/`QualityPage.tsx`.

---

<!--
Add new ADRs above this line using the template below.

# ADR-XXX

**Title:**
**Date:**
**Status:** Proposed | Accepted | Superseded by ADR-YYY

**Context:**

**Decision:**

**Alternatives considered:**

**Reason:**

**Consequences:**

**Affected Modules:**
-->
