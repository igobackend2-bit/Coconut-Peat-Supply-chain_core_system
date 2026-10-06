import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Generic lifecycle status reused across most Master Data tables. Kept
 * narrow on purpose — module-specific states (e.g. production batch
 * process/QC status) belong in that module's own schema, not here.
 */
export const entityStatusEnum = pgEnum('entity_status', ['ACTIVE', 'INACTIVE', 'SUSPENDED']);

export const uomCategoryEnum = pgEnum('uom_category', [
  'WEIGHT',
  'COUNT',
  'VOLUME',
  'AREA',
  'OTHER',
]);

export const productCategoryEnum = pgEnum('product_category', [
  'RAW_MATERIAL',
  'FINISHED_GOOD',
  'PACKAGING',
  'CONSUMABLE',
]);

export const qcDataTypeEnum = pgEnum('qc_data_type', ['NUMERIC', 'TEXT', 'BOOLEAN']);

// Phase 2 — Procurement / Gate & Weighment / Raw Material (docs/roadmap.md)

export const gateEntryDirectionEnum = pgEnum('gate_entry_direction', ['INBOUND', 'OUTBOUND']);

export const gateEntryStatusEnum = pgEnum('gate_entry_status', [
  'AT_GATE',
  'WEIGHED',
  'COMPLETED',
  'CANCELLED',
]);

export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
]);

/** Generic — reused by any domain that needs an approval record, not just Procurement. See governance.schema.ts. */
export const approvalStatusEnum = pgEnum('approval_status', ['PENDING', 'APPROVED', 'REJECTED']);

export const rawMaterialLotStatusEnum = pgEnum('raw_material_lot_status', [
  'RECEIVED',
  'IN_STORAGE',
  'CONSUMED',
  'REJECTED',
]);

// Phase 3 — Production / Quality (docs/roadmap.md)

export const productionBatchStatusEnum = pgEnum('production_batch_status', [
  'IN_PROGRESS',
  'COMPLETED',
  'ON_HOLD',
  'RELEASED',
  'REJECTED',
  'CLOSED',
]);

// Phase 4 — Inventory (docs/roadmap.md). Only the two movement types
// Production actually generates today are here — ADJUSTMENT exists for
// completeness (manual stock corrections) but nothing writes it yet;
// more types (GOODS_RECEIPT, DISPATCH, etc.) get added as those domains
// are built, rather than speculatively now.
export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'RAW_MATERIAL_RECEIPT',
  'RAW_MATERIAL_CONSUMPTION',
  'PRODUCTION_OUTPUT',
  'ADJUSTMENT',
]);

// Phase 4 — Packing (docs/roadmap.md)

export const packingOrderStatusEnum = pgEnum('packing_order_status', [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const packingLotQcStatusEnum = pgEnum('packing_lot_qc_status', [
  'PENDING',
  'PASSED',
  'FAILED',
]);

// Phase 4 — Sales (docs/roadmap.md)

export const salesOrderStatusEnum = pgEnum('sales_order_status', [
  'DRAFT',
  'CONFIRMED',
  'CANCELLED',
]);

// Phase 4 — Dispatch (docs/roadmap.md)

export const dispatchStatusEnum = pgEnum('dispatch_status', [
  'PENDING',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
]);

// Phase 4 — Export

export const proformaStatusEnum = pgEnum('proforma_status', ['DRAFT', 'ISSUED', 'CONVERTED', 'CANCELLED']);
export const commercialInvoiceStatusEnum = pgEnum('commercial_invoice_status', ['ISSUED', 'PAID', 'CANCELLED']);
export const containerStatusEnum = pgEnum('container_status', [
  'BOOKED',
  'LOADED',
  'IN_TRANSIT',
  'ARRIVED',
  'DELIVERED',
  'CANCELLED',
]);

// Phase 5 — Maintenance / Workforce / Finance

export const severityEnum = pgEnum('severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const breakdownStatusEnum = pgEnum('breakdown_status', ['OPEN', 'IN_REPAIR', 'RESOLVED']);
export const workOrderTypeEnum = pgEnum('work_order_type', ['PREVENTIVE', 'CORRECTIVE']);
export const workOrderStatusEnum = pgEnum('work_order_status', ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

export const attendanceStatusEnum = pgEnum('attendance_status', ['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY']);

export const expenseCategoryEnum = pgEnum('expense_category', [
  'RAW_MATERIAL',
  'LABOUR',
  'UTILITIES',
  'MAINTENANCE',
  'LOGISTICS',
  'PACKAGING',
  'OTHER',
]);
export const expenseStatusEnum = pgEnum('expense_status', ['SUBMITTED', 'APPROVED', 'REJECTED']);
export const paymentDirectionEnum = pgEnum('payment_direction', ['INCOMING', 'OUTGOING']);

// Phase 6 — Memory / AI (docs/memory.md §3, docs/agents.md)

export const memoryTypeEnum = pgEnum('memory_type', [
  'FACT',
  'DECISION',
  'INSTRUCTION',
  'PREFERENCE',
  'CONFIGURATION',
  'SOP',
  'PRODUCT_KNOWLEDGE',
  'SUPPLIER_KNOWLEDGE',
  'CUSTOMER_KNOWLEDGE',
  'INCIDENT',
  'LESSON',
  'ASSUMPTION',
  'OBSERVATION',
  'OPEN_ISSUE',
  'TASK_CONTEXT',
]);
export const memoryStatusEnum = pgEnum('memory_status', ['ACTIVE', 'ARCHIVED', 'SUPERSEDED']);
export const memorySensitivityEnum = pgEnum('memory_sensitivity', ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL']);

export const aiAgentStatusEnum = pgEnum('ai_agent_status', ['ENABLED', 'DISABLED']);
export const aiRunStatusEnum = pgEnum('ai_run_status', ['COMPLETED', 'FAILED']);
export const aiFindingSeverityEnum = pgEnum('ai_finding_severity', ['INFO', 'WARNING', 'CRITICAL']);
export const aiFindingStatusEnum = pgEnum('ai_finding_status', ['PROPOSED', 'ACKNOWLEDGED', 'DISMISSED']);
