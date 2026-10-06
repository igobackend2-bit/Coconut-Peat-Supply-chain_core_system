# Coco Pith Factory — Security

**Status:** Hardened in v0.3.1 (see "Hardening" below) and covered by an
integration test suite that runs in CI. Several items from
`MASTER_PROMPT.md` §20 are still open — listed at the end, not hidden.

## Authentication (implemented)

- Passwords hashed with bcrypt (`bcryptjs`, cost factor 10) — never
  stored or logged in plaintext. `AuthService.sanitizeUser()` uses an
  explicit allow-list (not an omit) when returning user data, so a future
  sensitive column added to `users` doesn't leak by default.
- Login issues an opaque random session token (32 bytes,
  `crypto.randomBytes`), returned to the client once. Only its SHA-256
  hash is stored (`user_sessions.token_hash`) — the server cannot
  reconstruct a raw token from the database.
- Session TTL is a hardcoded 7 days (`AuthService`'s `SESSION_TTL_MS`),
  not yet configurable.
- `POST /auth/logout` revokes a session (`revoked_at` set) rather than
  deleting the row — consistent with the audit/history posture
  elsewhere in this system.
- **Two real vulnerabilities were found and fixed during implementation,
  not left as theoretical risk:**
  1. The generic `@AuditLog` interceptor would have written the raw
     session token from `POST /auth/login`'s response straight into
     `audit_events.after_state` in plaintext — defeating the point of
     only storing a hash elsewhere. Fixed by adding
     `redactResponseFields` support to `@AuditLog` and using it on the
     login endpoint. See `docs/api.md` "Audit coverage".
  2. NestJS runs Guards before Interceptors, so a rejected (401/403)
     request never reached `AuditInterceptor` at all — access-denied
     attempts were invisible to the audit trail. Fixed with a global
     `AuthFailureAuditFilter`. See `docs/api.md` "Audit coverage" for the
     verified before/after.

## Hardening (v0.3.1)

Each item below is proven by an integration test in `apps/api/test/e2e/`
(and, for the first four, was checked by re-introducing the bug and
confirming the test failed).

- **Registration is closed.** `POST /auth/register` only works on a fresh
  install with zero users, and then makes that first user `SUPER_ADMIN`
  (an advisory lock makes "first user" atomic — six simultaneous requests
  produce exactly one admin). Afterwards it is 403. Accounts are created by
  an administrator via `POST /users` (`identity.user.manage`) and the
  Settings → Users screen.
- **No access without a role.** An authenticated account holding no roles
  can read only its own profile; every other guarded route returns 403.
  Money views additionally need `finance.read`, the audit log needs
  `audit.event.read`, confidential memory needs `memory.confidential.read`.
- **`PermissionsGuard` can no longer fail open.** It reads
  `@RequirePermissions` from the handler *and* the class. Previously a
  class-level declaration was silently ignored — the audit-log controller
  shipped open to every signed-in user that way.
- **Deactivated users are locked out immediately.** Deactivation revokes all
  their sessions; `authenticate()` and login both reject inactive accounts;
  the login answer is identical to "wrong password".
- **No account enumeration by response or timing.** Unknown email, wrong
  password and deactivated all return the same 401 message, and a dummy
  bcrypt comparison runs when the email doesn't exist.
- **Rate limiting** (`@nestjs/throttler`): 10 requests/min/IP on
  login, register and change-password; 600/min/IP overall. In-memory per
  process — put a shared store (Redis) behind it before running more than
  one API instance.
- **Password rules:** 8–72 characters (bcrypt ignores everything past 72
  bytes, so longer values are rejected rather than silently truncated).
- **Change password** verifies the current password and revokes the user's
  *other* sessions. A wrong current password is a 400, not a 401 — the web
  client signs the user out on any 401.
- **Security headers** via `helmet` (nosniff, frame protection, HSTS,
  CSP for API responses, no `X-Powered-By`).
- **CORS is scoped** to `CORS_ORIGINS` (default: the local Vite dev server).
  Other origins receive no CORS headers.
- **Confidential memory no longer leaks through the audit log.** The audit
  interceptor stores response bodies; memory write endpoints now redact
  `content`, so `audit.event.read` cannot be used to read what
  `memory.confidential.read` protects.
- **Audit and stock-ledger immutability is enforced by the database**
  (triggers), and tested by attempting `UPDATE`/`DELETE`.
- **Dependencies:** production dependencies have 0 known vulnerabilities
  (NestJS 10 → 11, drizzle-orm 0.36 → 0.45 for an SQL-identifier-escaping
  advisory). NestJS 12 was tried and rejected: it is ESM-only and this
  codebase is CommonJS. 47 advisories remain in *development* tooling
  (Jest, Nest CLI, Angular devkit, esbuild via drizzle-kit, webpack); they
  are not shipped and run only on trusted input. CI fails on any high
  production advisory (`npm audit --omit=dev --audit-level=high`).

### Legacy Go system: leaked secrets (action required outside the code)

The legacy system had these hardcoded and committed: a Docker Hub
account password (`plugin.sh`), an MQTT broker password
(`docker-compose.yml`, both Kubernetes manifests) and an Ethereum private
key (`server/blockchain.go`). They have been removed from the working tree
and replaced with environment variables / a Kubernetes Secret, but **they are
still in git history, so they must be treated as compromised:**

1. Rotate the Docker Hub password (and switch to an access token), the HiveMQ
   broker credentials, and stop using that Ethereum account (move any funds).
2. Optionally purge them from history (`git filter-repo` / BFG, then a
   force-push and re-clone for every collaborator) — destructive, so not done
   automatically.
3. `.kilo/` (another working copy) holds untouched copies; it is now
   gitignored but still contains the old values on disk.

`scripts/check-secrets.sh` runs in CI and detects all six of those leaked
lines when pointed at the old commit. Enable it locally with
`git config core.hooksPath .githooks`.

## RBAC

See `docs/permissions.md` for the full mechanism. `SessionAuthGuard`
(authentication) + `PermissionsGuard` (authorization), applied
per controller; permission declared per handler (class-level also works now).

## Residual risks and not yet done

- **The session token lives in `localStorage`**, so an XSS bug in the web
  app could steal it. There is no CSP on the SPA itself yet (the API sends
  one for its own responses). Moving to an `HttpOnly` cookie needs CSRF
  protection and is a design change, not a patch.
- **Rate limiting is in-memory and per IP**; there is no per-account
  lockout, so a distributed guesser is only slowed, not stopped.
- `/reports/*` (including finance KPIs on the dashboard) requires a role but
  not `finance.read`.
- **No tenant isolation** — `tenant_id` columns exist but nothing enforces them.
- MFA for privileged accounts.
- Secrets management beyond environment variables (no vault integration).
- Encryption at rest (depends on the PostgreSQL deployment).
- No refresh-token rotation, device list or "sign out everywhere" button
  (changing your password does sign out other sessions).
- Backup / disaster recovery plan; security incident process.
- Session lifetime is a fixed 7 days (`SESSION_TTL_MS`).
