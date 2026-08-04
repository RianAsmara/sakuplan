---
title: SakuPlan Reports API
project: SakuPlan
type: api
status: planned
tags:
  - project/sakuplan
  - api/reports
source: repository
last_synced: 2026-07-29
---

# Reports API

**Status: not implemented.** No dashboard, cash-flow report, or export code exists anywhere in `internal/`; no corresponding paths exist in `api/openapi/openapi.yaml`.

## Documented intent (PRD §8.11, requirements `RPT-001`–`RPT-004`)

- `RPT-001` Dashboard: liquid balance, safe-to-spend today/until-payday, days until payday, budget used/remaining, upcoming bill, goal progress, largest spending categories.
- `RPT-002` Cash-flow report: income, expenses, net cash flow, category breakdown, budget vs. actual, trend by day/week.
- `RPT-003` Reports must use the same ledger rules as account/budget summaries (no separate calculation path).
- `RPT-004` Export: profile, accounts, categories, transactions, budgets, bills, goals, consent metadata in a machine-readable format.

All the underlying data needed for a dashboard already exists via other endpoints ([[Financial Accounts API]], [[Safe-to-Spend Engine]], [[Bills API]], [[Saving Goals API]]) — this is a genuinely unimplemented aggregation layer, not a blocked one.

## Related notes

- [[Product Requirements]]
- [[Remaining Work]]
- [[API Overview]]
- [[SakuPlan]]
