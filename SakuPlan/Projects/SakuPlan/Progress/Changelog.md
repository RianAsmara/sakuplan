---
title: SakuPlan Changelog
project: SakuPlan
type: progress
status: active
tags:
  - project/sakuplan
  - progress/changelog
source: repository
last_synced: 2026-07-29
---

# Changelog

Derived from `docs/PROGRESS.md` (the repository has no `.git` history to draw from — confirmed no `.git` directory exists anywhere in the repo). Chronological, oldest first.

## 2026-07-24 — Claude-ready PRD and core backend

Initial scaffold: full PRD with stable requirement IDs, architecture/security/API-convention docs, incremental implementation plan. Core backend delivered: Fiber v3 HTTP adapter with request IDs and centralized error mapping; constructor-based DI with Fx at the composition root; PostgreSQL pool, repository adapters, transactional unit of work, initial Goose migration; Argon2id hashing; strict JWT validation; opaque rotating refresh tokens with reuse detection and family revocation; accounts, categories, ledger (income/expense/transfer/adjustment/reversal), idempotency; budgets with allocation/overlap validation; recurring bills; savings goals; safe-to-spend; deterministic recommendations; OpenAPI 3.1 contract. Quality tooling: unit/handler/integration tests, race/coverage/lint/vulnerability tooling, Dockerfile/Compose/Taskfile/CI.

Verification in that pass was environment-limited: only Go 1.23.2 was available (no Docker, no external module downloads), so only standard-library-only domain/application/config/system tests were actually executed at that time.

## 2026-07-24 — Verified backend baseline

Full toolchain verification on Go `1.26.4` (note: baseline elsewhere is stated as `1.26.5` — see [[Implementation Status]]) with Docker available. `task bootstrap`/`infra:up`/`migrate:up` passed. `task verify` initially **failed** on `go vet` (`fiber.Config.DisableStartupMessage` moved to `fiber.ListenConfig` in the pinned `fiber/v3 v3.4.0` — a genuine source/API mismatch, not an environment issue) — fixed by relocating the field and adding the Fiber import to the composition root (`internal/bootstrap/app.go`), then passed. `task test:integration` passed against real PostgreSQL via Testcontainers (9.54s). `task lint` **failed** with 27 pre-existing findings, none fixed in that pass. `govulncheck` passed (0 reachable vulnerabilities). Coverage generated: 33.5% overall `internal/...`, with `internal/domain` flagged as the standout gap at 18.8%. Produced `docs/P0_GAP_ANALYSIS.md`, a source-level verified snapshot of what's implemented vs. absent against the P0 requirement set.

## 2026-07-29 — Backend run verified live; Obsidian knowledge base synchronized

Live `/run` verification in this conversation (two separate passes): started Postgres via `task infra:up`, launched the API (port overridden to `8081` locally due to an unrelated container already bound to `8080` on this machine — no code change), confirmed `/healthz` and `/readyz` both return 200, then drove the full golden path over HTTP — register → login → `/v1/me` → create account → create category → create expense transaction → reversed balance check — all matching expected ledger arithmetic exactly. This documentation synchronization pass (`Projects/SakuPlan` in the Obsidian vault) was performed the same day, based on direct source inspection across docs, domain, application, adapters, migrations, OpenAPI, tests, and CI — not solely on `docs/PROGRESS.md`'s claims.

## Related notes

- [[Completed Milestones]]
- [[Implementation Status]]
- [[SakuPlan]]
