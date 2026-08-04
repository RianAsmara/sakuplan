---
title: SakuPlan Authentication API
project: SakuPlan
type: api
status: active
tags:
  - project/sakuplan
  - api/auth
source: repository
last_synced: 2026-07-29
---

# Authentication API

Source: `api/openapi/openapi.yaml` (Authentication tag), `internal/adapters/httpapi/auth_handlers.go`. See [[Authentication and Sessions]] for the underlying mechanism.

| Endpoint | Auth | Idempotency | Request | Response | Errors | Use case |
|---|---|---|---|---|---|---|
| `POST /v1/auth/register` | none | no | `RegisterRequest` (email, password, display_name) | 201 `TokenPair` | 422 validation | `AuthService.Register` |
| `POST /v1/auth/login` | none | no | `LoginRequest` (email, password) | 200 `TokenPair` | 401 (generic — no user enumeration) | `AuthService.Login` |
| `POST /v1/auth/refresh` | none (bears refresh token in body) | no | `RefreshRequest` | 200 `TokenPair` | 401 | `AuthService.Refresh` |
| `POST /v1/auth/logout` | none (bears refresh token in body) | no | `RefreshRequest`-like | 204 | — | `AuthService.Logout` |
| `POST /v1/auth/logout-all` | Bearer | no | — | 204 | 401 | `AuthService.LogoutAll` |
| `GET /v1/me` | Bearer | no | — | 200 `User` | 401 | `UserService.Get` |
| `PUT /v1/me` | Bearer | no | `UpdateProfileRequest` | 200 `User` | 422, 401 | `UserService.Update` |

`TokenPair` = `{access_token, access_expires_at, refresh_token, refresh_expires_at, user}`. See [[Authentication and Sessions]] for token issuance/rotation mechanics and [[Financial Invariants]] table for related idempotency notes (auth endpoints are **not** idempotency-key protected — they aren't classified as retriable monetary mutations).

## Ownership

`logout-all`, `me` (GET/PUT) act only on the JWT-bound user; there is no path parameter to target another user.

## Related notes

- [[Authentication and Sessions]]
- [[API Overview]]
- [[Error Conventions]]
- [[SakuPlan]]
