import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { approvalStatusEnum } from './enums';
import { users } from './identity.schema';

/**
 * Generic approval record — first real use is Purchase Order approval
 * (docs/roadmap.md Phase 2, MASTER_PROMPT.md §18's "PO > ₹1,00,000 →
 * Manager Approval" example), but `entityType`/`entityId` are deliberately
 * generic so QC batch release (Phase 3) and others can reuse this table
 * rather than each domain inventing its own approval shape.
 */
export const approvals = pgTable(
  'approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id'),
    entityType: text('entity_type').notNull(), // e.g. 'purchase_order'
    entityId: uuid('entity_id').notNull(),
    reason: text('reason'), // why approval is required, e.g. "amount exceeds threshold"
    status: approvalStatusEnum('status').notNull().default('PENDING'),
    requestedBy: uuid('requested_by').references(() => users.id),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    decidedBy: uuid('decided_by').references(() => users.id),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decisionReason: text('decision_reason'),
  },
  (t) => ({
    entityIdx: index('approvals_entity_idx').on(t.entityType, t.entityId),
  }),
);

export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;
