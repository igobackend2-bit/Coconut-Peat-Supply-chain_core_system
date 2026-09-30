import { boolean, index, numeric, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { productionBatches } from './production.schema';
import { qcParameters } from './master-data.schema';

/**
 * `qc_plans`, distinct `qc_tests` (folded into `qc_results` — a result
 * IS a completed test for this MVP), and `corrective_actions` from
 * architecture.md §3's Quality domain are deliberately deferred — not
 * on the critical path for Phase 3's definition of done. There is also
 * no separate `qc_decisions` table yet: the release/hold/reject
 * decision is tracked as `production_batches.status` plus the
 * corresponding `audit_events` row (via `@AuditLog` on the decision
 * endpoints) — a dedicated decision-history table is a reasonable
 * future addition if the status+audit-log combination turns out to be
 * insufficient for a real "batch decision history" UI.
 */
export const qcSamples = pgTable('qc_samples', {
  id: uuid('id').primaryKey().defaultRandom(),
  productionBatchId: uuid('production_batch_id').notNull().references(() => productionBatches.id),
  sampledAt: timestamp('sampled_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  batchIdx: index('qc_samples_batch_idx').on(t.productionBatchId),
}));

/**
 * `passed` is computed server-side by comparing `measuredValue` against
 * the sampled batch's product grade's `product_grade_qc_specs`
 * min/max (Master Data, Phase 1) — see `QcResultsService`. If the batch
 * has no `product_grade_id`, there's nothing to check against, and
 * `passed` is left `null` (not auto-failed) rather than guessed.
 */
export const qcResults = pgTable('qc_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  qcSampleId: uuid('qc_sample_id').notNull().references(() => qcSamples.id),
  qcParameterId: uuid('qc_parameter_id').notNull().references(() => qcParameters.id),
  measuredValue: numeric('measured_value', { precision: 12, scale: 4 }).notNull(),
  passed: boolean('passed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sampleIdx: index('qc_results_sample_idx').on(t.qcSampleId),
}));

export type QcSample = typeof qcSamples.$inferSelect;
export type QcResult = typeof qcResults.$inferSelect;
