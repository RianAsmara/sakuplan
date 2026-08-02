---
title: SakuPlan Financial Invariants
project: SakuPlan
type: data
status: active
tags:
  - project/sakuplan
  - data/invariants
  - finance
source: repository
last_synced: 2026-07-29
---

# Financial Invariants

Cross-cutting summary of every financial rule the codebase enforces, each tied to its source. This is the single-page reference — see [[Financial Ledger]], [[Safe-to-Spend Engine]], and [[Budget Recommendation Engine]] for the full derivations.

| Invariant | Rule | Source |
|---|---|---|
| Monetary representation | `domain.Money` = named `int64`, minor units, never float | `internal/domain/types.go:10` |
| No floating-point | Enforced by type system — `Money` has no float conversion path in application code | `internal/domain/types.go` |
| Ledger model | Transaction (event) + N transaction entries (signed account effects) | `internal/domain/entities.go`, [[Financial Ledger]] |
| Income | 1 credit entry | `internal/application/transactions.go` `Create` |
| Expense | 1 debit entry, requires expense category | `internal/application/transactions.go` `Create` |
| Transfer | 1 debit + 1 credit, same amount, different accounts, same currency | `internal/application/transactions.go` `Create` |
| Adjustment | 1 entry, direction from `"debit:"`-prefixed `Reason` string convention, reason mandatory | `internal/application/transactions.go` `Create` |
| Immutable reversal | New linked transaction (`reverses_id`/`reversed_by_id`), original never mutated/deleted; reversing a reversal or already-reversed transaction → `ErrConflict` | `internal/application/transactions.go` `Reverse`, verified by `TestReverseTransactionRejectsSecondReversal` |
| Account balance reconstruction | `initial_balance` + Σ(signed ledger entries), computed in SQL at query time — no cached balance column | `internal/adapters/postgres/store.go` `AccountBalance`/`LiquidBalance` |
| Idempotency key | `Idempotency-Key` header, 8–128 chars, required on transaction create/reverse and goal contribute | `internal/application/transactions.go`, `bills_goals.go` |
| Payload-hash conflict detection | SHA-256 of canonicalized JSON input (`canonicalHash`); same key + different hash → `ErrIdempotencyConflict` (409) | `internal/application/transactions.go` |
| Idempotency storage | Inline columns on `financial_transactions`: `idempotency_operation`, `idempotency_key`, `request_hash`; `UNIQUE(user_id, idempotency_operation, idempotency_key)` | `db/migrations/00001_core.sql` |
| SQL transaction boundaries | `ports.UnitOfWork.WithinTransaction`, nested-transaction-safe via context-stored `pgx.Tx`; used by `TransactionService.{Create,Reverse}` and `GoalService.Contribute` | `internal/adapters/postgres/store.go`, `internal/ports/ports.go` |
| Safe-to-spend formula | `LiquidBalance − UpcomingBills − RemainingSavingsCommitment − MinimumBuffer`, daily = that ÷ days-remaining (min 1) | `internal/application/planning.go` `SafeToSpend`, [[Safe-to-Spend Engine]] |
| Budget allocation validation | `SavingsCommitment + MinimumBuffer + Σ(allocations) ≤ ExpectedIncome`, else `ErrBudgetOverallocated`; overflow → `ErrInvalidInput` | `internal/application/budgets.go` `validateBudget` |
| Budget activation validation | Re-validates every allocation's category (kind, archived state) **again** at activation time, not just draft time | `internal/application/budgets.go` `Activate`, verified by `TestBudgetActivationRevalidatesArchivedCategory` |
| Budget overlap | No two **active** periods may overlap per user — enforced by a Postgres `EXCLUDE USING gist` constraint, not just application logic | `db/migrations/00001_core.sql` `budget_periods_no_overlapping_active` |
| Recurring bill handling | Only `monthly` frequency currently accepted despite `weekly`/`yearly` existing in the domain enum and DB constraint — implementation gap | `internal/application/bills_goals.go` `BillService.Create` |
| Saving-goal contribution | Debits account via a ledger transaction (`type=adjustment`, `reason="debit:saving_goal_contribution"`), 1:1 linked via `saving_goal_contributions.transaction_id` (unique), idempotent | `internal/application/bills_goals.go` `GoalService.Contribute` |
| Recommendation allocation constraints | Deterministic, pure function, no persistence; savings rate by mode (conservative 30% / balanced 20% / flexible 10%); locked allocations checked against spendable amount before proportional split; alphabetically-last unlocked category absorbs rounding remainder | `internal/application/planning.go` `RecommendationService.Generate`, [[Budget Recommendation Engine]] |
| Overflow protection | `addNonNegativeMoney` (rejects negatives, detects int64 overflow pre-emptively) and `proportionalMoney` (quotient/remainder decomposition to avoid multiply-overflow) | `internal/application/money_math.go` |
| Ownership | Every resource query scoped by `user_id`; cross-user access surfaces as `ErrNotFound`, not a distinct forbidden error | see [[Authorization and Ownership]] |

## Related notes

- [[Financial Ledger]]
- [[Safe-to-Spend Engine]]
- [[Budget Recommendation Engine]]
- [[Database Model]]
- [[Backend Modules]]
- [[SakuPlan]]
