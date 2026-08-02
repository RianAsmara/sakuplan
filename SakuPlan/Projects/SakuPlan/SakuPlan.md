---
title: SakuPlan
project: SakuPlan
type: moc
status: active
tags:
  - project/sakuplan
  - moc
source: repository
last_synced: 2026-07-29
---

# SakuPlan

Indonesia-first personal budgeting platform. Answers one core question: **"How much money can I safely spend today without disturbing bills, savings commitments, and essential needs until my next payday?"** Three intended surfaces — React Native mobile, Next.js admin web, Go API/worker — of which **only the Go API is implemented**.

Source repository: `/data/Gawai Duniawi/SaaS/sakuplan` (not a git repository — no commit history available). Obsidian vault root: `/data/Gawai Duniawi/SaaS/sakuplan/SakuPlan`.

**Last synchronized: 2026-07-29.**

## Current implementation status

Backend core (Phases 0–6 of the [[Product Requirements|implementation plan]]) is implemented and was last verified passing `task verify`, `task test:integration`, and `govulncheck` on 2026-07-24 (`docs/PROGRESS.md`), plus re-verified live via `/healthz`/`/readyz` and a full register→transact→reverse HTTP flow during this synchronization session. `task lint` currently fails with 27 known findings (not fixed). See [[Implementation Status]] for the full requirement-by-requirement matrix and [[Completed Milestones]] / [[Remaining Work]] for what's done vs. outstanding.

## Technology stack

Go 1.26.x · Fiber v3.4 · PostgreSQL 17 · pgx v5 · Goose v3 migrations · Uber Fx (composition root only) · Argon2id · golang-jwt/jwt v5 · Testcontainers-go · OpenAPI 3.1.

## Architecture summary

Clean Architecture, modular monolith. Dependency direction: Transport (Fiber) → Application (use cases) → Domain/Ports ← Infrastructure adapters (Postgres, JWT, Argon2id, clock, IDs). See [[System Architecture]] for diagrams and [[Repository Structure]] for the package layout.

## Completed modules

Auth & sessions · user profile · financial accounts · categories · transaction ledger (income/expense/transfer/adjustment/reversal) · budgets (draft/activate) · recurring bills (monthly only) · savings goals & contributions · deterministic safe-to-spend · deterministic budget recommendations. Detail: [[Backend Modules]].

## Quality status

Test coverage `internal/...` total 33.5% (domain package is the standout gap at 18.8%) — see [[Test Coverage]]. Testing spans domain/application/HTTP/adapter unit tests plus one Testcontainers Postgres integration test — see [[Testing Strategy]]. CI runs lint + fmt/vet/test/race/integration/build/govulncheck on every push/PR touching the backend — see [[CI and Quality Gates]].

## Known risks

- `task lint` fails (27 findings, none fixed) — see [[Security Controls]].
- `internal/domain` has low direct test coverage (18.8%) relative to `internal/application` (66.5%).
- No rate limiting, no admin RBAC/authorization enforcement (the `role` JWT claim is issued but never checked), no metrics/tracing.
- OpenAPI spec and `BillService` agree with each other but both diverge from the domain enum and PRD on bill frequency support (monthly-only vs. weekly/monthly/yearly).
- Two non-identical phase-numbering schemes exist across `docs/PRD.md` and `docs/IMPLEMENTATION_PLAN.md` — see [[Implementation Status]].

## Remaining work

Dashboard/reports/export, notifications, admin/RBAC, AI explanation adapter, account deletion, several smaller gaps within "done" modules (bill payment, budget consumption, goal progress). Mobile and admin-web have not been started at all. Full list: [[Remaining Work]].

## Repository commands

```bash
task bootstrap   # go mod tidy, create .env
task infra:up    # start PostgreSQL
task migrate:up  # apply migrations
task run         # go run ./cmd/api
task verify      # fmt:check, vet, test, test:race, build
task test:integration
task lint
```

Full detail: [[Local Development]], [[Runbook]].

## Navigation

### Product
[[Product Requirements]] · [[MVP Scope]] · [[User Flows]]

### Engineering
[[System Architecture]] · [[Repository Structure]] · [[Backend Modules]] · [[Dependency Injection]] · [[Financial Ledger]] · [[Safe-to-Spend Engine]] · [[Budget Recommendation Engine]] · [[Authentication and Sessions]] · [[Authorization and Ownership]] · [[Background Jobs]] · [[Observability]]

### Data
[[Database Model]] · [[Migrations]] · [[Financial Invariants]]

### API
[[API Overview]] · [[Authentication API]] · [[Financial Accounts API]] · [[Transactions API]] · [[Budgets API]] · [[Bills API]] · [[Saving Goals API]] · [[Recommendations API]] · [[Reports API]] · [[Error Conventions]]

### Quality
[[Testing Strategy]] · [[Test Coverage]] · [[Security Controls]] · [[CI and Quality Gates]]

### Operations
[[Local Development]] · [[Configuration]] · [[Deployment]] · [[Database Operations]] · [[Troubleshooting]] · [[Runbook]]

### Decisions
[[Decision Log]] · [[ADR-001]] · [[ADR-002]] · [[ADR-003]] · [[ADR-004]] · [[ADR-005]] · [[ADR-006]] · [[ADR-007]] · [[ADR-008]] · [[ADR-009]] · [[ADR-010]] · [[ADR-011]] · [[ADR-012]]

### Progress
[[Implementation Status]] · [[Completed Milestones]] · [[Remaining Work]] · [[Changelog]]

### References
[[Glossary]] · [[Source Map]]
