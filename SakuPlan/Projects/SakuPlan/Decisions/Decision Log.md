---
title: SakuPlan Decision Log
project: SakuPlan
type: decision
status: active
tags:
  - project/sakuplan
  - decision/log
source: repository
last_synced: 2026-07-29
---

# Decision Log

No standalone `docs/DECISIONS.md` or `docs/DECISIONS_REQUIRED.md` file exists in the repository — confirmed absent by direct filesystem check. The closest analog is `docs/PRD.md` §21 ("Initial Default Decisions"), a table of technology/architecture defaults. The ADRs below formalize the significant decisions found across `docs/ARCHITECTURE.md`, `docs/PRD.md` §21, and confirmed implementation choices, in the standard ADR format.

| ADR | Title | Status |
|---|---|---|
| [[ADR-001]] | Fiber v3 as HTTP framework | Accepted |
| [[ADR-002]] | Modular monolith instead of microservices | Accepted |
| [[ADR-003]] | Clean Architecture dependency boundaries | Accepted |
| [[ADR-004]] | Uber Fx restricted to the composition root | Accepted |
| [[ADR-005]] | pgx v5 with explicit SQL over an ORM | Accepted |
| [[ADR-006]] | Hybrid ledger model (transaction + entries) | Accepted |
| [[ADR-007]] | Immutable reversal instead of mutation or deletion | Accepted |
| [[ADR-008]] | Integer minor-unit money representation | Accepted |
| [[ADR-009]] | OpenAPI-first client contract | Accepted |
| [[ADR-010]] | Deterministic financial engine, AI restricted to explanation | Accepted |
| [[ADR-011]] | Refresh-token rotation with family revocation | Accepted |
| [[ADR-012]] | PostgreSQL as the sole source of truth (no cached balance) | Accepted |

No decision in this log has been superseded or deprecated as of this synchronization.

## Related notes

- [[Product Requirements]] (PRD §21 source table)
- [[System Architecture]]
- [[SakuPlan]]
