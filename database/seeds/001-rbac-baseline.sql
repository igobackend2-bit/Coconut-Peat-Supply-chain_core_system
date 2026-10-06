-- Baseline RBAC seed: a starter permission catalog and a SUPER_ADMIN
-- role granted all of them. There is no self-service "first user becomes
-- admin" bootstrap flow yet (docs/project-state.md) — after registering
-- a user via POST /auth/register, assign SUPER_ADMIN manually:
--
--   INSERT INTO user_roles (user_id, role_id)
--   SELECT '<user id from register response>', id FROM roles WHERE code = 'SUPER_ADMIN';
--
-- Idempotent: safe to run more than once (ON CONFLICT DO NOTHING).

INSERT INTO permissions (code, module, description) VALUES
  ('master_data.product.read', 'MASTER_DATA', 'View products'),
  ('master_data.product.write', 'MASTER_DATA', 'Create and update products'),
  ('master_data.supplier.read', 'MASTER_DATA', 'View suppliers'),
  ('master_data.supplier.write', 'MASTER_DATA', 'Create and update suppliers'),
  ('master_data.customer.read', 'MASTER_DATA', 'View customers'),
  ('master_data.customer.write', 'MASTER_DATA', 'Create and update customers'),
  ('master_data.warehouse.read', 'MASTER_DATA', 'View warehouses'),
  ('master_data.warehouse.write', 'MASTER_DATA', 'Create and update warehouses'),
  ('gate_weighment.vehicle.write', 'GATE_WEIGHMENT', 'Register vehicles'),
  ('gate_weighment.driver.write', 'GATE_WEIGHMENT', 'Register drivers'),
  ('gate_weighment.gate_entry.write', 'GATE_WEIGHMENT', 'Create gate entries'),
  ('gate_weighment.weighment.write', 'GATE_WEIGHMENT', 'Record weighments'),
  ('procurement.purchase_order.write', 'PROCUREMENT', 'Create purchase orders'),
  ('procurement.purchase_order.approve', 'PROCUREMENT', 'Approve or reject purchase orders pending approval'),
  ('procurement.goods_receipt.write', 'PROCUREMENT', 'Record goods receipts'),
  ('raw_material.lot.write', 'RAW_MATERIAL', 'Create raw material lots'),
  ('production.batch.write', 'PRODUCTION', 'Create/update production batches, inputs, outputs; complete/close batches'),
  ('production.batch.release', 'PRODUCTION', 'Release or reject a completed/held production batch (separate from .write — a QC/authority decision)'),
  ('quality.qc_sample.write', 'QUALITY', 'Create QC samples'),
  ('quality.qc_result.write', 'QUALITY', 'Record QC results'),
  ('master_data.department.write', 'MASTER_DATA', 'Create departments'),
  ('master_data.employee.write', 'MASTER_DATA', 'Create employees'),
  ('master_data.location.write', 'MASTER_DATA', 'Create storage locations'),
  ('master_data.machine.write', 'MASTER_DATA', 'Create machines'),
  ('master_data.packaging_type.write', 'MASTER_DATA', 'Create packaging types'),
  ('master_data.qc_parameter.write', 'MASTER_DATA', 'Create QC parameters'),
  ('master_data.unit.write', 'MASTER_DATA', 'Create units of measure'),
  ('master_data.vendor.write', 'MASTER_DATA', 'Create vendors'),
  ('packing.order.write', 'PACKING', 'Create packing orders; mark them complete'),
  ('packing.lot.write', 'PACKING', 'Record packing lots against a packing order'),
  ('sales.order.write', 'SALES', 'Create sales orders, add line items, cancel orders'),
  ('sales.order.confirm', 'SALES', 'Confirm a draft sales order (runs the customer credit-limit check)'),
  ('dispatch.record.write', 'DISPATCH', 'Create dispatches against a confirmed sales order; mark them dispatched/delivered/cancelled'),
  ('export.customer.write', 'EXPORT', 'Create export customers'),
  ('export.invoice.write', 'EXPORT', 'Create/issue/cancel proforma invoices and convert to commercial invoices'),
  ('export.container.write', 'EXPORT', 'Book containers and record shipment milestones'),
  ('maintenance.plan.write', 'MAINTENANCE', 'Create maintenance plans'),
  ('maintenance.breakdown.write', 'MAINTENANCE', 'Report, progress and resolve machine breakdowns'),
  ('maintenance.work_order.write', 'MAINTENANCE', 'Create and progress maintenance work orders'),
  ('maintenance.spare_part.write', 'MAINTENANCE', 'Create spare parts and adjust stock'),
  ('workforce.shift.write', 'WORKFORCE', 'Create shifts'),
  ('workforce.attendance.write', 'WORKFORCE', 'Record attendance'),
  ('workforce.allocation.write', 'WORKFORCE', 'Allocate labour hours'),
  ('finance.read', 'FINANCE', 'View expenses, payments, receivables, payables and batch costs'),
  ('finance.cost_centre.write', 'FINANCE', 'Create cost centres'),
  ('finance.expense.write', 'FINANCE', 'Submit expenses'),
  ('finance.expense.approve', 'FINANCE', 'Approve or reject expenses (never your own)'),
  ('finance.payment.write', 'FINANCE', 'Record incoming and outgoing payments'),
  ('memory.item.write', 'MEMORY', 'Create, revise and archive memory items'),
  ('memory.confidential.read', 'MEMORY', 'Read CONFIDENTIAL memory items'),
  ('ai.agent.run', 'AI', 'Run an AI agent analyzer'),
  ('ai.finding.decide', 'AI', 'Acknowledge or dismiss AI findings'),
  ('audit.event.read', 'AUDIT', 'Read the audit log'),
  ('identity.user.read', 'IDENTITY', 'List users, roles and permissions'),
  ('identity.user.manage', 'IDENTITY', 'Assign/remove roles and activate/deactivate users')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (code, name, description, is_system) VALUES
  ('SUPER_ADMIN', 'Super Admin', 'Full access to all permissions', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;
