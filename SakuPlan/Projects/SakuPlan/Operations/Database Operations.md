---
title: SakuPlan Database Operations
project: SakuPlan
type: operations
status: active
tags:
  - project/sakuplan
  - operations/database
source: repository
last_synced: 2026-07-29
---

# Database Operations

Source: `Taskfile.yml`, `compose.yaml`, verified live during this session.

## Local instance

`task infra:up` starts `postgres:17.10-alpine3.24` (compose service `postgres`), exposing `5432:5432`, with `pg_isready` healthcheck (5s interval, 10 retries). Credentials/database name are fixed in `compose.yaml` for local dev only (`sakuplan`/`sakuplan`/`sakuplan`) — not a production secret, but still excluded from being repeated verbatim in any note that might be shared externally.

## Migrations

`task migrate:up` / `task migrate:down` via Goose — see [[Migrations]] for full detail. **Never edit a released migration; add a new numbered one.**

## Connection pooling

`internal/adapters/postgres/pool.go`: `pgxpool` with `MaxConns` from `DB_MAX_CONNS` (default 10), `MinConns=1`, `MaxConnLifetime=30m`, `MaxConnIdleTime=5m`, `HealthCheckPeriod=30s`. Fails fast at startup — pings with a 5s timeout and closes the pool immediately if unreachable.

## Backup/restore

Not documented and not implemented — `docs/IMPLEMENTATION_PLAN.md` Phase 9 (Hardening) mentions "backup/restore and reconciliation runbooks" as future work; none exist yet.

## Related notes

- [[Migrations]]
- [[Database Model]]
- [[Local Development]]
- [[SakuPlan]]
