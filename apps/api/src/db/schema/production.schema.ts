import { index, numeric, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { productionBatchStatusEnum } from './enums';
import { products, productGrades } from './master-data.schema';
import { rawMaterialLots } from './raw-material.schema';

/**
 * `production_orders`, `process_steps`, `machine_runs`, and
 * `wastage_records` from architecture.md §3's Production domain are
 * deliberately deferred — not on the critical path for docs/roadmap.md
 * Phase 3's definition of done (Raw Material Lot → Production Batch →
 * QC Sample → QC Result → Release/Hold). `process_steps` specifically
 * needs its own design decision (configurable per-product process flow
 * templates — see the roadmap's own warning not to improvise this
 * shape live), not a stub built under time pressure.
 *
 * No `stock_ledger`/ledger-model consumption yet either (that's
 * Inventory, Phase 4) — batch input consumption here is a simple
 * one-time "mark the lot CONSUMED" operation, not a ledger entry. This
 * is a real, documented simplification, not the final model.
 */
export const productionBatches = pgTable('production_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  batchNumber: text('batch_number').notNull(),
  productId: uuid('product_id').notNull().references(() => products.id),
  productGradeId: uuid('product_grade_id').references(() => productGrades.id),
  plannedQuantityKg: numeric('planned_quantity_kg', { precision: 12, scale: 2 }),
  status: productionBatchStatusEnum('status').notNull().default('IN_PROGRESS'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  batchNumberUnique: unique('production_batches_batch_number_unique').on(t.batchNumber),
  productIdx: index('production_batches_product_idx').on(t.productId),
}));

export const batchInputs = pgTable('batch_inputs', {
  id: uuid('id').primaryKey().defaultRandom(),
  productionBatchId: uuid('production_batch_id').notNull().references(() => productionBatches.id),
  rawMaterialLotId: uuid('raw_material_lot_id').notNull().references(() => rawMaterialLots.id),
  quantityConsumedKg: numeric('quantity_consumed_kg', { precision: 12, scale: 2 }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  lotUnique: unique('batch_inputs_raw_material_lot_unique').on(t.rawMaterialLotId), // a lot is consumed once, in full (MVP simplification — see file doc comment)
  batchIdx: index('batch_inputs_batch_idx').on(t.productionBatchId),
}));

export const batchOutputs = pgTable('batch_outputs', {
  id: uuid('id').primaryKey().defaultRandom(),
  productionBatchId: uuid('production_batch_id').notNull().references(() => productionBatches.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  productGradeId: uuid('product_grade_id').references(() => productGrades.id),
  quantityKg: numeric('quantity_kg', { precision: 12, scale: 2 }).notNull(),
  producedAt: timestamp('produced_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  batchIdx: index('batch_outputs_batch_idx').on(t.productionBatchId),
}));

export type ProductionBatch = typeof productionBatches.$inferSelect;
export type BatchInput = typeof batchInputs.$inferSelect;
export type BatchOutput = typeof batchOutputs.$inferSelect;
