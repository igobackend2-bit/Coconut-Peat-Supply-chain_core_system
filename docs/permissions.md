# Coco Pith Factory — Permissions & RBAC

**Status:** Core mechanism implemented and verified live. The full role →
permission matrix from `product-requirements.md` §3 is not — only a
minimal starter catalog exists so far.

## How it actually works (implemented)

- `permissions` — a global, flat catalog of permission codes, e.g.
  `master_data.product.write`. Not per-tenant (see
  `docs/database-schema.md`).
- `roles` — named roles (e.g. `SUPER_ADMIN`), per-tenant-reserved but
  currently single-tenant in practice.
- `role_permissions` — many-to-many: which permissions a role grants.
- `user_roles` — many-to-many: which roles a user has.
- On every authenticated request, `SessionAuthGuard` calls
  `AuthService.authenticate()`, which joins
  `user_roles → roles → role_permissions → permissions` for the caller
  and attaches the resulting `roles: string[]` and `permissions: string[]`
  to `request.user`.
- `@RequirePermissions('code.a', 'code.b')` on a controller method +
  `PermissionsGuard` (must run after `SessionAuthGuard` — see
  `@UseGuards(SessionAuthGuard, PermissionsGuard)` order in
  `products.controller.ts`) requires the caller to have **all** listed
  codes, or throws `ForbiddenException`.
- A handler with `@UseGuards(SessionAuthGuard)` but no
  `@RequirePermissions` requires only authentication — this is how
  `GET /products` works (any logged-in user can read; only
  `master_data.product.write` gates create/update).

Verified live (`docs/changelog.md` has the full transcripts, across two
entries): an authenticated user without `master_data.product.write` gets
`403 Forbidden` with a clear message on `POST /products`, while the same
request succeeds for a user with `SUPER_ADMIN` (which the seed grants
every permission). Also verified: permissions are looked up fresh on
every request (not cached at login), so seeding new permission codes and
re-running the seed made them immediately available to an
already-logged-in `SUPER_ADMIN` session without re-login — confirmed via
`GET /auth/me` before/after adding the Suppliers/Customers/Warehouses
permission codes.

## Starter permission catalog

Seeded by `database/seeds/001-rbac-baseline.sql`:

| Code | Module | Meaning |
|---|---|---|
| `master_data.product.read` | MASTER_DATA | Not enforced — reads are gated by auth only. Seeded for forward compatibility. |
| `master_data.product.write` | MASTER_DATA | Create/update products. Enforced. |
| `master_data.supplier.read` | MASTER_DATA | Not enforced (same as product.read). |
| `master_data.supplier.write` | MASTER_DATA | Create/update suppliers. Enforced. |
| `master_data.customer.read` | MASTER_DATA | Not enforced (same as product.read). |
| `master_data.customer.write` | MASTER_DATA | Create/update customers. Enforced. |
| `master_data.warehouse.read` | MASTER_DATA | Not enforced (same as product.read). |
| `master_data.warehouse.write` | MASTER_DATA | Create/update warehouses. Enforced. |
| `master_data.department.write` | MASTER_DATA | Create departments. Enforced. |
| `master_data.employee.write` | MASTER_DATA | Create employees. Enforced. |
| `master_data.location.write` | MASTER_DATA | Create storage locations. Enforced. |
| `master_data.machine.write` | MASTER_DATA | Create machines. Enforced. |
| `master_data.packaging_type.write` | MASTER_DATA | Create packaging types. Enforced. |
| `master_data.qc_parameter.write` | MASTER_DATA | Create QC parameters. Enforced. |
| `master_data.unit.write` | MASTER_DATA | Create units of measure. Enforced. |
| `master_data.vendor.write` | MASTER_DATA | Create/update vendors (service providers — distinct from raw-material suppliers). Enforced. |
| `packing.order.write` | PACKING | Create packing orders; mark them complete. Enforced. |
| `packing.lot.write` | PACKING | Record packing lots against a packing order. Enforced. |
| `sales.order.write` | SALES | Create sales orders, add line items, cancel orders. Enforced. |
| `sales.order.confirm` | SALES | Confirm a draft sales order (runs the customer credit-limit check). Enforced. |
| `dispatch.record.write` | DISPATCH | Create dispatches against a confirmed sales order; mark them dispatched/delivered/cancelled. Enforced. |
| `export.customer.write` | EXPORT | Create export customers. Enforced. |
| `export.invoice.write` | EXPORT | Create/issue/cancel proformas, add items, convert to commercial invoices, mark paid. Enforced. |
| `export.container.write` | EXPORT | Book containers, record milestones. Enforced. |
| `maintenance.plan.write` | MAINTENANCE | Create maintenance plans. Enforced. |
| `maintenance.breakdown.write` | MAINTENANCE | Report, progress and resolve breakdowns. Enforced. |
| `maintenance.work_order.write` | MAINTENANCE | Create work orders, generate from plans, start/complete/cancel. Enforced. |
| `maintenance.spare_part.write` | MAINTENANCE | Create spare parts, adjust stock. Enforced. |
| `workforce.shift.write` | WORKFORCE | Create shifts. Enforced. |
| `workforce.attendance.write` | WORKFORCE | Record attendance. Enforced. |
| `workforce.allocation.write` | WORKFORCE | Allocate labour hours. Enforced. |
| `finance.read` | FINANCE | View expenses, payments, cost centres, receivables, payables, batch costs. Enforced on every finance GET. |
| `finance.cost_centre.write` | FINANCE | Create cost centres. Enforced. |
| `finance.expense.write` | FINANCE | Submit expenses. Enforced. |
| `finance.expense.approve` | FINANCE | Approve/reject expenses — **never your own** (segregation of duties, checked in the service in addition to this permission). Enforced. |
| `finance.payment.write` | FINANCE | Record incoming/outgoing payments. Enforced. |
| `memory.item.write` | MEMORY | Create, revise, archive memory. Enforced. |
| `memory.confidential.read` | MEMORY | See `CONFIDENTIAL` memory items (filtered from lists/history otherwise). Enforced. |
| `ai.agent.run` | AI | Run an analyzer. Enforced. |
| `ai.finding.decide` | AI | Acknowledge/dismiss findings. Enforced. |
| `audit.event.read` | AUDIT | Read the audit log. Enforced (handler-level on every route). |
| `identity.user.read` | IDENTITY | List users, roles, permissions. Enforced. |
| `identity.user.manage` | IDENTITY | Assign/remove roles, activate/deactivate users. Enforced. |
| `gate_weighment.vehicle.write` | GATE_WEIGHMENT | Register vehicles. Enforced. |
| `gate_weighment.driver.write` | GATE_WEIGHMENT | Register drivers. Enforced. |
| `gate_weighment.gate_entry.write` | GATE_WEIGHMENT | Create gate entries. Enforced. |
| `gate_weighment.weighment.write` | GATE_WEIGHMENT | Record weighments. Enforced. |
| `procurement.purchase_order.write` | PROCUREMENT | Create purchase orders. Enforced. |
| `procurement.purchase_order.approve` | PROCUREMENT | Approve/reject a PO pending approval. **Deliberately a separate permission from `.write`** — creating a PO and approving one over threshold are different privilege levels (`SUPER_ADMIN` has both via the seed, but a real role split would give a requester `.write` without `.approve`). |
| `procurement.goods_receipt.write` | PROCUREMENT | Record goods receipts. Enforced. |
| `raw_material.lot.write` | RAW_MATERIAL | Create raw material lots. Enforced. |
| `production.batch.write` | PRODUCTION | Create/update batches, inputs, outputs, complete/close. Enforced. |
| `production.batch.release` | PRODUCTION | Release or reject a completed/held batch. **Deliberately separate from `.write`** — same reasoning as `procurement.purchase_order.approve`: producing a batch and deciding its QC fate are different privilege levels. |
| `quality.qc_sample.write` | QUALITY | Create QC samples. Enforced. |
| `quality.qc_result.write` | QUALITY | Record QC results (this is what can trigger an auto-HOLD). Enforced. |

Plus one system role, `SUPER_ADMIN` (`is_system = true`), granted every
permission that exists at seed time.

## Approval mechanism, second real use: Production Batch QC hold/release

The same generic `approvals` mechanism built for Purchase Orders (below)
is reused unchanged for Production Batches — no new approval shape was
needed. `QcSamplesService.addResult()` creates a `PENDING` approval when
a QC result comes back out of spec (see `docs/api.md` "Quality");
`production.batch.release` is required to resolve it. Verified live with
a real out-of-spec case: a measured value of `2.5` against a `0.5–1.0`
spec correctly put the batch `ON_HOLD` with a `PENDING` approval, an
unprivileged user's release attempt correctly 403'd, and the admin's
release correctly resolved the approval and moved the batch to
`RELEASED`. This is exactly `docs/agents.md` A05's rule in practice: "AI
cannot independently release a rejected/held batch unless explicitly
authorized by policy" — there is no AI agent yet (Phase 6), but the
human-approval gate this rule requires already exists and works.

## Approval mechanism (first real use: Purchase Orders)

The generic `approvals` table (`docs/database-schema.md`,
`governance.schema.ts`) is distinct from the permission system above —
it's a workflow record (`entityType`/`entityId`/`status`/`requestedBy`/
`decidedBy`), not a permission. A Purchase Order over ₹100,000
(hardcoded threshold, see `docs/api.md`) is created `PENDING_APPROVAL`
with a matching `approvals` row; `POST /purchase-orders/:id/approve` (or
`/reject`) requires `procurement.purchase_order.approve` and updates
both the PO and the approval row together. Verified live: a PO's second
approve attempt correctly 409s ("not awaiting approval") rather than
double-processing.

This generalizes to other domains later (e.g. QC batch release in Phase
3 — `docs/agents.md` A05's human-approval-first rule) without inventing
a new approval shape each time.

## No self-service bootstrap

There is no "first registered user becomes admin" flow and no
role-management API yet. Assigning `SUPER_ADMIN` to a user is a manual
SQL step — see the seed file's comment. This is a known, deliberate gap
for this stage, not an oversight.

## Not yet done

- The full role list from `product-requirements.md` §3 (Factory Head,
  Production Manager, QC Manager, etc.) and a real permission matrix
  covering every module.
- Agent permission levels from `docs/agents.md` §3 (READ / ANALYZE /
  DRAFT / REQUEST_APPROVAL / EXECUTE / ADMIN) — the current mechanism is
  binary (has the permission code or doesn't), not leveled.
- Approval-policy configuration (`MASTER_PROMPT.md` §18's amount-threshold
  examples).
- Any role/permission management API (roles and permissions are only
  manageable via direct SQL right now).
- Row-level access rules (e.g. multi-location scoping) — not designed
  yet, and no managed-platform RLS per ADR-002.
