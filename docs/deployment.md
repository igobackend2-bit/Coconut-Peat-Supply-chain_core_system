# Coco Pith Factory — Deployment

**Status:** STUB — not yet written.

Must document the deployment story for the new Node.js/TypeScript system
(ADR-001). The legacy Go system's Docker Compose + K3s deployment
(`docker-compose.yml`, `kube-config/`, `core.dockerfile`, `plugin.sh`)
remains documented in the repo root `README.md` and `port.md` and is
**not** superseded by this file until the new system reaches functional
parity (see `project-state.md`).

## TODO

- [ ] Target infrastructure (VPS, managed platform, K8s/K3s continuation?)
- [ ] Containerization strategy for the new Node.js services
- [ ] Environment separation (dev / staging / production)
- [ ] Database migration/deploy sequencing
- [ ] Zero-downtime deploy strategy for API changes
- [ ] Rollback procedure
- [ ] Monitoring/alerting on deploy
- [ ] Relationship to the legacy Go deployment (parallel run? phased
      cutover? — needs an ADR when decided)
