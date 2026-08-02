---
title: SakuPlan Background Jobs
project: SakuPlan
type: engineering
status: planned
tags:
  - project/sakuplan
  - engineering/jobs
source: repository
last_synced: 2026-07-29
---

# Background Jobs

**Status: planned, not implemented.** There is no `cmd/worker`, no queue adapter, and no job-processing code anywhere in `internal/`. This note exists to record the documented intent so future work has a fixed reference point.

## What's documented

- `docs/ARCHITECTURE.md` §11 ("Future worker"): notification scheduling and exports will run in a separate `cmd/worker` process, sharing `internal/application` packages but using dedicated queue adapters; jobs must be idempotent and observable.
- `compose.yaml` already provisions **Redis** (`redis:8.6.4-alpine3.23`) under the `platform` Docker Compose profile (`task infra:up:platform`), alongside **Mailpit** (`axllent/mailpit:v1.30.5`, SMTP `1025`/web UI `8025`) as a local dev email sink. Neither is started by default (`task infra:up` only starts Postgres).
- PRD `NOTIF-004` requires: retry policy, dead-letter/failed-job visibility, traceable job ID, structured error metadata, admin retry capability with audit log — none of this exists in code.

## What's confirmed absent

No Redis client dependency in `go.mod` (Redis packages are provisioned in infra only). No `notification_preferences`, `feature_flags`, or job-tracking tables in `db/migrations/00001_core.sql`. No `BillService` "mark paid" use case that a notification job could hook into.

## Related notes

- [[System Architecture]]
- [[Remaining Work]]
- [[Local Development]]
- [[SakuPlan]]
