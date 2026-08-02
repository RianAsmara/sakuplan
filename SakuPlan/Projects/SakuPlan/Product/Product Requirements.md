---
title: SakuPlan Product Requirements
project: SakuPlan
type: product
status: active
tags:
  - project/sakuplan
  - product/requirements
source: repository
last_synced: 2026-07-29
---

# Product Requirements

Source of truth: `docs/PRD.md` (v1.0.0, last updated 2026-07-24, 34KB). This note is a navigable summary — the PRD itself remains canonical; do not treat this note as authoritative if it drifts from the source file.

## Product summary

SakuPlan is an Indonesia-first personal budgeting platform answering one core question: **"How much money can I safely spend today without disturbing bills, savings commitments, and essential needs until my next payday?"**

Three surfaces are planned:
- **Mobile app** (React Native + Expo + TypeScript) — end-user surface. [[Remaining Work#Mobile|not yet implemented]].
- **Admin web** (Next.js App Router + TypeScript) — operations console. [[Remaining Work#Admin web|not yet implemented]].
- **Go API + worker** — single source of truth for authorization, validation, ledger, budget rules, safe-to-spend, recommendations, audit. This is the only surface currently implemented — see [[System Architecture]].

Market: Indonesia; MVP currency IDR; MVP language Bahasa Indonesia; default timezone `Asia/Jakarta` (user-editable). The deterministic financial engine always performs calculations; AI (when configured) may only explain/summarize, never determine or silently apply monetary changes — see [[Security Controls]] (AI-001 through AI-006).

## Personas

| Persona | Summary |
|---|---|
| P1 — Salaried employee | Fixed monthly income/payday; rent, utilities, transport, food, subscriptions |
| P2 — Young family | Shared household expenses, child costs, debt, savings goals |
| P3 — Variable-income worker | Variable income timing/amount; conservative planning. Full irregular-income optimization is Post-MVP |
| P4 — Operations administrator | Manages user status, categories, flags, audit logs; no unrestricted access to transaction detail |
| P5 — Customer support agent | Sees masked financial info by default; sensitive access requires reason + expiry + audit |

## Core product principles (PRD §7)

1. **Ledger first** — financial history is append-oriented and auditable; corrections use reversal/adjustment records, not invisible mutation.
2. **Deterministic calculations** — balances, budgets, bills, goals, safe-to-spend must be reproducible from stored data.
3. **Explicit user control** — recommendations are drafts; never silently apply to an active budget.
4. **Privacy by default** — admin sees masked/aggregated data; sensitive access is exceptional and audited.
5. **Mobile resilience** — financial mutation APIs must be idempotent to survive mobile retries.

## Functional requirements by area

Full requirement text lives in `docs/PRD.md` §8. Status column reflects verified implementation state — see [[Implementation Status]] for the evidence behind each verdict.

### Authentication and sessions (`AUTH-*`)
| ID | Requirement | Status |
|---|---|---|
| AUTH-001 | Registration (email/password/display name) | Implemented |
| AUTH-002 | Login, identical error for invalid credentials/unknown email | Implemented |
| AUTH-003 | Short-lived JWT access + rotating opaque refresh tokens, reuse revokes family | Implemented |
| AUTH-004 | Logout current session / all sessions | Implemented |
| AUTH-005 | Mobile stores refresh token only in secure device storage | N/A (mobile not built) |
| AUTH-006 | Separate admin authentication policy, MFA before launch | Not implemented |

### User profile (`USER-*`)
| ID | Requirement | Status |
|---|---|---|
| USER-001 | Read/update display name, locale, timezone, payday, currency, buffer, AI consent | Implemented |
| USER-002 | Payday clamps to last calendar day when day doesn't exist in month | Implemented |
| USER-003 | Status enum: active/suspended/deletion_pending/deleted | Implemented (enum only — see USER-004) |
| USER-004 | Account deletion request → async execution, audit trail | Not implemented |

### Financial accounts (`ACC-*`) / Categories (`CAT-*`)
| ID | Requirement | Status |
|---|---|---|
| ACC-001 | Account types: cash, bank, ewallet, savings, other | Implemented |
| ACC-002 | Create account: name, type, currency, initial balance | Implemented |
| ACC-003 | Balance = initial_balance + ledger entries (income/transfer-in/+adjustment − expense/transfer-out/−adjustment) | Implemented |
| ACC-004 | Archive instead of hard-delete | Implemented |
| ACC-005 | Ownership: no cross-user account access | Implemented (via `ErrNotFound`, see [[Authorization and Ownership]]) |
| CAT-001 | Default income/expense categories | Implemented (9 seeded categories) |
| CAT-002 | Custom categories, unique per user/kind/active-state | Implemented |
| CAT-003 | Referenced categories archived, not hard-deleted | Implemented |
| CAT-004 | Admin category management, audited, no history rewrite | Not implemented (no admin surface) |

### Transaction ledger (`TXN-*`)
| ID | Requirement | Status |
|---|---|---|
| TXN-001 | Types: income, expense, transfer, adjustment | Implemented (+ `reversal` as a 5th internal type) |
| TXN-002 | Integer amount > 0; direction from entry, not sign | Implemented |
| TXN-003 | Income credits one account | Implemented |
| TXN-004 | Expense debits one account, requires expense category | Implemented |
| TXN-005 | Transfer: debit source + credit destination, same currency, atomic | Implemented |
| TXN-006 | Adjustment requires reason; no direct balance edit | Implemented (direction inferred from `"debit:"` reason prefix) |
| TXN-007 | Idempotency-Key required on retriable monetary mutations | Implemented |
| TXN-008 | Corrections via reversal, original stays auditable | Implemented |
| TXN-009 | Filterable/paginated transaction list | Partially implemented (cursor pagination by `(occurred_at, id)`; not all filters (amount range, search text) confirmed in handler) |
| TXN-010 | Ledger writes atomic | Implemented (`ports.UnitOfWork`) |

### Budgets (`BUD-*`)
| ID | Requirement | Status |
|---|---|---|
| BUD-001 | Budget period fields incl. status/source | Implemented |
| BUD-002 | No overlapping active periods per user | Implemented (Postgres `EXCLUDE` constraint) |
| BUD-003 | Allocations map category → integer limit | Implemented |
| BUD-004 | Reject/warn when obligations exceed income | Implemented (rejects — no override path) |
| BUD-005 | Spend derived from non-reversed expenses in period | Not directly verified (no consumption/report endpoint found — see [[Reports API]]) |
| BUD-006 | Copy prior budget into new draft | Not implemented |
| BUD-007 | Closing freezes config, late postings still allowed | Not implemented (no explicit close endpoint) |

### Recurring bills (`BILL-*`)
| ID | Requirement | Status |
|---|---|---|
| BILL-001 | Bill fields: name, amount, due day, frequency, category, account, reminder days | Implemented |
| BILL-002 | Frequencies: monthly, weekly, yearly | Partially implemented — enum has all three, `BillService.Create` currently accepts only `monthly` |
| BILL-003 | Unpaid bills before payday reduce safe-to-spend | Implemented |
| BILL-004 | Marking bill paid creates linked expense transaction | Not implemented (no "pay bill" use case in `BillService`) |
| BILL-005 | Paying a bill occurrence is idempotent | N/A (BILL-004 not implemented) |

### Savings goals (`GOAL-*`)
| ID | Requirement | Status |
|---|---|---|
| GOAL-001 | Goal fields incl. derived current amount | Implemented |
| GOAL-002 | Contribution debits account, auditable | Implemented |
| GOAL-003 | Progress: contributed/remaining/%, recommended monthly, projected completion | Partially implemented — contributed/remaining derivable from repo methods; no dedicated progress endpoint confirmed |
| GOAL-004 | Over-contribution allowed, clear completed state | Not explicitly verified |

### Safe-to-spend (`STS-*`)
| ID | Requirement | Status |
|---|---|---|
| STS-001–STS-007 | Deterministic safe-to-spend, liquid-account scoping, timezone-aware, explainable, negative-value handling | Implemented — see [[Safe-to-Spend Engine]] |

### Recommendations (`REC-*`)
| ID | Requirement | Status |
|---|---|---|
| REC-001–REC-006 | Deterministic rule-based recommendation, 3 modes, same validators as manual budgets, draft-only apply | Implemented — see [[Budget Recommendation Engine]] |
| REC-007 | AI explanation adapter over deterministic reason codes | Not implemented |

### Reports (`RPT-*`) / Notifications (`NOTIF-*`) / Admin (`ADM-*`) / AI (`AI-*`)
All **not implemented**. No dashboard, cash-flow report, export, notification, admin RBAC, or AI adapter code exists anywhere in `internal/`. See [[Remaining Work]] and the P0 gap analysis discrepancy notes in [[Implementation Status]].

## Cross-cutting business rules (PRD §9)

`BR-001` integer money only · `BR-002` every query scoped by user ID · `BR-003` UTC storage, user-timezone interpretation, ISO 8601 dates · `BR-004` reversal has zero net impact, both sides stay visible · `BR-005` transfers excluded from income/expense reports · `BR-006` savings contributions modeled as transfer-like movement, tracked separately from expense reports · `BR-007` bills/savings protected before discretionary spend · `BR-008` concurrent writes safe under DB transactions/locking · `BR-009` idempotency key equivalence via canonical request hash · `BR-010` cursor pagination ordered by `(occurred_at, id)`.

## Non-functional requirements (PRD §12)

| ID | Target | Verified? |
|---|---|---|
| NFR-001 | 99.5% monthly availability | Not measured (no prod deployment) |
| NFR-002 | P95 read <300ms, txn create <500ms, safe-to-spend <500ms | Not measured |
| NFR-003 | Horizontal API replicas, no correctness-critical in-memory state | Consistent with design (Postgres is sole state) |
| NFR-004 | SQL-transactional writes, idempotent jobs, graceful drain | Implemented for writes/shutdown; no jobs exist yet |
| NFR-005 | Structured logs, request/trace IDs, metrics, traces | Partial — logs + request ID only, no metrics/tracing — see [[Observability]] |
| NFR-006 | WCAG 2.2 AA | N/A (no UI yet) |
| NFR-007 | Localizable strings, language-neutral error codes | Error codes are language-neutral; no UI to localize yet |
| NFR-008 | Mobile/browser compatibility ranges | N/A (no UI yet) |

## Related notes

- [[MVP Scope]] — P0/P1 boundary and out-of-scope list
- [[Implementation Status]] — requirement-by-requirement evidence
- [[System Architecture]] — how these requirements map to code
- [[Financial Invariants]] — BR-001, BR-004–BR-009 in implementation detail
- [[Security Controls]] — SEC-*/AI-* requirement status
- [[SakuPlan]] — project map
