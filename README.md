# SakuPlan

SakuPlan is an Indonesia-first smart personal budgeting platform. This repository contains the complete product specification, the core Go backend, and the mobile app's authentication flow.

## Included

- Claude-friendly PRD with stable requirement IDs and acceptance criteria.
- Clean-architecture Go backend using Fiber v3.
- Constructor dependency injection in domain/application code.
- Uber Fx only in the composition root and lifecycle wiring.
- PostgreSQL 17 schema and Goose migration, with the local image pinned to PostgreSQL 17.10.
- Hybrid transaction ledger with atomic transfers, immutable reversals, and idempotency.
- Authentication with Argon2id, short-lived JWT access tokens, opaque rotating refresh tokens, and refresh-token reuse detection.
- Accounts, categories, budgets, recurring monthly bills, saving goals, safe-to-spend, deterministic budget recommendations, dashboard/cash-flow reports, and export.
- OpenAPI 3.1 contract.
- Unit, HTTP adapter, security adapter, configuration, race, and Testcontainers PostgreSQL integration tests.
- Docker Compose, Dockerfile, Taskfile, Make wrapper, and GitHub Actions workflow.
- Expo + TypeScript + Tamagui mobile app with a working Register/Login/Home/Logout flow against the API, a generated typed OpenAPI client, Zustand auth state, and secure token storage.

## Repository layout

```text
.
├── CLAUDE.md
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── SECURITY.md
│   ├── API_CONVENTIONS.md
│   └── PROGRESS.md
├── api/
│   ├── cmd/api/
│   ├── internal/domain/
│   ├── internal/application/
│   ├── internal/adapters/
│   ├── internal/bootstrap/
│   ├── db/migrations/
│   ├── openapi/
│   └── tests/integration/
├── mobile/
│   ├── app/
│   ├── src/
│   └── tamagui.config.ts
├── compose.yaml
├── Taskfile.yml
└── Makefile
```

## Technology baseline

- Go 1.26.5
- Fiber v3.4
- PostgreSQL 17
- pgx v5
- Uber Fx
- Argon2id
- JWT v5
- Testcontainers for Go

## Quick start

Install Go 1.26.5, Docker, Docker Compose, and Task.

```bash
cp .env.example .env
task bootstrap
task infra:up
task migrate:up
task run
```

API endpoints:

```text
GET  http://localhost:8080/healthz
GET  http://localhost:8080/livez
GET  http://localhost:8080/readyz
```

The required local service is:

- PostgreSQL: `localhost:5432`

Optional platform services can be started with:

```bash
task infra:up:platform
```

This additionally starts:

- Redis: `localhost:6379`
- Mailpit SMTP: `localhost:1025`
- Mailpit web: `localhost:8025`

Redis and Mailpit are reserved for later worker and notification phases. Object storage is intentionally deferred until export requirements and the provider decision are finalized.

## Mobile quick start

Install Node.js and Expo's platform tooling for whichever target you're building for (Xcode for iOS, Android Studio for Android — web needs neither). With the API already running (see above):

```bash
task mobile:install
task mobile:start
```

Press `i` for iOS simulator, `a` for Android emulator, or `w` for web in the Expo CLI, or run `task mobile:ios` / `task mobile:android` / `task mobile:web` directly. The app talks to the API at `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:8080`, matching `task run`'s default port — copy `mobile/.env.example` to `mobile/.env` to override).

Other mobile tasks:

```bash
task mobile:test         # Jest unit tests
task mobile:typecheck    # tsc --noEmit
task mobile:lint         # expo lint
task mobile:verify       # typecheck + lint + test
task mobile:generate-api # regenerate the typed client from api/openapi/openapi.yaml
```

## Verification

```bash
task fmt:check
task vet
task test
task test:race
task test:integration
task build
task lint
```

Or run the standard local verification suite:

```bash
task verify
```

Integration tests start an isolated PostgreSQL container and apply the real migration:

```bash
task test:integration
```

Generate coverage:

```bash
task coverage
```

## Database migrations

```bash
task migrate:up
task migrate:down
```

Never edit a migration that has already been released. Add a new numbered migration instead.

## Core financial invariants

- Monetary values are `int64` minor units; no floating-point arithmetic is allowed.
- The ledger is the source of truth for balances.
- Transfers produce debit and credit entries in one SQL transaction.
- Corrections use immutable reversal transactions.
- Retried monetary commands require `Idempotency-Key`.
- A reused idempotency key with a different payload is rejected.
- AI never calculates or directly changes authoritative monetary values.

## Working with Claude Code

Start Claude Code at the repository root and reference the canonical documents:

```text
Read @CLAUDE.md, @docs/PRD.md, @docs/ARCHITECTURE.md,
@docs/IMPLEMENTATION_PLAN.md, @docs/SECURITY.md,
and @docs/API_CONVENTIONS.md.

Inspect the repository and implement only the explicitly requested requirement IDs.
Do not change unrelated modules. Run the required verification commands and update
@docs/PROGRESS.md before finishing.
```

A good first continuation prompt is:

```text
Read @CLAUDE.md and all canonical documents.
Inspect the implemented core backend and its tests.
Do not modify code yet.
Create a gap analysis mapping every P0 requirement in @docs/PRD.md to:
implemented, partially implemented, or not implemented.
Write the result to @docs/P0_GAP_ANALYSIS.md and propose the next smallest phase.
```

## Current boundary

The supplied backend is a production-oriented **core**, not the entire P0 product. The mobile app currently covers only the authentication flow (Register/Login/Home/Logout) — every other mobile screen (accounts, transactions, budgets, bills, goals, safe-to-spend, reports, notifications, AI review), admin web, background notifications, bank synchronization, and AI-provider integration remain explicit later phases. The deterministic recommendation engine is already implemented; an LLM may later provide explanations only after deterministic validation.
