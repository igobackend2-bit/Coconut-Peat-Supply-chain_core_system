import { index, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { stockMovementTypeEnum } from './enums';
import { locations, products } from './master-data.schema';

/**
 * The single source of truth for stock (architecture.md §4: "never
 * directly manipulate stock balances without generating a stock
 * movement"). `quantityKg` is signed — negative for consumption,
 * positive for receipts/output — so a balance is just `SUM(quantityKg)`.
 *
 * Deliberately append-only, same reasoning and same enforcement
 * mechanism as `audit_events` (see
 * database/migrations/0001_enforce_audit_events_append_only.sql and its
 * counterpart for this table) — a ledger that can be edited after the
 * fact isn't a ledger. Corrections are new offsetting rows, not updates.
 *
 * `stock_balances` is NOT a separate table here — balances are computed
 * on read (`SUM(quantity_kg) GROUP BY product_id, location_id`) rather
 * than maintained as a second, separately-written table. This sidesteps
 * a real dual-write consistency problem (keeping a running balance in
 * sync with every ledger insert, under concurrent writes) at the cost
 * of a slightly more expensive read query — the right trade while
 * volumes are low. Revisit with a materialized/maintained balance table
 * if query performance ever actually requires it.
 */
export const stockLedger = pgTable('stock_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  productId: uuid('product_id').notNull().references(() => products.id),
  locationId: uuid('location_id').references(() => locations.id),
  movementType: stockMovementTypeEnum('movement_type').notNull(),
  quantityKg: numeric('quantity_kg', { precision: 14, scale: 3 }).notNull(),
  referenceType: text('reference_type'), // e.g. 'production_batch'
  referenceId: uuid('reference_id'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productIdx: index('stock_ledger_product_idx').on(t.productId),
  referenceIdx: index('stock_ledger_reference_idx').on(t.referenceType, t.referenceId),
}));

export type StockLedgerEntry = typeof stockLedger.$inferSelect;
export type NewStockLedgerEntry = typeof stockLedger.$inferInsert;
