---
title: SakuPlan Remaining Work
project: SakuPlan
type: progress
status: active
tags:
  - project/sakuplan
  - progress/remaining
source: repository
last_synced: 2026-07-29
---

# Remaining Work

## Backend (Phase 7–9 of `docs/IMPLEMENTATION_PLAN.md`)

- **Phase 7 — API completeness**: dashboard summary endpoint, cash-flow report, data export, notification preferences, OpenAPI client generation — see [[Reports API]].
- **Phase 8 — Admin**: RBAC/explicit permission model, admin user-management endpoints, default-category admin management, feature flags, sensitive-access workflow — see [[Security Controls]].
- **Phase 9 — Hardening**: OpenTelemetry tracing + Prometheus metrics, rate limiting, security tests, load tests for ledger/dashboard paths, backup/restore + reconciliation runbooks.

## Smaller, in-scope gaps within already-"implemented" areas

- `BillService.Create` only accepts `monthly` frequency — `weekly`/`yearly` exist in the domain enum and DB check constraint but are rejected by application validation (`BILL-002`).
- No "mark bill paid" use case (`BILL-004`/`BILL-005`).
- No budget consumption/summary, copy-prior-budget, or close-period endpoints (`BUD-005..007`).
- No goal progress-aggregation endpoint (`GOAL-003`).
- No "apply recommendation as draft budget" endpoint (`REC-006` computation exists, application step doesn't).
- No account-deletion workflow (`USER-004`).
- `golangci-lint` currently fails with 27 findings (13 test-only `bodyclose`, 12 `govet shadow`, 1 `gosec G115`, 1 `nilerr`) — none fixed as of the last recorded run.
- `internal/domain` package has only 18.8% test coverage — see [[Test Coverage]].

## Mobile (not started)

React Native + Expo + TypeScript app per PRD §5.1: registration/auth, onboarding, accounts/balances, transactions/transfers, budgets, recurring bills, savings goals, safe-to-spend, reports/notifications, AI-recommendation review, privacy/security controls. Zero mobile code exists in this repository.

## Admin web (not started)

Next.js App Router + TypeScript per PRD §5.2: admin auth/RBAC, user status management, default category management, feature flags, notification templates, operational metrics, AI request/failure metadata, failed background jobs, audit logs, controlled support tooling. Zero admin-web code exists in this repository. Depends on backend Phase 8 (admin/RBAC) being built first.

## Related notes

- [[Implementation Status]]
- [[Completed Milestones]]
- [[MVP Scope]]
- [[Security Controls]]
- [[SakuPlan]]
