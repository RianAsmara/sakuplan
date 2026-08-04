---
title: SakuPlan Saving Goals API
project: SakuPlan
type: api
status: active
tags:
  - project/sakuplan
  - api/goals
source: repository
last_synced: 2026-07-29
---

# Saving Goals API

Source: `api/openapi/openapi.yaml` (Goals tag), `internal/adapters/httpapi/planning_handlers.go`. See [[Backend Modules#Goals|GoalService]].

| Endpoint | Auth | Idempotency | Request/params | Response | Errors |
|---|---|---|---|---|---|
| `GET /v1/goals` | Bearer | — | query `include_inactive` (bool) | 200 `{data: Goal[]}` | 401 |
| `POST /v1/goals` | Bearer | no | `CreateGoalRequest` (name, target_amount, target_date?, monthly_commitment?, priority?) | 201 `Goal` | 422 |
| `POST /v1/goals/:id/contributions` | Bearer | **required** | `GoalContributionRequest` (account_id, amount, occurred_at) | 201 `GoalContribution` | 409 idempotency conflict, 400 |

A contribution debits the given account via a ledger transaction (`type=adjustment`) and links 1:1 via `saving_goal_contributions.transaction_id` (unique) — see [[Financial Ledger]].

## Not implemented

No explicit progress-aggregation endpoint (contributed/remaining/% complete/projected completion date — `GOAL-003`); over-contribution response behavior (`GOAL-004`) not independently verified.

## Related notes

- [[Backend Modules]]
- [[Financial Ledger]]
- [[Database Model]]
- [[API Overview]]
- [[SakuPlan]]
