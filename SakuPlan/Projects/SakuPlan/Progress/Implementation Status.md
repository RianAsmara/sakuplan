---
title: SakuPlan Implementation Status
project: SakuPlan
type: progress
status: active
tags:
  - project/sakuplan
  - progress/status
source: repository
last_synced: 2026-08-04
---

# Implementation Status

Requirement-by-requirement status, derived from source code, tests, migrations, and OpenAPI — not solely from `docs/PROGRESS.md`'s narrative claims. Full per-requirement tables live in [[Product Requirements]]; this note is the roll-up plus the evidence trail.

## Method note

`docs/P0_GAP_ANALYSIS.md` (dated 2026-07-24) already performed a source-level verification pass and is the primary evidence source here, cross-checked against the domain/application/adapters research done for this synchronization. Its own caveat, preserved: the gap analysis was produced by the same kind of automated pass that's producing this documentation, not an independent human audit — treat "implemented" claims as strong evidence, not absolute proof, and re-verify anything load-bearing with `task test:integration` before relying on it operationally.

## Documented discrepancy: two phase-numbering schemes

`docs/PRD.md` §19 and `docs/IMPLEMENTATION_PLAN.md` both define 10 phases (0–9) but split Phase 6/7 differently: the PRD separates "Safe-to-spend and reports" (6) from "Recommendations" (7), while the Implementation Plan groups safe-to-spend + recommendations together under "Planning" (6) and calls Phase 7 "API completeness" (dashboard/reports/exports). **`IMPLEMENTATION_PLAN.md` is the more authoritative source** for requirement-ID-to-phase mapping since it's the only one of the two with explicit ID ranges per phase.

## Status by area

| Area | Status | Evidence |
|---|---|---|
| Auth & sessions (`AUTH-001..005`) | ✅ Implemented | [[Authentication and Sessions]], `auth_test.go`, `server_test.go` |
| Admin auth (`AUTH-006`) | ⛔ Not implemented | `role` claim unused by any middleware — [[Authorization and Ownership]] |
| User profile (`USER-001..003`) | ✅ Implemented | [[Backend Modules#User]], `users_test.go` |
| Account deletion (`USER-004`) | ⛔ Not implemented | Enum exists, no service/handler/route |
| Accounts (`ACC-001..005`) | ✅ Implemented | [[Financial Accounts API]] |
| Categories (`CAT-001..003`) | ✅ Implemented | [[Financial Accounts API]] |
| Admin category mgmt (`CAT-004`) | ⛔ Not implemented | No admin surface exists |
| Ledger (`TXN-001..010`) | ✅ Implemented (TXN-009 filters partial) | [[Financial Ledger]], `transactions_test.go`, `TestPostgresLedgerAndBudgetConstraints` |
| Budgets (`BUD-001..004`) | ✅ Implemented | [[Backend Modules#Budgets]], `budget_planning_test.go` |
| Budget consumption/copy/close (`BUD-005..007`) | 🚧 Not implemented | No summary/copy/close endpoint found |
| Bills definition (`BILL-001`, `BILL-003`) | ✅ Implemented | [[Bills API]] |
| Bill frequency (`BILL-002`) | 🚧 Partial | Monthly-only in `BillService.Create`, despite weekly/yearly enum values |
| Bill payment (`BILL-004..005`) | ⛔ Not implemented | No "mark paid" use case |
| Goals (`GOAL-001..002`) | ✅ Implemented | [[Saving Goals API]], `goals_test.go` |
| Goal progress (`GOAL-003..004`) | 🚧 Partial | No dedicated progress-aggregation endpoint |
| Safe-to-spend (`STS-001..007`) | ✅ Implemented | [[Safe-to-Spend Engine]], `budget_planning_test.go` |
| Recommendations, deterministic (`REC-001..006`) | ✅ Implemented | [[Budget Recommendation Engine]] — **note**: REC-006 "apply as draft budget" is not wired to an endpoint, only the computation itself is done |
| AI explanation (`REC-007`) | ⛔ Not implemented | No AI adapter code anywhere |
| Reports (`RPT-001..004`) | ✅ Implemented (2026-08-02) | Dashboard, cash-flow report, synchronous export — `internal/application/reporting.go`, 12 unit tests + Postgres integration tests — [[Reports API]] |
| Notifications (`NOTIF-001..004`) | ⛔ Not implemented | No notification tables, no worker — [[Background Jobs]] |
| Mobile auth flow | ✅ Implemented (2026-08-04, branch `worktree-mobile-scaffold-auth`, not merged to `main`) | Register/Login/Home/Logout against the real API; Expo Router auth gate, Zustand store, `expo-secure-store`, 401 refresh interceptor — see [[Changelog]] and [[Completed Milestones]] |
| Mobile — everything else in PRD §5.1 | ⛔ Not implemented | Onboarding, accounts/balances, transactions, budgets, bills, goals, safe-to-spend, reports, notifications, AI review, privacy controls — no screens exist beyond auth |
| Admin/RBAC (`ADM-001..006`) | ⛔ Not implemented (audit storage only) | No `/admin/*` routes; `audit_logs` table + partial `AppendAudit` usage exists |
| AI guardrails (`AI-001..006`) | ⛔ N/A | Nothing to guard yet — no AI integration exists |
| Rate limiting (`SEC-005`) | ⛔ Not implemented | No limiter middleware — [[Security Controls]] |
| Observability (`NFR-005`) | 🚧 Partial | Logs + request ID only, no metrics/tracing — [[Observability]] |

## Audit logging — more nuanced than "implemented"

`docs/P0_GAP_ANALYSIS.md` calls audit-log **plumbing** complete (`audit_logs` table + `Store.AppendAudit`, called from `AuthService.Register`/`Login` and `UserService.Update`). `ADM-006`'s full requirement (actor type/ID, action, target type/ID, timestamp, request ID, source IP, reason, before/after metadata with sensitive-field filtering, result) is a much larger surface than "called from two services" covers — treat this as **plumbing implemented, full-field coverage and full-surface adoption not verified**.

## Go toolchain version note

`docs/PROGRESS.md`'s "verified" entry records `go1.26.4` as the toolchain actually used, while README.md/PRD.md state the baseline as Go `1.26.5` and CI (`backend.yml`) pins `1.26.5` via `actions/setup-go@v6`. A minor, likely inconsequential inconsistency, preserved here rather than silently reconciled.

## Related notes

- [[Product Requirements]]
- [[Completed Milestones]]
- [[Remaining Work]]
- [[Test Coverage]]
- [[SakuPlan]]
