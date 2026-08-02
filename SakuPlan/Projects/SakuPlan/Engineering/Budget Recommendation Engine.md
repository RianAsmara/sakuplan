---
title: SakuPlan Budget Recommendation Engine
project: SakuPlan
type: engineering
status: active
tags:
  - project/sakuplan
  - engineering/planning
  - finance
source: repository
last_synced: 2026-07-29
---

# Budget Recommendation Engine

Source: `internal/application/planning.go`, `RecommendationService.Generate` (lines ~99-186). Requirement IDs: `REC-001`–`REC-007` in [[Product Requirements]]. `REC-001` ("deterministic first") is satisfied by construction — `RecommendationService` has **zero repository/port dependencies**; `Generate` is a pure function of its input.

## Algorithm (exact, from source)

```mermaid
flowchart TD
    A["Input: ExpectedIncome, FixedBills, DebtPayments,<br/>RequestedSavings, MinimumBuffer, Mode, LockedAllocations, CategoryWeights"] --> B["mandatory = FixedBills + DebtPayments + MinimumBuffer<br/>(overflow-checked)"]
    B --> C{"available = ExpectedIncome − mandatory < 0?"}
    C -- yes --> W["Return with warning<br/>MANDATORY_OBLIGATIONS_EXCEED_INCOME<br/>Unallocated = available (negative)"]
    C -- no --> D["savings = proportionalMoney(available, rate%, 100)<br/>rate: conservative=30, balanced=20, flexible=10"]
    D --> E["savings = max(savings, RequestedSavings), clamped ≤ available"]
    E --> F["spendable = available − savings"]
    F --> G["lockedTotal = sum(LockedAllocations), overflow-checked"]
    G --> H{"lockedTotal > spendable?"}
    H -- yes --> X["ErrBudgetOverallocated"]
    H -- no --> I["remaining = spendable − lockedTotal"]
    I --> J["sort unlocked category keys alphabetically (deterministic)"]
    J --> K["allocate each via proportionalMoney(remaining, weight, totalWeight)"]
    K --> L["last sorted key absorbs the exact remainder<br/>(avoids rounding loss)"]
    L --> M["Return Recommendation{Allocations, SavingsCommitment,<br/>MinimumBuffer, Unallocated, ReasonCodes}"]
```

## Savings rate by mode

| Mode | Rate |
|---|---|
| `conservative` | 30% |
| `balanced` (default/empty) | 20% |
| `flexible` | 10% |
| anything else | `ErrInvalidInput` |

## Default category weights (used if none supplied)

`{"food": 40, "transport": 20, "household": 20, "health": 10, "lifestyle": 10}` — weights are validated 0–10,000 each; cumulative weight capped at 1,000,000 to prevent overflow.

## Money-conservation invariant

Every allocation run must satisfy:

```
SavingsCommitment + MinimumBuffer + FixedBills + DebtPayments + Unallocated + sum(Allocations) == ExpectedIncome
```

Verified by `TestRecommendationIsDeterministicAndConservesMoney` (also checks calling `Generate` twice with identical input yields identical output — determinism) and `TestRecommendationAllocatesRemainderWhenLastSortedCategoryIsLocked` (confirms `Unallocated == 0` even with rounding-prone weights, since the alphabetically-last **unlocked** key absorbs the remainder).

## Overflow safety

`TestRecommendationHandlesMaximumMoneyWithoutOverflow` confirms conservation holds at `math.MaxInt64`. `TestRecommendationRejectsMandatoryTotalOverflow` confirms `FixedBills = MaxInt64, DebtPayments = 1` is rejected with `ErrInvalidInput` rather than silently wrapping — via `addNonNegativeMoney` in `internal/application/money_math.go`, shared with [[Financial Ledger]] and [[Backend Modules#Budgets — BudgetService|BudgetService]].

## Validation parity (`REC-005`)

Recommendations are computed by a pure function and are **not automatically validated against `BudgetService.validateBudget`** — the caller would need to submit the resulting allocations through `POST /v1/budgets` to get that validation. There is no code path that runs recommendation output through the budget validator automatically.

## AI explanation layer (`REC-007`) — not implemented

The PRD describes an optional adapter that turns the deterministic `ReasonCodes` into natural-language text, treated as untrusted presentation text with a template-based fallback on failure. No such adapter exists in `internal/` today — see [[Remaining Work]] and [[ADR-010]].

## Related notes

- [[Backend Modules]]
- [[Safe-to-Spend Engine]]
- [[Financial Invariants]]
- [[Recommendations API]]
- [[ADR-010]]
- [[SakuPlan]]
