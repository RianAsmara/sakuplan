# SakuPlan Backend Architecture

## 1. Architecture style

The backend is a modular monolith using clean architecture boundaries:

```text
Transport (Fiber HTTP)
        ↓
Application use cases
        ↓
Domain models and ports
        ↑
Infrastructure adapters (PostgreSQL, JWT, Argon2id, clock, ID generator)
```

Dependency direction always points inward. Domain and application packages do not import Fiber, pgx, Uber Fx, or configuration packages.

## 2. Dependency injection

- Ordinary constructors are the primary DI mechanism.
- Interfaces are declared at the consumer boundary.
- Uber Fx is used only in `internal/bootstrap` and `cmd/*` to assemble the object graph and lifecycle hooks.
- Tests instantiate services directly with fakes; they do not require Fx.

## 3. Modules

- identity: users, credentials, sessions, refresh rotation
- accounts: financial accounts and balance views
- categories: default and user categories
- ledger: transactions, entries, reversals, idempotency
- budgets: periods, allocations, activation, summaries
- bills: recurring definitions and payment occurrences
- goals: savings goals and contributions
- planning: safe-to-spend and deterministic recommendations
- admin: RBAC, feature flags, user status, audit logs
- platform: configuration, database, logging, clock, IDs, security adapters

## 4. Ledger model

A transaction is a business event; entries represent account effects.

- Income: one credit entry.
- Expense: one debit entry.
- Transfer: one debit and one credit entry in one SQL transaction.
- Adjustment: one signed-direction entry with mandatory reason.
- Reversal: a new transaction linked to the original, with opposite entries.

Balances are derived from initial balance and non-voided entries. A future cached balance table may be introduced only with reconciliation tests.

## 5. Transaction boundaries

The application uses `ports.UnitOfWork` for atomic operations. PostgreSQL repositories detect the transaction stored in context. Use cases remain database-agnostic.

## 6. Authentication

- Access token: short-lived JWT HS256 for MVP, strict issuer/audience/algorithm validation.
- Refresh token: 256-bit opaque random value.
- Only SHA-256 refresh-token hashes are stored.
- Rotation creates a successor and revokes the current token.
- Reuse of a replaced token revokes the family.
- Passwords use Argon2id.

Production may migrate JWT signing to asymmetric keys or managed KMS without changing application interfaces.

## 7. HTTP

- Fiber v3 adapter.
- `/livez` is process liveness.
- `/readyz` checks PostgreSQL.
- Versioned API base `/v1`.
- Stable error envelope and request IDs.
- Authentication middleware writes verified principal data into request-local context.
- Fiber context values are copied into Go values before asynchronous use.

## 8. Persistence

- PostgreSQL is the source of truth.
- pgxpool handles connections.
- Goose SQL migrations are immutable after release.
- SQL constraints enforce ownership-independent invariants where practical.
- Every repository query that returns user resources scopes by `user_id`.

## 9. Testing strategy

- Domain tests: pure unit tests.
- Application tests: fake repositories and deterministic clocks/IDs.
- HTTP tests: Fiber `app.Test` with fake application services.
- Repository integration tests: Testcontainers PostgreSQL under `integration` build tag.
- Contract checks: OpenAPI validation in CI.
- Race tests: `go test -race ./...` in CI.

## 10. Observability

The scaffold provides structured `slog` logging and request IDs. Production phase adds:

- OpenTelemetry traces.
- Prometheus metrics.
- DB pool metrics.
- refresh-token reuse alerts.
- idempotency conflicts.
- financial transaction failure metrics.

## 11. Future worker

Notification scheduling and exports will run in a separate `cmd/worker` process. It will share application packages but use dedicated queue adapters. Jobs must be idempotent and observable.
