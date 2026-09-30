# Coco Pith Factory — Setup

**Status:** Real setup instructions for the Node.js/TypeScript system
(`apps/api`, `apps/web`). AI/Ollama/agent setup remains a stub — nothing
exists there yet (Phase 6, see `docs/roadmap.md`).

For the **legacy Go system** (still present in this repo — see
`decisions.md` ADR-001), setup instructions remain in the repo-root
`README.md` and are unaffected by this file.

## Prerequisites

- Node.js 22+, npm 10+
- A local PostgreSQL instance (this project's dev machine runs Postgres
  on the default port `5432` via Homebrew; adjust `DATABASE_URL` to
  match yours)

## Repository setup

```bash
cd apps/api && npm install
cd ../web && npm install
```

## Environment variables

- `apps/api/.env` — copy from `apps/api/.env.example`. Needs `PORT` and
  `DATABASE_URL`. **Port note:** this dev machine already has an
  unrelated process on port 3000, so the local convention here is
  `PORT=3001` — adjust if your machine differs, and update
  `apps/web/.env.local` to match.
- `apps/web/.env.local` — copy from `apps/web/.env.example`. Needs
  `VITE_API_BASE_URL` pointing at the API's actual port.

See `docs/environment.md` for the fuller variable reference.

## Database setup

```bash
createdb coco_pith_factory   # or whatever DATABASE_URL points at
cd apps/api
npx drizzle-kit migrate      # applies every migration in database/migrations/
psql -d coco_pith_factory -f ../../database/seeds/001-rbac-baseline.sql
```

The seed creates a starter permission catalog and a `SUPER_ADMIN` role.
There is no self-service "first user becomes admin" flow yet — after
registering a user via `POST /auth/register`, assign the role manually
(see the seed file's own comment for the exact SQL).

## Starting the application

**Both servers together** (recommended for normal development):

```bash
./start.sh
```

Starts `apps/api` (NestJS, watch mode) and `apps/web` (Vite dev server)
together from the repo root, and stops both together on Ctrl+C —
cleanup works by killing whatever is bound to the configured ports
(`apps/api/.env`'s `PORT`, and Vite's `5173`) rather than by process
tree/group, which was verified to be the more reliable approach: an
earlier version relying on bash's `kill 0` process-group trap did **not**
reliably stop the underlying `node` processes (each dev server is
`bash → npm → nest/vite → node`, several layers deep, and `SIGINT`
doesn't reliably propagate through all of them in a non-interactive
shell) — caught by testing, fixed by killing by port instead. Standard
Ctrl+C-in-an-interactive-terminal behavior should work correctly with
this fix; full re-verification of that exact interactive path was
constrained by this session's tooling (background processes across
separate sandboxed tool calls don't reliably receive forwarded signals),
so treat "press Ctrl+C in your own terminal" as the scenario to double-check
if anything ever seems to hang.

**Individually**, if you only need one:

```bash
cd apps/api && npm run start:dev   # NestJS, watch mode
cd apps/web && npm run dev          # Vite dev server
```

Or use the Claude Code launch configs in `.claude/launch.json` (`api`,
`web`) if working from an agent session with browser-preview support.

## Common dev commands

Run from within `apps/api` or `apps/web`:

```bash
npm run build   # apps/api: nest build · apps/web: tsc -b && vite build
npm test        # apps/api: jest · apps/web: vitest run
npm run lint    # apps/api: eslint · apps/web: oxlint
```

## Migrations

New schema changes go in `apps/api/src/db/schema/*.ts`, then:

```bash
cd apps/api
npx drizzle-kit generate --name <description>   # writes to database/migrations/
npx drizzle-kit migrate                          # applies pending migrations
```

Migration output intentionally lives at the repo-root `database/migrations/`,
not inside `apps/api` — see ADR-004.

## Not yet done

- AI/Ollama/agent setup (Phase 6 — see `docs/roadmap.md`)
- Production deployment steps (`docs/deployment.md` is still a stub)
- CI — nothing here runs in CI yet; every verification so far in this
  project has been manual and interactive
