process.env.AUTH_RATE_LIMIT = '3';

import { Ctx, createApp } from './helpers';
import { ADMIN_EMAIL } from './provision';

describe('rate limiting', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    ctx = await createApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('stops password guessing: after the limit, even the correct password is refused with 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await ctx.http().post('/auth/login').send({ email: ADMIN_EMAIL, password: `guess-${i}-Password` })).status);
    }
    expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
    expect(statuses.slice(3)).toEqual([429, 429]);
  });

  it('does not throttle ordinary endpoints at the auth limit', async () => {
    for (let i = 0; i < 8; i++) {
      expect((await ctx.http().get('/health')).status).toBe(200);
    }
  });
});
