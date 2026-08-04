---
title: SakuPlan Recommendations API
project: SakuPlan
type: api
status: active
tags:
  - project/sakuplan
  - api/planning
source: repository
last_synced: 2026-07-29
---

# Recommendations API

Covers both planning endpoints. Source: `api/openapi/openapi.yaml` (Planning tag), `internal/adapters/httpapi/planning_handlers.go`. See [[Safe-to-Spend Engine]] and [[Budget Recommendation Engine]] for the underlying formulas.

| Endpoint | Auth | Request/params | Response | Notes |
|---|---|---|---|---|
| `GET /v1/planning/safe-to-spend` | Bearer | — (uses current date/user timezone) | 200 `SafeToSpend` | Deterministic, no persistence |
| `POST /v1/planning/recommendations` | Bearer | `RecommendationRequest` (expected_income, fixed_bills, debt_payments, requested_savings, minimum_buffer, dependants, mode, locked_allocations?, category_weights?) | 200 `Recommendation` | Pure function — no persistence. OpenAPI description: "Rule-based recommendation. No LLM is involved in monetary calculations." |

`SafeToSpend` response: `liquid_balance`, `upcoming_bills`, `remaining_savings_commitment`, `minimum_buffer`, `until_payday`, `daily`, `days_remaining`, `risk_level`.

`Recommendation` response: `mode`, `savings_commitment`, `minimum_buffer`, `allocations` (map), `unallocated`, `warnings[]`, `reason_codes[]`.

## Not implemented

No "apply recommendation" endpoint that turns a `Recommendation` into a draft `Budget` (`REC-006`) — a client must manually resubmit the `allocations` as a `POST /v1/budgets` request. No AI explanation endpoint (`REC-007`).

## Related notes

- [[Safe-to-Spend Engine]]
- [[Budget Recommendation Engine]]
- [[Financial Invariants]]
- [[API Overview]]
- [[SakuPlan]]
