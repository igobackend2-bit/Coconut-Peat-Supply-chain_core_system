# Coco Pith Factory — API

NestJS backend (ADR-003) with Drizzle ORM against plain self-hosted
PostgreSQL (ADR-002, ADR-004). See `../../docs/architecture.md` and
`../../docs/decisions.md` for the full rationale.

## Status

Skeleton, with a working audit-logging pipeline. Implements:
- App bootstrap (`src/main.ts`, `src/app.module.ts`)
- Global Drizzle DB module/provider (`src/db/`), injectable via the
  `DRIZZLE` token
- `audit_events` schema (`src/db/schema/audit-events.schema.ts`) matching
  `docs/actions.md` §4, **append-only enforced at the DB level** via
  triggers (`database/migrations/0001_enforce_audit_events_append_only.sql`)
- `@AuditLog()` decorator + global `AuditInterceptor`
  (`src/common/audit/`) that write `audit_events` rows on success/failure
  for any endpoint that opts in — see `audit-demo.controller.ts` for a
  working example (`POST /audit-demo/ping`, `POST /audit-demo/fail`);
  remove that controller once a real business module uses `@AuditLog`
- `GET /health` and `GET /health/db` to prove the process boots and the
  Drizzle→Postgres connection actually works

Does **not** yet implement: auth, RBAC, or any real business module.
`@AuditLog` is only exercised by the demo controller so far — see
`apps/api/src/common/audit/audit.interceptor.ts`'s doc comment for known
limitations (no transactional coupling with business writes yet; no real
actor identity until auth exists).

## Setup

```bash
cd apps/api
npm install
cp .env.example .env   # edit DATABASE_URL to point at a real PostgreSQL instance
```

## Development

```bash
npm run start:dev   # watch mode
npm run build        # nest build (compiles to dist/)
npm test             # jest unit tests
npm run lint          # eslint
```

## Database migrations (Drizzle)

Migration files are generated into the repo-root `/database/migrations`
directory (not inside this app), so `/database` stays the single source
of truth regardless of which app touches the schema.

```bash
npm run db:generate   # generate a migration from the current schema/*.ts files
npm run db:migrate    # apply pending migrations to DATABASE_URL
npm run db:studio     # open Drizzle Studio against DATABASE_URL
```
