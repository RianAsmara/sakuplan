# Progress

## 2026-08-02 — AUTH-001: registration terms/privacy consent fields

### Requirement IDs implemented

AUTH-001 (registration must capture accepted terms/privacy versions). This
was a gap left over from the original Phase 0 identity implementation: the
PRD required it, but the field never made it into `RegisterInput`, `User`,
or the schema. Backend-only prerequisite for a later, separate mobile
Register screen task, which will send fixed version-string constants.

### Files changed

- `internal/domain/entities.go`: added `User.AcceptedTermsVersion`,
  `User.AcceptedPrivacyVersion` (immutable after registration — not touched
  by `UpdateUserProfile`, not part of `userResponse`/OpenAPI `User` schema).
- `internal/application/auth.go`: `RegisterInput` gains
  `AcceptedTermsVersion`, `AcceptedPrivacyVersion`; `Register` trims and
  validates both as required, max 32 characters, returning a
  `domain.ValidationError` (field `consent`) when missing/oversized; both
  are persisted onto the created `domain.User`.
- `internal/application/auth_test.go`: updated
  `TestRegisterCreatesUserAndTokens` to assert the two fields round-trip
  through the fake repository; updated
  `TestRefreshRotatesSessionAndRejectsReuse`'s register call; added
  `TestRegisterRejectsMissingConsent`.
- `internal/adapters/postgres/store.go`: `CreateUser`, `scanUser` (used by
  both `GetUserByID` and `GetUserByEmail`) read/write the two new columns.
- `internal/adapters/httpapi/auth_handlers.go`: `registerRequest` gains
  `accepted_terms_version`/`accepted_privacy_version` JSON fields, passed
  through to `application.RegisterInput`.
- `internal/adapters/httpapi/server_test.go`,
  `internal/adapters/httpapi/reporting_handlers_test.go`: the four
  HTTP-level register call sites now send both consent fields (previously
  501/422'd once the field became required).
- `tests/integration/postgres_test.go`: `startPostgres` previously
  hand-parsed only `db/migrations/00001_core.sql` as the Testcontainers init
  script, hardcoding a single migration file by name. With migration
  `00002` adding a `NOT NULL` column, this would have silently skipped it
  and broken every integration test (`column accepted_terms_version does
  not exist`). Changed it to read and concatenate the `-- +goose Up`
  section of every `*.sql` file in `db/migrations`, sorted by filename, so
  future migrations are picked up automatically. Also updated `createUser`
  to supply both consent fields (now `NOT NULL` in the real schema).
- `openapi/openapi.yaml`: `RegisterRequest` gains `accepted_terms_version`,
  `accepted_privacy_version` as required string properties (1–32 chars).

### Database migrations

- `db/migrations/00002_users_registration_consent.sql`: adds
  `accepted_terms_version` and `accepted_privacy_version` (`text NOT NULL`)
  to `users`. Uses a temporary `DEFAULT ''` during `ADD COLUMN` (dropped
  immediately after) purely to satisfy `NOT NULL` against a table that
  already has rows in dev databases; new rows must supply a real value
  going forward since application-layer validation requires it.

### Commands run and results

1. `go test ./internal/application/... -run 'TestRegister'` (pre-implementation,
   RED) → compile failure: `RegisterInput` had no `AcceptedTermsVersion`/
   `AcceptedPrivacyVersion` fields, as expected before Step 3.
2. `go test ./internal/application/... -run 'TestRegister|TestRefresh' -v`
   (post-implementation, GREEN) → PASS
   (`TestRegisterCreatesUserAndTokens`, `TestRegisterRejectsMissingConsent`,
   `TestRefreshRotatesSessionAndRejectsReuse`, 3/3).
3. `task migrate:up` → applied `00002_users_registration_consent.sql`
   (`goose: successfully migrated database to version: 2`). This sandbox
   cannot route from the host network namespace to the Compose Postgres
   container's bridge IP (a pre-existing sandbox limitation, also noted in
   the 2026-08-02 Phase 7a entry below for the fixed 5432 port); worked
   around by running `goose` inside a short-lived container attached to the
   same Compose network (`docker run --network
   mobile-scaffold-auth_default ...`, connecting to the `postgres` service
   by container DNS name instead of `localhost`), with the host's Go module
   cache bind-mounted in so no network egress was needed for the build.
   Verified with `psql \d users` that both columns exist as `NOT NULL`.
4. `go test ./...` → PASS, all packages.
5. `go test -race ./internal/...` → PASS, all packages.
6. `task verify` (fmt:check, vet, test, test:race, build) → PASS.
7. `task lint` (`golangci-lint run ./...`) → 35 findings, same counts and
   categories as the pre-change baseline (`bodyclose: 21, gosec: 1,
   govet: 12, nilerr: 1`), confirmed by running lint against `git stash`'d
   (pre-change) code and diffing the finding counts — no new finding or new
   category introduced by this change.
8. `govulncheck ./...` → PASS. 0 vulnerabilities in code or called
   dependencies.
9. `task test:integration` (`go test -tags=integration -count=1
   ./tests/integration/...`) → PASS, both
   `TestPostgresLedgerAndBudgetConstraints` and
   `TestPostgresReportingQueries`, against real Testcontainers-launched
   Postgres with both migrations applied.

### Deferred / not verified

- No manual `task run` end-to-end smoke test, for the same sandbox
  networking reason recorded in the Phase 7a entry below (fixed-port
  Postgres unreachable from the host network namespace). Confidence rests
  on the application unit tests (fake repository), and the Postgres
  integration tests (real schema, real `NOT NULL` constraint, real
  round-trip through `CreateUser`/`scanUser`).

---

## 2026-08-02 — Phase 7a: Dashboard, cash-flow report, export (RPT-001..004)

### Requirement IDs implemented

RPT-001 (dashboard), RPT-002 (cash-flow report), RPT-003 (consistency — new
endpoints compose the existing `PlanningService.SafeToSpend` and
`TransactionRepository.SpentByCategory` rather than reimplementing ledger
math), RPT-004 (export). Scoped per `docs/superpowers/specs` brainstorming
decision to exclude NOTIF-001..004 (notifications/background jobs), which
needs new job-runner infrastructure and is deferred to its own phase.

Design decisions confirmed with the requester before implementation: export
is synchronous (`POST /v1/exports` returns the full snapshot in the response
body — no job table/worker, deferred to the future NOTIF-004 phase);
cash-flow report defaults to the current calendar month with
`group_by=day`; dashboard "largest spending categories" is a fixed top 5.

### Files changed

- `internal/domain/reporting.go` (new): `Dashboard`, `UpcomingBill`,
  `GoalProgress`, `CategorySpend`, `CashFlowReport`, `BudgetVsActualLine`,
  `CashFlowTrendPoint`, `TrendPoint`, `Export`.
- `internal/domain/repositories.go`: added `BudgetRepository.List`,
  `BillRepository.NextDue`, `TransactionRepository.CashFlowTotals`,
  `TransactionRepository.CashFlowTrend`.
- `internal/application/reporting.go` (new): `ReportingService` with
  `Dashboard`, `CashFlow`, `Export` methods, composing `PlanningService`,
  the repository interfaces, and the existing overflow-safe money helpers.
- `internal/application/reporting_test.go` (new): 12 unit tests covering
  budget-used/remaining, top-5 truncation, calendar-month fallback, goal
  progress (including >100% overachieved), no-upcoming-bill, RPT-003
  consistency against `PlanningService.SafeToSpend` directly, cash-flow
  defaults/validation/trend zero-filling/budget-vs-actual/variance sign, and
  export section completeness.
- `internal/adapters/postgres/store.go`: `CashFlowTotals`, `CashFlowTrend`,
  `ListBudgets`, `NextDueBill`; refactored `billDueInRange` into a shared
  `nextBillOccurrence` helper (no behavior change).
- `internal/adapters/postgres/repositories.go`: thin forwarding methods for
  the four new repository methods.
- `internal/testkit/fakes.go`: fakes for the four new repository methods;
  fixed `Transactions.SpentByCategory` to match the real Postgres query's
  half-open `[start, end)` range and `reversed_by_id IS NULL` filter (it was
  previously inclusive-both-ends with no reversal exclusion — a latent
  fake/real mismatch with no prior callers, now the first real consumer).
- `internal/adapters/httpapi/dto.go`: response DTOs and mappers for
  dashboard, cash-flow report, and export.
- `internal/adapters/httpapi/reporting_handlers.go` (new): `dashboard`,
  `cashFlowReport`, `createExport` handlers.
- `internal/adapters/httpapi/server.go`: `Reporting` service field, three
  new routes (`GET /v1/dashboard`, `GET /v1/reports/cash-flow`,
  `POST /v1/exports`), `dateQuery` query-param helper.
- `internal/adapters/httpapi/server_test.go`: extended `newTestServer` to
  also wire budgets/bills/goals/planning/reporting (previously only
  auth/profiles/accounts/categories/transactions were wired), returning a
  `testFixtures` struct instead of a bare `*testkit.Users`.
- `internal/adapters/httpapi/reporting_handlers_test.go` (new): 5 handler
  tests via `app.Test` (401 without a token, dashboard/cash-flow/export
  happy paths, invalid `group_by` → 400).
- `tests/integration/postgres_test.go`: added
  `TestPostgresReportingQueries` (Testcontainers) covering `ListBudgets`
  ordering, `NextDueBill` earliest-active selection, `CashFlowTotals`
  reversal exclusion, and `CashFlowTrend` week-bucket alignment against real
  `date_trunc('week', ...)`.
- `internal/bootstrap/app.go`: `application.NewReportingService` added to
  `fx.Provide`; `newHTTPServices` takes and wires the reporting service.
- `openapi/openapi.yaml`: `Reporting` tag; `GET /v1/dashboard`,
  `GET /v1/reports/cash-flow`, `POST /v1/exports` paths; `Dashboard`,
  `UpcomingBill`, `GoalProgress`, `CategorySpend`, `CashFlowReport`,
  `BudgetVsActualLine`, `CashFlowTrendPoint`, `Export` schemas.

### Database migrations

None. The existing `financial_transactions_user_time_idx (user_id,
occurred_at DESC, id DESC)` already serves the `WHERE user_id=$1 AND
occurred_at>=$2 AND occurred_at<$3` range scan used by every new query; the
`GROUP BY` aggregation happens in-memory after the index scan, which is
acceptable at this application's per-user transaction volume.

### Commands run and results

1. `go test ./internal/application/... -run 'TestDashboard|TestCashFlow|TestExport'` → PASS (12/12).
2. `go test -tags=integration -run TestPostgresReportingQueries ./tests/integration/...` → PASS.
3. `go test -tags=integration -count=1 ./tests/integration/...` (full suite) → PASS.
4. `go test ./internal/adapters/httpapi/... -run 'TestDashboard|TestCashFlow|TestCreateExport'` → PASS (5/5).
5. `task verify` (fmt:check, vet, test, test:race, build) → PASS.
6. `task lint` (`golangci-lint run ./...`) → 35 findings (27 pre-existing,
   documented in `docs/P0_GAP_ANALYSIS.md`, untouched, plus 8 new
   `bodyclose` findings in `reporting_handlers_test.go` that follow the
   exact same pre-existing, deliberately-left `requestJSON` test-helper
   pattern used throughout `server_test.go` — no new lint *category*
   introduced). One `govet shadow` finding was introduced by this change in
   `internal/application/reporting.go` and was fixed (not left) since it
   was new code, not pre-existing debt.
7. `govulncheck ./...` → PASS. 0 vulnerabilities in code or called
   dependencies; the same 1 unreachable transitive advisory
   (`GO-2026-5932`) as the 2026-07-24 baseline.

### Deferred / not verified

- Manual end-to-end smoke test of the three new endpoints against a running
  `task run` instance was attempted but blocked: this sandbox resets TCP
  connections to the Docker-Compose Postgres container's fixed host port
  (5432) for every client tried (`goose`, `psql`, raw Python socket),
  while the same sandbox's Testcontainers-based integration tests (which
  use dynamically-assigned high ports) connect and run correctly. This
  looks like a deliberate sandbox restriction on the well-known Postgres
  port rather than a defect in this change. Confidence in end-to-end
  correctness instead rests on: full `ReportingService` unit tests against
  fakes, full HTTP handler tests via `app.Test` (proving routing, auth,
  JSON shape), and full Postgres integration tests via Testcontainers
  (proving the real SQL, including reversal exclusion and week-bucket
  alignment against Postgres's own `date_trunc`).
- NOTIF-001..004 (notification preferences, delivery, background job
  runner) remain unimplemented — scoped out per the pre-implementation
  design discussion; needs its own job-runner infrastructure decision.

---

## 2026-07-24 — Verified backend baseline

### Environment

- Go: `go1.26.4 linux/amd64` (matches PRD default).
- Docker Engine: `29.1.3` (client/server).
- Docker Compose: standalone `docker-compose` v2.29.2 registered as a `~/.docker/cli-plugins/docker-compose` symlink so `docker compose ...` (used by `Taskfile.yml`) resolves; no `docker compose` CLI plugin was preinstalled.
- `task` (go-task) v3.44.1 and `golangci-lint` v2.12.0 were not present locally and were installed via `go install` to match `.golangci.yml`'s `version: "2"` config (a stray v1.64.8 binary could not read it).

### Commands executed (in order) and results

1. `go version` → `go1.26.4`.
2. `docker version` → engine `29.1.3`.
3. `docker compose version` → `v2.29.2` (after registering the compose plugin symlink above).
4. `task bootstrap` → PASS (`.env` created from `.env.example`; `go mod tidy` resolved all dependencies).
5. `task infra:up` → PASS (`postgres:17.10-alpine3.24` container started and reported `healthy`).
6. `task migrate:up` → PASS (`goose` applied `00001_core.sql`, database now at migration version 1).
7. `task verify` (fmt:check, vet, test, test:race, build) → **initially FAILED**, then PASS after a source fix (see below).
8. `task test:integration` → PASS (`go test -tags=integration -count=1 ./tests/integration/...`, 9.54s, real PostgreSQL via Testcontainers).

Additionally run, per `CLAUDE.md`'s "format, lint, tests, race tests, and vulnerability checks" rule:

9. `task lint` (`golangci-lint run ./...`) → **FAILS** with 27 pre-existing findings (13 `bodyclose` in test file, 12 `govet shadow`, 1 `gosec G115`, 1 `nilerr`). None fixed in this pass — see `docs/P0_GAP_ANALYSIS.md` for the full breakdown and rationale for leaving them for a deliberate follow-up rather than bulk-editing core financial application code during a verification-only session.
10. `govulncheck ./...` → PASS. 0 vulnerabilities in code or called dependencies; 1 unreachable transitive advisory (`GO-2026-5932`, unmaintained `golang.org/x/crypto/openpgp`, not imported or called by this codebase).
11. `task coverage` → generated; see `docs/P0_GAP_ANALYSIS.md` for the per-package table (overall `internal/...` statement coverage: 33.5%).

### Source-code failure found and fixed (root cause, not an environment issue)

`go vet` failed at `internal/adapters/httpapi/server.go:53`: `unknown field DisableStartupMessage in struct literal of type fiber.Config`. Root cause: the pinned dependency `github.com/gofiber/fiber/v3 v3.4.0` moved `DisableStartupMessage` off `fiber.Config` and onto `fiber.ListenConfig` (passed to `App.Listen`), so the field no longer compiles against `fiber.Config` in this version. This is a genuine source/API mismatch, not a missing local dependency or config issue, so it was fixed rather than left in place:

- `internal/adapters/httpapi/server.go`: removed the now-invalid `DisableStartupMessage` field from `fiber.Config`.
- `internal/bootstrap/app.go`: pass `fiber.ListenConfig{DisableStartupMessage: true}` to `server.App().Listen(...)` instead, and added the `github.com/gofiber/fiber/v3` import (bootstrap is a composition root, where Fiber imports are permitted).

No dependency versions were changed; no application/business logic, tests, or the OpenAPI contract were touched.

### Deferred product phases (unchanged, confirmed still absent by source inspection)

Full detail in `docs/P0_GAP_ANALYSIS.md`. Summary: admin RBAC/auth (AUTH-006, ADM-001..006), account deletion workflow (USER-004), dashboard/reports/export (RPT-001..004), notifications and background jobs (NOTIF-001..004), rate limiting (SEC-005), and AI explanation adapter (AI-001..006) are all still unimplemented. Observability (NFR-005) has structured logs and request IDs but no metrics or tracing.

---

## 2026-07-24 — Claude-ready PRD and core backend

### Completed documents

- Full Claude-friendly PRD with stable requirement IDs, acceptance criteria, user journeys, data model, API capability map, NFRs, security controls, analytics, metrics, monetization, and release phases.
- Clean architecture and dependency direction.
- Security requirements and threat controls.
- API conventions and error model.
- Incremental implementation plan.

### Completed core backend

- Fiber v3 HTTP adapter with request IDs, centralized error mapping (including framework 404/405 errors), authentication middleware, liveness, and readiness endpoints.
- Constructor-based dependency injection with Uber Fx restricted to the composition root.
- PostgreSQL pool, repository adapters, transactional unit of work, and initial Goose migration.
- Argon2id password hashing.
- Strict HS256 JWT issuer, audience, algorithm, and expiry validation.
- Opaque refresh tokens stored only as SHA-256 hashes.
- Refresh-token rotation, reuse detection, family revocation, logout, and logout-all.
- Financial accounts with ledger-derived balances.
- Default and custom categories.
- Income, expense, transfer, adjustment, and immutable reversal transactions.
- Idempotent monetary commands with 8–128 character keys and payload-hash conflict detection.
- Budget drafts, allocation/category validation, activation-time revalidation, allocations, and overlapping-active-period database constraint.
- Monthly recurring bills.
- Saving goals and idempotent contributions.
- Safe-to-spend calculation.
- Deterministic conservative, balanced, and flexible budget recommendations with overflow-safe proportional allocation.
- OpenAPI 3.1 contract aligned with HTTP response DTOs.

### Completed quality tooling

- Pure domain and application unit tests.
- Reversal, idempotency, transfer, budget, recommendation, safe-to-spend, goal, and authentication tests.
- Argon2id, JWT, refresh-token, configuration, and ID-generator tests.
- Fiber `app.Test` HTTP adapter tests.
- PostgreSQL Testcontainers integration tests using the real migration.
- Race-test, vet, coverage, golangci-lint v2.12, build, and vulnerability-check commands.
- Dockerfile, Docker Compose, Taskfile, Make wrapper, and GitHub Actions workflow.

### Verification performed in artifact environment

The available runtime contained Go 1.23.2 and did not provide Docker or external module downloads. The standard-library-only domain, application, configuration, and system test suites were executed successfully, including the race detector and `go vet`.

The Fiber, pgx, Fx, Argon2id, JWT, and Testcontainers suites are included but require Go 1.26.5 plus dependency download. PostgreSQL integration tests additionally require Docker.

### Deferred product phases

- Mobile React Native application.
- Next.js admin web.
- Administrator RBAC endpoints and sensitive-access workflow.
- Redis-backed worker and notifications.
- Dashboard/report query models and exports.
- OpenTelemetry and Prometheus adapters.
- Rate limiting and production edge controls.
- AI-provider explanation layer.
