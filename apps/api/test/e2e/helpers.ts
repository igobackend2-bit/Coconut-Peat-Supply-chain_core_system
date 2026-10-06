import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './provision';

export interface Ctx {
  app: INestApplication;
  /** Raw supertest handle for tests that need headers/origins. */
  http: () => ReturnType<typeof request>;
  db: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** Boots the real AppModule with the real HTTP configuration against `process.env.DATABASE_URL`. */
export async function createApp(): Promise<Ctx> {
  // Required lazily so env set at the top of a spec (e.g. AUTH_RATE_LIMIT) is read at import time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppModule } = require('../../src/app.module');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { configureApp } = require('../../src/app.setup');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DRIZZLE } = require('../../src/db/drizzle.provider');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return { app, http: () => request(app.getHttpServer()), db: app.get(DRIZZLE) };
}

export async function login(ctx: Ctx, email: string, password: string): Promise<string> {
  const res = await ctx.http().post('/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token as string;
}

export const adminToken = (ctx: Ctx) => login(ctx, ADMIN_EMAIL, ADMIN_PASSWORD);

export const authed = (ctx: Ctx, token: string) => ({
  get: (path: string) => ctx.http().get(path).set('Authorization', `Bearer ${token}`),
  post: (path: string, body?: object) => ctx.http().post(path).set('Authorization', `Bearer ${token}`).send(body ?? {}),
  del: (path: string) => ctx.http().delete(path).set('Authorization', `Bearer ${token}`),
});

let counter = 0;
export const uniq = (prefix = 'x') => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Inserts a role holding exactly `permissionCodes` and returns its id. */
export async function createRole(ctx: Ctx, permissionCodes: string[]): Promise<string> {
  const code = uniq('ROLE_').toUpperCase();
  const { sql } = require('drizzle-orm'); // eslint-disable-line @typescript-eslint/no-require-imports
  const rows = await ctx.db.execute(sql`INSERT INTO roles (code, name) VALUES (${code}, ${code}) RETURNING id`);
  const roleId = (rows as unknown as { id: string }[])[0].id;
  if (permissionCodes.length) {
    await ctx.db.execute(
      sql`INSERT INTO role_permissions (role_id, permission_id) SELECT ${roleId}::uuid, id FROM permissions WHERE code IN (${sql.join(permissionCodes.map((c) => sql`${c}`), sql`, `)})`,
    );
  }
  return roleId;
}

/** Creates a user through the admin API (the real path) and returns credentials plus a session token. */
export async function createUser(ctx: Ctx, admin: string, roleIds: string[] = []) {
  const email = `${uniq('u')}@test.local`;
  const password = 'User-Test-Pass-1';
  const res = await authed(ctx, admin).post('/users', { email, password, fullName: 'Test User', roleIds });
  if (res.status !== 201) throw new Error(`createUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: res.body.id as string, email, password, token: await login(ctx, email, password) };
}

/** Asserts a DB statement is rejected, matching the Postgres message whether or not the driver wraps it (drizzle ≥0.40 puts it in `cause`). */
export async function expectDbRejects(run: Promise<unknown>, pattern: RegExp): Promise<void> {
  let error: unknown;
  try {
    await run;
  } catch (e) {
    error = e;
  }
  if (!error) throw new Error('Expected the statement to be rejected, but it succeeded');
  const err = error as { message?: string; cause?: { message?: string } };
  expect(`${err.cause?.message ?? ''} ${err.message ?? ''}`).toMatch(pattern);
}
