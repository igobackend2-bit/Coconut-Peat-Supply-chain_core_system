import { index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { memorySensitivityEnum, memoryStatusEnum, memoryTypeEnum } from './enums';
import { users } from './identity.schema';

/**
 * Memory domain (docs/memory.md). Implemented: typed records, status,
 * sensitivity, confidence, tags, expiry, linked entity, and a version
 * chain via `supersedes_memory_id` (an edit never overwrites — it
 * creates version n+1 and marks the old row SUPERSEDED, per §8).
 *
 * NOT implemented: embeddings/semantic retrieval, automatic candidate
 * extraction from conversations, conflict records (§7), tenant
 * isolation. Retrieval is plain text search + filters. Per §6, memory
 * is only written by a human through the API; nothing here is
 * auto-promoted from AI output.
 */
export const memoryItems = pgTable('memory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  memoryType: memoryTypeEnum('memory_type').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: memoryStatusEnum('status').notNull().default('ACTIVE'),
  sensitivity: memorySensitivityEnum('sensitivity').notNull().default('INTERNAL'),
  sourceType: text('source_type').notNull().default('MANUAL'),
  confidence: numeric('confidence', { precision: 3, scale: 2 }).notNull().default('1.00'),
  tags: text('tags').array().notNull().default([]),
  linkedEntityType: text('linked_entity_type'),
  linkedEntityId: uuid('linked_entity_id'),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  version: integer('version').notNull().default(1),
  supersedesMemoryId: uuid('supersedes_memory_id'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('memory_items_status_idx').on(t.status),
  typeIdx: index('memory_items_type_idx').on(t.memoryType),
}));

export type MemoryItem = typeof memoryItems.$inferSelect;
