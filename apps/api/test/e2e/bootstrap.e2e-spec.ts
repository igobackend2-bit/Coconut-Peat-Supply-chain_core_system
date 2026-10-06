// Uses the second, empty database so "first user" behaviour can be tested from a clean state.
process.env.DATABASE_URL = process.env.E2E_BOOT_DATABASE_URL ?? '';

import { Ctx, createApp, login, authed } from './helpers';

describe('first-run bootstrap', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    ctx = await createApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('lets exactly one of several simultaneous first registrations through, and makes it SUPER_ADMIN', async () => {
    const attempts = await Promise.all(
      Array.from({ length: 6 }, (_unused, i) =>
        ctx.http().post('/auth/register').send({ email: `first${i}@test.local`, password: 'First-User-Pass-1', fullName: `First ${i}` }),
      ),
    );
    const created = attempts.filter((r: { status: number }) => r.status === 201);
    const refused = attempts.filter((r: { status: number }) => r.status === 403);
    expect(created).toHaveLength(1);
    expect(refused).toHaveLength(5);

    const email = created[0].body.email as string;
    const token = await login(ctx, email, 'First-User-Pass-1');
    const me = await authed(ctx, token).get('/auth/me');
    expect(me.body.roles).toContain('SUPER_ADMIN');
  });

  it('is closed for everyone afterwards', async () => {
    const res = await ctx.http().post('/auth/register').send({ email: 'late@test.local', password: 'Late-Comer-Pass-1', fullName: 'Late' });
    expect(res.status).toBe(403);
  });
});
