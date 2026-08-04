# SakuPlan — Product Requirements Document

> **Document status:** Implementation-ready MVP specification  
> **Version:** 1.0.0  
> **Last updated:** 2026-07-24  
> **Primary readers:** Product, mobile, web admin, backend, QA, security, and AI coding agents  
> **Canonical source:** This file is the source of truth for product scope. Technical implementation details may refine, but must not silently contradict, this document.

---

## 0. Instructions for AI Coding Agents

Before implementing any feature:

1. Read this entire PRD.
2. Read `../CLAUDE.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `SECURITY.md`, and `API_CONVENTIONS.md`.
3. Implement only the requested phase or requirement IDs.
4. Do not introduce features marked **Post-MVP** or **Out of Scope**.
5. Do not use an LLM as the source of truth for money, balances, dates, bills, debt, or safe-to-spend calculations.
6. Do not duplicate financial business rules in mobile or admin web clients.
7. Preserve backward-compatible API behavior unless a documented decision explicitly authorizes a breaking change.
8. Add or update tests for every changed business rule.
9. Treat all monetary values as integer minor units. For IDR, `100000` means Rp100.000.
10. Every privileged or sensitive-data action must be auditable.
11. Update `PROGRESS.md` after completing a phase.

### Requirement language

- **MUST**: mandatory for the stated release.
- **SHOULD**: expected unless there is a documented reason not to.
- **MAY**: optional.
- Requirement IDs such as `AUTH-001` and `TXN-004` are stable references for implementation, tests, and issue tracking.

---

## 1. Product Summary

SakuPlan is an Indonesia-first personal budgeting platform consisting of:

1. A React Native mobile application for end users.
2. A web-based admin and operations console.
3. A Go backend API and worker serving both clients.

The product helps users answer:

> “How much money can I safely spend today without disturbing bills, savings commitments, and essential needs until my next payday?”

Users can create a budget manually or request an optional AI-assisted budget. The deterministic financial engine always performs the calculations. AI may explain, summarize, and propose scenarios, but it must never directly determine balances or silently apply changes.

### Working positioning

**Smart personal budget planner that protects bills, tracks goals, and calculates safe-to-spend until payday.**

### Primary market

- Indonesia
- Currency at MVP: IDR
- Language at MVP: Bahasa Indonesia
- Time zone default: Asia/Jakarta, editable by user

---

## 2. Problem Statement

Users often know their salary and account balance but cannot reliably determine:

- how much can be spent today;
- how much must remain reserved for upcoming bills;
- whether savings targets remain achievable;
- which spending categories are becoming risky;
- how to adjust a budget after an unexpected expense;
- whether the current month is financially healthy.

Traditional expense trackers are retrospective. They record what happened, but they often fail to translate data into an actionable daily spending limit.

---

## 3. Product Goals

### 3.1 User goals

- Create a realistic monthly budget in less than five minutes.
- Record a transaction in less than ten seconds.
- See updated account balances and budget consumption immediately.
- Know safe-to-spend for today and until next payday.
- Reserve money for recurring bills and savings goals.
- Receive understandable warnings before overspending.
- Obtain optional AI explanations without surrendering control.

### 3.2 Business goals

- Achieve a high onboarding-to-first-budget activation rate.
- Build a weekly habit around transaction recording and budget review.
- Establish a trustworthy privacy and security posture.
- Validate willingness to pay for advanced planning, reports, and AI assistance.

### 3.3 Non-goals for MVP

- Becoming a bank, wallet, lender, broker, or investment advisor.
- Moving money between external financial institutions.
- Providing regulated investment recommendations.
- Automatically reading all bank and e-wallet transactions.
- Creating a social financial network.

---

## 4. Personas

### P1 — Salaried employee

- Fixed monthly income and payday.
- Has rent/KPR, utilities, transport, food, and subscriptions.
- Main need: remain financially safe until payday.

### P2 — Young family

- Shared household expenses, child-related costs, debt, and savings goals.
- Main need: protect mandatory spending and understand household affordability.

### P3 — Variable-income worker

- Income may vary in amount and timing.
- Main need: conservative planning based on available cash and income history.
- Full irregular-income optimization is Post-MVP, but MVP data structures must not block it.

### P4 — Operations administrator

- Manages user account status, default categories, flags, templates, AI metadata, failed jobs, and audit logs.
- Must not have unrestricted access to users’ transaction details.

### P5 — Customer support agent

- Assists users with account and application issues.
- Sees masked financial information by default.
- Sensitive access requires explicit permission, reason, expiry, and audit trail.

---

## 5. Product Surfaces

### 5.1 Mobile application

Primary end-user surface for:

- registration and authentication;
- onboarding;
- accounts and balances;
- transactions and transfers;
- budgets;
- recurring bills;
- savings goals;
- safe-to-spend;
- reports and notifications;
- AI-assisted recommendation review;
- privacy and security controls.

### 5.2 Admin web

Internal surface for:

- administrator authentication and RBAC;
- user status management;
- default category management;
- feature flags;
- notification templates;
- operational metrics;
- AI request/failure metadata;
- failed background jobs;
- audit logs;
- controlled support tooling.

### 5.3 Go API and worker

Single source of truth for:

- authorization;
- validation;
- financial ledger and balance calculations;
- budget rules;
- safe-to-spend;
- recommendations;
- audit logging;
- asynchronous notifications and scheduled processing.

---

## 6. MVP Scope Summary

### P0 — Required

- Email/password registration and login.
- Access token and rotating refresh token sessions.
- Logout current session and all sessions.
- User profile and payday preferences.
- Financial accounts: cash, bank, e-wallet, savings, other.
- Default and custom categories.
- Income, expense, transfer, and adjustment ledger transactions.
- Idempotency for retriable financial mutation endpoints.
- Monthly budget periods and category allocations.
- Recurring bills and payment status.
- Savings goals and contributions.
- Deterministic safe-to-spend engine.
- Deterministic budget recommendation modes: conservative, balanced, flexible.
- Dashboard summaries and basic reports.
- Budget and bill notifications.
- Optional AI explanation interface, disabled safely when no provider is configured.
- Admin authentication, RBAC, user status, default categories, feature flags, audit logs.
- Export of user data in machine-readable format.
- Account deletion workflow.

### P1 — After MVP stabilization

- CSV import.
- OCR receipts.
- Android notification parsing with explicit permission.
- Home-screen widgets.
- Advanced subscription detection.
- Shared household budgets.
- Multi-currency.
- Bank or open-finance integration.
- Full irregular-income forecasting.
- Advanced AI chat.

---

## 7. Core Product Principles

### 7.1 Ledger first

Financial history is append-oriented and auditable. Updates that change monetary meaning SHOULD create reversal or adjustment records instead of mutating historical facts invisibly.

### 7.2 Deterministic calculations

Balances, totals, budget consumption, bills, goals, and safe-to-spend MUST be reproducible from stored data and deterministic rules.

### 7.3 Explicit user control

Recommendations are drafts. A recommendation MUST NOT change an active budget until the user explicitly applies it.

### 7.4 Privacy by default

Admin users see masked or aggregated financial data by default. Sensitive access is exceptional, permissioned, time-limited, reason-bound, and audited.

### 7.5 Mobile resilience

The mobile client may retry requests after connection failure. Financial mutation APIs MUST be idempotent.

---

## 8. Functional Requirements

## 8.1 Authentication and sessions

### AUTH-001 Registration

The system MUST allow a user to register using email, password, display name, accepted terms version, and privacy version.

Acceptance criteria:

- Email is normalized and unique case-insensitively.
- Password policy is validated server-side.
- Password is stored using Argon2id.
- A new active user receives an access token and refresh token.
- Registration creates an audit event.
- Duplicate email returns a stable conflict error without leaking credential state beyond the expected registration response.

### AUTH-002 Login

The system MUST authenticate active users using email and password.

Acceptance criteria:

- Invalid credentials return the same external error regardless of whether the email exists.
- Suspended or deleted users cannot log in.
- Successful login creates a session record and audit event.

### AUTH-003 Token model

- Access tokens MUST be short-lived JWTs.
- Refresh tokens MUST be opaque random values, stored only as secure hashes.
- Refresh tokens MUST rotate on each successful refresh.
- Reuse of an already-rotated token MUST revoke the related token family.

### AUTH-004 Logout

Users MUST be able to:

- revoke the current session;
- revoke all their sessions.

### AUTH-005 Mobile storage

The mobile app MUST store refresh credentials only in secure device storage. Tokens MUST NOT be persisted in plain AsyncStorage.

### AUTH-006 Admin authentication

Admin authentication MUST use separate authorization policies and SHOULD support MFA before production launch.

---

## 8.2 User profile and preferences

### USER-001 Profile

Users MUST be able to read and update:

- display name;
- locale;
- time zone;
- payday day-of-month;
- default currency;
- minimum safety buffer;
- AI consent state.

### USER-002 Payday handling

If the selected payday does not exist in a month, the effective payday MUST be the final calendar day of that month.

### USER-003 Status

Supported user statuses:

- `active`
- `suspended`
- `deletion_pending`
- `deleted`

### USER-004 Data deletion

Users MUST be able to request account deletion.

- Login and mutation capabilities are disabled when deletion completes.
- Legally or operationally required audit metadata may be retained in minimized form.
- Deletion execution MUST be asynchronous and auditable.

---

## 8.3 Financial accounts

### ACC-001 Account types

Supported MVP account types:

- `cash`
- `bank`
- `ewallet`
- `savings`
- `other`

### ACC-002 Create account

Fields:

- name;
- type;
- currency;
- initial balance;
- optional icon or display metadata.

### ACC-003 Balance

Account balance MUST be calculated from:

```text
initial_balance
+ incoming income entries
+ incoming transfer entries
+ positive adjustments
- expense entries
- outgoing transfer entries
- negative adjustments
```

A cached balance MAY be stored for performance but cannot replace the ledger as the source of truth.

### ACC-004 Archive

Accounts with transactions MUST be archived rather than hard-deleted.

### ACC-005 Ownership

A user MUST NOT read or mutate another user’s accounts.

---

## 8.4 Categories

### CAT-001 Default categories

The system MUST provide default income and expense categories.

### CAT-002 Custom categories

Users MAY create custom categories. Names must be unique within user, type, and active state as defined by API rules.

### CAT-003 Category deletion

A category referenced by transactions MUST be archived or disabled, not hard-deleted.

### CAT-004 Admin category management

Authorized admins MAY manage default categories. Changes MUST be audited and MUST NOT rewrite historical transaction labels.

---

## 8.5 Transaction ledger

### TXN-001 Transaction types

Supported types:

- `income`
- `expense`
- `transfer`
- `adjustment`

### TXN-002 Amount representation

- Amount MUST be an integer greater than zero.
- Sign is determined by entry direction, not by accepting arbitrary negative input.
- Floating-point monetary input is rejected.

### TXN-003 Income

Income MUST credit one account and MAY reference an income category.

### TXN-004 Expense

Expense MUST debit one account and MUST reference an expense category.

### TXN-005 Transfer

A transfer MUST:

- debit a source account;
- credit a different destination account;
- use the same currency in MVP;
- execute atomically in one database transaction.

### TXN-006 Adjustment

Adjustments exist for controlled corrections and opening reconciliation.

- User-initiated adjustments require a reason.
- Admin adjustments require elevated permission and audit event.
- Direct account balance editing is forbidden.

### TXN-007 Idempotency

Create income, expense, transfer, adjustment, goal contribution, and bill payment endpoints MUST accept `Idempotency-Key`.

- Same user, endpoint, key, and equivalent payload returns the original result.
- Same key with a different payload returns conflict.
- Idempotency records have a configurable retention period.

### TXN-008 Transaction editing

MVP SHOULD implement corrections using reversal-and-replacement semantics.

- Original transaction remains auditable.
- Reversal and replacement are linked.
- Reports exclude reversed impact while retaining history.

### TXN-009 Transaction list

Users can filter by:

- account;
- category;
- type;
- date range;
- amount range;
- search text;
- pagination cursor.

### TXN-010 Atomicity

All ledger writes and affected denormalized summaries MUST commit or roll back together.

---

## 8.6 Budget periods and allocations

### BUD-001 Budget period

A budget period contains:

- start date;
- end date;
- expected income;
- savings commitment;
- minimum safety buffer;
- status: `draft`, `active`, `closed`;
- source: `manual`, `rule_based`, `ai_assisted`.

### BUD-002 Overlap

A user MUST NOT have overlapping active budget periods.

### BUD-003 Allocations

Budget allocations map expense categories to integer monetary limits.

### BUD-004 Validation

The system MUST warn or reject activation when:

```text
fixed bills + savings commitment + minimum buffer + category allocations
> expected income
```

Activation policy:

- mandatory obligations are always shown;
- explicit user override MAY be allowed only with a high-risk warning and audit event;
- a negative safe-to-spend result remains visible and is not clamped silently.

### BUD-005 Consumption

Budget spent amount is derived from non-reversed expense transactions occurring within the budget period.

### BUD-006 Copy prior budget

Users MAY copy the most recent compatible budget into a new draft.

### BUD-007 Close period

Closing a budget freezes its configuration for normal user edits but does not prevent late transaction posting. Reports must identify late-posted transactions.

---

## 8.7 Recurring bills

### BILL-001 Bill definition

Fields:

- name;
- amount;
- due day;
- frequency;
- category;
- preferred account;
- reminder lead days;
- active status.

### BILL-002 Frequencies

MVP frequencies:

- monthly;
- weekly;
- yearly.

### BILL-003 Upcoming reservation

Unpaid bill occurrences due before the next payday MUST reduce safe-to-spend.

### BILL-004 Mark paid

Marking a bill paid SHOULD create an expense transaction atomically and link it to the bill occurrence.

### BILL-005 Duplicate prevention

Paying a bill occurrence MUST be idempotent.

---

## 8.8 Savings goals

### GOAL-001 Goal fields

- name;
- target amount;
- current amount derived from contributions;
- target date;
- optional monthly commitment;
- priority;
- status.

### GOAL-002 Contribution

Contributions MAY debit an account and MUST create auditable financial records.

### GOAL-003 Progress

The system MUST expose:

- contributed amount;
- remaining amount;
- percentage progress;
- recommended monthly contribution using deterministic arithmetic;
- projected completion date where data is sufficient.

### GOAL-004 Over-contribution

The API MAY allow over-contribution but MUST return a clear completed state and amount above target.

---

## 8.9 Safe-to-spend engine

### STS-001 Definition

Safe-to-spend is not account balance. It is the amount available for discretionary use after protected obligations.

### STS-002 Base formula

```text
available_liquid_balance
- unpaid_bills_due_before_next_payday
- remaining_savings_commitment
- minimum_safety_buffer
= safe_to_spend_until_payday
```

### STS-003 Daily value

```text
safe_to_spend_until_payday / remaining_calendar_days_including_today
= daily_safe_to_spend
```

Rounding MUST be deterministic and documented. MVP rounds toward zero for display safety and carries the remainder in the total.

### STS-004 Liquid accounts

MVP liquid account types:

- cash;
- bank;
- e-wallet.

Savings accounts are excluded by default unless user marks them as spendable.

### STS-005 Negative value

Negative safe-to-spend MUST remain negative and trigger a high-risk state.

### STS-006 Explainability

The response MUST include all major components used in the calculation.

### STS-007 Time zone

Date boundaries MUST use the user’s configured time zone.

---

## 8.10 Budget recommendations

### REC-001 Deterministic first

Recommendation calculations MUST be implemented in a deterministic rule engine.

### REC-002 Modes

- `conservative`
- `balanced`
- `flexible`

### REC-003 Inputs

- expected income;
- fixed bills;
- debt or mandatory payments;
- savings target;
- safety buffer;
- dependants;
- historical category spending when available;
- locked categories;
- selected mode.

### REC-004 Output

- category allocations;
- savings commitment;
- buffer;
- daily safe-to-spend estimate;
- warnings;
- reason codes;
- recommendation version.

### REC-005 Validation

Recommendations MUST pass the same budget activation validators as manual budgets.

### REC-006 Apply

Applying a recommendation creates or updates a draft budget only after explicit confirmation.

### REC-007 AI explanation

An AI provider MAY transform structured reason codes into natural-language explanation.

- Numeric source fields are supplied by the deterministic engine.
- The returned explanation is treated as untrusted presentation text.
- Failure falls back to template-based explanation.

---

## 8.11 Dashboard and reports

### RPT-001 Dashboard

The mobile dashboard MUST include:

- liquid balance;
- safe-to-spend today;
- safe-to-spend until payday;
- days until payday;
- current budget used and remaining;
- upcoming bill;
- savings-goal progress;
- largest spending categories.

### RPT-002 Cash-flow report

Report fields:

- income;
- expenses;
- net cash flow;
- category breakdown;
- budget vs actual;
- trend by day or week.

### RPT-003 Consistency

Report values MUST use the same ledger rules as account and budget summaries.

### RPT-004 Export

Users MUST be able to request an export containing their profile, accounts, categories, transactions, budgets, bills, goals, and consent metadata.

---

## 8.12 Notifications and background jobs

### NOTIF-001 Preferences

Users can independently enable or disable:

- bill reminders;
- budget 80% alert;
- budget exceeded alert;
- daily spending warning;
- goal behind-plan reminder;
- weekly summary.

### NOTIF-002 Idempotent delivery

A scheduled notification occurrence MUST not be delivered more than once per channel unless a retry is required after a confirmed failure.

### NOTIF-003 Channels

MVP:

- push notification;
- email for security-sensitive events and account lifecycle.

### NOTIF-004 Job reliability

Background jobs require:

- retry policy;
- dead-letter or failed-job visibility;
- traceable job ID;
- structured error metadata;
- admin retry capability with audit log.

---

## 8.13 Admin and operations

### ADM-001 Roles

Initial roles:

- `super_admin`
- `operations_admin`
- `support_agent`
- `auditor`

### ADM-002 Permissions

Permissions are explicit capabilities, not hard-coded role checks inside handlers.

Examples:

- `users.read`
- `users.status.update`
- `categories.default.manage`
- `feature_flags.manage`
- `audit.read`
- `jobs.read`
- `jobs.retry`
- `sensitive_data.request`
- `sensitive_data.approve`
- `sensitive_data.view`

### ADM-003 User management

Authorized admins MAY:

- search users by ID or email;
- view status and non-sensitive profile metadata;
- suspend or reactivate accounts;
- view session count;
- initiate support workflows.

### ADM-004 Sensitive financial data

- Monetary details are masked or aggregated by default.
- Support agents cannot view raw transaction notes or merchants by default.
- Sensitive access requires a reason, approved permission, expiration, and audit entry.
- A user-facing transparency log SHOULD be considered Post-MVP.

### ADM-005 Feature flags

Admin can manage server-defined feature flags with environment and audience constraints. Financial correctness rules MUST NOT be bypassable through ordinary feature flags.

### ADM-006 Audit logs

Audit records MUST include:

- actor type and ID;
- action;
- target type and ID;
- timestamp;
- request ID;
- source IP where appropriate;
- reason;
- before/after metadata with sensitive field filtering;
- result.

Audit logs are append-only through the application interface.

---

## 9. Business Rules

### BR-001 Money

- Integer minor units only.
- IDR has zero decimal minor units in MVP.
- No floating-point persistence or arithmetic.

### BR-002 Ownership

Every end-user resource query MUST include or verify the authenticated user ID.

### BR-003 Date handling

- Persist timestamps in UTC.
- Interpret budgeting and payday boundaries in user time zone.
- API dates use ISO 8601.

### BR-004 Reversal

A reversed transaction has zero net impact when paired with its reversal entry, but both remain visible in audit history.

### BR-005 Transfer

Transfers are never counted as income or expense in cash-flow reports.

### BR-006 Savings contributions

Internal movement to a savings account may be a transfer, not an expense. Goal progress is linked separately to avoid distorting expense reports.

### BR-007 Mandatory obligations

Recurring bills and configured savings commitments are protected before discretionary safe-to-spend.

### BR-008 Concurrency

Concurrent financial writes affecting the same account MUST be safe under database transactions and appropriate locking or serialized balance update strategy.

### BR-009 Idempotency hash

Payload equivalence for an idempotency key is determined from a canonical request hash.

### BR-010 Pagination

Large lists use cursor-based pagination with stable ordering by `(occurred_at, id)` or equivalent.

---

## 10. API Capability Map

The exact OpenAPI contract is maintained in `../api/openapi/openapi.yaml`.

### Public/authenticated end-user API groups

```text
/auth/register
/auth/login
/auth/refresh
/auth/logout
/auth/logout-all
/me
/accounts
/categories
/transactions
/budgets
/bills
/goals
/safe-to-spend
/recommendations
/reports
/notification-preferences
/exports
```

### Admin API groups

```text
/admin/auth
/admin/users
/admin/default-categories
/admin/feature-flags
/admin/jobs
/admin/audit-logs
/admin/sensitive-access-requests
```

### API conventions

- Base path: `/v1`
- JSON only for MVP API.
- Stable machine-readable error codes.
- Request ID returned in headers and error body.
- Idempotency key required for designated endpoints.
- OpenAPI-generated TypeScript client is used by mobile and admin web.

---

## 11. Data Model Summary

Primary entities:

- `users`
- `user_credentials`
- `sessions`
- `refresh_tokens`
- `financial_accounts`
- `categories`
- `transactions`
- `transaction_entries`
- `budget_periods`
- `budget_allocations`
- `recurring_bills`
- `bill_occurrences`
- `saving_goals`
- `saving_goal_contributions`
- `recommendations`
- `recommendation_allocations`
- `notification_preferences`
- `feature_flags`
- `roles`
- `permissions`
- `role_permissions`
- `admin_assignments`
- `audit_logs`
- `idempotency_records`
- `sensitive_access_requests`

### Ledger model decision

MVP uses a **hybrid double-entry-inspired ledger**:

- A transaction is the business event.
- Each transaction has one or more account entries.
- Income and expense use one user account entry plus a classified external direction.
- Transfer uses balanced debit and credit entries between two user accounts.
- The implementation avoids a full accounting chart of accounts while preserving reliable transfers, balances, and auditability.

---

## 12. Non-Functional Requirements

### NFR-001 Availability

Target MVP API monthly availability: 99.5%, excluding announced maintenance.

### NFR-002 Performance

Under normal load:

- P95 simple read endpoint: < 300 ms server time.
- P95 transaction creation: < 500 ms excluding external notifications.
- Safe-to-spend response: < 500 ms.

### NFR-003 Scalability

The modular monolith MUST support horizontal API replicas. No correctness-critical state may live only in process memory.

### NFR-004 Reliability

- Financial writes use SQL transactions.
- Retriable jobs are idempotent.
- Graceful shutdown stops accepting requests and drains in-flight work within configured timeout.

### NFR-005 Observability

- Structured JSON logs.
- Request ID and trace ID propagation.
- Metrics for request rate, latency, error rate, DB pool, token refresh reuse, job retries, and recommendation failures.
- Distributed traces for API, DB, worker, and external providers.

### NFR-006 Accessibility

Mobile and admin web SHOULD meet WCAG 2.2 AA practices for supported components.

### NFR-007 Localization

All user-facing strings are localizable. Backend error codes are language-neutral.

### NFR-008 Compatibility

Mobile supports the active Expo-supported Android/iOS range selected at implementation time. Admin web supports current evergreen browsers.

---

## 13. Security and Privacy Requirements

### SEC-001 Passwords

Argon2id with calibrated parameters and per-password random salt.

### SEC-002 Tokens

- JWT algorithm allowlist.
- Issuer and audience validation.
- Short access-token TTL.
- Opaque refresh tokens stored hashed.
- Rotation and reuse detection.

### SEC-003 Transport

TLS required outside local development.

### SEC-004 Secrets

Secrets come from secret management or environment injection and are never committed.

### SEC-005 Rate limits

Rate limits apply to login, registration, refresh, password reset, export, and sensitive admin endpoints.

### SEC-006 Data minimization

Only data required for a feature is collected and sent to external providers.

### SEC-007 AI privacy

Raw account numbers, credentials, names, addresses, and unnecessary transaction descriptions MUST NOT be sent to AI providers.

### SEC-008 Audit filtering

Audit metadata must not contain passwords, tokens, full secrets, or unnecessarily complete financial payloads.

### SEC-009 Dependency security

CI runs vulnerability scanning and blocks known high/critical issues according to the project security policy.

### SEC-010 Database access

Application database roles use least privilege. Production migrations SHOULD use a separate role.

---

## 14. AI Requirements and Guardrails

### AI-001 Optional capability

The product works without an AI provider.

### AI-002 Structured boundary

The AI interface receives a minimized structured recommendation result, not raw ledger data unless a future approved feature explicitly requires it.

### AI-003 Output validation

AI text is not parsed as authoritative monetary data.

### AI-004 User consent

AI requests require user opt-in and a recorded consent version.

### AI-005 Failure behavior

If AI is unavailable:

- deterministic recommendation still succeeds;
- template explanation is returned;
- the user is not blocked from budgeting.

### AI-006 Cost controls

- per-user quotas;
- request size limits;
- caching by deterministic recommendation version and locale where safe;
- operational usage metrics.

---

## 15. Analytics Events

Minimum events:

- `registration_completed`
- `onboarding_completed`
- `account_created`
- `transaction_created`
- `transfer_created`
- `budget_draft_created`
- `budget_activated`
- `safe_to_spend_viewed`
- `bill_created`
- `bill_paid`
- `goal_created`
- `goal_contribution_created`
- `recommendation_generated`
- `recommendation_applied`
- `recommendation_rejected`
- `ai_explanation_requested`
- `export_requested`
- `account_deletion_requested`

Analytics payloads MUST avoid raw notes, merchants, token values, and unnecessary monetary detail.

---

## 16. Success Metrics

### Activation

A user is activated after:

- onboarding completion;
- at least one financial account;
- first budget created or explicitly skipped;
- at least three transactions.

Track:

- onboarding completion rate;
- time to first account;
- time to first transaction;
- first budget creation rate;
- recommendation generation and acceptance rate.

### Engagement

- weekly active users;
- transactions per active user;
- safe-to-spend views per week;
- budget review frequency;
- monthly budget renewal rate.

### Retention

- D7 and D30 retention;
- second-month budget creation;
- recurring bill adoption;
- goal contribution recurrence.

### Reliability and trust

- financial calculation incident count;
- duplicate transaction rate;
- token-reuse detections;
- support complaints related to unexplained numbers;
- AI explanation failure rate.

---

## 17. Monetization Direction

### Free

- core manual transactions;
- limited accounts;
- monthly budget;
- safe-to-spend;
- limited goals;
- basic reports;
- limited recommendation generations.

### Premium

- unlimited accounts and goals;
- advanced reports;
- multiple budget scenarios;
- extended exports;
- weekly financial review;
- higher AI quota;
- household features when released.

Security, data access, data deletion, and export of legally required user data MUST NOT be withheld as premium-only protections.

---

## 18. Out of Scope for MVP

- Direct payment execution.
- Loans or credit underwriting.
- Investment execution or recommendations.
- Cryptocurrency portfolio tracking.
- Automatic bank scraping.
- Full double-entry general ledger for businesses.
- Tax filing.
- Multi-tenant business accounting.
- Public social profiles.
- Kubernetes as a mandatory deployment requirement.
- Premature microservice decomposition.

---

## 19. Release Phases

### Phase 0 — Foundation

- Repository structure.
- Go API and worker composition roots.
- PostgreSQL and migrations.
- Fiber routing, configuration, logging, health checks.
- CI, lint, tests, vulnerability scanning.

### Phase 1 — Identity

- Registration, login, refresh rotation, logout.
- Profile and session controls.

### Phase 2 — Accounts and categories

- Account CRUD/archive.
- Default and custom categories.

### Phase 3 — Ledger

- Income, expense, transfer, adjustment.
- Idempotency and reversal.
- Balances and lists.

### Phase 4 — Budgeting

- Budget periods and allocations.
- Budget summaries and alerts.

### Phase 5 — Bills and goals

- Recurring bills and occurrences.
- Goal contributions and progress.

### Phase 6 — Safe-to-spend and reports

- Deterministic engine.
- Dashboard and reporting aggregates.

### Phase 7 — Recommendations

- Rule-based modes.
- Draft apply flow.
- Optional AI explanation adapter.

### Phase 8 — Admin and operations

- RBAC.
- User status.
- Default categories.
- Flags, jobs, audit logs, controlled sensitive access.

### Phase 9 — Hardening

- Export and deletion.
- Observability.
- Security testing.
- Performance and recovery testing.

---

## 20. Definition of Done

A requirement is complete only when:

- acceptance criteria are implemented;
- API contract is updated;
- unit tests cover business branches;
- handler tests cover success and expected error mapping;
- repository integration tests cover SQL behavior where applicable;
- race-sensitive code is tested with `go test -race` in CI;
- lint, formatting, and static analysis pass;
- no secret or sensitive data is logged;
- observability is added for critical paths;
- security impact is reviewed;
- documentation and `PROGRESS.md` are updated.

---

## 21. Initial Default Decisions

| Decision | Default |
|---|---|
| Backend framework | Fiber v3 |
| Go version | Go 1.26.x stable |
| Architecture | Modular monolith with clean boundaries |
| DI | Constructor injection; Uber Fx at composition root only |
| Database | PostgreSQL |
| Driver | pgx v5 |
| Migration | Goose v3, SQL migrations |
| Money | int64 minor units |
| Ledger | Hybrid transaction + entries model |
| Auth | JWT access + opaque rotating refresh tokens |
| Password hashing | Argon2id |
| API | REST JSON, OpenAPI 3.1 |
| Mobile | React Native + Expo + TypeScript |
| Web admin | Next.js App Router + TypeScript |
| Server state clients | TanStack Query |
| Mobile local state | Zustand only for local/UI state |
| Background jobs | Redis-backed worker, introduced when notifications require it |
| AI | Optional explanation/scenario adapter after deterministic engine |
| Deployment | Containers; managed PostgreSQL preferred |

---

## 22. Glossary

- **Ledger:** auditable record of financial events and account entries.
- **Safe-to-spend:** discretionary money available after protected obligations.
- **Budget period:** time-bounded expected-income and allocation plan.
- **Idempotency:** repeated equivalent request produces one financial effect.
- **Reversal:** new record that neutralizes a previous transaction without deleting history.
- **Liquid account:** account considered available for near-term spending.
- **Recommendation:** proposed budget configuration not yet applied.
- **AI explanation:** natural-language presentation of deterministic results.
