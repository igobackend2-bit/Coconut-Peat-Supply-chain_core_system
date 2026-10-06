import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { dispatchStatusEnum } from './enums';
import { drivers, vehicles } from './gate-weighment.schema';
import { packingLots } from './packing.schema';
import { salesOrders } from './sales.schema';

/**
 * Dispatch domain (architecture.md §3, product-requirements.md §4.11).
 * Deliberately scoped down for this MVP: a `dispatches` row per sales
 * order tracks the physical outbound movement (vehicle, driver,
 * status), rather than building `shipments`/`delivery_confirmations` as
 * separate tables — delivery confirmation is folded into `deliveredAt`/
 * `deliveryNotes` here, the same "fold a sub-concept into the parent
 * row instead of a speculative extra table" call already made for
 * Production's QC decisions (tracked via status + audit_events, not a
 * separate table).
 *
 * `gate_entries.direction = OUTBOUND` reuse (noted as the intended
 * Phase 4 design in gate-weighment.schema.ts's own doc comment) is NOT
 * wired up here — actually integrating dispatch with the physical gate-
 * out flow is real, separate work (a gate entry needs a customer
 * reference it doesn't have today) and deserves its own pass, not a
 * half-wired FK added under time pressure.
 *
 * A sales order can only be dispatched once it's CONFIRMED — enforced
 * in DispatchService.create(), same reasoning as Packing's
 * RELEASED-batch-only gate. At most one *active* (non-CANCELLED)
 * dispatch per order is enforced in the service layer, not a DB unique
 * constraint on `salesOrderId` — a hard column-level unique constraint
 * was tried first and found wrong by live testing: it let a single
 * CANCELLED dispatch permanently block ever dispatching that order
 * again, which breaks the entirely normal "cancel and redispatch" flow.
 * Partial/multi-shipment dispatch of a single order is still out of
 * scope (only one *active* dispatch at a time).
 */
export const dispatches = pgTable('dispatches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  salesOrderId: uuid('sales_order_id').notNull().references(() => salesOrders.id),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  driverId: uuid('driver_id').references(() => drivers.id),
  status: dispatchStatusEnum('status').notNull().default('PENDING'),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  deliveryNotes: text('delivery_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  salesOrderIdx: index('dispatches_sales_order_idx').on(t.salesOrderId),
  vehicleIdx: index('dispatches_vehicle_idx').on(t.vehicleId),
}));

/**
 * Which packed lots left the factory on which dispatch — the link that lets
 * a batch be traced forward to a customer (and a customer back to suppliers).
 * `packing_lot_id` is deliberately NOT unique: a CANCELLED dispatch must free
 * its lots to be shipped again (the same trap as `dispatches.sales_order_id`).
 * "A lot is on at most one *active* dispatch" is enforced in DispatchService.
 */
export const dispatchLots = pgTable('dispatch_lots', {
  id: uuid('id').primaryKey().defaultRandom(),
  dispatchId: uuid('dispatch_id').notNull().references(() => dispatches.id),
  packingLotId: uuid('packing_lot_id').notNull().references(() => packingLots.id),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  dispatchIdx: index('dispatch_lots_dispatch_idx').on(t.dispatchId),
  lotIdx: index('dispatch_lots_packing_lot_idx').on(t.packingLotId),
}));

export type Dispatch = typeof dispatches.$inferSelect;
export type DispatchLot = typeof dispatchLots.$inferSelect;
