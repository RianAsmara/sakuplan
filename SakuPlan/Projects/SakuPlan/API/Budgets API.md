---
title: SakuPlan Budgets API
project: SakuPlan
type: api
status: active
tags:
  - project/sakuplan
  - api/budgets
source: repository
last_synced: 2026-07-29
---

# Budgets API

Source: `services/api/openapi/openapi.yaml` (Budgets tag), `internal/adapters/httpapi/planning_handlers.go`. See [[Backend Modules#Budgets|BudgetService]] and [[Financial Invariants]] for the allocation formula.

| Endpoint | Auth | Idempotency | Request/params | Response | Errors |
|---|---|---|---|---|---|
| `POST /v1/budgets` | Bearer | no | `CreateBudgetRequest` (start_date, end_date, expected_income, savings_commitment, minimum_buffer, allocations[]) | 201 `Budget` | 409 `BUDGET_OVERALLOCATED`/overlap |
| `POST /v1/budgets/:id/activate` | Bearer | no | path `id` | 200 `Budget` (activated) | 409 (re-validation failure, overlap) |
| `GET /v1/budgets/active` | Bearer | no | — (defaults to current date) | 200 `Budget` | 404 (no active period) |

`Budget` includes `status` (draft/active/closed) and `source` (manual/rule_based/ai_assisted).

## Not implemented

No `GET /v1/budgets/:id` (single fetch by ID), no update/allocation-replace endpoint (`BudgetRepository.ReplaceAllocations` exists but is unused), no consumption/summary endpoint (`BUD-005`), no copy-prior-budget (`BUD-006`), no explicit close endpoint (`BUD-007`).

## Related notes

- [[Backend Modules]]
- [[Financial Invariants]]
- [[Database Model]]
- [[API Overview]]
- [[SakuPlan]]
