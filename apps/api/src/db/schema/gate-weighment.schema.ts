import { index, integer, numeric, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { entityStatusEnum, gateEntryDirectionEnum, gateEntryStatusEnum } from './enums';
import { products, suppliers } from './master-data.schema';

// See master-data.schema.ts for the same NULL-defeats-uniqueness note —
// all `code`/registration-number uniqueness below is single-column, not
// composite with tenant_id, for the same verified reason.

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  registrationNumber: text('registration_number').notNull(),
  vehicleType: text('vehicle_type'),
  capacityKg: integer('capacity_kg'),
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  regUnique: unique('vehicles_registration_number_unique').on(t.registrationNumber),
}));

export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  fullName: text('full_name').notNull(),
  licenseNumber: text('license_number'),
  phone: text('phone'),
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A vehicle's visit to the factory. `direction` defaults to INBOUND
 * (Phase 2 scope — raw material receipt); Phase 4 Dispatch is expected
 * to reuse this table with direction=OUTBOUND rather than duplicating it
 * (see docs/roadmap.md Phase 4 note), but that reuse isn't wired up yet.
 */
export const gateEntries = pgTable('gate_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  driverId: uuid('driver_id').references(() => drivers.id),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  direction: gateEntryDirectionEnum('direction').notNull().default('INBOUND'),
  purpose: text('purpose'),
  status: gateEntryStatusEnum('status').notNull().default('AT_GATE'),
  entryTime: timestamp('entry_time', { withTimezone: true }).notNull().defaultNow(),
  exitTime: timestamp('exit_time', { withTimezone: true }),
}, (t) => ({
  vehicleIdx: index('gate_entries_vehicle_idx').on(t.vehicleId),
  supplierIdx: index('gate_entries_supplier_idx').on(t.supplierId),
}));

/**
 * Gross/tare/net weight for one gate entry. `gateEntryId` is UNIQUE —
 * this is the concrete duplicate-weighment prevention required by
 * product-requirements.md §4.3: a gate entry can have at most one
 * weighment record at the database level, not just by convention. A
 * genuine re-weigh needs a new gate entry, which is intentional (keeps
 * the audit trail honest about how many times a vehicle was actually
 * weighed).
 */
export const weighments = pgTable('weighments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  gateEntryId: uuid('gate_entry_id').notNull().references(() => gateEntries.id),
  productId: uuid('product_id').references(() => products.id),
  grossWeightKg: numeric('gross_weight_kg', { precision: 10, scale: 2 }).notNull(),
  tareWeightKg: numeric('tare_weight_kg', { precision: 10, scale: 2 }).notNull(),
  netWeightKg: numeric('net_weight_kg', { precision: 10, scale: 2 }).notNull(), // computed in WeighmentsService, not a DB-generated column (kept simple)
  weighedAt: timestamp('weighed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  gateEntryUnique: unique('weighments_gate_entry_unique').on(t.gateEntryId),
}));

export type Vehicle = typeof vehicles.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type GateEntry = typeof gateEntries.$inferSelect;
export type Weighment = typeof weighments.$inferSelect;
