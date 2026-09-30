import { index, numeric, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { purchaseOrderStatusEnum } from './enums';
import { weighments } from './gate-weighment.schema';
import { products, suppliers, unitsOfMeasure } from './master-data.schema';

/**
 * Purchase Requisitions, Supplier Rates, and Supplier Documents from
 * architecture.md §3's Procurement domain are deliberately deferred —
 * not on the critical path for docs/roadmap.md Phase 2's definition of
 * done (a full PO → Goods Receipt → Gate Entry → Weighment → Raw
 * Material Lot chain). Supplier Documents specifically needs object
 * storage, which nothing in this project has integrated yet — better to
 * build deliberately later than stub weakly now.
 */
export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  poNumber: text('po_number').notNull(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  unitId: uuid('unit_id').references(() => unitsOfMeasure.id),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 16, scale: 2 }).notNull(), // computed in PurchaseOrdersService (quantity * unitPrice), not a DB-generated column
  status: purchaseOrderStatusEnum('status').notNull().default('DRAFT'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  poNumberUnique: unique('purchase_orders_po_number_unique').on(t.poNumber),
  supplierIdx: index('purchase_orders_supplier_idx').on(t.supplierId),
}));

export const goodsReceipts = pgTable('goods_receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  grnNumber: text('grn_number').notNull(),
  purchaseOrderId: uuid('purchase_order_id').notNull().references(() => purchaseOrders.id),
  weighmentId: uuid('weighment_id').references(() => weighments.id),
  receivedQuantity: numeric('received_quantity', { precision: 12, scale: 3 }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  grnNumberUnique: unique('goods_receipts_grn_number_unique').on(t.grnNumber),
  poIdx: index('goods_receipts_po_idx').on(t.purchaseOrderId),
  weighmentUnique: unique('goods_receipts_weighment_unique').on(t.weighmentId), // one goods receipt per weighment
}));

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type GoodsReceipt = typeof goodsReceipts.$inferSelect;
