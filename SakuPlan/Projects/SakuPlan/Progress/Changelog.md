---
title: SakuPlan Changelog
project: SakuPlan
type: progress
status: active
tags:
  - project/sakuplan
  - progress/changelog
source: repository
last_synced: 2026-08-04
---

# Changelog

Derived from `docs/PROGRESS.md` and, from 2026-08-04 onward, directly from `git log` (the repo is now a real git repository with a remote — `git@github.com:RianAsmara/sakuplan.git` — superseding the earlier "no `.git` history" note). Chronological, oldest first.

## 2026-07-24 — Claude-ready PRD and core backend

Initial scaffold: full PRD with stable requirement IDs, architecture/security/API-convention docs, incremental implementation plan. Core backend delivered: Fiber v3 HTTP adapter with request IDs and centralized error mapping; constructor-based DI with Fx at the composition root; PostgreSQL pool, repository adapters, transactional unit of work, initial Goose migration; Argon2id hashing; strict JWT validation; opaque rotating refresh tokens with reuse detection and family revocation; accounts, categories, ledger (income/expense/transfer/adjustment/reversal), idempotency; budgets with allocation/overlap validation; recurring bills; savings goals; safe-to-spend; deterministic recommendations; OpenAPI 3.1 contract. Quality tooling: unit/handler/integration tests, race/coverage/lint/vulnerability tooling, Dockerfile/Compose/Taskfile/CI.

Verification in that pass was environment-limited: only Go 1.23.2 was available (no Docker, no external module downloads), so only standard-library-only domain/application/config/system tests were actually executed at that time.

## 2026-07-24 — Verified backend baseline

Full toolchain verification on Go `1.26.4` (note: baseline elsewhere is stated as `1.26.5` — see [[Implementation Status]]) with Docker available. `task bootstrap`/`infra:up`/`migrate:up` passed. `task verify` initially **failed** on `go vet` (`fiber.Config.DisableStartupMessage` moved to `fiber.ListenConfig` in the pinned `fiber/v3 v3.4.0` — a genuine source/API mismatch, not an environment issue) — fixed by relocating the field and adding the Fiber import to the composition root (`internal/bootstrap/app.go`), then passed. `task test:integration` passed against real PostgreSQL via Testcontainers (9.54s). `task lint` **failed** with 27 pre-existing findings, none fixed in that pass. `govulncheck` passed (0 reachable vulnerabilities). Coverage generated: 33.5% overall `internal/...`, with `internal/domain` flagged as the standout gap at 18.8%. Produced `docs/P0_GAP_ANALYSIS.md`, a source-level verified snapshot of what's implemented vs. absent against the P0 requirement set.

## 2026-07-29 — Backend run verified live; Obsidian knowledge base synchronized

Live `/run` verification in this conversation (two separate passes): started Postgres via `task infra:up`, launched the API (port overridden to `8081` locally due to an unrelated container already bound to `8080` on this machine — no code change), confirmed `/healthz` and `/readyz` both return 200, then drove the full golden path over HTTP — register → login → `/v1/me` → create account → create category → create expense transaction → reversed balance check — all matching expected ledger arithmetic exactly. This documentation synchronization pass (`Projects/SakuPlan` in the Obsidian vault) was performed the same day, based on direct source inspection across docs, domain, application, adapters, migrations, OpenAPI, tests, and CI — not solely on `docs/PROGRESS.md`'s claims.

## 2026-08-02 — Phase 7a: dashboard, cash-flow report, export (`RPT-001..004`)

Reporting half of Phase 7 shipped on `main` (commit `0e7615f`, the repository's single squashed initial commit, covers Phases 0–7a): `ReportingService` composing the existing `PlanningService.SafeToSpend` and `TransactionRepository.SpentByCategory` rather than reimplementing ledger math; three new endpoints (`GET /v1/dashboard`, `GET /v1/reports/cash-flow`, `POST /v1/exports`); export is synchronous by design (no job table/worker — deferred to the NOTIF-004 background-job phase); 12 new application unit tests plus Postgres integration tests for `CashFlowTotals`/`CashFlowTrend`/`ListBudgets`/`NextDueBill`. `task verify`/`task lint`/`govulncheck` all passed; no new migration needed (existing `financial_transactions_user_time_idx` already served the new range-scan queries). Phase 7's notification half (`NOTIF-001..004`), Phase 8 (admin RBAC), and Phase 9 (hardening) remain unimplemented.

## 2026-08-04 — Mobile app: Expo scaffold + full authentication flow

First mobile code in the repository, built on a dedicated branch (`worktree-mobile-scaffold-auth`, 18 commits ahead of `main` as of this entry — **not yet merged**). Scope: project scaffold through a complete, working Register → Login → Home → Logout flow against the real Go API, executed via `superpowers:subagent-driven-development` (fresh implementer + independent reviewer per task, fix loops for anything findings surfaced).

- **Backend prerequisite**: `AUTH-001` gained `accepted_terms_version`/`accepted_privacy_version` capture at registration (migration `00002_users_registration_consent.sql`), a gap found by re-reading the PRD against the actual implementation before building the mobile Register screen against it.
- **Stack**: Expo Router, a custom Tamagui theme (see [[SakuPlan]] for the "pocket card" visual language), `openapi-typescript`-generated types consumed via `openapi-fetch`, Zustand for local auth state, TanStack Query for server state, `expo-secure-store` for the refresh token (never `AsyncStorage`, per `AUTH-005`). All screen copy is hardcoded Bahasa Indonesia — a mid-build spec revision dropped the originally-planned `react-i18next` scaffolding as premature for a 3-screen pass with only one bundled locale.
- **Real bugs caught by review, not just brief transcription**: (1) the 401 refresh-and-retry interceptor's retry logic threw on every authenticated POST/PUT/PATCH/DELETE because it rebuilt the request from an already-consumed body — fixed with a `WeakMap`-captured clone taken before the original fetch, plus new tests proving a body-bearing retry actually works; (2) cold-start session hydration had no error handling, so a thrown exception (e.g. no network) left the user stuck on the loading spinner forever — fixed with a try/catch that stops hydrating without clearing a possibly-still-valid stored token; (3) `@tamagui/lucide-icons` resolved to a deprecated timestamp-suffixed canary release carrying its own divergent nested `@tamagui/core` instance — replaced with the real successor package `@tamagui/lucide-icons-2`, after directly verifying against npm registry metadata (matching maintainer, official repo, an npm-level deprecation notice on the original naming the replacement) that an automated scanner's typosquat flag on the replacement was a false positive.
- **Verification status**: `npm test` 11/11 passing, `npx tsc --noEmit` zero errors project-wide, `npx expo lint` zero warnings/errors (ESLint configured for the first time in this pass). The interactive simulator+backend walkthrough (register → home → logout → relaunch → re-login, plus each screen's visual check) has **not** been performed by any agent — it requires a human with a device/simulator and is the one remaining gate before this branch is considered fully done.

## Related notes

- [[Completed Milestones]]
- [[Implementation Status]]
- [[Remaining Work]]
- [[SakuPlan]]
