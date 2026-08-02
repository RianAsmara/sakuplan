# Backend Implementation Plan

## Phase 0 — Foundation

- Go 1.26 module.
- Fiber v3 application.
- Uber Fx composition root.
- Configuration validation.
- PostgreSQL pool and Goose migrations.
- Structured logging.
- Health endpoints.
- CI, lint, unit tests, integration-test target.

## Phase 1 — Identity

Requirements: AUTH-001 through AUTH-004, USER-001.

- Register, login, refresh, logout, logout-all, current user.
- Argon2id and rotating opaque refresh tokens.
- Unit tests for invalid credentials, suspended users, rotation, reuse, and revocation.
- Handler tests for status and error mapping.
- Repository integration tests for uniqueness and token-family behavior.

## Phase 2 — Accounts and categories

Requirements: ACC-001 through ACC-005, CAT-001 through CAT-004.

- Account CRUD/archive and balance query.
- Default and custom categories.
- Ownership and duplicate-name tests.

## Phase 3 — Ledger

Requirements: TXN-001 through TXN-010.

- Income, expense, transfer, adjustment.
- Hybrid entries model.
- Idempotency records.
- Reversal path.
- Cursor lists and balance aggregates.
- Atomic transfer and duplicate-request integration tests.

## Phase 4 — Budgets

Requirements: BUD-001 through BUD-007.

- Draft, activation, allocation replacement, summary.
- Overlap and over-allocation validation.

## Phase 5 — Bills and goals

Requirements: BILL-001 through BILL-005, GOAL-001 through GOAL-004.

- Recurring bill definitions and payment linkage.
- Goal contributions and progress.

## Phase 6 — Planning

Requirements: STS-001 through STS-007, REC-001 through REC-006.

- Safe-to-spend breakdown.
- Deterministic recommendation modes and reason codes.

## Phase 7 — API completeness

- Dashboard and report queries.
- Export request.
- Notification preferences.
- OpenAPI client generation.

## Phase 8 — Admin

- RBAC and explicit permission checks.
- User status, default categories, flags, jobs, audit.
- Controlled sensitive-access workflow.

## Phase 9 — Hardening

- OpenTelemetry and metrics.
- Rate limiting.
- Security tests.
- Load tests for ledger and dashboard paths.
- Backup/restore and reconciliation runbooks.

## Current scaffold status

The supplied backend implements a functional core for identity, accounts, categories, ledger, budgets, bills, goals, safe-to-spend, and deterministic recommendations. It includes unit tests and integration-test templates. Immutable reversal is included in the supplied ledger core; replacement workflows remain a later product increment.

Phase 7's reporting half (dashboard, cash-flow report, export — RPT-001..004) is complete as of 2026-08-02; see `docs/PROGRESS.md`. Export is synchronous by design, deferring real background-job infrastructure to the notifications phase. Phase 7's notification half (NOTIF-001..004), Phase 8 (admin RBAC), and Phase 9 (hardening/observability) remain unimplemented subsequent increments.
