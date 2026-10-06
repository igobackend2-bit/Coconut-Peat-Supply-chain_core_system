import { readFileSync } from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export const ADMIN_EMAIL = 'admin@test.local';
export const ADMIN_PASSWORD = 'Admin-Test-Pass-1';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/** Connection URL for the server's maintenance database, taken from TEST_DB_ADMIN_URL or the dev DATABASE_URL. */
export function adminUrl(): string {
  if (process.env.TEST_DB_ADMIN_URL) return process.env.TEST_DB_ADMIN_URL;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: join(__dirname, '..', '..', '.env') });
  const dev = process.env.DATABASE_URL;
  if (!dev) throw new Error('Set TEST_DB_ADMIN_URL (e.g. postgresql://postgres:postgres@localhost:5432/postgres) or DATABASE_URL');
  const u = new URL(dev);
  u.pathname = '/postgres';
  return u.toString();
}

export function urlFor(dbName: string): string {
  const u = new URL(adminUrl());
  u.pathname = `/${dbName}`;
  return u.toString();
}

/**
 * Drops and recreates `dbName`, applies every real migration, then the seed
 * files. Refuses any name that isn't clearly a test database.
 */
export async function provisionDb(dbName: string, opts: { withAdmin: boolean }): Promise<void> {
  if (!/^[a-z0-9_]+_test(_[a-z0-9]+)?$/.test(dbName)) throw new Error(`Refusing to provision "${dbName}": name must end in _test`);

  const admin = postgres(adminUrl(), { max: 1, onnotice: () => {} });
  await admin.unsafe(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE ${dbName}`);
  await admin.end();

  const client = postgres(urlFor(dbName), { max: 1, onnotice: () => {} });
  await migrate(drizzle(client), { migrationsFolder: join(REPO_ROOT, 'database', 'migrations') });
  for (const seed of ['001-rbac-baseline.sql', '002-ai-agents.sql']) {
    await client.unsafe(readFileSync(join(REPO_ROOT, 'database', 'seeds', seed), 'utf8'));
  }
  if (opts.withAdmin) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 4);
    await client.unsafe(
      `WITH u AS (INSERT INTO users (email, password_hash, full_name) VALUES ('${ADMIN_EMAIL}', '${hash}', 'Test Admin') RETURNING id)
       INSERT INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM u, roles r WHERE r.code = 'SUPER_ADMIN'`,
    );
  }
  await client.end();
}
