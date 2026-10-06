import { date, index, numeric, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { attendanceStatusEnum } from './enums';
import { employees, machines } from './master-data.schema';
import { productionBatches } from './production.schema';

/**
 * Workforce domain (architecture.md §3, product-requirements.md §4.14).
 * Business rules live in WorkforceService: one attendance row per
 * employee per day (DB-enforced), and labour can only be allocated to
 * an employee who was PRESENT or HALF_DAY that day, capped at 12 hours
 * per employee per day.
 */
export const shifts = pgTable('shifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  startTime: text('start_time').notNull(), // 'HH:MM'
  endTime: text('end_time').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('shifts_code_unique').on(t.code),
}));

export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  shiftId: uuid('shift_id').references(() => shifts.id),
  workDate: date('work_date').notNull(),
  status: attendanceStatusEnum('status').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  employeeDayUnique: unique('attendance_employee_day_unique').on(t.employeeId, t.workDate),
  dateIdx: index('attendance_date_idx').on(t.workDate),
}));

export const labourAllocations = pgTable('labour_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  workDate: date('work_date').notNull(),
  hours: numeric('hours', { precision: 5, scale: 2 }).notNull(),
  task: text('task').notNull(),
  productionBatchId: uuid('production_batch_id').references(() => productionBatches.id),
  machineId: uuid('machine_id').references(() => machines.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  employeeDayIdx: index('labour_allocations_employee_day_idx').on(t.employeeId, t.workDate),
}));

export type Shift = typeof shifts.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type LabourAllocation = typeof labourAllocations.$inferSelect;
