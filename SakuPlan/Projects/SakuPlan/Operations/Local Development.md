---
title: SakuPlan Local Development
project: SakuPlan
type: operations
status: active
tags:
  - project/sakuplan
  - operations/local-dev
source: repository
last_synced: 2026-07-29
---

# Local Development

Source: `README.md`, `Taskfile.yml`, verified live in this repository during this synchronization session (see [[Troubleshooting]] for the port-conflict caveat hit during that verification).

## Quick start

```bash
cp .env.example .env
task bootstrap        # go mod tidy, creates .env if missing
task infra:up         # starts Postgres 17.10-alpine3.24 (compose.yaml)
task migrate:up       # applies db/migrations/00001_core.sql via Goose
task run              # go run ./cmd/api
```

Health check once running: `GET http://localhost:8080/healthz`, `/livez`, `/readyz`.

## Optional platform services

`task infra:up:platform` additionally starts Redis (`localhost:6379`) and Mailpit (SMTP `1025`, web UI `8025`) — "reserved for later worker and notification phases" per README. Nothing in the current codebase connects to either — see [[Background Jobs]].

## Verified working (this session)

`task bootstrap` → `task infra:up` → `task migrate:up` (reported "no migrations to run, current version: 1" — already applied from a prior session) → server launched via `go run ./cmd/api` → full golden path exercised over HTTP: register → login → `/v1/me` → create account (100000 minor units) → create category (`kind=expense`) → create expense transaction (25000) → balance correctly dropped to 75000. All verified against a live instance, not just code reading.

## Verification suite

```bash
task fmt:check
task vet
task test
task test:race
task test:integration   # requires Docker
task build
task lint
```
Or `task verify` for the standard local bundle (fmt/vet/test/race/build — **not** `test:integration` or `lint`, which are separate). See [[CI and Quality Gates]].

## Related notes

- [[Configuration]]
- [[Troubleshooting]]
- [[Database Operations]]
- [[CI and Quality Gates]]
- [[SakuPlan]]
