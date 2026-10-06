// Runs before each spec file. Point the app at the disposable database and relax only
// the blanket limiter; the auth limiter is tuned per spec.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.E2E_DATABASE_URL ?? '';
process.env.RATE_LIMIT = process.env.RATE_LIMIT ?? '100000';
process.env.AUTH_RATE_LIMIT = process.env.AUTH_RATE_LIMIT ?? '100';
