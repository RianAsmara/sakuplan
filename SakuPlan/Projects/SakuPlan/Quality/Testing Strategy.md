---
title: SakuPlan Testing Strategy
project: SakuPlan
type: quality
status: active
tags:
  - project/sakuplan
  - quality/testing
source: repository
last_synced: 2026-07-29
---

# Testing Strategy

Source: `docs/ARCHITECTURE.md` §9, confirmed against 13 test files under `services/api`. See [[Test Coverage]] for coverage percentages and [[CI and Quality Gates]] for how these run in CI.

## Layers

| Layer | Approach | Files |
|---|---|---|
| Domain unit tests | Pure unit tests, no fakes needed | `internal/domain/types_test.go` |
| Application (use-case) tests | Fake repositories + deterministic clock/ID generator, no DB | `internal/application/*_test.go` (6 files) |
| HTTP/handler tests | Fiber `app.Test()` with fake application services | `internal/adapters/httpapi/server_test.go` |
| Adapter/infrastructure tests | Direct unit tests of security/system adapters | `security/password_test.go`, `security/token_test.go`, `system/system_test.go`, `config/config_test.go` |
| Repository integration tests | Testcontainers real PostgreSQL, `-tags=integration` | `tests/integration/postgres_test.go` |

## Test inventory by module

- **Auth**: `TestRegisterCreatesUserAndTokens`, `TestLoginHidesUnknownEmail`, `TestRefreshRotatesSessionAndRejectsReuse` (`auth_test.go`)
- **Budgets/Planning**: `TestBudgetRejectsOverAllocation`, `TestSafeToSpendProtectsBillsSavingsAndBuffer`, `TestRecommendationIsDeterministicAndConservesMoney`, `TestRecommendationAllocatesRemainderWhenLastSortedCategoryIsLocked`, `TestSafeToSpendUsesUserTimezone`, `TestBudgetActivationRevalidatesArchivedCategory`, `TestBudgetRejectsOverflowingAllocationTotal`, `TestRecommendationHandlesMaximumMoneyWithoutOverflow`, `TestRecommendationRejectsMandatoryTotalOverflow` (`budget_planning_test.go`)
- **Goals**: `TestGoalContributionIsIdempotent`, `TestGoalRejectsNegativePlanningFields` (`goals_test.go`)
- **Ownership**: `TestAccountRejectsUnknownType`, `TestBudgetRejectsAnotherUsersCategory`, `TestBillRejectsAnotherUsersAccount` (`ownership_test.go`)
- **Transactions/Ledger**: `TestCreateExpenseDebitsAccount`, `TestTransferIsBalanced`, `TestIdempotencyReturnsOriginalAndRejectsPayloadChange`, `TestReverseTransactionRestoresBalanceAndIsIdempotent`, `TestReverseTransactionRejectsSecondReversal`, `TestTransactionRejectsShortIdempotencyKey` (`transactions_test.go`)
- **Users**: `TestUpdateProfileValidatesTimezoneAndFinancialPreferences`, `TestUpdateProfileRejectsInvalidTimezone` (`users_test.go`)
- **HTTP**: `TestHealthz`, `TestRegisterAndCreateAccount`, `TestProtectedRouteRejectsMissingBearerToken`, `TestTransactionAndReversalHTTPFlow`, `TestUnknownRouteReturnsFramework404Envelope`, `TestUpdateProfileHTTPFlow` (`server_test.go`)
- **Security adapters**: `TestArgon2Hasher`, `TestJWTManagerIssueAndParse`, `TestRefreshManagerNeverStoresPlainToken`
- **System/Config**: `TestIDGeneratorProducesUUIDv4`, `TestLoadDefaultsAndOverrides`, `TestLoadRejectsWeakJWTSecret`, `TestLoadRejectsInvalidPositiveInteger`
- **Integration** (real Postgres via Testcontainers, `postgres:17.10-alpine3.24`, migration applied as init script): single test `TestPostgresLedgerAndBudgetConstraints` covering a two-account transfer, idempotency replay + payload-conflict, exact balance verification, and the `budget_periods_no_overlapping_active` exclusion constraint (expects `ErrConflict` on overlapping activation).

## Verification status

| Status | Meaning |
|---|---|
| **Verified locally** | `docs/PROGRESS.md` records an actual run with output, dated 2026-07-24: `task bootstrap`, `task infra:up`, `task migrate:up`, `task test` (implied by `task verify`), `task test:race`, `task test:integration`, `task build`, `govulncheck` all passed on Go 1.26.4. |
| **Verified in CI** | Same command set runs in `.github/workflows/backend.yml` on every push/PR touching `services/api/**` — see [[CI and Quality Gates]]. No independent CI run log was available to this synchronization (repo has no `.git` history). |
| **Test exists, execution not re-verified by this sync** | All test files listed above exist in the repository as of 2026-07-29; this documentation pass read the test source but did not re-run `task test`/`task test:integration` itself — see the `/run` session in this conversation for the closest live verification (functional smoke test via `curl`, not `go test`). |

**Do not claim "all tests pass" from this documentation alone** — the last actual recorded run is `docs/PROGRESS.md`'s 2026-07-24 entry. Re-run `task verify && task test:integration` to get a current result.

## Related notes

- [[Test Coverage]]
- [[CI and Quality Gates]]
- [[Security Controls]]
- [[SakuPlan]]
