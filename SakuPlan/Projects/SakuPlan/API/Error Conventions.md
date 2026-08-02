---
title: SakuPlan Error Conventions
project: SakuPlan
type: api
status: active
tags:
  - project/sakuplan
  - api/errors
source: repository
last_synced: 2026-07-29
---

# Error Conventions

Source: `internal/adapters/httpapi/server.go` `errorHandler` (exact mapping table, not the OpenAPI spec — the spec's `ErrorEnvelope` schema documents only the shape, not the concrete `code` values).

## Envelope

```json
{"error": {"code": "NOT_FOUND", "message": "resource was not found", "request_id": "..."}}
```

## Domain error → HTTP status mapping (exact, from source)

| Domain condition | HTTP | `code` | `message` |
|---|---|---|---|
| `*fiber.Error` (framework-level, e.g. unmatched route) | `fiberErr.Code` | `HTTP_ERROR` | `fiberErr.Message` |
| `domain.ValidationError` | 422 | `VALIDATION_ERROR` | always the fixed string `"validation failed"` (per-field detail in `Fields` is **not** surfaced) |
| `ErrInvalidInput`, `ErrInvalidAmount`, `ErrSameAccountTransfer` | 400 | `INVALID_REQUEST` | `err.Error()` |
| `ErrUnauthorized`, `ErrInvalidCredentials` | 401 | `UNAUTHORIZED` | fixed: `"authentication is required"` |
| `ErrForbidden`, `ErrInactiveUser` | 403 | `FORBIDDEN` | `err.Error()` |
| `ErrNotFound` | 404 | `NOT_FOUND` | fixed: `"resource was not found"` |
| `ErrIdempotencyConflict` | 409 | `IDEMPOTENCY_CONFLICT` | `err.Error()` |
| `ErrConflict`, `ErrBudgetOverallocated` | 409 | `CONFLICT` | `err.Error()` |
| unmatched (default) | 500 | `INTERNAL_ERROR` | fixed: `"an unexpected error occurred"` |

5xx responses are logged server-side (`slog.Error("request_failed", ...)`) with the raw error and request ID — never leaked to the client body.

## Discrepancy vs `docs/API_CONVENTIONS.md`

The docs describe a status-mapping table that includes `429` (rate limited) — **no rate limiting exists in code** (see [[Security Controls]]), so `429` is never actually returned today. The docs also show an error example with `"code": "VALIDATION_FAILED"` and a `"details": []` array; the actual code uses `"VALIDATION_ERROR"` (not `VALIDATION_FAILED`) and has no `details` field in the envelope — the `ValidationError.Fields` slice exists in Go but isn't serialized into the HTTP response. Treat the table above (from source) as authoritative over the docs prose.

## Related notes

- [[API Overview]]
- [[Security Controls]]
- [[SakuPlan]]
