# Coco Pith Factory — API Specification

**Status:** Identity (auth) + all Master Data entities (Products,
Suppliers, Vendors, Customers, Warehouses, Departments, Employees,
Locations, Machines, Units of Measure, Packaging Types, QC Parameters) +
Phase 2 (Gate & Weighment, Procurement, Raw Material) + Phase 3
(Production Batches, QC Samples/Results) + Phase 4 core (Inventory —
stock ledger and computed balances) implemented and verified live.
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
