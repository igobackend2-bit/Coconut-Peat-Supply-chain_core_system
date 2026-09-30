# Coco Pith Factory — Security

**Status:** Authentication mechanism implemented and verified live. Most
of `MASTER_PROMPT.md` §20's list is still open.

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

## RBAC

See `docs/permissions.md` for the full mechanism. Enforced via
`SessionAuthGuard` (authentication) + `PermissionsGuard` (authorization),
applied per-controller/per-handler.

## CORS

`app.enableCors()` in `apps/api/src/main.ts`, currently wide open (no
origin restriction) — was necessary for `apps/web`'s dev server to reach
the API cross-origin. **Should be scoped to real allowed origins** once
there's a concrete deployment target to scope it to; flagged here rather
than left silent.

## Not yet done

- MFA for privileged accounts.
- Rate limiting.
- Systematic input validation beyond what `class-validator` DTOs already
  cover for the two endpoints that exist (`RegisterUserDto`, `LoginDto`,
  `CreateProductDto`, `UpdateProductDto`).
- Secrets management beyond local `.env` files (see
  `docs/environment.md`) — no vault/secret-manager integration.
- Encryption at rest (relies on whatever the PostgreSQL deployment
  provides).
- Session management beyond the basic issue/revoke described above — no
  "log out all other sessions," no device list, no refresh-token
  rotation.
- Backup and disaster recovery plan.
- Security incident response process.
- CORS origin scoping (see above).
