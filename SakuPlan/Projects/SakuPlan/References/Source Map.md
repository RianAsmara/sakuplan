---
title: SakuPlan Source Map
project: SakuPlan
type: reference
status: active
tags:
  - project/sakuplan
  - reference/source-map
source: repository
last_synced: 2026-07-29
---

# Source Map

Quick lookup from documentation topic to repository-relative source path. Repository root: `/data/Gawai Duniawi/SaaS/sakuplan`.

| Topic | Primary source paths |
|---|---|
| Product requirements | `docs/PRD.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Implementation plan / phases | `docs/IMPLEMENTATION_PLAN.md` |
| Security baseline | `docs/SECURITY.md` |
| API conventions | `docs/API_CONVENTIONS.md` |
| Verified gap snapshot | `docs/P0_GAP_ANALYSIS.md` |
| Verification log | `docs/PROGRESS.md` |
| Agent hard rules | `CLAUDE.md` |
| Entities, value objects, errors, repo interfaces | `services/api/internal/domain/{entities,types,repositories}.go` |
| Driven-port interfaces | `services/api/internal/ports/ports.go` |
| Auth use cases | `services/api/internal/application/auth.go` |
| User profile use cases | `services/api/internal/application/users.go` |
| Account use cases | `services/api/internal/application/accounts.go` |
| Category use cases | `services/api/internal/application/categories.go` |
| Transaction/ledger use cases | `services/api/internal/application/transactions.go` |
| Overflow-safe money math | `services/api/internal/application/money_math.go` |
| Budget use cases | `services/api/internal/application/budgets.go` |
| Bill and goal use cases | `services/api/internal/application/bills_goals.go` |
| Safe-to-spend and recommendations | `services/api/internal/application/planning.go` |
| Fiber routes, middleware, error mapping | `services/api/internal/adapters/httpapi/server.go` |
| Auth HTTP handlers | `services/api/internal/adapters/httpapi/auth_handlers.go` |
| Account/category/transaction HTTP handlers | `services/api/internal/adapters/httpapi/finance_handlers.go` |
| Budget/bill/goal/planning HTTP handlers | `services/api/internal/adapters/httpapi/planning_handlers.go` |
| Request/response DTOs | `services/api/internal/adapters/httpapi/dto.go` |
| Postgres store, transactions, SQL | `services/api/internal/adapters/postgres/store.go` |
| Postgres connection pool | `services/api/internal/adapters/postgres/pool.go` |
| Postgres health check | `services/api/internal/adapters/postgres/health.go` |
| Repository adapters | `services/api/internal/adapters/postgres/repositories.go` |
| Argon2id password hashing | `services/api/internal/adapters/security/password.go` |
| JWT + refresh-token manager | `services/api/internal/adapters/security/token.go` |
| Clock and ID generator | `services/api/internal/adapters/system/system.go` |
| Uber Fx composition root | `services/api/internal/bootstrap/app.go` |
| Config loading/validation | `services/api/internal/config/config.go` |
| Process entrypoint | `services/api/cmd/api/main.go` |
| Database schema | `services/api/db/migrations/00001_core.sql` |
| OpenAPI contract | `services/api/openapi/openapi.yaml` |
| PostgreSQL integration tests | `services/api/tests/integration/postgres_test.go` |
| CI workflow | `.github/workflows/backend.yml` |
| Local infra (Postgres/Redis/Mailpit) | `compose.yaml` |
| Task runner | `Taskfile.yml` |

## Related notes

- [[Repository Structure]]
- [[Glossary]]
- [[SakuPlan]]
