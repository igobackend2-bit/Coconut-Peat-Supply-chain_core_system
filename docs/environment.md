# Coco Pith Factory — Environment Configuration

**Status:** STUB — not yet written.

Must document every environment variable the new system needs, separated
by environment (development / staging / production), per
`MASTER_PROMPT.md` §28. Real secret values must never be committed — only
variable names and descriptions belong here; actual values live in each
environment's secret store.

A root `.env.example` (with variable **names** only, no real values)
should be created and kept in sync with this file once the Node.js
project exists.

## TODO

- [ ] Database connection variables (host, port, name, user — never the
      password value itself in this doc)
- [ ] API server variables (port, base URL, CORS origins)
- [ ] Auth/session secret variable names
- [ ] LLM provider variable names (once chosen — see `project-state.md`
      Open Decisions)
- [ ] Integration credentials variable names (IGO ERP, GST/e-invoicing,
      WhatsApp, email, weighbridge, logistics — see `integrations.md`)
- [ ] Note: the legacy Go system's `.env.sample` files
      (`/.env.sample`, `plugins/grading/.env.sample`,
      `plugins/cutting/.env.sample`) document its variables separately
      and remain valid for that system.
