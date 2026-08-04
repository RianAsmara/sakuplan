---
title: SakuPlan API Overview
project: SakuPlan
type: api
status: active
tags:
  - project/sakuplan
  - api/overview
source: repository
last_synced: 2026-07-29
---

# API Overview

Source of truth: `api/openapi/openapi.yaml` (OpenAPI 3.1.0, `info.version: 0.1.0`, 805 lines, 29 paths, 33 schemas). This note summarizes conventions; the spec file is authoritative for exact shapes.

## Base path and versioning

All endpoints (except `/healthz`, `/livez`, `/readyz`) live under `/v1`. Server URL in the spec: `http://localhost:8080` (dev default).

## Response envelope

`docs/API_CONVENTIONS.md` documents a `{"data": {...}, "meta": {...}}` success envelope with `meta` omitted when empty. **Note**: the actual OpenAPI spec and handlers mostly return the resource directly (e.g. `Account`, `Transaction`) rather than wrapping every response in `{"data": ...}` — list endpoints (`GET /v1/accounts`, `/v1/categories`, `/v1/transactions`, `/v1/bills`, `/v1/goals`) do use `{"data": [...]}`, and `/v1/transactions` additionally returns `meta.next_cursor` for pagination. Single-resource endpoints (`GET /v1/accounts/:id`, `POST /v1/transactions`, etc.) return the object directly, not wrapped in `data`. Treat `docs/API_CONVENTIONS.md`'s envelope description as the intent for **list** endpoints; single-resource responses are unwrapped in the current implementation.

## Error envelope (confirmed exact shape from code)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "human-readable message",
    "request_id": "uuid"
  }
}
```

Source: `internal/adapters/httpapi/server.go` `errorHandler`. See [[Error Conventions]] for the full status/code mapping table.

## Authentication

`Authorization: Bearer <access-token>` header. Enforced by `requireAuth` middleware on every `/v1` route except `auth/register`, `auth/login`, `auth/refresh`, `auth/logout`. See [[Authentication API]].

## Idempotency

`Idempotency-Key` header (8–128 chars), **required** on: `POST /v1/transactions`, `POST /v1/transactions/:id/reverse`, `POST /v1/goals/:id/contributions`. Same key + identical payload → original result returned unchanged. Same key + different payload → `409 IDEMPOTENCY_CONFLICT`. See [[Financial Invariants]].

## Dates and money

Timestamps: RFC3339 UTC. Calendar dates: `YYYY-MM-DD`. Money: JSON integer, minor units (e.g. IDR `100000` = Rp100.000) — floating-point amounts are invalid input.

## Pagination

Cursor-based, confirmed on `GET /v1/transactions` only: query params `limit` (1–200, default 50) and `cursor` (opaque string); response includes `meta.next_cursor`. Ordering is `(occurred_at DESC, id DESC)` per the underlying index — see [[Database Model]].

## Full endpoint index

| Group | Note |
|---|---|
| Health | this note (`/healthz`, `/livez`, `/readyz`) |
| Auth | [[Authentication API]] |
| Accounts | [[Financial Accounts API]] |
| Categories | [[Financial Accounts API]] |
| Transactions | [[Transactions API]] |
| Budgets | [[Budgets API]] |
| Bills | [[Bills API]] |
| Goals | [[Saving Goals API]] |
| Planning (safe-to-spend, recommendations) | [[Recommendations API]] |
| Reports | [[Reports API]] (not implemented) |

### Health endpoints

| Path | Method | Auth | Notes |
|---|---|---|---|
| `/healthz` | GET | none | Process liveness only |
| `/livez` | GET | none | Same handler as `/healthz` |
| `/readyz` | GET | none | Pings Postgres via `ports.HealthChecker`; 503 if unreachable |

## Related notes

- [[Error Conventions]]
- [[Financial Invariants]]
- [[SakuPlan]]
