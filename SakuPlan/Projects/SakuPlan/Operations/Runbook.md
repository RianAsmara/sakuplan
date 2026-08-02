---
title: SakuPlan Runbook
project: SakuPlan
type: operations
status: active
tags:
  - project/sakuplan
  - operations/runbook
source: repository
last_synced: 2026-07-29
---

# Runbook

Condensed operational reference. See [[Local Development]] for full explanations.

## Start everything locally

```bash
cp .env.example .env
task bootstrap
task infra:up
task migrate:up
task run
```

## Health check

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz   # checks Postgres connectivity
```

## Run the full verification suite

```bash
task verify            # fmt:check, vet, test, test:race, build
task test:integration  # Testcontainers, requires Docker
task lint              # currently fails with 27 known findings — see [[Troubleshooting]]
govulncheck ./...
```

## Stop everything

```bash
task infra:down   # stops Postgres (and redis/mailpit if the platform profile was used)
```

## Graceful shutdown behavior

`SIGINT`/`SIGTERM` → Fiber stops accepting new connections and drains in-flight requests for up to `SHUTDOWN_TIMEOUT` (default 10s) → DB pool closes after HTTP has finished draining. See [[Dependency Injection]].

## Escalation / known gaps to be aware of on-call

No rate limiting, no admin RBAC, no metrics/tracing, no notification/background-job system exist yet — see [[Security Controls]] and [[Remaining Work]] before assuming operational tooling exists that doesn't.

## Related notes

- [[Local Development]]
- [[Troubleshooting]]
- [[Database Operations]]
- [[CI and Quality Gates]]
- [[SakuPlan]]
