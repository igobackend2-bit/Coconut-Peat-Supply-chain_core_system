import { defineConfig } from 'drizzle-kit';

// Drizzle ORM configuration (ADR-004). Migration output is kept at the
// repo-root /database/migrations directory (per the Phase 0 scaffold),
// not inside apps/api, so /database stays the single source of truth
// for schema history regardless of which app touches the database.
export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: '../../database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/coco_pith_factory',
  },
  verbose: true,
  strict: true,
});
