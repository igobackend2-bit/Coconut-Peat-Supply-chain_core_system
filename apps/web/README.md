# Coco Pith Factory — Web

Vite + React + TypeScript SPA (ADR-005), React Router for routing. See
`../../docs/architecture.md` and `../../docs/decisions.md` for rationale.

## Status

Real, working UI for every module with a backend API — not a skeleton
anymore. Verified end-to-end in a real browser (not just build/test):
login → create a Product through the UI → create an over-threshold
Purchase Order → watch Approve/Reject appear → approve it → logout, all
via real clicks against the live NestJS API.

- **Auth**: `pages/Login.tsx` + `lib/auth.ts` (localStorage session,
  opaque token — matches the backend's session model) + `app/RequireAuth.tsx`
  (redirects to `/login` when there's no session). `AppShell` shows the
  logged-in user's email/roles and a working logout button.
- **Master Data** (`pages/MasterDataPage.tsx`): Products, Suppliers,
  Customers, Warehouses as tabs, each using the generic
  `ResourceListPage` (list + create form).
- **Gate & Weighment** (`pages/GateWeighmentPage.tsx`): Vehicles,
  Drivers, Gate Entries, Weighments as tabs.
- **Procurement** (`pages/ProcurementPage.tsx`): Purchase Orders as a
  dedicated panel (create form + **Approve/Reject buttons that only
  appear for `PENDING_APPROVAL` orders** — real conditional UI, verified
  live with a real ₹300,000 order), Goods Receipts via the generic
  component.
- **Raw Materials** (`pages/RawMaterialsPage.tsx`): Raw Material Lots.
- **Production** (`pages/ProductionPage.tsx`): full batch lifecycle UI —
  create, consume a raw material lot, record output, complete, release/
  reject, close — each action only shown for the batch statuses it's
  valid from.
- **Quality** (`pages/QualityPage.tsx`): QC Samples + Results. No
  `/qc-parameters` API exists yet, so the parameter is entered as a raw
  UUID for now — said plainly in the page, not hidden.
- `components/ResourceListPage.tsx` is a generic list+create component
  used by ~10 of the simpler modules — deliberately NOT built until
  enough near-identical modules existed to justify it (same reasoning
  the backend used before building per-entity services).
- Every nav item with **no backend yet** (Inventory, Packing, Sales,
  Dispatch, Export, Maintenance, Workforce, Finance, Reports, AI Agents,
  Audit & Activity, Memory, Settings) still renders `PlaceholderPage` —
  deliberately, building UI for APIs that don't exist would just be fake
  screens.

Does **not** yet implement: a chosen component library (still an open
decision — see `docs/project-state.md`), state management beyond local
component state (no React Query/Redux — not needed yet at this scale),
or a `/qc-parameters` picker (blocked on the backend API not existing).

## Setup

```bash
cd apps/web
npm install
cp .env.example .env.local   # adjust VITE_API_BASE_URL if the API runs on a different port
```

## Development

```bash
npm run dev     # Vite dev server (default port 5173)
npm run build   # tsc -b && vite build
npm test        # vitest run
npm run lint    # oxlint
```

Or, from the repo root, use the Claude Code launch configs in
`.claude/launch.json` (`web` and `api`) to run both dev servers together.

## Notes

- The NestJS API (`apps/api`) must have CORS enabled for the dev server
  fetch to work across origins — it is (`app.enableCors()` in
  `apps/api/src/main.ts`), wide open for now since there's no auth yet
  to scope it against. Revisit once `docs/security.md` is written for
  real.
- Local dev port conflicts: this machine already has an unrelated
  process on port 3000, so the local convention here is API on 3001 —
  adjust `apps/api/.env` and `apps/web/.env.local` together if your
  environment differs.
