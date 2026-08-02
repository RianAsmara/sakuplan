---
title: SakuPlan Backend Modules
project: SakuPlan
type: engineering
status: active
tags:
  - project/sakuplan
  - engineering/modules
source: repository
last_synced: 2026-07-29
---

# Backend Modules

One section per implemented `internal/application` service. Each links to its repository contract, Postgres adapter, Fiber endpoints, and known limitations. See [[Financial Ledger]] and [[Safe-to-Spend Engine]] / [[Budget Recommendation Engine]] for deep dives on the ledger and planning math specifically.

## Auth — `AuthService` (`internal/application/auth.go`)

- **Entities**: `User`, `RefreshSession`
- **Use cases**: `Register`, `Login`, `Refresh`, `Logout`, `LogoutAll`
- **Repos**: `UserRepository`, `SessionRepository`, `AuditRepository`
- **Endpoints**: `POST /v1/auth/{register,login,refresh,logout}`, `POST /v1/auth/logout-all` (authenticated)
- **Ownership**: n/a (pre-auth except logout-all, which acts on the caller's own sessions)
- **Transaction boundary**: `Register` wraps user creation + session creation + audit append in `UnitOfWork.WithinTransaction`
- **Idempotency**: none (auth actions aren't retriable-mutation endpoints per PRD)
- **Audit**: `user.registered`-style events via `AuditRepository`, best-effort on `Login` (error ignored)
- **Key tests**: `TestRegisterCreatesUserAndTokens`, `TestLoginHidesUnknownEmail` (no user enumeration), `TestRefreshRotatesSessionAndRejectsReuse`
- **Limitations**: no admin auth policy (AUTH-006); `role` JWT claim is issued but never read by any middleware — see [[Authorization and Ownership]]

## User — `UserService` (`internal/application/users.go`)

- **Entities**: `User`
- **Use cases**: `Get`, `Update` (display name, currency, timezone via `time.LoadLocation` validation, payday 1–31, minimum buffer ≥0)
- **Repos**: `UserRepository`, `AuditRepository`
- **Endpoints**: `GET /v1/me`, `PUT /v1/me`
- **Ownership**: implicit — operates on the JWT-bound user ID only
- **Audit**: `user.profile_updated`
- **Key tests**: `TestUpdateProfileValidatesTimezoneAndFinancialPreferences`, `TestUpdateProfileRejectsInvalidTimezone`
- **Limitations**: no account-deletion use case (USER-004 not implemented)

## Accounts — `AccountService` (`internal/application/accounts.go`)

- **Entities**: `FinancialAccount`
- **Use cases**: `Create`, `List`, `Get`, `Balance`, `Archive`
- **Repos**: `AccountRepository`
- **Endpoints**: `GET/POST /v1/accounts`, `GET /v1/accounts/:id`, `GET /v1/accounts/:id/balance`, `DELETE /v1/accounts/:id` (archive)
- **Ownership**: every repo call scoped by `(userID, accountID)`
- **Transaction boundary**: none — single-aggregate writes only
- **Limitations**: no update endpoint beyond archive (repo has `Update`, unused by any handler)

## Categories — `CategoryService` (`internal/application/categories.go`)

- **Entities**: `Category`
- **Use cases**: `Create`, `List` (optional kind filter), `Archive`
- **Repos**: `CategoryRepository`
- **Endpoints**: `GET/POST /v1/categories`, `DELETE /v1/categories/:id`
- **Ownership**: `user_id` nullable in schema — `NULL` means a system default category, shared across users
- **Limitations**: no admin-managed default-category workflow (CAT-004)

## Transactions — `TransactionService` (`internal/application/transactions.go`)

See [[Financial Ledger]] for the full ledger model. Summary:

- **Use cases**: `Create` (income/expense/transfer/adjustment), `Reverse`, `List` (cursor-paginated), `Get`
- **Repos**: `TransactionRepository`, `AccountRepository`, `CategoryRepository`
- **Endpoints**: `GET/POST /v1/transactions`, `GET /v1/transactions/:id`, `POST /v1/transactions/:id/reverse`
- **Transaction boundary**: `UnitOfWork.WithinTransaction` wraps account/category validation + ledger entry construction + persistence for both `Create` and `Reverse`
- **Idempotency**: `Idempotency-Key` header (8–128 chars) + SHA-256 canonical payload hash, scoped by `(user_id, operation, key)`. Operation name is `"transaction.create.<type>"` or `"transaction.reverse"`.
- **Key tests**: `TestCreateExpenseDebitsAccount`, `TestTransferIsBalanced`, `TestIdempotencyReturnsOriginalAndRejectsPayloadChange`, `TestReverseTransactionRestoresBalanceAndIsIdempotent`, `TestReverseTransactionRejectsSecondReversal`

## Budgets — `BudgetService` (`internal/application/budgets.go`)

- **Entities**: `BudgetPeriod`, `BudgetAllocation`
- **Use cases**: `CreateDraft`, `Activate` (re-validates every allocation's category at activation time, not just draft time), `Active` (lookup by date)
- **Repos**: `BudgetRepository`, `CategoryRepository`
- **Endpoints**: `POST /v1/budgets`, `POST /v1/budgets/:id/activate`, `GET /v1/budgets/active`
- **Ownership**: category ownership checked via `categories.Get(ctx, userID, categoryID)` before allocation
- **Validation formula**: `sum(SavingsCommitment, MinimumBuffer, allocations) ≤ ExpectedIncome`, overflow-checked — see [[Financial Invariants]]
- **Key tests**: `TestBudgetRejectsOverAllocation`, `TestBudgetActivationRevalidatesArchivedCategory`, `TestBudgetRejectsOverflowingAllocationTotal`
- **Limitations**: `BudgetRepository.ReplaceAllocations` exists in the interface but has no caller — allocations can't currently be edited after draft creation without recreating the budget; no consumption/summary endpoint (BUD-005/006/007 not implemented)

## Bills — `BillService` (`internal/application/bills_goals.go`)

- **Entities**: `RecurringBill`
- **Use cases**: `Create`, `List`
- **Repos**: `BillRepository`, `AccountRepository`, `CategoryRepository`
- **Endpoints**: `GET/POST /v1/bills`
- **Ownership**: account and category existence/ownership verified at creation
- **Limitations**: **`Create` only accepts `BillFrequency == monthly`** even though `weekly`/`yearly` exist as domain enum values and DB check constraints — a real spec-vs-implementation gap (BILL-002). No "mark bill paid" use case exists at all (BILL-004/005 not implemented), despite `BillRepository.UpcomingTotal` being consumed by [[Safe-to-Spend Engine]].

## Goals — `GoalService` (`internal/application/bills_goals.go`)

- **Entities**: `SavingGoal`, `GoalContribution`
- **Use cases**: `Create`, `List`, `Contribute`
- **Repos**: `GoalRepository`, `AccountRepository`, `TransactionRepository`, `UnitOfWork`
- **Endpoints**: `GET/POST /v1/goals`, `POST /v1/goals/:id/contributions`
- **Transaction boundary**: `Contribute` wraps goal/account lookup + ledger transaction creation (`Type: adjustment`, `Reason: "debit:saving_goal_contribution"`) + contribution record insert in one `UnitOfWork.WithinTransaction`. Note this calls `TransactionRepository.Create` directly rather than going through `TransactionService`, bypassing category validation (not needed here since no category applies).
- **Idempotency**: operation `"goal.contribute"`, same canonical-hash pattern as transactions
- **Key tests**: `TestGoalContributionIsIdempotent`, `TestGoalRejectsNegativePlanningFields`
- **Limitations**: no explicit "progress" endpoint aggregating contributed/remaining/% (GOAL-003 partially implemented via raw repo methods only)

## Planning — `PlanningService` + `RecommendationService` (`internal/application/planning.go`)

Full formula detail in [[Safe-to-Spend Engine]] and [[Budget Recommendation Engine]].

- **`PlanningService.SafeToSpend`**: read-only, no `UnitOfWork`. Depends on `AccountRepository`, `BudgetRepository`, `BillRepository`, `GoalRepository`, `Clock`.
- **`RecommendationService.Generate`**: zero dependencies — pure function, no repo/port injected at all.
- **Endpoints**: `GET /v1/planning/safe-to-spend`, `POST /v1/planning/recommendations`
- **Limitations**: no AI explanation adapter (REC-007); no "apply recommendation as draft budget" endpoint (REC-006 not wired — client must manually re-POST allocations to `/v1/budgets`)

## Not implemented as modules

Reports, Notifications, Admin, and a dedicated AI adapter have no `internal/application` service at all — see [[Remaining Work]].

## Related notes

- [[System Architecture]]
- [[Financial Ledger]]
- [[Safe-to-Spend Engine]]
- [[Budget Recommendation Engine]]
- [[Authorization and Ownership]]
- [[Database Model]]
- [[SakuPlan]]
