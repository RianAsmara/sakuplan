---
title: SakuPlan Repository Structure
project: SakuPlan
type: architecture
status: active
tags:
  - project/sakuplan
  - engineering/architecture
source: repository
last_synced: 2026-07-29
---

# Repository Structure

Source repository: `/data/Gawai Duniawi/SaaS/sakuplan` (not a git repository — no `.git` directory present, so no commit history is available for this synchronization).

```text
sakuplan/
├── CLAUDE.md                      agent hard rules (money, DI, package boundaries)
├── README.md                      quick start, tech baseline, verification commands
├── compose.yaml                   postgres (default) + redis/mailpit (platform profile)
├── Taskfile.yml                   task runner: bootstrap/infra/migrate/run/verify/test/lint
├── Makefile                       thin wrapper
├── docs/
│   ├── PRD.md                     product requirements — see [[Product Requirements]]
│   ├── ARCHITECTURE.md            backend architecture — see [[System Architecture]]
│   ├── IMPLEMENTATION_PLAN.md     phase → requirement-ID mapping
│   ├── SECURITY.md                security baseline — see [[Security Controls]]
│   ├── API_CONVENTIONS.md         envelope/pagination/idempotency conventions
│   ├── P0_GAP_ANALYSIS.md         verified gap snapshot, dated 2026-07-24
│   └── PROGRESS.md                narrative log of verification runs
├── .github/workflows/backend.yml  CI — see [[CI and Quality Gates]]
└── api/                  the only implemented service
    ├── cmd/api/main.go             entrypoint: bootstrap.New().Run()
    ├── db/migrations/00001_core.sql   single migration — see [[Migrations]]
    ├── openapi/openapi.yaml        OpenAPI 3.1 contract — see [[API Overview]]
    ├── internal/
    │   ├── domain/                 entities, value objects, errors, repo interfaces
    │   ├── ports/                  driven-port interfaces (Clock, IDGenerator, ...)
    │   ├── application/            use cases — see [[Backend Modules]]
    │   ├── adapters/
    │   │   ├── httpapi/            Fiber transport, handlers, DTOs
    │   │   ├── postgres/           pgx-backed Store + repository adapters
    │   │   ├── security/           Argon2id, JWT, refresh-token manager
    │   │   └── system/             Clock, IDGenerator (UUIDv4)
    │   ├── bootstrap/              Uber Fx composition root — see [[Dependency Injection]]
    │   ├── config/                 env-var loading and validation
    │   └── testkit/                shared test helpers
    └── tests/integration/          Testcontainers PostgreSQL suite
```

## Package boundary rules (from `CLAUDE.md`, confirmed by inspection)

| Package | May import | Must not import |
|---|---|---|
| `internal/domain` | stdlib only | Fiber, pgx, Fx, JWT, env config |
| `internal/application` | `internal/domain`, `internal/ports`, stdlib | Fiber, pgx, Fx, env config |
| `internal/adapters/*` | domain, ports, application, framework/driver libraries | — |
| `internal/bootstrap` | everything — the only place Fx assembles concrete dependencies | — |
| `cmd/*` | `internal/bootstrap` only | everything else directly |

Verified: `internal/application`'s files import only `context`, `crypto/sha256`, `encoding/hex`, `encoding/json`, `errors`, `fmt`, `math`, `sort`, `strings`, `time`, plus `internal/domain`/`internal/ports`.

## Related notes

- [[System Architecture]]
- [[Backend Modules]]
- [[Dependency Injection]]
- [[Source Map]]
- [[SakuPlan]]
