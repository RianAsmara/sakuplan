---
title: SakuPlan Transactions API
project: SakuPlan
type: api
status: active
tags:
  - project/sakuplan
  - api/transactions
source: repository
last_synced: 2026-07-29
---

# Transactions API

Source: `api/openapi/openapi.yaml` (Transactions tag), `internal/adapters/httpapi/finance_handlers.go`. See [[Financial Ledger]] and [[Backend Modules#Transactions|TransactionService]] for the underlying model.

| Endpoint | Auth | Idempotency | Request/params | Response | Errors |
|---|---|---|---|---|---|
| `GET /v1/transactions` | Bearer | — | query `limit` (1–200, default 50), `cursor` | 200 `{data: Transaction[], meta: {next_cursor}}` | 401 |
| `POST /v1/transactions` | Bearer | **required** | `CreateTransactionRequest` (account_id, destination_id?, category_id?, amount, occurred_at, note?, reason?, type) | 201 `Transaction` (or original, if idempotent replay) | 409 `IDEMPOTENCY_CONFLICT`, 400 |
| `GET /v1/transactions/:id` | Bearer | — | path `id` | 200 `Transaction` | 404 |
| `POST /v1/transactions/:id/reverse` | Bearer | **required** | `ReverseTransactionRequest` (reason) | 201 `Transaction` (reversal, linked via `reverses_id`) | 409 (already reversed / reversing a reversal), 400 |

`Transaction` response includes `reverses_id`, `reversed_by_id`, and `entries[]` (each entry: `account_id`, `direction`, `amount`).

`CreateTransactionType` schema in the OpenAPI spec is restricted to `income`/`expense`/`transfer`/`adjustment` — **`reversal` is intentionally excluded** from creatable types since reversals are only produced via the `/reverse` endpoint.

## Verified end-to-end (manual `/run` session)

`register → create account → create category (kind=expense) → create expense transaction (amount 25000) → balance drops 100000→75000`, all matching expected ledger arithmetic exactly.

## Ownership

`account_id`/`destination_id`/`category_id` are all validated to belong to the authenticated user (or be a shared default category) before any entries are written — see [[Authorization and Ownership]].

## Related notes

- [[Financial Ledger]]
- [[Financial Invariants]]
- [[Backend Modules]]
- [[API Overview]]
- [[SakuPlan]]
