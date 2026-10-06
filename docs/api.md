# Coco Pith Factory — API Specification

**Status:** Identity (auth) + all Master Data entities (Products,
Suppliers, Vendors, Customers, Warehouses, Departments, Employees,
Locations, Machines, Units of Measure, Packaging Types, QC Parameters) +
Phase 2 (Gate & Weighment, Procurement, Raw Material) + Phase 3
(Production Batches, QC Samples/Results) + Phase 4 core (Inventory —
stock ledger and computed balances; Packing — packing orders and lots;
Sales — sales orders with credit-limit enforcement; Dispatch — dispatch
records against confirmed sales orders; Export) + Phase 5 (Maintenance,
Workforce, Finance) + Phase 6 (Memory, rule-based AI analyzers) +
Reports, Audit & Activity, and user/role management — all implemented
and verified live.
Everything else remains to be built as its module is implemented (see
`docs/roadmap.md` for the phase plan, `docs/project-state.md` for
current status).

Base URL in dev: `http://localhost:3001` (see `apps/api/README.md` for
why 3001, not 3000, on this machine). No `/api` path prefix — routes are
mounted at their controller path directly (`/health`, `/auth/*`,
`/products/*`).

Every mutating request pipeline follows `MASTER_PROMPT.md` §19: guards
(auth → authz) → validation pipe → handler → audit event. See
`docs/actions.md` for the audit event shape and
`apps/api/src/common/audit/` for the implementation.

## Auth

Session-token auth, not JWT: `POST /auth/login` issues an opaque random
token; the server stores only its SHA-256 hash (`user_sessions.token_hash`).
Clients send `Authorization: Bearer <token>` on subsequent requests.

| Method | Path | Auth required | Permission required | Notes |
|---|---|---|---|---|
| `POST` | `/auth/register` | No | — | Creates a user. Returns the sanitized user (no password hash). |
| `POST` | `/auth/login` | No | — | Returns `{ token, expiresAt }`. Token TTL is 7 days (hardcoded, not yet configurable). |
| `POST` | `/auth/logout` | Yes | — | Revokes the current session (sets `revoked_at`). |
| `GET` | `/auth/me` | Yes | — | Returns the authenticated user's id/email/fullName/roles/permissions. |

**No self-service admin bootstrap.** After registering, a user has no
roles. See `database/seeds/001-rbac-baseline.sql` for the baseline
`SUPER_ADMIN` role + starter permission catalog, and its comment for the
manual SQL to assign that role to a user — there is no API endpoint for
this yet.

## Master Data → Products

All endpoints require authentication (`SessionAuthGuard`). `POST`/`PATCH`
additionally require the `master_data.product.write` permission
(`PermissionsGuard`) — `GET` endpoints only require authentication, no
specific permission, matching `docs/agents.md` §3's `READ` permission
level being the baseline.

| Method | Path | Permission required | Notes |
|---|---|---|---|
| `GET` | `/products` | — (auth only) | Lists all products. |
| `GET` | `/products/:id` | — (auth only) | 404 if not found. |
| `POST` | `/products` | `master_data.product.write` | 409 on duplicate SKU. Audited (`@AuditLog`). |
| `PATCH` | `/products/:id` | `master_data.product.write` | 404 if not found. Audited. SKU is not updatable by design (immutable identity). |

**No `DELETE /products/:id`.** `docs/agents.md` §3 lists master-data
deletion as a high-risk operation requiring approval, and no approval
workflow exists yet. Deactivate via `PATCH { "status": "INACTIVE" }`
instead.

## Master Data → Suppliers, Customers, Warehouses

Same pattern as Products, replicated per-entity (each has its own
service/controller/module, not a generic CRUD factory — that
abstraction isn't justified yet with only 4 entities). Same guard order
(`SessionAuthGuard, PermissionsGuard`), same "read needs auth only,
write needs a permission" split, same "no DELETE" rationale.

| Method | Path | Permission required | Notes |
|---|---|---|---|
| `GET` | `/suppliers`, `/suppliers/:id` | — (auth only) | |
| `POST` | `/suppliers` | `master_data.supplier.write` | 409 on duplicate `code`. |
| `PATCH` | `/suppliers/:id` | `master_data.supplier.write` | `code` not updatable. |
| `GET` | `/customers`, `/customers/:id` | — (auth only) | |
| `POST` | `/customers` | `master_data.customer.write` | 409 on duplicate `code`. `creditLimit` accepted as a JSON number, stored as Postgres `numeric` (string internally) — see `CustomersService.toColumns()` for the conversion. |
| `PATCH` | `/customers/:id` | `master_data.customer.write` | `code` not updatable. |
| `GET` | `/warehouses`, `/warehouses/:id` | — (auth only) | |
| `POST` | `/warehouses` | `master_data.warehouse.write` | 409 on duplicate `code`. |
| `PATCH` | `/warehouses/:id` | `master_data.warehouse.write` | `code` not updatable. |

`master_data.{supplier,customer,warehouse}.read` permission codes are
seeded (see `database/seeds/001-rbac-baseline.sql`) but **not currently
enforced** — same "seeded for forward compatibility, not yet gating
reads" situation as `master_data.product.read` (see
`docs/permissions.md`).

## Master Data → Departments, Employees, Locations, Machines, Units of Measure, Packaging Types, QC Parameters

The remaining seven Master Data entities from `architecture.md` §3, all
plain CRUD (list/get/create, no update endpoint yet, no DELETE) — same
pattern, one write permission each (`master_data.<entity>.write`).

| Method | Path | Notes |
|---|---|---|
| `GET`/`POST` | `/departments` | — |
| `GET`/`POST` | `/employees` | `departmentId` optional reference |
| `GET`/`POST` | `/locations` | `warehouseId` optional reference |
| `GET`/`POST` | `/machines` | `locationId` optional reference; `capacityPerHour` numeric |
| `GET`/`POST` | `/units-of-measure` | — |
| `GET`/`POST` | `/packaging-types` | `capacityUnitId` optional reference to units-of-measure |
| `GET`/`POST` | `/qc-parameters` | `unitId` optional reference to units-of-measure. **Closes a real gap**: the Quality module's "Add Result" form used to require a hand-typed QC parameter UUID because this endpoint didn't exist — it now has a real dropdown (`apps/web/src/pages/QualityPage.tsx`). |

## Gate & Weighment

One `GateWeighmentModule` (unlike Master Data's one-module-per-entity —
see the doc comment in `gate-weighment.module.ts`), all behind
`SessionAuthGuard` + `PermissionsGuard`.

| Method | Path | Permission required | Notes |
|---|---|---|---|
| `GET`/`POST` | `/vehicles`, `/vehicles/:id`, `PATCH /vehicles/:id` | write needs `gate_weighment.vehicle.write` | 409 on duplicate `registrationNumber`. |
| `GET`/`POST` | `/drivers`, `/drivers/:id` | write needs `gate_weighment.driver.write` | No update endpoint yet (not needed for Phase 2's definition of done). |
| `GET`/`POST` | `/gate-entries`, `/gate-entries/:id` | write needs `gate_weighment.gate_entry.write` | Defaults `direction: INBOUND`, `status: AT_GATE`. No "close"/exit endpoint yet. |
| `GET`/`POST` | `/weighments`, `/weighments/:id` | write needs `gate_weighment.weighment.write` | **Duplicate-weighment prevention** (`product-requirements.md` §4.3), enforced two ways: a DB `UNIQUE(gate_entry_id)` constraint, and a service-level check that 409s with a clear message if the gate entry isn't `AT_GATE`. Also 400s if `tareWeightKg >= grossWeightKg`. `netWeightKg` is computed server-side (`gross - tare`), not accepted from the client. On success, flips the gate entry to `status: WEIGHED`. |

## Procurement

| Method | Path | Permission required | Notes |
|---|---|---|---|
| `GET`/`POST` | `/purchase-orders`, `/purchase-orders/:id` | write needs `procurement.purchase_order.write` | `totalAmount` computed server-side (`quantity × unitPrice`). Orders over ₹100,000 (hardcoded threshold — see `PurchaseOrdersService`) are created as `PENDING_APPROVAL` with an `approvals` row instead of `APPROVED`; orders at or under the threshold are auto-`APPROVED`. |
| `POST` | `/purchase-orders/:id/approve` | `procurement.purchase_order.approve` (distinct from `.write` — approval is a higher privilege) | 409 if the PO isn't `PENDING_APPROVAL`. Marks the matching `approvals` row `APPROVED` and the PO `APPROVED`. |
| `POST` | `/purchase-orders/:id/reject` | `procurement.purchase_order.approve` | Same shape as approve, decision `REJECTED`. |
| `GET`/`POST` | `/goods-receipts`, `/goods-receipts/:id` | write needs `procurement.goods_receipt.write` | 409 if the referenced PO isn't `APPROVED`. On success, flips the PO to `RECEIVED` (Phase 2 simplification: one receipt fully receives its PO — no partial receipts yet, despite the `PARTIALLY_RECEIVED` status existing in the schema). |

**Deferred from this phase** (see `docs/roadmap.md` Phase 2): Purchase
Requisitions, Supplier Rates, Supplier Documents (needs object storage,
not integrated anywhere yet).

## Raw Material

| Method | Path | Permission required | Notes |
|---|---|---|---|
| `GET`/`POST` | `/raw-material-lots`, `/raw-material-lots/:id` | write needs `raw_material.lot.write` | Created from a Goods Receipt (`goodsReceiptId`), not directly — `productId`/`supplierId` are **derived from the receipt's Purchase Order**, not accepted from the client, so a lot's recorded origin can never drift from what was actually ordered (see the doc comment in `RawMaterialLotsService`). 409 if the goods receipt already has a lot (one lot per receipt, Phase 2 scope). |

**Verified backward traceability** (`product-requirements.md` §1): a
single SQL join from `raw_material_lots` through `goods_receipts →
purchase_orders` and `weighments → gate_entries → vehicles` correctly
resolves a lot back to its supplier, PO, weighment (gross/tare/net), and
delivery vehicle — see `docs/changelog.md` for the exact query and
output.

## Production

`ProductionModule` (one module, same rationale as Gate & Weighment —
these entities are tightly coupled and always deployed together). All
behind `SessionAuthGuard` + `PermissionsGuard`.

| Method | Path | Permission required | Notes |
|---|---|---|---|
| `GET`/`POST` | `/production-batches`, `/production-batches/:id` | write needs `production.batch.write` | Created directly in `IN_PROGRESS` (no separate "start" step). `batchNumber` auto-generated. |
| `GET`/`POST` | `/production-batches/:id/inputs` | `production.batch.write` | Consumes a raw material lot **in full** — the lot's `status` flips to `CONSUMED`. 409 if the lot is already consumed, 409 if the batch isn't `IN_PROGRESS`. |
| `GET`/`POST` | `/production-batches/:id/outputs` | `production.batch.write` | Records finished-good output. |
| `POST` | `/production-batches/:id/complete` | `production.batch.write` | 400 if no outputs recorded yet. `IN_PROGRESS → COMPLETED`. |
| `POST` | `/production-batches/:id/release` | `production.batch.release` (**distinct from `.write`** — same higher-privilege pattern as `procurement.purchase_order.approve`) | `COMPLETED → RELEASED` directly, or `ON_HOLD → RELEASED` if a matching `PENDING` approval exists (400 if not — see Quality below for how a batch gets put `ON_HOLD`). |
| `POST` | `/production-batches/:id/reject` | `production.batch.release` | Same shape as release, `→ REJECTED`. |
| `POST` | `/production-batches/:id/close` | `production.batch.write` | `RELEASED`/`REJECTED → CLOSED`. Terminal. |

**Deferred from this phase** (see `docs/roadmap.md` Phase 3):
`production_orders` (planning layer above batches), `process_steps`
(needs its own design — configurable per-product process flow templates,
not improvised here), `machine_runs`, `wastage_records`.

## Quality

| Method | Path | Permission required | Notes |
|---|---|---|---|
| `GET`/`POST` | `/qc-samples`, `/qc-samples/:id` | write needs `quality.qc_sample.write` | Requires the batch to be `COMPLETED` or already `ON_HOLD`. |
| `GET`/`POST` | `/qc-samples/:id/results` | write needs `quality.qc_result.write` | **The core Phase 3 mechanism.** `measuredValue` is compared against the sampled batch's product grade's `product_grade_qc_specs` (Master Data, Phase 1). If out of spec, the batch **auto-transitions to `ON_HOLD`** and a `PENDING` row is created in `approvals` — implementing `docs/agents.md` A05's rule that AI cannot independently release a held batch. If the batch has no grade, or no spec exists for that parameter, `passed` is `null` (not auto-failed). |

**Deferred from this phase**: `qc_plans`, a distinct `qc_tests` entity
(a result IS a completed test here), `corrective_actions`, a dedicated
`qc_decisions` table (the decision is tracked as `production_batches.status`
plus the `audit_events` row from `@AuditLog` on release/reject).

**Verified live** (see `docs/changelog.md` for the full transcript): a
real out-of-spec QC result (measured `2.5` against a spec range of
`0.5–1.0`) correctly computed `passed: false`, auto-put the batch
`ON_HOLD`, and created a `PENDING` approval. An unprivileged user's
release attempt correctly 403'd. The admin's release correctly resolved
the approval to `APPROVED` and moved the batch to `RELEASED`, and a
second release attempt correctly 409'd. A single SQL join confirmed the
full chain — supplier → raw material lot → production batch → output →
QC result — resolves correctly end-to-end.

## Inventory

Read-only — there is no `POST /stock-ledger`. Ledger entries are only
ever written by the real business operation that causes a stock
movement (Raw Material Lot creation credits, Production consumption/
output debits/credits), never directly by a client, per
`architecture.md` §4. A manual `ADJUSTMENT` write endpoint may be added
later with its own approval/reason requirements — not built yet.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/stock-ledger` | Every movement, newest first. `quantityKg` is signed (negative = leaving stock). |
| `GET` | `/stock-balances` | **Computed**, not a stored table — `SUM(quantity_kg) GROUP BY product_id, location_id` over `stock_ledger`. `id` in the response is a synthesized `productId:locationId` key so the frontend's generic list component can render it like any other resource. |

**Retrofitted into existing services** (found and fixed via live
testing, not designed up front): `ProductionBatchesService.addInput()`
now writes a `RAW_MATERIAL_CONSUMPTION` (negative) entry alongside
marking the lot `CONSUMED`; `addOutput()` writes a `PRODUCTION_OUTPUT`
(positive) entry. `RawMaterialLotsService.createFromGoodsReceipt()`
writes a `RAW_MATERIAL_RECEIPT` (positive) entry — **added after** the
first version shipped, because live-testing the Production retrofit
showed a raw material's computed balance going permanently negative:
consumption debited the ledger but nothing had ever credited it on
receipt. Verified live end-to-end: a fresh 200kg lot consumed by a batch
showed `-200.000`; a subsequent 50kg receipt of the same product
correctly moved the balance to `-150.000` — see `docs/changelog.md` for
the full transcript.

## Packing

A packing order can only be created against a production batch whose
`status` is `RELEASED` — packing output that hasn't cleared the Quality
gate (Phase 3) would defeat the whole point of that gate. This is
enforced server-side (`PackingService.create()`), not just hinted at in
the UI: creating an order against any other batch status correctly
409s, verified live.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/packing-orders` | List all packing orders. |
| `GET` | `/packing-orders/:id` | One order. |
| `POST` | `/packing-orders` | `{ productionBatchId, packagingTypeId, plannedQuantityUnits? }` — 404 if the batch doesn't exist, 409 if it isn't `RELEASED`. Starts `PENDING`. |
| `GET` | `/packing-orders/:id/lots` | Lots recorded against an order. |
| `POST` | `/packing-orders/:id/lots` | `{ productId, quantityUnits, netWeightKg? }` — 409 once the order is `COMPLETED`/`CANCELLED`. The order's first lot flips its status `PENDING → IN_PROGRESS`. `lotNumber` is server-generated (`PKG-<date>-<random>`, same scheme as production batch numbers) and globally unique. |
| `POST` | `/packing-orders/:id/complete` | 409 unless the order is `IN_PROGRESS`. Moves it to `COMPLETED`, after which no more lots can be added. |

**Deliberately deferred from this MVP** (see `packing.schema.ts`'s doc
comment): QR code generation — the server-generated `lotNumber` stands
in as the traceable identifier for now, a real QR payload/scan flow is
its own piece of work, not a stub field. No `stock_ledger` entry is
written for packing — repackaging finished goods into units doesn't
change total kg on hand, and `packaging_inventory` (consumable packaging
stock itself) is separately deferred (see `docs/architecture.md`'s
Inventory section). Pallet/container linkage is deferred along with
Inventory's `pallets` table.

## Sales

A sales order builds up freely in `DRAFT` (add as many line items as
needed) — the customer's credit exposure is only checked at
`POST /:id/confirm`, not at creation or per-item. `totalAmount` is
recomputed server-side after every line item add (`SUM(line_total)` over
`sales_order_items`), never trusted from the client.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/sales-orders` | List all sales orders. |
| `GET` | `/sales-orders/:id` | One order. |
| `POST` | `/sales-orders` | `{ customerId }` — 404 if the customer doesn't exist. Starts `DRAFT`, `totalAmount: 0`. |
| `GET` | `/sales-orders/:id/items` | Line items on an order. |
| `POST` | `/sales-orders/:id/items` | `{ productId, quantity, unitPrice }` — 409 once the order is no longer `DRAFT`. `lineTotal` is server-computed (`quantity * unitPrice`), and the parent order's `totalAmount` is recomputed immediately after. |
| `POST` | `/sales-orders/:id/confirm` | 409 unless `DRAFT`; 400 if there are zero line items. Computes the customer's exposure as `SUM(totalAmount)` over their other `CONFIRMED` orders plus this order's total, and 409s if that exceeds `customers.credit_limit` — the error names the exact projected exposure and the limit. A `null` credit limit (not every customer has one) skips the check entirely. Moves the order to `CONFIRMED`. |
| `POST` | `/sales-orders/:id/cancel` | 409 if already `CANCELLED`; otherwise moves the order to `CANCELLED` from either `DRAFT` or `CONFIRMED`. |

**Deliberately deferred from this MVP** (see `sales.schema.ts`'s doc
comment): `quotations` (a pre-commitment draft — not on the critical
path for "can we validate an order against credit limit"), `invoices`
(belongs to Dispatch/Finance once goods actually move), and price list
lookup (`price_lists`/`price_list_items`, Master Data) — `unitPrice` is
entered directly on each line, the same pattern Procurement's
`purchase_orders.unitPrice` already uses. There is no approval-override
path for a credit-limit breach yet (unlike Procurement's PO-threshold
`approvals` flow) — a rejected confirm is a hard stop for now; wiring an
override through `approvals` is a natural follow-up if/when the business
rule turns out to need one.

## Dispatch

A dispatch can only be created against a sales order whose `status` is
`CONFIRMED`, and at most one **active** (non-`CANCELLED`) dispatch may
exist per order at a time — both enforced server-side.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/dispatches` | List all dispatch records. |
| `GET` | `/dispatches/:id` | One record. |
| `POST` | `/dispatches` | `{ salesOrderId, vehicleId, driverId? }` — 404 if the order doesn't exist, 409 if it isn't `CONFIRMED`, 409 if the order already has an active dispatch. Starts `PENDING`. |
| `POST` | `/dispatches/:id/dispatch` | 409 unless `PENDING`. Moves to `DISPATCHED`, sets `dispatchedAt`. |
| `POST` | `/dispatches/:id/deliver` | `{ deliveryNotes? }` — 409 unless `DISPATCHED`. Moves to `DELIVERED`, sets `deliveredAt`. |
| `POST` | `/dispatches/:id/cancel` | 409 if already `DELIVERED` or `CANCELLED`; cancellable from `PENDING` or `DISPATCHED` (e.g. a recall before delivery). |
| `GET` | `/dispatches/:id/lots` | Packed lots on this dispatch. |
| `GET` | `/dispatches/:id/available-lots` | Lots that *could* be added: from a `COMPLETED` packing order, not QC-`FAILED`, of a product on the sales order, not already on a live dispatch. |
| `POST` | `/dispatches/:id/lots` | `{ packingLotId }`. Only while the dispatch is `PENDING` (409 after). 409 if the packing order isn't `COMPLETED`, the lot failed QC, its product isn't on the sales order, or it's already on another non-cancelled dispatch. |
| `DELETE` | `/dispatches/:id/lots/:packingLotId` | Only while `PENDING`; 404 if the lot isn't on it. |

**Lot linking closes the traceability gap.** `dispatch_lots` is what lets a
batch be traced forward to a customer (below). It is deliberately *not* unique
on `packing_lot_id` — cancelling a dispatch must free its lots (the same trap
`dispatches.sales_order_id` fell into). A dispatch with no lots is allowed,
but it is untraceable and the UI says so.

**A found-and-fixed bug**: the first version enforced "one dispatch per
order, ever" with a hard database `UNIQUE(sales_order_id)` constraint.
Live testing caught this immediately — cancelling a dispatch left the
CANCELLED row in place, and the unique constraint then permanently
blocked ever dispatching that order again, breaking the entirely normal
"cancel and redispatch" flow. Fixed by dropping the column-level unique
constraint (migration `0011_foamy_husk.sql`) in favor of a service-level
check that only counts non-`CANCELLED` dispatches, backed by a plain
(non-unique) index for lookup speed. Re-verified live: creating a new
dispatch for an order whose prior dispatch was cancelled now correctly
succeeds, while creating a second dispatch while one is still active
still correctly 409s.

**Deliberately deferred from this MVP** (see `dispatch.schema.ts`'s doc
comment): `shipments`/`delivery_confirmations` as separate tables —
delivery confirmation is folded into `deliveredAt`/`deliveryNotes` on
the `dispatches` row itself. Reuse of `gate_entries.direction =
OUTBOUND` (the design gate-weighment.schema.ts's own doc comment says
Phase 4 Dispatch is expected to use) is **not** wired up — `gate_entries`
has no customer reference today, so actually integrating dispatch with
the physical gate-out flow is real, separate work, not a half-wired FK
added under time pressure.

## Export

Flow: export customer → proforma invoice (`DRAFT`, line items, `ISSUED`)
→ commercial invoice (only from an `ISSUED` proforma, which becomes
`CONVERTED`) → container → shipment milestones. Each stage is gated on the
previous one, server-side.

| Method | Path | Notes |
|---|---|---|
| `GET`/`POST` | `/export-customers` | `{ code, name, country, contactName?, email?, phone?, address? }`. Duplicate code → 409. |
| `GET`/`POST` | `/proforma-invoices` | `POST { exportCustomerId, currency? }` (3-letter, upper-cased, default `USD`). Starts `DRAFT`, total 0. |
| `GET`/`POST` | `/proforma-invoices/:id/items` | `{ productId, quantity, unitPrice }`. Only while `DRAFT` (409 after). `lineTotal` and the invoice total are server-computed. |
| `POST` | `/proforma-invoices/:id/issue` | 400 with no items; 409 unless `DRAFT`. |
| `POST` | `/proforma-invoices/:id/convert` | Creates the commercial invoice. 409 unless `ISSUED`; the proforma becomes `CONVERTED` so it can't be invoiced twice. |
| `POST` | `/proforma-invoices/:id/cancel` | 409 once `CONVERTED`/`CANCELLED`. |
| `GET` | `/commercial-invoices` | There is no manual create. |
| `POST` | `/commercial-invoices/:id/mark-paid` | 409 unless `ISSUED`. |
| `GET`/`POST` | `/containers` | `{ commercialInvoiceId, containerNumber, sealNumber?, destinationPort? }`. 409 on a cancelled invoice or duplicate number. |
| `GET`/`POST` | `/containers/:id/milestones` | `{ milestone, notes? }`, milestone ∈ `LOADED, GATED_OUT, DEPARTED, ARRIVED, CUSTOMS_CLEARED, DELIVERED`. Must move forward (409 for a step already passed); container status follows the latest milestone; nothing after `DELIVERED`. |

Not modelled: HS codes, bill of lading, customs documents, FX rates, and
any link from export lines to production/packing lots.

## Maintenance

| Method | Path | Notes |
|---|---|---|
| `GET`/`POST` | `/breakdowns` | `POST { machineId, description, severity? }` **suspends the machine** (`machines.status = SUSPENDED`). |
| `POST` | `/breakdowns/:id/start-repair`, `/resolve` | `resolve` restores the machine to `ACTIVE` only when no other unresolved breakdown remains on it. |
| `GET`/`POST` | `/work-orders` | `PREVENTIVE` requires `maintenancePlanId`, `CORRECTIVE` requires `breakdownId` (400 otherwise). |
| `POST` | `/work-orders/:id/start`, `/complete`, `/cancel` | Completing a corrective order resolves its breakdown; completing a preventive order sets its plan's `nextDueDate` to today + `frequencyDays`. |
| `GET`/`POST` | `/maintenance-plans` | `{ machineId, title, frequencyDays, nextDueDate }`. |
| `POST` | `/maintenance-plans/:id/generate-work-order` | At most one open work order per plan (409). |
| `GET`/`POST` | `/spare-parts` | `POST /:id/adjust { delta }` cannot take stock below zero (409). |
| `GET` | `/machines/:id/history` | Breakdowns + work orders merged into one timeline (a view, not a table). |

## Workforce

| Method | Path | Notes |
|---|---|---|
| `GET`/`POST` | `/shifts` | `startTime`/`endTime` must be `HH:MM`. |
| `GET`/`POST` | `/attendance` | `?date=YYYY-MM-DD` filters. One row per employee per day (409 on a duplicate). |
| `GET` | `/attendance/summary?date=` | Counts per status + total allocated hours that day. |
| `GET`/`POST` | `/labour-allocations` | Only for an employee marked `PRESENT` or `HALF_DAY` that day (409 otherwise); daily cap 12h (`PRESENT`) / 6h (`HALF_DAY`) across all allocations (409). |

## Finance

Operational finance only — see ADR-009. No general ledger, no tax.

| Method | Path | Notes |
|---|---|---|
| `GET`/`POST` | `/cost-centres` | |
| `GET`/`POST` | `/expenses` | `POST` records the caller as `submittedBy`. |
| `POST` | `/expenses/:id/approve`, `/reject` | **Segregation of duties:** the submitter gets 403 (also written to the audit log as a `SECURITY` event). 409 unless `SUBMITTED`. |
| `GET`/`POST` | `/payments` | `INCOMING` requires a `CONFIRMED` `salesOrderId`; `OUTGOING` an approved `purchaseOrderId`; amount may not exceed the outstanding balance (409, message names the balance). |
| `GET` | `/finance/receivables` | Confirmed orders with received/outstanding, plus per-customer exposure vs credit limit. |
| `GET` | `/finance/payables` | Approved POs with paid/outstanding. |
| `GET` | `/finance/batch-costs/:batchId` | **Material cost only**: consumed kg × the unit price on the PO each lot came from (lot → goods receipt → PO). Assumes PO unit price is per kg. Labour hours are reported, not costed; the response lists what is `notCosted`. |
| `GET` | `/finance/summary` | Approved spend by category, expense status counts, receivable/payable totals. |

## Memory

Typed (15 types, `docs/memory.md` §3), versioned company knowledge. Written
only by a person — nothing is auto-promoted from AI output.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/memory` | `?type=&status=&q=` (status defaults `ACTIVE`; `q` searches title + content). `CONFIDENTIAL` items are omitted unless the caller has `memory.confidential.read`. Each item carries a computed `expired` flag. |
| `POST` | `/memory` | `memory.item.write`. `confidence` 0–1, `tags[]`, `validUntil?`, `sensitivity`. |
| `POST` | `/memory/:id/revise` | Never overwrites: creates version n+1 (`supersedesMemoryId`) and marks the old row `SUPERSEDED`. 409 unless the item is `ACTIVE`. |
| `POST` | `/memory/:id/archive` | |
| `GET` | `/memory/:id/history` | The full version chain, oldest first. A confidential item the caller can't see returns 404, not 403. |

Not implemented: embeddings/semantic retrieval, automatic candidate
extraction, conflict records (§7), tenant isolation.

## AI agents

**No language model is connected.** The registry holds the 12 agents from
`docs/agents.md` (seed: `database/seeds/002-ai-agents.sql`); 8 have a
deterministic, rule-based analyzer, 4 (A01 Copilot, A02 Planning, A07
Sales, A12 Memory) are specified but cannot run (409). An agent only ever
writes *findings* in status `PROPOSED`; a person acknowledges or dismisses
them. Nothing an agent does changes business data.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/ai-agents`, `/ai-runs`, `/ai-findings?status=` | |
| `POST` | `/ai-agents/:id/run` | `ai.agent.run`. Records a run + findings. A condition that already has a `PROPOSED` finding is not proposed again (the run reports "already pending"). Acknowledged findings recur on the next run if the condition still holds. |
| `POST` | `/ai-findings/:id/acknowledge`, `/dismiss` | `ai.finding.decide`. 409 if already decided. |

Analyzers: **A03** POs awaiting approval / approved but unreceived 7+ days;
**A04** negative stock; **A05** batches on QC hold; **A06** overdue plans,
open breakdowns, spare parts at reorder level; **A08** confirmed orders
undispatched 3+ days, dispatches pending 2+ days; **A09** customers over
credit limit, expenses unapproved 7+ days; **A10** daily operations
summary; **A11** repeated access denials, approvals pending 3+ days.

## Reports

| Method | Path | Notes |
|---|---|---|
| `GET` | `/reports/overview` | Every dashboard KPI in one round trip (live SQL, nothing cached). |
| `GET` | `/reports/production-yield` | Output kg ÷ input kg per batch. |
| `GET` | `/reports/sales-by-customer` | Confirmed orders and value per customer. |
| `GET` | `/reports/traceability/batch/:id` | Backward: supplier → vehicle/driver → weighment → PO → goods receipt → lot → batch. Forward: QC results → packing lots → the live dispatch each lot shipped on → sales order → **customer**. A lot with no live dispatch has `customerCode: null` ("packed, not shipped"). Goods dispatched before lots were tracked can't be traced; `limits` says so. |
| `GET` | `/reports/traceability/sales-order/:id` | **Recall view**: from an order to the lots shipped on its live dispatches, their batches, and every supplier whose raw material is in them (`suppliers[]`, plus the full backward chain per batch). Empty `lots` with an explanatory `limits` when nothing is linked. |

## Audit & Activity

| Method | Path | Notes |
|---|---|---|
| `GET` | `/audit-events` | `audit.event.read`. Filters: `module, actionType, status, entityType, actorId, from, to`; `limit` (1–500, default 100), `offset`. |
| `GET` | `/audit-events/meta` | Distinct modules/actions/outcomes for filter dropdowns. |
| `GET` | `/audit-events/:id` | |

Read-only over the append-only table. Denied access attempts appear as
`SECURITY` events.

## Users, roles and passwords

| Method | Path | Notes |
|---|---|---|
| `POST` | `/auth/change-password` | `{ currentPassword, newPassword (≥8) }` → 204; revokes the user's *other* sessions. A wrong current password is **400**, not 401 — the web client treats any 401 as "session expired" and signs the user out. |
| `POST` | `/auth/register` | **Bootstrap only.** Works only while the database has zero users, then makes that account `SUPER_ADMIN` (atomic under an advisory lock). Any later call is 403 "Self-registration is closed". |
| `POST` | `/users` | `identity.user.manage`. `{ email, password (8–72), fullName, phone?, roleIds? }` — the only way to create accounts after bootstrap. Roles are validated before anything is written (400 on an unknown role); 409 on a duplicate email. |
| `GET` | `/users`, `/roles`, `/permissions` | `identity.user.read`. Password hashes are never selected. |
| `POST` | `/users/:id/roles` | `{ roleId }`, `identity.user.manage`. 409 if already assigned. |
| `DELETE` | `/users/:id/roles/:roleId` | 409 for the last `SUPER_ADMIN`. |
| `POST` | `/users/:id/status` | `{ status: ACTIVE\|INACTIVE }`; you can't deactivate yourself. Deactivating **revokes all of the user's sessions immediately**, and login for an inactive account fails with the generic invalid-credentials message. |

### Cross-cutting behaviour

- **Rate limits** (per client IP, per minute; `429` when exceeded):
  `login`, `register` and `change-password` 10; everything else 600. In-memory,
  per process.
- **A role is required.** An authenticated account holding no roles can call
  only `/auth/me`, `/auth/logout` and `/auth/change-password`; every other
  guarded route returns 403.
- **`PermissionsGuard`** reads `@RequirePermissions` from the handler *and* the
  class (handler wins). Before v0.3.1 it read the handler only, so a class-level
  declaration was silently ignored and left the audit log open to any signed-in user.
- **Finance reads** (`/cost-centres`, `/expenses`, `/payments`, `/finance/*`)
  require `finance.read`.
- **Headers/CORS:** `helmet` defaults; CORS only for `CORS_ORIGINS`.
- **Audit redaction:** memory write endpoints redact `content` from
  `audit_events.after_state` so the audit log can't expose confidential memory.

## Error shape

Standard NestJS `HttpException` JSON, not yet the custom
`{ success, error_code, message, request_id }` shape sketched in
`MASTER_PROMPT.md` §19 — that's a TODO once more endpoints exist to
justify a shared error-formatting layer:

```json
{ "statusCode": 409, "message": "Product with SKU \"X\" already exists", "error": "Conflict" }
```

## Audit coverage

Every `@AuditLog`-decorated endpoint writes an `audit_events` row on both
success and failure. A gap was found and fixed during implementation:
NestJS runs Guards before Interceptors, so a 401 (no/invalid token) or
403 (missing permission) used to be completely invisible to the audit
log — closed by `AuthFailureAuditFilter`
(`apps/api/src/common/audit/auth-failure-audit.filter.ts`), which writes
a `module: SECURITY, entityType: access_attempt` row for every
`UnauthorizedException`/`ForbiddenException`, globally, without changing
the response the client sees.

A second issue was found and fixed before shipping: `POST /auth/login`'s
response contains the raw session token, which would have been captured
verbatim in `audit_events.after_state` if left as-is. `@AuditLog` now
supports `redactResponseFields`, used on the login endpoint to replace
`token` with `"[REDACTED]"` before writing.

## Not yet done

- Procurement, Gate & Weighment, Raw Material, Production, Quality,
  Inventory, Sales/Logistics, Maintenance, AI, Memory endpoints.
- Remaining Master Data entities beyond Products/Suppliers/
  Customers/Warehouses (machines, locations, departments, employees,
  units of measure, packaging types, QC parameters, tax configurations,
  price lists — same CRUD pattern, not yet replicated).
- Standard error-response envelope (`request_id`, `error_code`).
- Rate limiting, API versioning.
- Self-service admin bootstrap flow.
