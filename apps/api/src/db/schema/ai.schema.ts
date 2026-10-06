import { index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { aiAgentStatusEnum, aiFindingSeverityEnum, aiFindingStatusEnum, aiRunStatusEnum } from './enums';
import { users } from './identity.schema';

/**
 * AI domain (docs/agents.md). HONEST SCOPE: no LLM is connected. The
 * "agents" here are the A01–A12 registry plus deterministic, rule-based
 * analyzers (see AiService) that read real operational data and write
 * FINDINGS in status PROPOSED. A human acknowledges or dismisses each
 * finding — nothing an agent produces changes business data, which is
 * the agents.md §1/§6 rule ("AI must never silently modify business
 * data"; proposed ≠ executed).
 *
 * Registry rows with `analyzer_key IS NULL` are specified but have no
 * implementation yet and cannot be run.
 */
export const aiAgents = pgTable('ai_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull(), // A01..A12
  name: text('name').notNull(),
  purpose: text('purpose').notNull(),
  permissionLevel: text('permission_level').notNull().default('READ'),
  analyzerKey: text('analyzer_key'),
  status: aiAgentStatusEnum('status').notNull().default('ENABLED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('ai_agents_code_unique').on(t.code),
}));

export const aiRuns = pgTable('ai_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => aiAgents.id),
  triggeredBy: uuid('triggered_by').references(() => users.id),
  status: aiRunStatusEnum('status').notNull(),
  summary: text('summary'),
  findingCount: integer('finding_count').notNull().default(0),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
}, (t) => ({
  agentIdx: index('ai_runs_agent_idx').on(t.agentId),
}));

export const aiFindings = pgTable('ai_findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').notNull().references(() => aiRuns.id),
  agentId: uuid('agent_id').notNull().references(() => aiAgents.id),
  severity: aiFindingSeverityEnum('severity').notNull(),
  title: text('title').notNull(),
  detail: text('detail').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  status: aiFindingStatusEnum('status').notNull().default('PROPOSED'),
  decidedBy: uuid('decided_by').references(() => users.id),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('ai_findings_status_idx').on(t.status),
  runIdx: index('ai_findings_run_idx').on(t.runId),
}));

export type AiAgent = typeof aiAgents.$inferSelect;
export type AiRun = typeof aiRuns.$inferSelect;
export type AiFinding = typeof aiFindings.$inferSelect;
