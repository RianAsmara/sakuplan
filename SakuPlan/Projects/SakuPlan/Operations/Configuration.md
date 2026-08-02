---
title: SakuPlan Configuration
project: SakuPlan
type: operations
status: active
tags:
  - project/sakuplan
  - operations/configuration
source: repository
last_synced: 2026-07-29
---

# Configuration

Source: `services/api/internal/config/config.go`. **No secret values are reproduced here** — only variable names, defaults, and validation rules, per the safety requirements of this synchronization.

| Env var | Default | Validation |
|---|---|---|
| `APP_ENV` | `development` | none (only `"development"` is special-cased, for log format) |
| `HTTP_ADDRESS` | `:8080` | none |
| `DATABASE_URL` | *(none)* | **required**, else startup fails |
| `DB_MAX_CONNS` | `10` | must be a positive integer |
| `JWT_SECRET` | *(none)* | **required, ≥32 characters** — validated twice (config load + `security.NewJWTManager`) |
| `JWT_ISSUER` | `sakuplan-api` | none |
| `JWT_AUDIENCE` | `sakuplan-client` | none |
| `ACCESS_TOKEN_TTL` | `15m` | must parse as a Go duration |
| `REFRESH_TOKEN_TTL` | `720h` (30 days) | must parse as a Go duration |
| `SHUTDOWN_TIMEOUT` | `10s` | must parse as a Go duration |

Validation order in `Load()`: duration/int fields parsed first (short-circuits on first parse failure) → `DATABASE_URL` empty-check → `JWT_SECRET` length-check. A malformed duration therefore surfaces before a missing `DATABASE_URL` would.

## Never log or commit

`.env` is gitignored. Per `CLAUDE.md`: never log passwords, access tokens, refresh tokens, secrets, or complete sensitive financial payloads. Argon2id parameters are fixed in code (`security.DefaultArgon2Config()`), not configurable via environment.

## Related notes

- [[Local Development]]
- [[Authentication and Sessions]]
- [[Security Controls]]
- [[SakuPlan]]
