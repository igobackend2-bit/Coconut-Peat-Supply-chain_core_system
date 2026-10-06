# Coco Pith Factory — Environment Configuration

Real secret values never belong in the repository — only variable **names**
and descriptions. Each environment keeps its values in its own secret store
(a gitignored `.env` locally, a Kubernetes Secret or CI secret elsewhere).
`scripts/check-secrets.sh` (CI + optional pre-commit hook) fails the build if
a credential-looking literal is committed.

## New system — `apps/api` (`apps/api/.env`, see `apps/api/.env.example`)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string (ADR-002). |
| `PORT` | no (3000) | HTTP port. Dev here uses 3001. |
| `CORS_ORIGINS` | prod: yes | Comma-separated browser origins allowed to call the API. Default is the local Vite dev server only; any other origin gets no CORS headers. |
| `TRUST_PROXY` | behind a proxy | Number of proxy hops in front of the API, so rate limiting keys on the real client IP. **Leave unset when not behind a proxy** — setting it wrongly lets a client spoof its IP and dodge the limiter. |
| `RATE_LIMIT` | no (600) | Requests per IP per minute across the whole API. |
| `AUTH_RATE_LIMIT` | no (10) | Requests per IP per minute to `login`, `register` and `change-password`. |
| `TEST_DB_ADMIN_URL` | tests only | Maintenance-database URL the integration suite uses to create/drop its own `*_test` databases. Defaults to the dev `DATABASE_URL` with the database name replaced by `postgres`. |

## New system — `apps/web` (`apps/web/.env.local`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the API (default `http://localhost:3000`). Not a secret — it is compiled into the public bundle. |

## Legacy Go system (repo root `.env`, see `/.env.example`)

Read by `docker-compose.yml`, `plugin.sh` and the Go services.

| Variable | Purpose |
|---|---|
| `MQTT_BROKER`, `MQTT_USERNAME`, `MQTT_PASSWORD` | MQTT broker for the core and grading services. In Kubernetes these come from the Secret `mqtt-credentials` (keys `broker`, `username`, `password`) — see the header of `kube-config/core-system.yaml`. |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | Used by `plugin.sh` to push plugin images. Use an access token, not an account password. |
| `BLOCKCHAIN_PRIVATE_KEY` | Hex private key of the sending account in `server/blockchain.go`. Use a dedicated account. |
| `DB_URL` | MongoDB connection for the plugins (see each `.env.sample`). |

CI (`.github/workflows/ci-cd.yml`) takes Docker Hub credentials from the
repository secrets `DOCKER_USERNAME` / `DOCKER_PASSWORD`; the image build step
sets placeholder values for the MQTT variables, which docker-compose requires
even for `build` but does not use.

## Not yet defined

LLM provider (ADR-008), IGO ERP integration (ADR-009), GST/e-invoicing,
WhatsApp, email and weighbridge credentials — add their variable names here
when those integrations are built.
