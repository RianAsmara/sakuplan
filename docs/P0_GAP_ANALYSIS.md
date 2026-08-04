# P0 Gap Analysis

> **Status:** Baseline verification snapshot
> **Date:** 2026-07-24
> **Scope:** Compares the current `api` implementation against the P0 requirement set in `PRD.md` §6/§8. This is a read-only assessment produced while establishing a verified backend baseline; no new product phase was implemented as part of this pass.

## Method

Verified by running the full local toolchain (see `PROGRESS.md` for exact commands/results) plus a source-level, evidence-based read of `internal/domain`, `internal/application`, `internal/adapters/httpapi`, `internal/adapters/postgres`, `internal/bootstrap`, `db/migrations`, and `openapi/openapi.yaml`.

## Implemented (verified against code, not just docs)

- **AUTH-001..005**: registration, login, JWT access + rotating opaque refresh tokens, reuse-family revocation, logout/logout-all. Argon2id hashing.
- **USER-001..003**: profile fields, payday handling, status enum (`active`, `suspended`, `deletion_pending`, `deleted`) exists in domain and schema.
- **ACC-001..005, CAT-001..004**: account CRUD/archive, ledger-derived balances, default/custom categories.
- **TXN-001..010**: income/expense/transfer/adjustment, idempotency keys with payload-hash conflict detection, immutable reversal, atomic transfers.
- **BUD-001..007, BILL-001..005, GOAL-001..004**: budget periods/allocations/activation validation, recurring bills, savings goals and idempotent contributions.
- **STS-001..007, REC-001..007 (deterministic part)**: safe-to-spend engine and conservative/balanced/flexible recommendation modes are present and unit-tested. (REC-007's AI explanation adapter is not — see below.)
- Audit logging plumbing: `audit_logs` table (`db/migrations/00001_core.sql`) and `Store.AppendAudit`, called from auth and user-status mutations.
- Structured JSON logging (`slog`) with request-ID propagation.

## Absent or partial (P0 gaps)

| Area | Status | Evidence | Missing |
|---|---|---|---|
| **AUTH-006** Admin auth | Absent | Roles are a JWT claim only (`internal/adapters/security/token.go`); the `role` local set in `server.go` is never read by any middleware. | No admin login policy, no role/permission enforcement middleware, no MFA. |
| **USER-004** Account deletion | Absent | `UserStatusDeletionPending` enum exists in domain/schema; no service method, handler, or route ever sets or drives it. | Deletion request endpoint, async execution job, audit trail for deletion. |
| **RPT-001..004** Dashboard & reports | Absent | No `dashboard`/`report`/`cashflow`/`export` code anywhere in `internal/`; no corresponding OpenAPI paths. | Dashboard summary endpoint, cash-flow report, data export. |
| **NOTIF-001..004** Notifications | Absent | No notification tables, no notification code, no `cmd/worker`, no queue/Redis dependency. | Preferences model, scheduled delivery, background job runner, retry/dead-letter visibility. |
| **ADM-001..006** Admin/RBAC | Partial | No `/admin/*` routes exist at all; no `permissions`/`role_permissions`/feature-flag tables in migrations. Audit log storage is the one piece that is real. | Explicit permission model, admin user-management endpoints, feature flags, sensitive-access workflow. |
| **AI-001..006** AI guardrails | Absent | Only an `ai_consent` boolean field and a `BudgetAIAssisted` enum value exist; no adapter, no explanation call path. | Entire AI explanation adapter (this is fine per REC-007/AI-005 — deterministic engine must work without it, which it does). |
| **SEC-005** Rate limiting | Absent | No limiter middleware, no 429 handling anywhere in `internal/` or `go.mod`. | Rate limiting on auth, refresh, export, and sensitive admin endpoints. |
| **NFR-005** Observability | Partial | JSON logs + request ID present. OpenTelemetry packages are only transitive (`// indirect` in `go.mod`), not imported/used. No Prometheus metrics. | Traces, metrics (request rate/latency/error rate/DB pool/refresh-reuse/job retry/recommendation failure). |
| **SEC-006/007 AI data minimization** | N/A | No AI integration exists yet to violate or satisfy this; revisit once REC-007/AI adapter is built. | — |

## Test coverage snapshot

`task coverage` (package-level, `internal/...`):

| Package | Coverage |
|---|---|
| `adapters/httpapi` | 40.4% |
| `adapters/postgres` | 0.0% (covered instead by `tests/integration`, tagged `integration`) |
| `adapters/security` | 79.3% |
| `adapters/system` | 84.2% |
| `application` | 66.5% |
| `bootstrap` | 0.0% (composition root, expected) |
| `config` | 81.2% |
| `domain` | 18.8% |
| `testkit` | 0.0% (test helpers, expected) |
| **Total (`internal/...`)** | **33.5%** |

`domain` at 18.8% is the standout gap — most business-rule branch coverage currently lives in `application` tests exercising domain indirectly rather than direct domain unit tests. Worth dedicated attention before the next feature phase, per PRD §20 Definition of Done ("unit tests cover business branches").

## Lint findings (non-blocking for this baseline, documented for follow-up)

`golangci-lint v2.12.0` (project's `.golangci.yml` targets v2; a locally available v1.64.8 binary could not read the config and was upgraded) surfaced 27 issues, none touched during this baseline pass since they sit in core financial application code and fixing them is out of scope for a verification-only task:

- 13× `bodyclose` — unclosed HTTP response bodies in `internal/adapters/httpapi/server_test.go` (test-only, no production risk).
- 12× `govet shadow` — shadowed `err` in `internal/application/auth.go`, `transactions.go`, `bills_goals.go`. Each instance appears to be intentional idiomatic `if err := ...; err != nil` nesting rather than a masked-error bug, but should be reviewed deliberately rather than bulk-fixed.
- 1× `gosec G115` — `int` → `uint32` conversion in `internal/adapters/security/password.go:69` (`uint32(len(expected))`); len() of a fixed-size hash output, low real-world risk, but worth an explicit `#nosec` justification or bounds check.
- 1× `nilerr` — `internal/application/auth.go` `Logout`: returns `nil` when the session lookup fails. Read as intentional (idempotent logout, avoids leaking token validity), not a defect, but not lint-suppressed.

## Recommendation

The identity/accounts/ledger/budget/bills/goals/planning core (Phases 0–6 of `IMPLEMENTATION_PLAN.md`) is solid and now compiles, vets, and passes unit, race, and Testcontainers-backed integration tests on the pinned toolchain. The clearest next-phase candidates, in PRD priority order, are Phase 7 (dashboard/reports/exports/notification preferences) and Phase 8 (admin RBAC), both currently P0 and entirely unimplemented. No implementation was started for these in this session, per instructions.
