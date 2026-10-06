# Coco Pith Factory — Testing

## What runs

| Suite | Where | Command | Count |
|---|---|---|---|
| API unit | `apps/api/src/**/*.spec.ts` | `npm test` | 18 |
| API integration | `apps/api/test/e2e/*.e2e-spec.ts` | `npm run test:e2e` | 43 |
| Web unit/route | `apps/web/src/**/*.spec.tsx` | `npm test -- --run` | 9 |

CI (`.github/workflows/node-ci.yml`) runs lint, typecheck, all three suites, the
web build, a production-dependency audit and the secret scan on every push and PR.

## Integration tests

They boot the **real** `AppModule` with the **real** HTTP configuration
(`configureApp()`: helmet, CORS, validation, rate limiting) against a **real
PostgreSQL**, so they exercise guards, interceptors, the audit pipeline,
migrations and database triggers together — not mocks.

- `global-setup.ts` drops and recreates two databases, `coco_pith_factory_test`
  and `coco_pith_factory_test_boot` (empty, for first-run bootstrap), applies every
  migration in `database/migrations` and both seed files, and inserts one
  `SUPER_ADMIN` into the first. `provision.ts` refuses any database name that
  doesn't end in `_test…`, so it cannot touch development data.
- Needs a Postgres reachable with `TEST_DB_ADMIN_URL`
  (default: the dev `DATABASE_URL` with database `postgres`).
- Specs: `security` (headers, CORS, auth, deactivation, change-password, role-less
  access, audit-log protection, confidential data, DB immutability), `bootstrap`
  (concurrent first registration), `throttle` (rate limiting), `rules` (credit limit,
  dispatch, expenses, payments, export, maintenance, workforce, memory, AI),
  `traceability` (supplier → batch → lot → dispatch → customer, and the recall view).

### Do the tests catch regressions?

Three vulnerabilities were re-introduced one at a time (role-less access allowed,
confidential content unredacted in the audit log, deactivated users able to log in);
each made exactly the matching test fail, then the code was restored.

## Gotchas

- Never run `npm run build` in `apps/api` while `nest start --watch` is running — it
  deletes `dist/` and crashes the dev server. Use `npx tsc --noEmit`.
- drizzle-orm ≥ 0.40 wraps driver errors; the Postgres message is in `error.cause`.
  `expectDbRejects()` in `helpers.ts` handles both shapes.
- The login limiter is per IP: after ~10 attempts in a minute against a dev server you
  will get 429 for the rest of that minute.

## Still to do

Permission matrix test (role × module × action), per-mutation audit-row assertions,
AI-agent tests beyond the analyzers' happy path, browser E2E (Playwright), and a
fixture for the full Purchase → … → Dispatch flow as a single scenario.
