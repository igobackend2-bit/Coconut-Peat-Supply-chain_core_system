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
