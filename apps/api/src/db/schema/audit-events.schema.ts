import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Append-only audit log. Fields mirror the mandatory action record in
 * docs/actions.md §4. This table must never be UPDATEd or DELETEd from
 * application code — corrections are new rows (docs/actions.md §7).
 *
 * This is a first-cut schema to prove the NestJS + Drizzle wiring works
 * end-to-end (project-state.md Next Priority #3). It is not yet wired to
 * an audit-logging interceptor — that is separate follow-up work.
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id'),
    actorId: uuid('actor_id'),
    actorType: text('actor_type').notNull(), // USER | AI_AGENT | SYSTEM | INTEGRATION | ADMIN
    actorName: text('actor_name'),
    actionType: text('action_type').notNull(), // CREATE | UPDATE | DELETE | APPROVE | ...
    module: text('module').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    operation: text('operation'),
    status: text('status').notNull(), // REQUESTED | ... | COMPLETED | FAILED | PARTIAL
    requestId: uuid('request_id'),
    correlationId: uuid('correlation_id'),
    conversationId: uuid('conversation_id'),
    sessionId: uuid('session_id'),
    source: text('source'), // WEB | MOBILE | API | AI_AGENT | INTEGRATION
    reason: text('reason'),
    beforeState: jsonb('before_state'),
    afterState: jsonb('after_state'),
    diff: jsonb('diff'),
    approvalId: uuid('approval_id'),
    toolName: text('tool_name'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    entityIdx: index('audit_events_entity_idx').on(table.entityType, table.entityId),
    actorIdx: index('audit_events_actor_idx').on(table.actorId),
    createdAtIdx: index('audit_events_created_at_idx').on(table.createdAt),
  }),
);

export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
