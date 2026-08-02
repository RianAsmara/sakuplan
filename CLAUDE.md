# SakuPlan Agent Instructions

Read these files before changing code:

- `@docs/PRD.md`
- `@docs/ARCHITECTURE.md`
- `@docs/IMPLEMENTATION_PLAN.md`
- `@docs/SECURITY.md`
- `@docs/API_CONVENTIONS.md`
- `@docs/PROGRESS.md`

## Hard rules

- Implement only explicitly requested requirement IDs or phases.
- Go API owns all financial business rules.
- Use Fiber v3 and Go 1.26.x.
- Use constructor injection in domain/application code.
- Uber Fx is allowed only in composition roots and infrastructure module wiring.
- Domain and application packages must not import Fiber, pgx, Fx, JWT libraries, or environment configuration.
- Use `int64` minor units for money. Never use floating point.
- Use database transactions for multi-record financial mutations.
- Require idempotency for retriable monetary mutation endpoints.
- AI cannot be the source of truth for calculations.
- Add unit, handler, and repository integration tests appropriate to the change.
- Run format, lint, tests, race tests, and vulnerability checks before completion.
- Never log passwords, access tokens, refresh tokens, secrets, or complete sensitive financial payloads.
- Update `docs/PROGRESS.md` after completing work.

## Completion report

Report:

1. Requirement IDs implemented.
2. Files changed.
3. Database migrations added.
4. Commands run.
5. Test and lint results.
6. Remaining risks or deferred work.

## Repository commands

Run from the repository root:

```bash
task bootstrap
task infra:up
task migrate:up
task run
task verify
task test:integration
```

The integration suite requires Docker. Never report a command as passed unless it was actually executed and its exit status was successful.

## Core package boundaries

- `internal/domain`: entities, value objects, errors, repository contracts; no external framework imports.
- `internal/application`: use cases and deterministic financial rules; no Fiber, pgx, Fx, or environment imports.
- `internal/adapters`: Fiber, PostgreSQL, cryptography, clock, and ID implementations.
- `internal/bootstrap`: the only place where Uber Fx assembles concrete dependencies.
- `cmd`: process entry points only.

When adding a feature, start from the application use case and tests, then add persistence and transport adapters. Do not begin with a handler or database table unless the requirement is infrastructure-only.
