import { Ctx, adminToken, authed, createApp, createRole, createUser, expectDbRejects, login, uniq } from './helpers';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './provision';

describe('security', () => {
  let ctx: Ctx;
  let admin: string;

  beforeAll(async () => {
    ctx = await createApp();
    admin = await adminToken(ctx);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  describe('HTTP hardening', () => {
    it('sends security headers and hides the framework', async () => {
      const res = await ctx.http().get('/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('answers CORS only for the configured web origin', async () => {
      const ok = await ctx.http().options('/customers').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'GET');
      expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      const evil = await ctx.http().options('/customers').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'GET');
      expect(evil.headers['access-control-allow-origin']).toBeUndefined();
    });

    it.each(['/customers', '/users', '/audit-events', '/finance/summary', '/memory', '/ai-agents', '/reports/overview'])(
      'requires authentication for %s',
      async (path) => {
        expect((await ctx.http().get(path)).status).toBe(401);
      },
    );

    it('rejects unknown fields and oversized passwords', async () => {
      const a = authed(ctx, admin);
      expect((await a.post('/users', { email: `${uniq()}@t.local`, password: 'x'.repeat(73), fullName: 'N' })).status).toBe(400);
      expect((await a.post('/users', { email: `${uniq()}@t.local`, password: 'short', fullName: 'N' })).status).toBe(400);
      expect((await a.post('/users', { email: `${uniq()}@t.local`, password: 'Long-Enough-1', fullName: 'N', isAdmin: true })).status).toBe(400);
    });
  });

  describe('authentication', () => {
    it('gives the same answer for an unknown user and a wrong password', async () => {
      const unknown = await ctx.http().post('/auth/login').send({ email: 'nobody@test.local', password: 'Whatever-123' });
      const wrong = await ctx.http().post('/auth/login').send({ email: ADMIN_EMAIL, password: 'Wrong-Password-1' });
      expect(unknown.status).toBe(401);
      expect(wrong.status).toBe(401);
      expect(unknown.body.message).toBe(wrong.body.message);
    });

    it('keeps self-registration closed once any user exists', async () => {
      const res = await ctx.http().post('/auth/register').send({ email: `${uniq()}@t.local`, password: 'Register-Me-1', fullName: 'Intruder' });
      expect(res.status).toBe(403);
    });

    it('signs a user out of everything the moment they are deactivated, and refuses new logins', async () => {
      const u = await createUser(ctx, admin);
      expect((await authed(ctx, u.token).get('/auth/me')).status).toBe(200);

      expect((await authed(ctx, admin).post(`/users/${u.id}/status`, { status: 'INACTIVE' })).status).toBe(201);

      expect((await authed(ctx, u.token).get('/auth/me')).status).toBe(401);
      const relogin = await ctx.http().post('/auth/login').send({ email: u.email, password: u.password });
      expect(relogin.status).toBe(401);
      expect(relogin.body.message).toBe('Invalid email or password'); // indistinguishable from a wrong password

      expect((await authed(ctx, admin).post(`/users/${u.id}/status`, { status: 'ACTIVE' })).status).toBe(201);
      await expect(login(ctx, u.email, u.password)).resolves.toEqual(expect.any(String));
    });

    it('does not let an administrator deactivate their own account', async () => {
      const me = await authed(ctx, admin).get('/auth/me');
      expect((await authed(ctx, admin).post(`/users/${me.body.id}/status`, { status: 'INACTIVE' })).status).toBe(400);
    });

    it('changes a password: wrong current is 400 (not 401), other sessions die, own session lives', async () => {
      const u = await createUser(ctx, admin);
      const other = await login(ctx, u.email, u.password);

      const wrong = await authed(ctx, u.token).post('/auth/change-password', { currentPassword: 'nope-nope-1', newPassword: 'Brand-New-Pass-2' });
      expect(wrong.status).toBe(400);
      expect((await authed(ctx, u.token).get('/auth/me')).status).toBe(200); // not logged out by the typo

      const ok = await authed(ctx, u.token).post('/auth/change-password', { currentPassword: u.password, newPassword: 'Brand-New-Pass-2' });
      expect(ok.status).toBe(204);
      expect((await authed(ctx, other).get('/auth/me')).status).toBe(401);
      expect((await authed(ctx, u.token).get('/auth/me')).status).toBe(200);
      expect((await ctx.http().post('/auth/login').send({ email: u.email, password: u.password })).status).toBe(401);
      await expect(login(ctx, u.email, 'Brand-New-Pass-2')).resolves.toEqual(expect.any(String));
    });
  });

  describe('authorisation', () => {
    it('creates users only for holders of identity.user.manage, validating roles first', async () => {
      const plainRole = await createRole(ctx, ['master_data.product.write']);
      const plain = await createUser(ctx, admin, [plainRole]);
      const res = await authed(ctx, plain.token).post('/users', { email: `${uniq()}@t.local`, password: 'Another-Pass-1', fullName: 'X' });
      expect(res.status).toBe(403);

      const bad = await authed(ctx, admin).post('/users', { email: `${uniq()}@t.local`, password: 'Another-Pass-1', fullName: 'X', roleIds: ['00000000-0000-4000-8000-000000000000'] });
      expect(bad.status).toBe(400);
      const dupEmail = `${uniq()}@t.local`;
      expect((await authed(ctx, admin).post('/users', { email: dupEmail, password: 'Another-Pass-1', fullName: 'X' })).status).toBe(201);
      expect((await authed(ctx, admin).post('/users', { email: dupEmail, password: 'Another-Pass-1', fullName: 'X' })).status).toBe(409);
    });

    it('gives an account with no roles access to nothing but its own profile', async () => {
      const nobody = await createUser(ctx, admin);
      const a = authed(ctx, nobody.token);
      expect((await a.get('/auth/me')).status).toBe(200);
      for (const path of ['/customers', '/products', '/ai-agents', '/reports/overview', '/memory', '/sales-orders']) {
        expect((await a.get(path)).status).toBe(403);
      }
    });

    it('protects the audit log on every route (regression: class-level metadata was ignored)', async () => {
      const role = await createRole(ctx, ['master_data.product.write']);
      const u = await createUser(ctx, admin, [role]);
      for (const path of ['/audit-events', '/audit-events/meta']) {
        expect((await authed(ctx, u.token).get(path)).status).toBe(403);
        expect((await authed(ctx, admin).get(path)).status).toBe(200);
      }
    });

    it('records denied access as SECURITY events', async () => {
      const role = await createRole(ctx, ['master_data.product.write']);
      const u = await createUser(ctx, admin, [role]);
      await authed(ctx, u.token).get('/audit-events');
      const events = await authed(ctx, admin).get(`/audit-events?module=SECURITY&actorId=${u.id}`);
      expect(events.status).toBe(200);
      expect(events.body.length).toBeGreaterThanOrEqual(1);
    });

    it('requires finance.read for money views', async () => {
      const without = await createUser(ctx, admin, [await createRole(ctx, ['master_data.product.write'])]);
      const withRead = await createUser(ctx, admin, [await createRole(ctx, ['finance.read'])]);
      for (const path of ['/expenses', '/payments', '/finance/summary', '/finance/receivables', '/cost-centres']) {
        expect((await authed(ctx, without.token).get(path)).status).toBe(403);
        expect((await authed(ctx, withRead.token).get(path)).status).toBe(200);
      }
    });

    it('refuses to remove the last SUPER_ADMIN', async () => {
      const roles = await authed(ctx, admin).get('/roles');
      const sa = roles.body.find((r: { code: string }) => r.code === 'SUPER_ADMIN');
      const me = await authed(ctx, admin).get('/auth/me');
      const res = await authed(ctx, admin).del(`/users/${me.body.id}/roles/${sa.id}`);
      expect(res.status).toBe(409);
    });
  });

  describe('data exposure', () => {
    it('keeps CONFIDENTIAL memory out of lists, history and the audit log', async () => {
      const secret = `TOP-SECRET-${uniq()}`;
      const created = await authed(ctx, admin).post('/memory', { memoryType: 'FACT', title: 'Margin target', content: secret, sensitivity: 'CONFIDENTIAL' });
      expect(created.status).toBe(201);
      const id = created.body.id;

      const reader = await createUser(ctx, admin, [await createRole(ctx, ['memory.item.write'])]);
      const list = await authed(ctx, reader.token).get('/memory');
      expect(JSON.stringify(list.body)).not.toContain(secret);
      expect((await authed(ctx, reader.token).get(`/memory/${id}/history`)).status).toBe(404);

      // The audit log is readable by audit.event.read holders — the secret must not be copied into it.
      const audit = await authed(ctx, admin).get('/audit-events?module=MEMORY&limit=200');
      expect(JSON.stringify(audit.body)).not.toContain(secret);
    });
  });

  describe('database-level guarantees', () => {
    it('refuses to update or delete audit events', async () => {
      const { sql } = require('drizzle-orm'); // eslint-disable-line @typescript-eslint/no-require-imports
      await expectDbRejects(ctx.db.execute(sql`UPDATE audit_events SET status = 'TAMPERED'`), /append-only/);
      await expectDbRejects(ctx.db.execute(sql`DELETE FROM audit_events`), /append-only/);
    });
  });
});
