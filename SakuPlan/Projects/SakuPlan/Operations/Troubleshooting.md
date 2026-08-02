---
title: SakuPlan Troubleshooting
project: SakuPlan
type: operations
status: active
tags:
  - project/sakuplan
  - operations/troubleshooting
source: repository
last_synced: 2026-07-29
---

# Troubleshooting

Practical issues actually encountered while running this repository, plus documented known-issues from the repo itself.

## Port 8080 already in use (environment-specific, not a repo bug)

On the machine used for this synchronization, host port `8080` was already bound by an unrelated Docker container (`kerjain-backend`, a different project). `HTTP_ADDRESS` is read directly from `os.Getenv` in `internal/config/config.go`, so it can be overridden per-launch without editing `.env`:

```bash
cd services/api
set -a && source ../../.env && set +a
export HTTP_ADDRESS=":8081"
go run ./cmd/api
```

## `go vet` fails on `DisableStartupMessage`

If you see `unknown field DisableStartupMessage in struct literal of type fiber.Config` — this was already fixed in the current source (moved to `fiber.ListenConfig` for `fiber/v3 v3.4.0`). If it reappears, check whether the Fiber dependency version has drifted from the pinned `v3.4.0`. See [[Dependency Injection]].

## `task lint` fails with 27 findings

This is a known, currently-unaddressed state as of `docs/PROGRESS.md` (2026-07-24) — 13 test-only `bodyclose`, 12 `govet shadow` (believed intentional), 1 `gosec G115`, 1 `nilerr` (believed intentional). Not a sign of a broken environment. See [[Security Controls]].

## Request field-name mismatches (discovered via live testing, not a bug — just non-obvious)

- `POST /v1/accounts` expects `initial_balance`, not `opening_balance`.
- `POST /v1/categories` expects `kind` (`income`/`expense`), not `type`.

## Related notes

- [[Local Development]]
- [[CI and Quality Gates]]
- [[Runbook]]
- [[SakuPlan]]
