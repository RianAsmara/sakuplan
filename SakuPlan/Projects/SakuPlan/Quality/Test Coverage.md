---
title: SakuPlan Test Coverage
project: SakuPlan
type: quality
status: active
tags:
  - project/sakuplan
  - quality/coverage
source: repository
last_synced: 2026-07-29
---

# Test Coverage

Source: `docs/P0_GAP_ANALYSIS.md` coverage snapshot table, generated via `task coverage` (`go test -coverprofile=coverage.out ./internal/...`), dated 2026-07-24. This is a **snapshot**, not a live measurement — re-run `task coverage` for current numbers.

| Package | Coverage | Note |
|---|---|---|
| `internal/domain` | 18.8% | Flagged in the source doc itself as "the standout gap" — most business-rule branches are exercised indirectly through `application` tests rather than direct domain unit tests |
| `internal/application` | 66.5% | Core business-rule coverage lives here |
| `internal/adapters/httpapi` | 40.4% | |
| `internal/adapters/postgres` | 0.0% | Covered instead by `tests/integration` (tagged `integration`, excluded from this coverage run) |
| `internal/adapters/security` | 79.3% | |
| `internal/adapters/system` | 84.2% | |
| `internal/config` | 81.2% | |
| `internal/bootstrap` | 0.0% | Composition root — expected, not exercised by unit tests |
| `internal/testkit` | 0.0% | Test helpers — expected |
| **Total (`internal/...`)** | **33.5%** | |

## Interpretation

The gap analysis's own recommendation: direct `domain` package unit-test coverage is the clearest coverage gap relative to `docs/PRD.md` §20's Definition of Done ("unit tests cover business branches"). Since much of the confidence in ledger/budget correctness currently comes from `application`-layer tests exercising domain types indirectly, a regression introduced directly in `internal/domain` (e.g. a `Money` arithmetic edge case) is less likely to be caught by a domain-level test than by an application-level one.

## Related notes

- [[Testing Strategy]]
- [[Implementation Status]]
- [[SakuPlan]]
