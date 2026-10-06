import { date, index, numeric, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { expenseCategoryEnum, expenseStatusEnum, paymentDirectionEnum } from './enums';
import { users } from './identity.schema';
import { purchaseOrders } from './procurement.schema';
import { salesOrders } from './sales.schema';

/**
 * Finance domain (architecture.md §3). Deliberately NOT a general ledger:
 * product-requirements.md §4.15 says Finance integrates with the central
 * IGO ERP rather than keeping conflicting books, and that integration's
 * protocol is still unknown (docs/roadmap.md Phase 5 says to discover it
 * first). So this module holds factory-side operational finance only —
 * cost centres, expenses with an approval step, and payments against
 * sales/purchase orders — plus computed receivables and batch costing.
 * No double-entry, no tax postings, no GST.
 *
 * Segregation of duties (agents.md A11): an expense cannot be approved or
 * rejected by the user who submitted it.
 */
export const costCentres = pgTable('cost_centres', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('cost_centres_code_unique').on(t.code),
}));

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  expenseNumber: text('expense_number').notNull(),
  costCentreId: uuid('cost_centre_id').references(() => costCentres.id),
  category: expenseCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  expenseDate: date('expense_date').notNull(),
  status: expenseStatusEnum('status').notNull().default('SUBMITTED'),
  submittedBy: uuid('submitted_by').notNull().references(() => users.id),
  decidedBy: uuid('decided_by').references(() => users.id),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  decisionReason: text('decision_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  numberUnique: unique('expenses_number_unique').on(t.expenseNumber),
  statusIdx: index('expenses_status_idx').on(t.status),
}));

/**
 * INCOMING payments must reference a sales order, OUTGOING ones a
 * purchase order (enforced in FinanceService, along with "cannot exceed
 * the outstanding amount").
 */
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  paymentNumber: text('payment_number').notNull(),
  direction: paymentDirectionEnum('direction').notNull(),
  salesOrderId: uuid('sales_order_id').references(() => salesOrders.id),
  purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrders.id),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  method: text('method').notNull().default('BANK_TRANSFER'),
  reference: text('reference'),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
  recordedBy: uuid('recorded_by').references(() => users.id),
}, (t) => ({
  numberUnique: unique('payments_number_unique').on(t.paymentNumber),
  salesOrderIdx: index('payments_sales_order_idx').on(t.salesOrderId),
  purchaseOrderIdx: index('payments_purchase_order_idx').on(t.purchaseOrderId),
}));

export type CostCentre = typeof costCentres.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Payment = typeof payments.$inferSelect;
