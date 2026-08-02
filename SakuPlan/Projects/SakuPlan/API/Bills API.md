---
title: SakuPlan Bills API
project: SakuPlan
type: api
status: active
tags:
  - project/sakuplan
  - api/bills
source: repository
last_synced: 2026-07-29
---

# Bills API

Source: `services/api/openapi/openapi.yaml` (Bills tag), `internal/adapters/httpapi/planning_handlers.go`. See [[Backend Modules#Bills|BillService]].

| Endpoint | Auth | Request/params | Response | Errors |
|---|---|---|---|---|
| `GET /v1/bills` | Bearer | query `include_inactive` (bool) | 200 `{data: Bill[]}` | 401 |
| `POST /v1/bills` | Bearer | `CreateBillRequest` (name, amount, due_day, frequency, category_id, account_id, reminder_days) | 201 `Bill` | 422 |

## Known gap: frequency restricted to monthly

The OpenAPI spec's `CreateBillRequest.frequency` enum is declared as `[monthly]` **only**, even though the database `bill_frequency` enum supports `weekly`/`monthly`/`yearly`. This matches the application-layer restriction in `BillService.Create`, which currently rejects anything but `monthly`. Both the spec and the implementation agree with each other but disagree with the domain enum and the PRD (`BILL-002` calls for all three frequencies) — a real, consistent gap rather than a doc/code mismatch.

## Not implemented

No "mark bill paid" endpoint (`BILL-004`/`BILL-005` — would create a linked expense transaction idempotently); no update endpoint (`BillRepository.Update` exists, unused).

## Related notes

- [[Backend Modules]]
- [[Safe-to-Spend Engine]]
- [[Database Model]]
- [[API Overview]]
- [[SakuPlan]]
