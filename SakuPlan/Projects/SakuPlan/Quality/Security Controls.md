---
title: SakuPlan Security Controls
project: SakuPlan
type: quality
status: active
tags:
  - project/sakuplan
  - quality/security
  - security
source: repository
last_synced: 2026-07-29
---

# Security Controls

Source: `docs/SECURITY.md`, `docs/P0_GAP_ANALYSIS.md`, confirmed against `internal/adapters/security/*`. See [[Authentication and Sessions]] and [[Authorization and Ownership]] for implementation depth.

## Implemented ✅

| Control | Detail |
|---|---|
| Argon2id password hashing | Memory 64 MiB, iterations 3, parallelism 2, salt 16B, key 32B, constant-time verify — [[Authentication and Sessions]] |
| JWT access tokens | HS256 only (allowlisted), issuer/audience/expiry validated, injectable clock, ≥32-char secret enforced | 
| Refresh-token rotation | Opaque 256-bit tokens, SHA-256 hash stored (never plaintext), atomic Postgres CTE rotation |
| Refresh-token reuse detection | Replaying an already-rotated token revokes the entire session family |
| Session revocation | Logout (single session) and logout-all (all sessions for user) |
| Ownership scoping | Every resource query scoped by `user_id` — [[Authorization and Ownership]] |
| Secure error handling | 5xx internals never leaked to client body, only server logs |
| Idempotency protection | `Idempotency-Key` + payload-hash conflict detection on monetary mutations |
| Secrets via environment | `.env` gitignored; no secrets committed; config validated at startup (`JWT_SECRET` ≥32 chars, `DATABASE_URL` required) |
| Audit logging (partial) | `audit_logs` table + `Store.AppendAudit`, called from auth (`Register`) and profile-update (`UserService.Update`) mutations — **not** wired into account/transaction/budget/bill/goal services |
| Dependency vulnerability scanning | `govulncheck ./...` in CI — 0 reachable vulnerabilities as of last verified run (1 unreachable transitive advisory, `golang.org/x/crypto/openpgp`, not imported/called) |

## Not implemented ⛔ / 🚧

| Control | Status | Evidence |
|---|---|---|
| Admin authentication / RBAC (`AUTH-006`, `ADM-001..006`) | Absent | `role` JWT claim exists but no middleware reads it; no `/admin/*` routes; no `permissions`/`role_permissions`/feature-flag tables |
| Rate limiting (`SEC-005`) | Absent | No limiter middleware, no 429 handling anywhere in `internal/` |
| CORS / security headers | Absent | No `cors.New()` or security-header middleware found in `server.go` — only `recover.New()` and the custom `requestContext` are registered |
| Account deletion workflow (`USER-004`) | Absent | `UserStatusDeletionPending` enum exists; no service/handler/route drives it |
| AI data minimization (`SEC-006`/`SEC-007`) | N/A | No AI integration exists yet to violate or satisfy this |
| Observability / metrics for security events (token-reuse alerts, etc.) | Partial | Logs + request ID only; no metrics/tracing — see [[Observability]] |
| TLS (`SEC-003`) | Out of scope for this backend | Expected to be handled by a reverse proxy/load balancer in deployment, not application code |

## Lint-flagged security-adjacent findings (`docs/P0_GAP_ANALYSIS.md`, 27 total golangci-lint findings, none fixed as of last run)

- 1× `gosec G115` — `int`→`uint32` conversion in `internal/adapters/security/password.go:69` (`uint32(len(expected))`); doc's own assessment: "low real-world risk, but worth an explicit `#nosec` justification or bounds check."
- 1× `nilerr` — `AuthService.Logout` returns `nil` when session lookup fails; doc's own assessment: "intentional (idempotent logout, avoids leaking token validity), not a defect."
- 12× `govet shadow` — shadowed `err` in `auth.go`, `transactions.go`, `bills_goals.go`; doc's own assessment: "appears to be intentional idiomatic nesting rather than a masked-error bug, but should be reviewed deliberately."
- 13× `bodyclose` — unclosed HTTP response bodies, but **test-only** (`server_test.go`), no production risk per the doc.

## Related notes

- [[Authentication and Sessions]]
- [[Authorization and Ownership]]
- [[Observability]]
- [[Implementation Status]]
- [[SakuPlan]]
