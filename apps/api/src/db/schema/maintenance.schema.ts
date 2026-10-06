import { date, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import {
  breakdownStatusEnum,
  entityStatusEnum,
  severityEnum,
  workOrderStatusEnum,
  workOrderTypeEnum,
} from './enums';
import { employees, machines } from './master-data.schema';

/**
 * Maintenance domain (architecture.md §3). `machine_history` is not a
 * table: a machine's history is the union of its breakdowns and work
 * orders, served by `GET /machines/:id/history`.
 *
 * Machine status is wired in on purpose — reporting a breakdown sets the
 * machine SUSPENDED and resolving the last open breakdown restores it
 * to ACTIVE, so Production can see which machines are actually usable.
 * Completing a PREVENTIVE work order advances its plan's next_due_date
 * by frequency_days.
 */
export const maintenancePlans = pgTable('maintenance_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  machineId: uuid('machine_id').notNull().references(() => machines.id),
  title: text('title').notNull(),
  frequencyDays: integer('frequency_days').notNull(),
  nextDueDate: date('next_due_date').notNull(),
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  machineIdx: index('maintenance_plans_machine_idx').on(t.machineId),
}));

export const breakdowns = pgTable('breakdowns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  machineId: uuid('machine_id').notNull().references(() => machines.id),
  description: text('description').notNull(),
  severity: severityEnum('severity').notNull().default('MEDIUM'),
  status: breakdownStatusEnum('status').notNull().default('OPEN'),
  reportedAt: timestamp('reported_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionNotes: text('resolution_notes'),
}, (t) => ({
  machineIdx: index('breakdowns_machine_idx').on(t.machineId),
}));

export const workOrders = pgTable('work_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  workOrderNumber: text('work_order_number').notNull(),
  machineId: uuid('machine_id').notNull().references(() => machines.id),
  type: workOrderTypeEnum('type').notNull(),
  title: text('title').notNull(),
  breakdownId: uuid('breakdown_id').references(() => breakdowns.id),
  maintenancePlanId: uuid('maintenance_plan_id').references(() => maintenancePlans.id),
  assignedToEmployeeId: uuid('assigned_to_employee_id').references(() => employees.id),
  status: workOrderStatusEnum('status').notNull().default('OPEN'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (t) => ({
  numberUnique: unique('work_orders_number_unique').on(t.workOrderNumber),
  machineIdx: index('work_orders_machine_idx').on(t.machineId),
}));

export const spareParts = pgTable('spare_parts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  quantityOnHand: integer('quantity_on_hand').notNull().default(0),
  reorderLevel: integer('reorder_level').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('spare_parts_code_unique').on(t.code),
}));

export type MaintenancePlan = typeof maintenancePlans.$inferSelect;
export type Breakdown = typeof breakdowns.$inferSelect;
export type WorkOrder = typeof workOrders.$inferSelect;
export type SparePart = typeof spareParts.$inferSelect;
