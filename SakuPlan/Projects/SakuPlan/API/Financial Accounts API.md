---
title: SakuPlan Financial Accounts API
project: SakuPlan
type: api
status: active
tags:
  - project/sakuplan
  - api/accounts
source: repository
last_synced: 2026-07-29
---

# Financial Accounts API

Source: `api/openapi/openapi.yaml` (Accounts, Categories tags), `internal/adapters/httpapi/finance_handlers.go`. See [[Backend Modules#Accounts|AccountService]] and [[Backend Modules#Categories|CategoryService]].

## Accounts

| Endpoint | Auth | Idempotency | Request/params | Response | Errors |
|---|---|---|---|---|---|
| `GET /v1/accounts` | Bearer | — | query `include_archived` (bool, default false) | 200 `{data: Account[]}` | 401 |
| `POST /v1/accounts` | Bearer | no | `CreateAccountRequest` (name, type, currency, **`initial_balance`**, spendable) | 201 `Account` | 422 |
| `GET /v1/accounts/:id` | Bearer | — | path `id` | 200 `Account` | 404 |
| `GET /v1/accounts/:id/balance` | Bearer | — | path `id` | 200 `{account_id, balance}` (reconstructed from ledger, see [[Financial Ledger]]) | 404 |
| `DELETE /v1/accounts/:id` | Bearer | — | path `id` | 204 (archives, not hard-deletes) | 404 |

Note: request field is `initial_balance`, not `opening_balance` — confirmed by direct testing during a prior `/run` session against a live instance.

No update endpoint exists beyond archive — `AccountRepository.Update` is defined but has no handler wired to it.

## Categories

| Endpoint | Auth | Request/params | Response | Errors |
|---|---|---|---|---|
| `GET /v1/categories` | Bearer | query `kind` (income/expense), `include_archived` | 200 `{data: Category[]}` | 401 |
| `POST /v1/categories` | Bearer | `CreateCategoryRequest` (name, **`kind`**, icon) | 201 `Category` | 422 |
| `DELETE /v1/categories/:id` | Bearer | path `id` | 204 (archives custom category) | 404 |

Note: request field is `kind` (`income`/`expense`), not `type` — confirmed by direct testing. `is_default` categories cannot be archived by regular users (no admin category management, `CAT-004`).

## Ownership

Both scoped by `user_id`; categories additionally allow `user_id IS NULL` for shared default categories. See [[Authorization and Ownership]].

## Related notes

- [[Backend Modules]]
- [[Database Model]]
- [[API Overview]]
- [[SakuPlan]]
