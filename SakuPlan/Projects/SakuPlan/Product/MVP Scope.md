---
title: SakuPlan MVP Scope
project: SakuPlan
type: product
status: active
tags:
  - project/sakuplan
  - product/scope
source: repository
last_synced: 2026-07-29
---

# MVP Scope

Source: `docs/PRD.md` §6, §18. See [[Product Requirements]] for the full requirement inventory this scope boundary governs.

## P0 — required for MVP

Auth & sessions; user profile & payday preferences; financial accounts (cash/bank/ewallet/savings/other); default & custom categories; income/expense/transfer/adjustment ledger with idempotency; monthly budget periods & allocations; recurring bills & payment status; savings goals & contributions; deterministic safe-to-spend; deterministic recommendation modes (conservative/balanced/flexible); dashboard summaries & basic reports; budget/bill notifications; optional AI explanation interface (safely disabled without a provider); admin auth/RBAC/user status/default categories/feature flags/audit logs; user data export; account deletion workflow.

**Implemented so far** (backend only): auth & sessions, user profile, accounts, categories, ledger, budgets, bills (partial), goals, safe-to-spend, recommendations (deterministic part).

**Not yet implemented, still P0**: dashboard/reports, notifications, admin/RBAC, AI explanation adapter, account deletion, data export. See [[Remaining Work]].

## P1 — after MVP stabilization

CSV import · OCR receipts · Android notification parsing (explicit permission) · home-screen widgets · advanced subscription detection · shared household budgets · multi-currency · bank/open-finance integration · full irregular-income forecasting · advanced AI chat.

## Explicit non-goals (PRD §3.3, §18)

Not a bank, wallet, lender, broker, or investment advisor. No moving money between external institutions. No regulated investment advice. No automatic reading of all bank/e-wallet transactions (no scraping). No social financial network. No tax filing. No multi-tenant business accounting. No mandatory Kubernetes requirement. No premature microservice decomposition — see [[ADR-002]].

## Release phasing

Two phase numbering schemes exist across the docs and are not perfectly aligned — see the discrepancy noted in [[Implementation Status]]. `docs/IMPLEMENTATION_PLAN.md` is the more authoritative source for requirement-ID-to-phase mapping (it maps `AUTH-*`/`USER-001` → Phase 1, `ACC-*`/`CAT-*` → Phase 2, `TXN-*` → Phase 3, `BUD-*` → Phase 4, `BILL-*`/`GOAL-*` → Phase 5, `STS-*`/`REC-001..006` → Phase 6). Phases 0–6 are implemented; Phase 7 (API completeness: dashboard/reports/export/notification prefs), Phase 8 (admin), and Phase 9 (hardening: OTel, rate limiting, security/load tests) are not started.

## Related notes

- [[Product Requirements]]
- [[Implementation Status]]
- [[Remaining Work]]
- [[SakuPlan]]
