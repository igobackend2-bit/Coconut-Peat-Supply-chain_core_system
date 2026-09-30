# Coco Pith Factory — Testing Strategy

**Status:** STUB — not yet written.

Must cover the testing requirements from `MASTER_PROMPT.md` §24–25:
unit, integration, API, database, permission, audit, AI agent, E2E, and
security tests, with critical workflows requiring E2E coverage (e.g.
Purchase → Goods Receipt → Stock → Production → QC → Packing → Sales →
Dispatch).

## TODO

- [ ] Test framework choice for the Node.js/TypeScript backend
- [ ] Test framework choice for the React frontend
- [ ] Database test strategy (test database provisioning, fixtures,
      cleanup)
- [ ] Permission test matrix (verify role × module × action enforcement)
- [ ] Audit test requirements (every mutating operation produces a
      correct `audit_events` row)
- [ ] AI agent test requirements per `MASTER_PROMPT.md` §25: agent
      authorization, unauthorized tool calls, approval requirements,
      hallucination handling, incorrect tool arguments, duplicate
      execution, retry behaviour, memory conflicts, memory permissions,
      conversation linkage, audit completeness
- [ ] E2E coverage list for critical workflows (see `workflows.md`)
- [ ] CI pipeline: what runs on every PR (lint, typecheck, unit, integration)
      vs. nightly/pre-release (E2E, security)
