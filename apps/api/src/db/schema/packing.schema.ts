import { index, numeric, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { packingLotQcStatusEnum, packingOrderStatusEnum } from './enums';
import { packagingTypes, products } from './master-data.schema';
import { productionBatches } from './production.schema';

/**
 * Packing domain (architecture.md §3, product-requirements.md §4.9).
 * A packing_order converts a completed production batch's finished-good
 * output into packaged units of a given packaging_type; packing_lots are
 * the individual packed lots produced against that order.
 *
 * Deliberately deferred from this MVP: QR code generation (the lot
 * number stands in as the traceable identifier for now — a real QR
 * payload/scan flow is its own piece of work, not a stub field), and
 * pallets/containers linkage (Inventory's `pallets` table, itself
 * deferred — see inventory.schema.ts). No stock_ledger entry is written
 * for packing: repackaging finished goods into units doesn't change
 * total kg on hand, and packaging_inventory (consumable packaging stock)
 * is separately deferred.
 */
export const packingOrders = pgTable('packing_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  productionBatchId: uuid('production_batch_id').notNull().references(() => productionBatches.id),
  packagingTypeId: uuid('packaging_type_id').notNull().references(() => packagingTypes.id),
  plannedQuantityUnits: numeric('planned_quantity_units', { precision: 12, scale: 2 }),
  status: packingOrderStatusEnum('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  batchIdx: index('packing_orders_batch_idx').on(t.productionBatchId),
}));

export const packingLots = pgTable('packing_lots', {
  id: uuid('id').primaryKey().defaultRandom(),
  packingOrderId: uuid('packing_order_id').notNull().references(() => packingOrders.id),
  lotNumber: text('lot_number').notNull(),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantityUnits: numeric('quantity_units', { precision: 12, scale: 2 }).notNull(),
  netWeightKg: numeric('net_weight_kg', { precision: 12, scale: 2 }),
  qcStatus: packingLotQcStatusEnum('qc_status').notNull().default('PENDING'),
  packedAt: timestamp('packed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  lotNumberUnique: unique('packing_lots_lot_number_unique').on(t.lotNumber),
  orderIdx: index('packing_lots_order_idx').on(t.packingOrderId),
}));

export type PackingOrder = typeof packingOrders.$inferSelect;
export type PackingLot = typeof packingLots.$inferSelect;
