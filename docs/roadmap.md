# Coco Pith Factory — Roadmap

**Status:** Full phase-by-phase implementation plan for the complete
ERP, superseding the earlier draft-phasing stub. Cross-check against
`docs/project-state.md` before starting any phase — that file has the
fine-grained, continuously-updated "what's actually done" state;
this file is the stable target shape and sequencing.

Every phase follows the build pattern already proven across 8
`docs/changelog.md` entries for Phase 1: **schema → migration
(generated + applied to a real local DB) → seed data if needed → service
+ controller + DTOs → RBAC permission codes (`<module>.<entity>.<verb>`,
added to `database/seeds/001-rbac-baseline.sql`) → `@AuditLog` on
mutating endpoints → live verification (real curl/psql or browser
against a running server, not just build/test) → docs updated
(`database-schema.md`, `api.md`, `permissions.md`, `architecture.md`
status markers) → `changelog.md` entry.** Deviating from this pattern
for a given phase should be a conscious decision, recorded as an ADR if
it's a real architectural choice (e.g. "this domain needs a background
job queue, unlike everything so far").

## Phase 0 — Documentation & Scaffolding ✅ Complete (2026-09-29)

Master docs, `MASTER_PROMPT.md`, directory skeleton. See `changelog.md`
v0.0.1.

## Phase 1 — Foundations ✅ Complete, ongoing extension

**Done and live-verified:**
- `apps/api` (NestJS + Drizzle) and `apps/web` (Vite + React) skeletons
- `audit_events` — append-only (DB-trigger-enforced), `@AuditLog` +
  `AuditInterceptor` + `AuthFailureAuditFilter`
- Identity: register/login/logout/me, session-token auth
- RBAC: `SessionAuthGuard` + `PermissionsGuard` + `@RequirePermissions`
- Master Data schema: all 17 tables (see `architecture.md` §3)
- Master Data API: Products, Suppliers, Customers, Warehouses (CRUD)

**Remaining in this phase** (before moving fully to Phase 2 — these are
Master Data entities other modules will reference by foreign key, so
cheaper to finish now than to backfill mid-Phase-2):
- [ ] Machines API (Maintenance needs it; Production needs it for
      `machine_runs`)
- [ ] Locations, Warehouses-adjacent — already have Warehouses; Locations
      API still ⬜
- [ ] Units of Measure, Packaging Types API (referenced by
      Production/Packing/Inventory)
- [ ] Employees, Departments API (referenced by Workforce, and by
      "who ran this batch" fields across Production/QC)
- [ ] Vendors API (schema exists, no controller yet)
- [ ] QC Parameters + Product Grade QC Specs API (Quality module needs
      to read these, even before Quality itself is built)
- [ ] Role/permission management API (currently direct-SQL only)
- [ ] Self-service "first user becomes admin" bootstrap

Tax Configurations and Price Lists are deliberately deferred to Phase 5
(Finance) and Phase 4 (Sales) respectively — no other module needs them
sooner, so building them now would be premature.

## Phase 2 — Inbound ✅ Core deliverables done, verified live

**Domains:** Procurement, Gate & Weighment (new — see `architecture.md`
§3 note), Raw Material (new — see same).

**Why this order:** the traceability chain in `product-requirements.md`
§1 starts `Supplier → Vehicle → Weighment → Raw Material Lot`. Gate &
Weighment and Raw Material must exist before Production can consume
anything, and Procurement is what puts a supplier relationship and a PO
behind a gate entry in the first place.

**Deliverables:**
- [x] Gate & Weighment: `vehicles`, `drivers`, `gate_entries`,
      `weighments` (gross/tare/net, **duplicate-weighment prevention** —
      `product-requirements.md` §4.3 calls this out explicitly). Verified
      two enforcement layers live: a DB `UNIQUE(gate_entry_id)`
      constraint and a service-level status check, both actually
      rejecting a real duplicate attempt with a clear 409.
- [x] Raw Material: `raw_material_lots` — created from a Goods Receipt
      (not directly from a weighment — a receipt is what actually
      finalizes "this PO's material arrived", the weighment is evidence
      linked via the receipt). `product_id`/`supplier_id` derived from
      the receipt's PO, not accepted from the caller. The Production-batch
      consumption FK is still ⬜, added when Production is built in
      Phase 3.
- [x] Procurement: `purchase_orders`, `goods_receipts`. **Deferred**:
      `purchase_requisitions`, `supplier_rates`, `supplier_documents` —
      not needed for this phase's definition of done; supplier_documents
      specifically needs object storage, which nothing in this project
      integrates yet.
- [x] **Approval policy** for PO amount thresholds
      (`MASTER_PROMPT.md` §18's example: "PO > ₹1,00,000 → Manager
      Approval") — implemented as a hardcoded ₹100,000 threshold (real
      configurability is `docs/configuration.md`'s TODO, not improvised
      here) using Governance's `approvals` table. Verified live: a PO
      under threshold auto-`APPROVED`s, one over threshold is
      `PENDING_APPROVAL` and blocks Goods Receipt until a real
      `POST /purchase-orders/:id/approve` call (gated by a separate
      `procurement.purchase_order.approve` permission) approves it.
- [x] Goods Receipt → Raw Material Lot linkage — implemented and
      verified. **Deferred**: Goods Receipt → Supplier performance data
      point (`docs/agents.md` A03) — no supplier-performance
      aggregation/reporting exists yet in any form, this is a Phase
      6+/reporting concern, not a Phase 2 schema gap.
- [ ] Weighbridge integration stub (`docs/integrations.md`) — **not
      done**. Weighments are manual-entry only right now; leaves room for
      a future integration but nothing was built toward it.

**Definition of done:** ✅ met — a full `PO → Goods Receipt → Gate Entry
→ Weighment → Raw Material Lot` chain was created via the live API
(curl against a running server, real PostgreSQL, not mocked), and a
single SQL join from `raw_material_lots` back through
`goods_receipts → purchase_orders` and `weighments → gate_entries →
vehicles` correctly resolved the full backward traceability chain. See
`docs/changelog.md` for the exact commands/output.

## Phase 3 — Core Production ✅ Core deliverables done, verified live

**Domains:** Production, Quality.

**Why this order:** needs Raw Material Lots (Phase 2) to consume and
Master Data's `qc_parameters`/`product_grade_qc_specs` (Phase 1) to test
against. This is the heart of the traceability chain and the most
business-logic-dense phase so far.

**Deliverables:**
- [x] `production_batches`, `batch_inputs`, `batch_outputs`. **Deferred**:
      `production_orders` (planning layer, not needed for this phase's
      chain), `machine_runs`, `wastage_records`.
- [ ] `process_steps` — **not done**, correctly left undone rather than
      improvised: it needs a real design decision (configurable
      per-product process flow templates, likely its own ADR), which
      the roadmap itself warned against building under time pressure.
      Still ⬜.
- [x] Batch input consumption — **did not** wait for the full ledger
      model (Inventory, Phase 4). Went with option (b) from this
      roadmap's original text: `batch_inputs` marks the consumed
      `raw_material_lots` row `CONSUMED` directly, no ledger entry yet.
      This is a known, documented simplification (see
      `production.schema.ts`'s doc comment) — the real ledger-backed
      retrofit is still owed in Phase 4.
- [x] Quality: `qc_samples`, `qc_results`. **Deferred**: `qc_plans`, a
      distinct `qc_tests` entity (folded into `qc_results`),
      `corrective_actions`, a dedicated `qc_decisions` table (decision
      tracked via `production_batches.status` + `audit_events` instead).
- [x] QC decision logic reads `product_grade_qc_specs` to auto-flag
      out-of-spec results — implemented and verified live with a real
      out-of-spec case (measured `2.5` against a `0.5–1.0` spec).
- [x] Batch release/hold/rejection **requires approval** — implemented
      by reusing the exact `approvals` mechanism built for Purchase
      Orders in Phase 2 (no new approval shape needed). Verified live:
      an out-of-spec result auto-put a batch `ON_HOLD` with a `PENDING`
      approval; an unprivileged user's release attempt correctly 403'd;
      the admin's release correctly resolved the approval and moved the
      batch to `RELEASED`.
- [x] Batch closure — implemented (`POST /production-batches/:id/close`).

**Definition of done:** ✅ met — `Raw Material Lot → Production Batch →
QC Sample → QC Result → Batch Hold → Approval → Release → Close` was
built and verified via the live API (not raw SQL), including the
out-of-spec case correctly triggering a HOLD, and a single SQL join
confirmed the full chain from supplier through to the closed batch. See
`docs/changelog.md` for the exact commands/output. "Process Steps" is
the one deliverable genuinely left undone, by design (needs its own
design decision, not a stub).

## Phase 4 — Outbound 🚧 Inventory core done, rest not started

**Domains:** Inventory, Packing (new), Sales/Logistics, Export (new).

**Deliverables:**
- [x] Inventory: `stock_ledger` (append-only, DB-trigger enforced,
      migrations 0005/0006), `stock_balances` (computed via
      `SUM(quantity_kg) GROUP BY product_id, location_id`, never a
      stored table). Retrofitted into the Phase 3 debt called out above:
      `ProductionBatchesService.addInput()`/`addOutput()` now write
      ledger entries instead of only mutating lot status, and
      `RawMaterialLotsService.createFromGoodsReceipt()` writes the
      receipt-side credit (added one migration later, 0007, after live
      testing caught the balance going permanently negative with no
      receipt crediting it). Verified live end-to-end — see
      `docs/changelog.md`. **Deferred**: `stock_movements` (folded into
      `stock_ledger` itself), `lots` (finished-goods/WIP lot identity),
      `pallets`, `packaging_inventory`.
- [x] Master Data: `vendors` API (schema existed since Phase 1, gap
      closed alongside Inventory — mirrors `suppliers` exactly).
- [ ] Packing: `packing_orders`, `packing_lots` (batch number, mfg date,
      QC status, **QR code generation** — `product-requirements.md` §4.9)
- [ ] Sales: `quotations`, `sales_orders`, **price list lookup** (Master
      Data's `price_lists`/`price_list_items` API, deferred from Phase 1,
      belongs here), `invoices`, credit limit check against
      `customers.credit_limit` (already in schema, unused until now)
- [ ] Dispatch: `dispatches`, `vehicles` (may reuse Phase 2's Gate &
      Weighment `vehicles` table rather than duplicating), `shipments`,
      `delivery_confirmations`
- [ ] Export: `export_customers`, `proforma_invoices`,
      `commercial_invoices`, `containers`, `shipment_milestones`
- [ ] **Backward + forward traceability query** — `product-requirements.md`
      §1 requires both directions (Supplier → Customer and Customer →
      Supplier) to actually work as a real query across every table
      built so far (Phase 1–4). This is a good phase-end integration
      test, not a new table.

**Definition of done:** a finished product can be traced backward to its
originating supplier and weighment, and the full `PO → ... → Dispatch`
chain is live-verified.

## Phase 5 — Supporting Operations ⬜ Not started

**Domains:** Maintenance, Workforce (new), Finance.

**Deliverables:**
- [ ] Maintenance: `maintenance_plans`, `breakdowns`, `work_orders`,
      `spare_parts`, `machine_history` (references Phase 1's `machines`)
- [ ] Workforce: `shifts`, `attendance`, `labour_allocation` (references
      Phase 1's `employees`)
- [ ] Finance: purchase/sales accounting, expenses, payments, receipts,
      cost centres, batch cost, profitability — **and the IGO ERP
      integration** (`product-requirements.md` §4.15: "should integrate
      with the central IGO ERP rather than creating conflicting books").
      This integration's actual API/protocol is unknown yet — treat
      discovering it as the first concrete task of this phase, not
      something to guess at now.
- [ ] Tax Configurations API (schema exists since Phase 1, deferred)

## Phase 6 — AI Layer ⬜ Not started

**Domains:** AI, Memory.

This phase depends on every prior phase having real, audited business
data for agents to act on — building it earlier would mean agents with
nothing real to read/act on, undermining the whole "verify live" ethos
this project has used so far.

**Deliverables:**
- [ ] `ai_agents`, `ai_sessions`, `ai_messages`, `ai_tool_calls`,
      `ai_approvals`, `ai_executions` schema
- [ ] Agent runtime + tool-calling infrastructure with permission
      controls (`docs/agents.md` §3: READ/ANALYZE/DRAFT/
      REQUEST_APPROVAL/EXECUTE/ADMIN — the current permission mechanism
      is binary has-it-or-doesn't; this phase needs the leveled version)
- [ ] LLM provider decision — still an Open Decision in
      `project-state.md`; resolve and record as an ADR before building
      against it
- [ ] The 12-agent registry from `docs/agents.md` §2, roughly in
      dependency order: Factory Copilot (A01, general-purpose, least
      risky) first, then domain agents once their business modules
      exist (Production Planning A02 after Phase 3, Procurement A03
      after Phase 2, etc. — an agent for a domain that doesn't exist yet
      has nothing to do), QC Assistant (A05) explicitly gated by the
      human-approval-first rule already built in Phase 3, Memory Agent
      (A12) last since it depends on the Memory system below existing
- [ ] Memory: `memory_items`, `memory_sources`, `memory_links`,
      `memory_versions`, `memory_feedback`, `memory_conflicts`, the
      pipeline from `docs/memory.md` §5 (candidate extraction →
      classification → dedup → conflict detection → permission check →
      approval → store → index → retrieval)
- [ ] AI UI: proposal/approve/reject panel per `docs/design.md` §7 — the
      backend approval mechanism from Phase 2 (PO thresholds) and Phase
      3 (QC release) generalizes here rather than being reinvented

## Phase 7 — Dashboards & Reporting ⬜ Not started

**Deliverables:**
- [ ] CEO Dashboard, Factory Dashboard, Procurement Dashboard, QC
      Dashboard (`product-requirements.md` §5) — these are read-only
      aggregation views over data that should already exist and be
      correct by this phase; building dashboards earlier risks
      dashboards over incomplete/unverified data
- [ ] Component library / design system decision (still an Open
      Decision) should probably be made before this phase, since
      dashboards are the most visually demanding screens in the product

## Phase 8 — Hardening ⬜ Not started

**Deliverables:**
- [ ] Security audit — `docs/security.md`'s "Not yet done" list (MFA,
      rate limiting, secrets management beyond `.env`, encryption at
      rest, session management beyond basic issue/revoke, CORS origin
      scoping, backup/DR, incident response)
- [ ] `npm audit` remediation — 27 vulnerabilities flagged since Phase 1
      (`changelog.md` v0.0.3), never triaged
- [ ] Performance pass (query indexing beyond what's already on
      `audit_events`, load testing)
- [ ] Legacy Go system retirement decision — still an Open Decision;
      "functional parity" needs a concrete definition before this can
      even be evaluated
- [ ] CI/CD (nothing has been wired to CI yet — every verification so
      far has been manual, live, interactive)

## Explicitly deferred / not phased

- **Multi-tenancy** — still an Open Decision in `project-state.md`. If
  resolved as "yes, genuinely multi-tenant," this touches every phase's
  tables (they all already carry a reserved `tenant_id` column, per
  ADR-002-era decisions) and the uniqueness-constraint fix from
  `changelog.md` v0.0.5 would need revisiting (single-column → composite
  `tenant_id`-aware). Better resolved before Phase 2 than mid-build.
- **Generic CRUD abstraction** — deliberately not built despite 4
  near-identical Master Data modules (Products/Suppliers/Customers/
  Warehouses) sharing the same shape. Revisit once Phase 1's remaining
  Master Data entities (Machines, Locations, Units of Measure, etc.) are
  built — at 8+ near-identical modules the duplication cost likely
  exceeds a shared abstraction's complexity cost; at 4 it didn't.

## TODO

- [ ] Confirm phase order and dependencies with stakeholders — this plan
      is derived from the dependency structure in
      `product-requirements.md` and `architecture.md`, not from business
      priority; a real deadline (e.g. "Sales needs to demo before
      Maintenance") could reasonably reorder Phase 4 vs Phase 5.
- [ ] Attach target dates once team capacity is known.
- [ ] Track phase status here as work progresses (update the ✅/🚧/⬜
      markers and checkboxes above alongside `project-state.md`, which
      tracks fine-grained current status).
