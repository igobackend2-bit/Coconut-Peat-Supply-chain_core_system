import { index, numeric, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { salesOrderStatusEnum } from './enums';
import { customers, products } from './master-data.schema';

/**
 * Sales domain (architecture.md §3, product-requirements.md §4.10).
 * Deliberately scoped down for this MVP, mirroring the same reasoning
 * used for Procurement/Production: `quotations` and `invoices` are
 * deferred (a quotation is a pre-commitment draft, an invoice belongs
 * to Dispatch/Finance once goods actually move — neither is on the
 * critical path for "can we take and validate a sales order against a
 * customer's credit limit"). Price list lookup (`price_lists`/
 * `price_list_items`, Master Data) is also deferred — `unitPrice` is
 * entered directly on each order line, the same pattern Procurement's
 * `purchase_orders.unitPrice` already uses, rather than wiring up
 * pricing lookup speculatively.
 *
 * Credit limit enforcement happens on `confirm()`, not `create()` — a
 * DRAFT order can be built up over several `addItem()` calls before the
 * customer's total exposure (this order's total + their other CONFIRMED
 * orders) is checked against `customers.credit_limit`. A `null` credit
 * limit means no check is enforced (not every customer has one set).
 */
export const salesOrders = pgTable('sales_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  orderNumber: text('order_number').notNull(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  status: salesOrderStatusEnum('status').notNull().default('DRAFT'),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderNumberUnique: unique('sales_orders_order_number_unique').on(t.orderNumber),
  customerIdx: index('sales_orders_customer_idx').on(t.customerId),
}));

export const salesOrderItems = pgTable('sales_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  salesOrderId: uuid('sales_order_id').notNull().references(() => salesOrders.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
  lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderIdx: index('sales_order_items_order_idx').on(t.salesOrderId),
}));

export type SalesOrder = typeof salesOrders.$inferSelect;
export type SalesOrderItem = typeof salesOrderItems.$inferSelect;
