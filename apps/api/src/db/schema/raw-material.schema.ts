import { index, numeric, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { rawMaterialLotStatusEnum } from './enums';
import { goodsReceipts } from './procurement.schema';
import { locations, products, suppliers } from './master-data.schema';

/**
 * Raw Material Lot — the identity a Production batch will eventually
 * consume from (Phase 3). Created from a Goods Receipt, per
 * docs/roadmap.md Phase 2. Distinct from Inventory's generic
 * `stock_ledger`/`lots` (Phase 4) — this table is specifically about
 * lot-level identity and quality capture at receipt, per
 * product-requirements.md §4.4.
 */
export const rawMaterialLots = pgTable('raw_material_lots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  lotNumber: text('lot_number').notNull(),
  productId: uuid('product_id').notNull().references(() => products.id),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id),
  goodsReceiptId: uuid('goods_receipt_id').notNull().references(() => goodsReceipts.id),
  quantityKg: numeric('quantity_kg', { precision: 12, scale: 2 }).notNull(),
  moistureContentPercent: numeric('moisture_content_percent', { precision: 5, scale: 2 }),
  storageLocationId: uuid('storage_location_id').references(() => locations.id),
  status: rawMaterialLotStatusEnum('status').notNull().default('RECEIVED'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  lotNumberUnique: unique('raw_material_lots_lot_number_unique').on(t.lotNumber),
  goodsReceiptUnique: unique('raw_material_lots_goods_receipt_unique').on(t.goodsReceiptId), // one lot per goods receipt, for now (Phase 2 scope — splitting one receipt into multiple lots is a future refinement)
  supplierIdx: index('raw_material_lots_supplier_idx').on(t.supplierId),
}));

export type RawMaterialLot = typeof rawMaterialLots.$inferSelect;
export type NewRawMaterialLot = typeof rawMaterialLots.$inferInsert;
