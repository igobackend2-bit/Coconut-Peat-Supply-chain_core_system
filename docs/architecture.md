# Coco Pith Factory — Technical Architecture

**Status:** This document mixes what's actually built (marked ✅) with
what's planned (marked 🚧 / ⬜). See `docs/roadmap.md` for the full
phase-by-phase implementation plan and `docs/project-state.md` for the
fine-grained "what's done right now" tracker — this file is the stable
target shape, those two are the moving trackers.

## 1. Architecture Overview

```text
Users / Operators / Managers / AI Agents
                 |
                 v
   apps/web — Vite + React SPA ✅ (a real screen for every module)
                 |
                 v (HTTP, CORS)
   apps/api — NestJS ✅
                 |
       +---------+----------+
       |                    |
       v                    v
 Business Modules ✅/🚧    AI Orchestration ⬜
 (Identity, Master Data     (Agent Runtime,
  done; rest per roadmap)    LLM Gateway — Phase 6)
       |                    |
       +---------+----------+
                 |
                 v
      Drizzle ORM ✅ → PostgreSQL (self-hosted) ✅
                 |
      +----------+----------+
      |          |          |
 Audit Log ✅  Memory ⬜  Business Data ✅/🚧
 (append-only,  (Phase 6)  (Identity + Master
  DB-enforced)              Data live; rest
                            per roadmap)
      |          |          |
      +----------+----------+
                 |
                 v
       IGO Central ERP / Accounts ⬜ (Phase 5)
```

**What's real today, concretely:** `apps/api` is a running NestJS app
with a global `AuditInterceptor` + `AuthFailureAuditFilter` writing to a
real, DB-trigger-enforced append-only `audit_events` table; `SessionAuthGuard`
+ `PermissionsGuard` enforce real RBAC. Identity (register/login/logout/me),
four Master Data modules (Products, Suppliers, Customers, Warehouses),
and all of Phase 2 (Vehicles, Drivers, Gate Entries, Weighments,
Purchase Orders with a real threshold-based approval workflow, Goods
Receipts, Raw Material Lots) are live APIs — the full `Supplier → Vehicle
→ Weighment → Raw Material Lot` traceability chain from
`product-requirements.md` §1 has been built and verified with a real SQL
join, not just each table tested in isolation. `apps/web` is a routed
SPA shell whose only real screen (Dashboard) calls the live API. Every
other box above is planned, not built — `docs/roadmap.md` sequences
exactly how they get built.

## 2. Technology Decisions (see decisions.md for ADRs)

Frontend: - React + TypeScript, built with Vite (ADR-005) - Client-side
SPA with React Router (no SSR — see ADR-005 for why Next.js was rejected) -
Responsive PWA via a Vite PWA plugin - Component library/design system:
not yet chosen (see project-state.md → Open Decisions)

Backend: - TypeScript/Node.js REST/JSON API layer (ADR-001) - NestJS as
the web framework (ADR-003), using its guards/pipes/interceptors for the
mandatory auth → authz → validation → business logic → transaction →
audit event → response pipeline (§19) - Event-driven internal services
where useful

Database: - Plain self-hosted PostgreSQL (ADR-002) - Drizzle ORM for
schema, migrations, and queries (ADR-004) - Row Level Security
implemented in application/DB policies (no managed-platform RLS) -
Transaction-safe stock operations - Append-only audit event tables

AI: - Agent orchestration layer - Ollama/local models where
appropriate - Cloud LLM gateway where approved - Tool-calling with
permission controls - Retrieval system for documents and memory

Infrastructure: - Cloud VPS or managed infrastructure - Object storage -
Redis/queue where required - Monitoring - Centralized logs - Scheduled
jobs

> **Note on the legacy Go system:** the pre-existing
> `Coconut-Peat-Supply-chain_core_system` Go/gRPC plugin architecture
> (see repo root `server/`, `plugins/`, `proto/`) is superseded by this
> architecture per ADR-001/ADR-002. It has not been deleted — it remains
> in the repository until the new system reaches functional parity, at
> which point its removal should go through its own approval and be
> recorded in `changelog.md`.

## 3. Core Database Domains

Each domain below is marked with its implementation status and, for
domains not yet built, the roadmap phase that covers it
(`docs/roadmap.md`).

### Identity — ✅ Implemented (Phase 1)

-   users
-   roles
-   permissions
-   user_sessions
-   service_accounts

API: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`,
`GET /auth/me`. RBAC: `SessionAuthGuard` + `PermissionsGuard` +
`@RequirePermissions`. See `docs/api.md`, `docs/permissions.md`.

### Master — ✅ Implemented (Phase 1, ongoing)

Implemented (`apps/api/src/db/schema/master-data.schema.ts`) —
expanded from the original list below to match
`product-requirements.md` §4.1's fuller Master Data scope. Raw materials
are modeled as `products.category = RAW_MATERIAL` rather than a separate
table, since they share the same identity/UoM/grading shape as finished
goods and packaging.

-   products (category: RAW_MATERIAL | FINISHED_GOOD | PACKAGING | CONSUMABLE) — API ✅
-   product_grades — schema ✅, no dedicated API yet (nested under products, 🚧)
-   product_grade_qc_specs (per-grade QC thresholds) — schema ✅, API ⬜ (still nested under Quality's product-grade lookup; not exposed standalone)
-   qc_parameters — API ✅ (closed a real gap — Quality's "Add Result" form used to need a hand-typed UUID before this existed)
-   suppliers — API ✅
-   customers — API ✅
-   vendors (service providers — transport/maintenance/contract labour, distinct from suppliers) — API ✅
-   machines — API ✅
-   warehouses — API ✅
-   locations — API ✅
-   employees — API ✅
-   departments — API ✅
-   units_of_measure — API ✅
-   packaging_types — API ✅
-   tax_configurations — schema ✅, API ⬜ (Phase 5 — Finance needs it first)
-   price_lists, price_list_items — schema ✅, API ⬜ (Phase 4 — Sales needs it first)

### Procurement — 🚧 Partially implemented (Phase 2)

-   purchase_orders — ✅ API implemented (`GET/POST /purchase-orders`,
    `POST /purchase-orders/:id/{approve,reject}`), including the
    threshold-based approval workflow (first real use of Governance's
    `approvals` table)
-   goods_receipts — ✅ API implemented (`GET/POST /goods-receipts`)
-   purchase_requisitions — ⬜ deferred, see `docs/roadmap.md` Phase 2
-   supplier_rates — ⬜ deferred
-   supplier_documents — ⬜ deferred (needs object storage, not
    integrated anywhere in this project yet)

### Gate & Weighment — ✅ Implemented (Phase 2)

Not in the original domain list but required by
`product-requirements.md` §4.3 and the traceability chain (§1: `Supplier
→ Vehicle → Weighment → Raw Material Lot → ...`). Added here for
completeness.

-   vehicles — ✅ (`GET/POST /vehicles`, `PATCH /vehicles/:id`)
-   drivers — ✅ (`GET/POST /drivers`)
-   gate_entries — ✅ (`GET/POST /gate-entries`)
-   weighments — ✅ (`GET/POST /weighments`) — gross/tare/net weight,
    **duplicate-weighment prevention verified two ways**: a DB
    `UNIQUE(gate_entry_id)` constraint and a service-level status check,
    both live-tested to actually reject a duplicate

### Raw Material — ✅ Implemented (Phase 2)

Also not in the original domain list but required by
`product-requirements.md` §4.4. Distinct from Inventory's generic
`stock_ledger` — this domain is specifically about lot-level identity and
quality capture at receipt.

-   raw_material_lots — ✅ (`GET/POST /raw-material-lots`) — created
    from a Goods Receipt, with `product_id`/`supplier_id` derived from
    the receipt's Purchase Order rather than accepted from the caller,
    so origin can't drift from what was actually ordered

### Production — 🚧 Core lifecycle implemented (Phase 3)

-   production_orders — ⬜ deferred (planning layer above batches, not
    needed for this phase's chain)
-   production_batches — ✅ full lifecycle API (`IN_PROGRESS → COMPLETED
    → (ON_HOLD →) RELEASED/REJECTED → CLOSED`)
-   batch_inputs — ✅ (consumes a raw material lot in full — MVP
    simplification, real ledger model is Inventory/Phase 4)
-   batch_outputs — ✅
-   process_steps (configurable per product, per
    `product-requirements.md` §4.6) — ⬜ deferred, needs its own design
    (configurable per-product process flow templates), not improvised
-   machine_runs — ⬜ deferred
-   wastage_records — ⬜ deferred

### Quality — 🚧 Core mechanism implemented (Phase 3)

-   qc_plans — ⬜ deferred
-   qc_samples — ✅ (`GET/POST /qc-samples`)
-   qc_tests — ⬜ folded into qc_results (a result IS a completed test
    for this MVP)
-   qc_results — ✅ (`GET/POST /qc-samples/:id/results`) — **auto-checks
    against `product_grade_qc_specs` and auto-puts the batch `ON_HOLD`
    with a `PENDING` approval on an out-of-spec result**, verified live
    with a real out-of-spec case (see `docs/permissions.md`)
-   qc_decisions — ⬜ deferred (tracked as `production_batches.status` +
    `audit_events`, not a separate table yet)
-   corrective_actions — ⬜ deferred

Note: `qc_parameters` and `product_grade_qc_specs` (Master domain,
schema ✅) already define *what* to test and the pass/fail thresholds;
this domain is *executing* those tests and recording results/decisions
against a specific batch.

### Inventory — 🚧 Core implemented (Phase 4)

-   stock_ledger — ✅ (`GET /stock-ledger`) — append-only, DB-trigger
    enforced, mirrors `audit_events`' pattern exactly (§4). Written only
    by the business operations that cause a movement: Raw Material Lot
    creation credits `RAW_MATERIAL_RECEIPT`, Production
    consumption/output debit/credit — never by a direct client write.
-   stock_balances — ✅ (`GET /stock-balances`) — **computed**, not a
    stored/maintained table: `SUM(quantity_kg) GROUP BY product_id,
    location_id` over `stock_ledger`, to avoid a dual-write consistency
    problem between a ledger and a separately-maintained balance table.
-   stock_movements — folded into `stock_ledger` itself (one row per
    movement); no separate table needed.
-   lots (finished-goods/WIP lot identity, distinct from
    raw_material_lots) — ⬜ deferred
-   pallets — ⬜ deferred
-   packaging_inventory — ⬜ deferred

### Packing — 🚧 Core implemented (Phase 4)

Also not in the original domain list; required by
`product-requirements.md` §4.9.

-   packing_orders — ✅ (`GET/POST /packing-orders`) — can only be
    created against a `RELEASED` production batch (enforced server-side,
    409 otherwise); status `PENDING → IN_PROGRESS → COMPLETED`
-   packing_lots — ✅ (`GET/POST /packing-orders/:id/lots`) — batch
    number (server-generated `lot_number`), QC status field present.
    **Deferred**: real QR code generation (the lot number is the
    traceable identifier for now), links to pallets/containers
    (Inventory's `pallets`, itself deferred)

### Sales — 🚧 Core implemented (Phase 4)

-   quotations — ⬜ deferred (a pre-commitment draft, not on the
    critical path for validating an order against credit limit)
-   sales_orders — ✅ (`GET/POST /sales-orders`, `POST .../items`,
    `POST .../confirm`, `POST .../cancel`) — `DRAFT` orders build up
    freely; credit-limit exposure is checked only at `confirm()` against
    `customers.credit_limit`, a hard 409 (no approval-override path yet,
    unlike Procurement's PO-threshold `approvals` flow)
-   invoices — ⬜ deferred (belongs once goods actually move —
    Dispatch/Finance)

### Dispatch — 🚧 Core implemented (Phase 4)

Split out from the original "Sales/Logistics" domain list — dispatch is
a distinct concern (getting goods physically out the gate) from taking
and validating a sales order.

-   dispatches — ✅ (`GET/POST /dispatches`, `POST .../dispatch`,
    `POST .../deliver`, `POST .../cancel`) — can only be created against
    a `CONFIRMED` sales order; at most one *active* (non-`CANCELLED`)
    dispatch per order, enforced server-side (a hard DB unique
    constraint was tried first, found wrong by live testing — it
    permanently blocked redispatch after a cancellation — and replaced
    with a service-level check, see `docs/database-schema.md`)
-   vehicles — ✅ reuses Phase 2's Gate & Weighment `vehicles`/`drivers`
    tables directly, not duplicated
-   dispatch_lots — ✅ which packed lots ship on a dispatch; makes batch → customer
    and customer → supplier traceability possible (`/reports/traceability/*`)
-   shipments — ⬜ deferred, folded into `dispatches.deliveredAt`/
    `deliveryNotes` for this MVP
-   delivery_confirmations — ⬜ deferred, same fold-in as `shipments`

### Export — 🚧 Core implemented (Phase 4)

Required by `product-requirements.md` §4.12.

-   export_customers — ✅
-   proforma_invoices (+ items) — ✅ `DRAFT → ISSUED → CONVERTED`
-   commercial_invoices — ✅ only from an issued proforma
-   containers — ✅ only against a non-cancelled invoice
-   shipment_milestones — ✅ forward-only, append-only trail
-   **Deferred**: HS codes, bill of lading, customs documents, FX, lot linkage

### Maintenance — ✅ Implemented (Phase 5)

-   maintenance_plans, breakdowns, work_orders, spare_parts — ✅
-   machine_history — ✅ computed view, not a table
-   Wired into Master Data: a breakdown suspends the machine; resolving the
    last open one restores it; completing a preventive order advances its plan.

### Workforce — ✅ Implemented (Phase 5)

Required by `product-requirements.md` §4.14.

-   shifts, attendance, labour_allocations — ✅
-   Rules: one attendance row per employee per day; labour only for people
    who attended; 12h/6h daily cap.

### Finance — 🚧 Operational finance only (Phase 5, ADR-009)

-   cost_centres, expenses, payments — ✅
-   Computed: receivables (with credit utilisation), payables, material-only
    batch cost — ✅
-   expenses cannot be approved by their submitter (segregation of duties)
-   purchase_accounting / sales_accounting / receipts / product_profitability —
    ⬜ **not built**: no general ledger, tax or GST; IGO ERP integration
    deferred until its protocol is known

### AI — 🚧 Rule-based analyzers, no LLM (Phase 6, ADR-008)

-   ai_agents (A01–A12), ai_runs, ai_findings — ✅
-   8 of 12 agents run as deterministic analyzers; findings are `PROPOSED`
    and need a human decision; nothing here changes business data
-   ai_sessions, ai_messages, ai_tool_calls, ai_approvals, ai_executions —
    ⬜ need an LLM and a leveled permission model

### Governance — ✅ audit_events + approvals implemented (Phase 1–2)

-   audit_events — ✅ implemented, append-only enforced at the DB level
    via triggers (`database/migrations/0001_enforce_audit_events_append_only.sql`)
-   change_events — ⬜ (may fold into audit_events' `diff` field rather
    than a separate table — revisit when the human-readable change-log
    UI from `design.md` §6 is built)
-   approvals — ✅ implemented (Phase 2, first used for PO approval
    thresholds — see Procurement above and `docs/permissions.md`
    "Approval mechanism"). Generic `entityType`/`entityId` shape, meant
    to be reused by other domains (e.g. QC batch release, Phase 3)
    rather than each inventing its own.
-   security_events — ⬜ (may fold into `audit_events` with
    `module: SECURITY`, the pattern `AuthFailureAuditFilter` already
    uses for access-denied events — revisit if a genuinely separate
    shape is needed)
-   system_events — ⬜

### Memory — 🚧 Core implemented (Phase 6)

-   memory_items — ✅ typed, versioned (edits supersede, never overwrite),
    sensitivity-filtered (`CONFIDENTIAL` needs a permission), text search
-   memory_sources, memory_links, memory_feedback, memory_conflicts,
    embeddings, automatic candidate extraction — ⬜

## 4. Event-Driven Principle

Business actions should produce domain events.

Example:

```text
GoodsReceiptCreated
       |
       +--> InventoryUpdated
       +--> SupplierLedgerUpdated
       +--> AuditEventCreated
       +--> MemoryCandidateCreated
       +--> NotificationCreated
```

Events must be idempotent and traceable.

## 5. Security

-   RBAC + permission checks
-   Application-enforced row-level access (no managed-platform RLS; see ADR-002)
-   API authentication
-   MFA for privileged users
-   Approval workflows
-   Secret management
-   Encryption
-   Rate limiting
-   Audit logging
-   Backup and disaster recovery

## 6. Integration Architecture

Potential integrations: - IGO ERP - Accounting - GST/e-invoicing
services - Weighbridge - Barcode/QR scanners - WhatsApp notifications -
Email - Logistics APIs - IoT/machine telemetry - Cloud storage

External integrations must use integration IDs and retry-safe APIs.

## 7. Observability

Capture: - API logs - application logs - AI execution logs - database
audit events - integration logs - security logs - performance metrics -
errors

Every distributed operation should have:
`request_id + correlation_id + actor_id + conversation_id`.
