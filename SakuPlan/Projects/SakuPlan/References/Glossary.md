---
title: SakuPlan Glossary
project: SakuPlan
type: reference
status: active
tags:
  - project/sakuplan
  - reference/glossary
source: repository
last_synced: 2026-07-29
---

# Glossary

Source: `docs/PRD.md` §22, extended with implementation-specific terms confirmed in code.

| Term | Definition |
|---|---|
| **Ledger** | The append-only record of transactions and their entries; the sole source of truth for balances. See [[Financial Ledger]]. |
| **Safe-to-spend** | Amount available for discretionary use today, after protected obligations (bills, savings, buffer) are reserved — not the same as account balance. See [[Safe-to-Spend Engine]]. |
| **Budget period** | A date-bounded plan (draft/active/closed) with expected income, savings commitment, buffer, and category allocations. See [[Database Model]]. |
| **Idempotency** | Property that retrying the same monetary mutation with the same `Idempotency-Key` and payload produces the same result without duplicate side effects. See [[Financial Invariants]]. |
| **Reversal** | An immutable, linked correction transaction that offsets an original transaction's entries; the original is never mutated or deleted. See [[ADR-007]]. |
| **Liquid account** | An account type counted toward safe-to-spend by default (cash, bank, e-wallet) — savings accounts are excluded unless explicitly marked spendable. |
| **Recommendation** | A deterministic, rule-based proposed budget allocation, computed by a pure function with no persistence side effects until a user explicitly applies it. See [[Budget Recommendation Engine]]. |
| **AI explanation** | A planned (not yet implemented) adapter that would turn deterministic reason codes into natural-language text — never a source of monetary truth. See [[ADR-010]]. |
| **Money (`domain.Money`)** | Named `int64` type representing minor currency units (e.g. IDR has zero decimal places, so `100000` = Rp100.000). See [[ADR-008]]. |
| **Transaction entry** | A single signed effect (credit/debit) of a transaction on one account; a transaction has one or more entries. See [[Financial Ledger]]. |
| **Unit of Work** | `ports.UnitOfWork.WithinTransaction` — the abstraction wrapping multi-record financial mutations in one SQL transaction. See [[Dependency Injection]]. |
| **Family (session family)** | The chain of rotated refresh-token sessions descending from a single login; reuse of a rotated token revokes the whole family. See [[Authentication and Sessions]]. |
| **Composition root** | `internal/bootstrap` — the only place Uber Fx assembles concrete dependencies. See [[Dependency Injection]]. |

## Related notes

- [[Product Requirements]]
- [[Financial Ledger]]
- [[SakuPlan]]
