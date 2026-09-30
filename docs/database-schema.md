# Coco Pith Factory — Database Schema

**Status:** Identity, Master Data, Governance (`approvals`), Gate &
Weighment, Procurement, and Raw Material domains implemented and
verified. Other domains remain stubs (see `architecture.md` §3 for the
full planned table list per domain, `docs/roadmap.md` for the build
order).

Source of truth is the Drizzle TypeScript schema under
`apps/api/src/db/schema/`; this file describes it in prose and must be
kept in sync. Migrations live at the repo-root `database/migrations/`
(see ADR-004 for why migration output lives outside `apps/api`).

## Applied migrations

| # | File | Contents |
|---|---|---|
| 0000 | `0000_optimal_miek.sql` | `audit_events` (append-only audit log, `docs/actions.md` §4) |
| 0001 | `0001_enforce_audit_events_append_only.sql` | DB-level triggers blocking `UPDATE`/`DELETE` on `audit_events` |
| 0002 | `0002_identity_and_master_data.sql` | Identity domain (users/roles/permissions/sessions/service accounts) + Master Data domain (24 tables total across both) |
| 0003 | `0003_phase2_procurement_gate_weighment_raw_material.sql` | `approvals` (Governance) + Gate & Weighment (4 tables) + Procurement (2 tables) + Raw Material (1 table) — 8 tables total |
| 0004 | `0004_phase3_production_quality.sql` | Production (3 tables) + Quality (2 tables) — 5 tables total |
| 0005 | `0005_phase4_inventory_stock_ledger.sql` | Inventory domain — `stock_ledger` (1 table) |
| 0006 | `0006_enforce_stock_ledger_append_only.sql` | DB-level triggers blocking `UPDATE`/`DELETE` on `stock_ledger`, same pattern as 0001 for `audit_events` |
| 0007 | `0007_add_raw_material_receipt_movement_type.sql` | Adds `RAW_MATERIAL_RECEIPT` to `stock_movement_type` enum — found missing via live testing, see "Inventory domain" below |

## Identity domain (`apps/api/src/db/schema/identity.schema.ts`)

| Table | Purpose | Key relationships |
|---|---|---|
| `permissions` | Global, system-defined permission catalog (e.g. `production.batch.approve`) — **not** per-tenant | — |
| `roles` | Named role per tenant (e.g. `QC_MANAGER`) | — |
| `role_permissions` | Many-to-many: which permissions a role grants | `roles`, `permissions` |
| `users` | Human accounts | optional `employees.id` link |
| `user_roles` | Many-to-many: which roles a user has | `users`, `roles` |
| `user_sessions` | Active/expired login sessions (hashed token, not the raw token) | `users` |
| `service_accounts` | Non-human actors — AI agents and integrations (`docs/agents.md`'s `AI_AGENT` actor type, `docs/actions.md`'s `INTEGRATION` actor type) | — |

## Master Data domain (`apps/api/src/db/schema/master-data.schema.ts`)

Expanded beyond `architecture.md`'s original minimal list to match
`product-requirements.md` §4.1's fuller scope (raw materials, vendors,
units of measure, packaging types, QC parameters, departments, tax
configuration, price lists) — see that file's updated §3 for the
reconciled list.

| Table | Purpose | Key relationships |
|---|---|---|
| `departments` | Org unit an employee belongs to | — |
| `units_of_measure` | kg, pcs, bag, litre, etc. | — |
| `employees` | Factory staff | → `departments` |
| `warehouses` | Top-level storage sites | — |
| `locations` | Specific storage location (bay/rack/yard/dock), optionally under a warehouse | → `warehouses` (nullable) |
| `machines` | Production equipment | → `locations` (nullable) |
| `packaging_types` | Bag/box/pallet definitions with capacity | → `units_of_measure` |
| `products` | Raw material / finished good / packaging / consumable — one identity table for all product categories | → `units_of_measure` |
| `product_grades` | Grade variants of a product (e.g. Grade A/B) | → `products` |
| `qc_parameters` | pH, EC, moisture, etc. — the measurable things QC tests for | → `units_of_measure` (nullable) |
| `product_grade_qc_specs` | Min/max/target threshold for a QC parameter, per product grade | → `product_grades`, `qc_parameters` |
| `suppliers` | Raw material suppliers | — |
| `customers` | Sales customers | — |
| `vendors` | Service providers (transport, maintenance, contract labour) — distinct from suppliers | — |
| `tax_configurations` | GST/CGST/SGST/IGST/export tax rates with effective dates | — |
| `price_lists` | Named price list (currency, validity window) | — |
| `price_list_items` | Per-product(-grade) unit price within a price list | → `price_lists`, `products`, `product_grades` (nullable) |

## Governance domain (`apps/api/src/db/schema/governance.schema.ts`)

| Table | Purpose | Key relationships |
|---|---|---|
| `approvals` | Generic approval workflow record — `entityType`/`entityId` deliberately generic so any domain can reuse it (first real use: Purchase Orders over the approval threshold) | → `users` (`requestedBy`, `decidedBy`) |

## Gate & Weighment domain (`apps/api/src/db/schema/gate-weighment.schema.ts`)

| Table | Purpose | Key relationships |
|---|---|---|
| `vehicles` | Registered vehicles (unique `registration_number`) | — |
| `drivers` | Registered drivers | — |
| `gate_entries` | A vehicle's visit (`direction`: INBOUND/OUTBOUND, defaults INBOUND for Phase 2's raw-material-receipt scope) | → `vehicles`, `drivers` (nullable), `suppliers` (nullable) |
| `weighments` | Gross/tare/net weight for one gate entry. `gate_entry_id` is **UNIQUE** — the DB-level half of duplicate-weighment prevention (`product-requirements.md` §4.3); the service-level half is a status check in `WeighmentsService`. `net_weight_kg` is computed in the service, not a DB-generated column | → `gate_entries` (unique), `products` (nullable) |

## Procurement domain (`apps/api/src/db/schema/procurement.schema.ts`)

Purchase Requisitions, Supplier Rates, and Supplier Documents are
deliberately deferred — see `docs/roadmap.md` Phase 2.

| Table | Purpose | Key relationships |
|---|---|---|
| `purchase_orders` | `total_amount` computed server-side; `status` includes `PENDING_APPROVAL` for orders over the (hardcoded) approval threshold | → `suppliers`, `products`, `units_of_measure` (nullable) |
| `goods_receipts` | Records receiving against a PO. `weighment_id` is **UNIQUE** (one receipt per weighment) | → `purchase_orders`, `weighments` (nullable, unique) |

## Raw Material domain (`apps/api/src/db/schema/raw-material.schema.ts`)

| Table | Purpose | Key relationships |
|---|---|---|
| `raw_material_lots` | Lot-level identity + quality capture at receipt. `product_id`/`supplier_id` are populated from the linked Goods Receipt's Purchase Order at creation time, not accepted directly from callers (see `docs/api.md`). `goods_receipt_id` is **UNIQUE** (one lot per receipt, Phase 2 scope) | → `products`, `suppliers`, `goods_receipts` (unique), `locations` (nullable) |

## Production domain (`apps/api/src/db/schema/production.schema.ts`)

`production_orders`, `process_steps`, `machine_runs`, `wastage_records`
deliberately deferred — see `docs/roadmap.md` Phase 3.

| Table | Purpose | Key relationships |
|---|---|---|
| `production_batches` | The operational unit. Status lifecycle: `IN_PROGRESS → COMPLETED → (ON_HOLD →) RELEASED/REJECTED → CLOSED` | → `products`, `product_grades` (nullable) |
| `batch_inputs` | Raw material consumption. `raw_material_lot_id` is **UNIQUE** — a lot is consumed once, in full (MVP simplification; the real ledger model is Inventory, Phase 4) | → `production_batches`, `raw_material_lots` (unique) |
| `batch_outputs` | Finished-good output recorded against a batch | → `production_batches`, `products`, `product_grades` (nullable) |

## Quality domain (`apps/api/src/db/schema/quality.schema.ts`)

`qc_plans`, a distinct `qc_tests` entity, `corrective_actions`, and a
dedicated `qc_decisions` table deliberately deferred — see
`docs/roadmap.md` Phase 3.

| Table | Purpose | Key relationships |
|---|---|---|
| `qc_samples` | A sample taken from a completed (or already-held) batch | → `production_batches` |
| `qc_results` | One measured value per QC parameter per sample. `passed` is computed server-side against the batch's product grade's `product_grade_qc_specs` (Master Data, Phase 1) — `null` if the batch has no grade or no spec exists for that parameter, never auto-guessed | → `qc_samples`, `qc_parameters` |

## Inventory domain (`apps/api/src/db/schema/inventory.schema.ts`)

`stock_balances` deliberately **not** a table — see the doc comment at
the top of `inventory.schema.ts`. A separately-maintained balance table
requires every writer to keep it in sync with the ledger (a dual-write
consistency problem); instead balances are computed on read as
`SUM(quantity_kg) GROUP BY product_id, location_id` over `stock_ledger`.

| Table | Purpose | Key relationships |
|---|---|---|
| `stock_ledger` | Append-only (DB-trigger enforced, migration 0006) record of every stock movement. `quantity_kg` is signed: negative = leaving stock, positive = entering. `movement_type` ∈ `RAW_MATERIAL_RECEIPT`, `RAW_MATERIAL_CONSUMPTION`, `PRODUCTION_OUTPUT`, `ADJUSTMENT`. `reference_type`/`reference_id` point back at the business record that caused the movement (`raw_material_lot`, `production_batch`) | → `products`, `locations` (nullable) |

No direct write endpoint exists (`InventoryController` is read-only —
`GET /stock-ledger`, `GET /stock-balances`). Entries are written only by
the service that owns the underlying business event:
`RawMaterialLotsService.createFromGoodsReceipt()` (credits
`RAW_MATERIAL_RECEIPT`) and `ProductionBatchesService.addInput()`/
`addOutput()` (debits `RAW_MATERIAL_CONSUMPTION`, credits
`PRODUCTION_OUTPUT`). The receipt-side credit was added one migration
(0007) after the consumption-side debit — live testing after the
Production retrofit showed a raw material's computed balance going
permanently negative because nothing had ever credited a receipt. See
`docs/changelog.md` for the found-and-fixed transcript.

## Cross-cutting design decisions

- **`tenant_id`** is a nullable `uuid` column on every domain table
  (except join tables and the global `permissions` catalog). Multi-tenancy
  is an open decision (`project-state.md`) — the column is reserved to
  avoid a painful migration later, but nothing currently enforces
  tenant isolation.
- **Uniqueness is single-column (`code`/`sku`/`email`), not composite with
  `tenant_id`.** This was a real bug found by testing, not a design
  choice made in the abstract: `UNIQUE(tenant_id, code)` does not work
  while `tenant_id` is `NULL` for every row, because PostgreSQL treats
  `NULL` as distinct from `NULL` for uniqueness — two rows with the same
  code and both `NULL` tenant_id would both be accepted. This was
  inserted, observed, and fixed before being left in the schema. See the
  doc comment at the top of `master-data.schema.ts` for the full
  explanation and the migration path if/when multi-tenancy is decided.
- **`created_by`/`updated_by` columns are intentionally omitted.**
  `audit_events` already captures `actor_id` per change
  (`docs/actions.md` §4); per-row "last touched by" columns can be added
  later without breaking this schema if a specific module needs faster
  access to that without querying the audit log.
- **Raw materials are `products` with `category = RAW_MATERIAL`**, not a
  separate table — they share identity, unit-of-measure, and grading
  shape with finished goods and packaging.

## Verification performed

All of the following were actually run against a local PostgreSQL
database, not just written (see `docs/changelog.md` for exact commands
and output per entry):

- `drizzle-kit generate`/`migrate` for every migration listed above,
  including a full rebuild-from-scratch when the `products.sku`
  uniqueness bug (below) was found and fixed pre-commit.
- Phase 1: a full insert chain — unit of measure → product → product
  grade → QC parameter → QC threshold spec, and separately department →
  employee → user → role → permission → role-permission → user-role —
  joined together in one query.
- Phase 2: a full chain via the live API (not raw SQL) — vehicle →
  driver → gate entry → weighment (with both a DB-level and
  service-level duplicate-weighment rejection verified) → purchase order
  (both under- and over-threshold, the latter through a real approve
  step) → goods receipt → raw material lot — then a single SQL join from
  `raw_material_lots` back through `goods_receipts → purchase_orders`
  and `weighments → gate_entries → vehicles` confirmed correct backward
  traceability (`product-requirements.md` §1).
- The `products.sku` uniqueness bug was found, fixed, and re-verified: a
  duplicate SKU insert now correctly fails with
  `duplicate key value violates unique constraint "products_sku_unique"`.

## Not yet done

- Inventory: `stock_movements`-level detail beyond the ledger (already
  covered by `stock_ledger` itself), lot/pallet tracking, packaging
  inventory, a manual `ADJUSTMENT` write endpoint. Sales/Logistics,
  Maintenance, Workforce, Finance, AI, and Memory domains — see
  `docs/roadmap.md` Phases 4–6 for the build order.
- Purchase Requisitions, Supplier Rates, Supplier Documents (Procurement
  — deferred, see `docs/roadmap.md` Phase 2).
- Production Orders, Process Steps (needs its own design), Machine Runs,
  Wastage Records, QC Plans, a distinct QC Tests entity, Corrective
  Actions, a dedicated QC Decisions table — all deferred from Phase 3,
  see `docs/api.md` "Production"/"Quality" for the reasoning per item.
- Partial goods receipts (PO status has `PARTIALLY_RECEIVED` in the
  enum, but `GoodsReceiptsService` always fully receives — Phase 2
  simplification, documented in its own file).
- No Drizzle relations API definitions (`relations()` helper) — the
  schema only has raw FK columns so far; typed relational queries
  (`db.query.products.findMany({ with: { grades: true } })`) aren't
  wired up yet.
- No standardized handling of raw Postgres FK-violation errors into
  clean 4xx responses — referencing a nonexistent id in a
  not-yet-explicitly-validated FK column (e.g. `baseUnitId` on a
  product) currently surfaces as an unhandled 500, not a clean 400/404.
