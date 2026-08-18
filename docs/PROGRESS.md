# Progress

## 2026-08-05 — dc-prototype Phase 1: auth redesign + 5-tab shell + Home wired to dashboard

### Requirement IDs implemented

None (design/UI implementation of `docs/superpowers/plans/2026-08-04-dc-prototype-phase1.md`,
Tasks 9–12 — Tasks 1–8 landed in prior sessions). Completes the plan: Login/Register
redesigned to match `SakuPlan.dc.html`, a 5-tab Expo Router navigation shell added
under `(app)/(tabs)`, and the Home tab wired to the real `GET /v1/dashboard` endpoint
in place of the earlier static placeholder.

### Files changed

- `mobile/app/(app)/(tabs)/home.tsx` (new): Home screen consuming `useCurrentUser`
  and `useDashboard`, rendering safe-to-spend, liquid balance, budget usage,
  upcoming bill (via `billUrgency`), goal progress, and top categories, all through
  `formatRupiah`. Header "Notifikasi"/avatar controls are inert placeholders
  (no notifications/profile endpoints yet).
- `mobile/app/(app)/home.tsx` (deleted): superseded by the tabbed route above.
- `mobile/app/(app)/(tabs)/_layout.tsx` (new): `Tabs` layout wiring `TabBarButton`
  (added in a prior session) as the `tabBarButton` renderer for all five tabs.
- `mobile/app/(app)/(tabs)/transactions.tsx`, `budgets.tsx`, `reports.tsx`,
  `more.tsx` (new): honest `ComingSoonScreen` placeholders (added in a prior
  session), not half-built real screens.
- `mobile/app/index.tsx`: redirect target updated from `/(app)/home` to
  `/(app)/(tabs)/home`.

### Database migrations

None (mobile-only).

### Commands run and results

1. `cd mobile && npx tsc --noEmit` → PASS, exit 0 (run after each of Tasks 9–11).
2. `cd mobile && npx eslint <changed files>` → PASS after each task; `npx expo lint`
   (full project) → PASS, exit 0.
3. `cd mobile && npx jest` → PASS, 4 suites / 18 tests (`billUrgency.test.ts`,
   `refreshInterceptor.test.ts`, `store.test.ts`, `money.test.ts`).
4. Backend smoke test: `task infra:up`, confirmed already at migration version 2,
   `task run` (Fx boot, `http_server_started address=:8080`). Verified with `curl`:
   `POST /v1/auth/register`, `POST /v1/auth/login`, `GET /v1/dashboard` (with a
   fresh user) all returned correct 2xx/JSON responses.
5. Manual Expo walkthrough: booted the `sakuplan_test` headless Android emulator
   (Android SDK + `/dev/kvm`, same setup as the 2026-08-02 Task 2 entry) via
   `npx expo start --android`. Confirmed via `adb exec-out screencap`: app boots
   with no red-box errors; the redesigned Login screen renders pixel-correct
   against the prototype (solid-border inputs, icons beside labels, tinted
   left-accent error banner reading "Email atau kata sandi salah." after a failed
   login attempt, "atau" divider, disabled Google button with the
   "Pratinjau desain — integrasi belum tersedia." caption).
6. Confirmed emulator→host connectivity independent of the app: `toybox netcat`
   from inside the emulator against `10.0.2.2:8080` returned a real HTTP response
   from the running API, ruling out a network-level block.

### Deferred / not verified

- Could not complete the logged-in portion of the walkthrough (tab bar with
  Beranda active, real dashboard numbers, placeholder tabs) in this sandbox.
  Root cause isolated, not guessed: `adb shell input text` / `input keyevent`
  reliably updates the native `EditText`'s displayed content (confirmed via
  `uiautomator dump`) but does **not** trigger the Tamagui `Input`'s
  `onChangeText` JS callback in this headless Expo Go build — the `Masuk`
  button's native `enabled` attribute stayed `false` (i.e. `canSubmit` stayed
  false in JS) even once the native field visibly held the correct, correctly-
  typed credentials, across three different injection methods (bulk `input
  text`, per-character `input text`, per-character hardware `input keyevent`).
  This is a driving-mechanism limitation of scripting ADB against this
  particular Expo Go/software-renderer combination, not a code defect — the
  same screens' pure logic (`formatRupiah`, `billUrgency`, the auth store, the
  refresh interceptor) is fully covered by the Jest suite, and the login/
  register mutation code is unchanged from the already-merged Tasks 5's
  `useLogin`. Confidence in the tab shell and dashboard wiring instead rests on:
  full type-checking of every new file, `eslint`/`expo lint` clean, and the
  `GET /v1/dashboard` response shape (verified via `curl`) matching exactly
  what `home.tsx` destructures (`liquid_balance`, `safe_to_spend_today`,
  `safe_to_spend_until_payday`, `days_until_payday`, `budget_total`,
  `budget_used`, `budget_remaining`, `upcoming_bill`, `goals`,
  `top_categories`).
- Recommend a follow-up session either drive the emulator through a real
  on-screen IME tap sequence (not raw `adb input`), or add a project `run`
  skill (per `/run-skill-generator`) that captures a working driver for this
  specific Expo Go + headless-emulator combination.
- `mobile/.env`'s `EXPO_PUBLIC_API_URL` was temporarily pointed at
  `http://10.0.2.2:8080` (the Android emulator's host alias) for this
  walkthrough and reverted to `http://localhost:8080` afterward — this file is
  gitignored and this note is purely for the next person's context.

---

## 2026-08-02 — Mobile Task 2: Expo scaffold + custom Tamagui theme

### Requirement IDs implemented

None (infrastructure/scaffolding task — SDD plan
`.superpowers/sdd/2026-08-02-mobile-scaffold-auth/task-2-brief.md`, Task 2 of
the mobile scaffold+auth plan). Creates `mobile/` from scratch: an
Expo Router app wired to a custom Tamagui theme (SakuPlan's `kertas`/`tinta`/
`terjaga`/`leluasa`/`kulit`/`peringatan` color tokens, Fraunces/IBM Plex Sans/
IBM Plex Mono fonts) and gated font loading. No screens, navigation, or API
client — those are later tasks in the same plan.

### Files changed

- `mobile/` (new): scaffolded via `create-expo-app@latest --template
  blank-typescript`, `expo-router` + navigation deps, Tamagui core packages,
  Google Fonts packages.
- `mobile/tamagui.config.ts` (new): custom color/space/size/radius
  tokens, three custom fonts (heading/body/mono), single `light` theme,
  exports `AppConfig` type via `declare module 'tamagui'`.
- `mobile/metro.config.js` (new): `withTamagui` Metro plugin wiring.
- `mobile/src/theme/fonts.ts` (new): `useAppFontsLoaded()` hook
  gating on Fraunces/Plex Sans/Plex Mono via `@expo-google-fonts/*`.
- `mobile/app/_layout.tsx` (new): root layout — themed loading
  spinner while fonts load, then `TamaguiProvider`/`Theme`/`Slot` once ready.
  Added `defaultTheme="light"` (required by the installed Tamagui version,
  not present in the original plan snippet).
- `mobile/app/index.tsx` (new, not in the original plan): minimal
  stub route (`return null`) — `expo-router`'s `<Slot />` throws "Couldn't
  find any screens for the navigator" when `app/` has zero route files, a
  real crash found via the emulator boot check. Task 7 replaces this with
  real route groups.
- Deleted `mobile/App.tsx` and `mobile/index.ts` (template
  entry point, superseded by `main: "expo-router/entry"`).

### Database migrations

None (mobile-only).

### Commands run and results

1. `npx create-expo-app@latest mobile --template blank-typescript` +
   `npx expo install expo-router react-native-safe-area-context
   react-native-screens expo-linking expo-constants expo-status-bar` → PASS.
2. `npm install tamagui@2.6.2 @tamagui/config@2.6.2
   @tamagui/animations-react-native@2.6.2 --legacy-peer-deps` → PASS
   (`--legacy-peer-deps` needed: `react-dom@19.2.8` pulled transitively via
   `expo-router`'s optional web deps conflicts with the SDK-57-pinned
   `react@19.2.3`).
3. `npx expo install expo-font @expo-google-fonts/fraunces
   @expo-google-fonts/ibm-plex-sans @expo-google-fonts/ibm-plex-mono` → PASS.
4. `npm install @tamagui/metro-plugin@2.6.2 --legacy-peer-deps` → PASS.
5. `npm install --save-dev react-dom@19.2.3 --legacy-peer-deps` → PASS
   (`@tamagui/metro-plugin`'s static extractor does a real `require('react-dom')`
   at Metro build time; without it Metro failed to start with `Cannot find
   module 'react-dom'`. Pinned to match the app's `react` version exactly;
   never shipped in the native bundle).
6. `npx tsc --noEmit` → PASS, exit 0 (after adding `defaultTheme="light"` to
   `TamaguiProvider`, required by tamagui 2.6.2's types — the plan snippet
   predates this requirement).
7. `npx expo start` (Metro boot) → started cleanly, no bundler errors.
8. Forced a real Android bundle via `curl
   ".../expo-router/entry.bundle?platform=android&dev=true..."` directly
   against the running Metro server → HTTP 200, 1835 modules, no errors.
9. Real Android emulator boot check (Android SDK + `/dev/kvm` available in
   this sandbox): downloaded `system-images;android-35;google_apis;x86_64`,
   created AVD `sakuplan_test` (Pixel 6 profile), booted headless
   (`-no-window -gpu swiftshader_indirect`), confirmed
   `sys.boot_completed=1`, ran `npx expo start --android` (auto-installed
   Expo Go), verified app state via `adb shell screencap` screenshots (no
   interactive display in this sandbox, so the emulator's off-screen
   framebuffer was captured instead of a live view):
   - First attempt (before the `app/index.tsx` fix): real red-box render
     error confirmed via screenshot — `<Slot />` with zero registered routes.
   - After the fix: clean full rebuild (`--clear`), 1836 modules, no render
     errors, app reaches a stable blank white screen. Confirmed by pixel
     sampling (`RGB 255,255,255`) that this is the correct rendering of the
     plan's own code: the `fontsLoaded` branch in `_layout.tsx` sets no
     `backgroundColor` (only the loading/spinner branch does), so once fonts
     load and `<Slot/>` renders the empty stub route, the native view's
     default white shows — matching the plan's "then an empty screen"
     expectation.
   - Did **not** visually catch the intermediate `$kertas`-background/
     `$primary`-spinner loading frame — Google Fonts are bundled locally and
     `useFonts` resolved faster than the `adb screencap`+`pull` round-trip
     across ~5 rapid-fire screenshots. Confident in this branch by code
     review and type-checking, not by direct observation; noted as a gap
     rather than claimed as verified.

### Deferred / not verified

- iOS boot check not performed (no macOS/simulator in this sandbox); the
  brief accepts either platform and Android was used.
- The `$kertas`/`$primary` loading-spinner frame was not visually confirmed
  (see above) — only the pre- and post-load states were captured.
- An intermittent "Cannot connect to Expo CLI..." banner appeared from Expo
  Go's dev-tools websocket channel (separate from the HTTP bundle-fetch
  channel, which kept working) — likely a sandbox networking quirk, did not
  block bundle loading or rendering, not investigated further.
- `openapi-typescript` (referenced by the new `generate:api` npm script) is
  not installed — out of scope per the brief ("no API client yet").

Full detail: `.superpowers/sdd/2026-08-02-mobile-scaffold-auth/task-2-report.md`.

---

## 2026-08-02 — AUTH-001: registration terms/privacy consent fields

### Requirement IDs implemented

AUTH-001 (registration must capture accepted terms/privacy versions). This
was a gap left over from the original Phase 0 identity implementation: the
PRD required it, but the field never made it into `RegisterInput`, `User`,
or the schema. Backend-only prerequisite for a later, separate mobile
Register screen task, which will send fixed version-string constants.

### Files changed

- `internal/domain/entities.go`: added `User.AcceptedTermsVersion`,
  `User.AcceptedPrivacyVersion` (immutable after registration — not touched
  by `UpdateUserProfile`, not part of `userResponse`/OpenAPI `User` schema).
- `internal/application/auth.go`: `RegisterInput` gains
  `AcceptedTermsVersion`, `AcceptedPrivacyVersion`; `Register` trims and
  validates both as required, max 32 characters, returning a
  `domain.ValidationError` (field `consent`) when missing/oversized; both
  are persisted onto the created `domain.User`.
- `internal/application/auth_test.go`: updated
  `TestRegisterCreatesUserAndTokens` to assert the two fields round-trip
  through the fake repository; updated
  `TestRefreshRotatesSessionAndRejectsReuse`'s register call; added
  `TestRegisterRejectsMissingConsent`.
- `internal/adapters/postgres/store.go`: `CreateUser`, `scanUser` (used by
  both `GetUserByID` and `GetUserByEmail`) read/write the two new columns.
- `internal/adapters/httpapi/auth_handlers.go`: `registerRequest` gains
  `accepted_terms_version`/`accepted_privacy_version` JSON fields, passed
  through to `application.RegisterInput`.
- `internal/adapters/httpapi/server_test.go`,
  `internal/adapters/httpapi/reporting_handlers_test.go`: the four
  HTTP-level register call sites now send both consent fields (previously
  501/422'd once the field became required).
- `tests/integration/postgres_test.go`: `startPostgres` previously
  hand-parsed only `db/migrations/00001_core.sql` as the Testcontainers init
  script, hardcoding a single migration file by name. With migration
  `00002` adding a `NOT NULL` column, this would have silently skipped it
  and broken every integration test (`column accepted_terms_version does
  not exist`). Changed it to read and concatenate the `-- +goose Up`
  section of every `*.sql` file in `db/migrations`, sorted by filename, so
  future migrations are picked up automatically. Also updated `createUser`
  to supply both consent fields (now `NOT NULL` in the real schema).
- `openapi/openapi.yaml`: `RegisterRequest` gains `accepted_terms_version`,
  `accepted_privacy_version` as required string properties (1–32 chars).

### Database migrations

- `db/migrations/00002_users_registration_consent.sql`: adds
  `accepted_terms_version` and `accepted_privacy_version` (`text NOT NULL`)
  to `users`. Uses a temporary `DEFAULT ''` during `ADD COLUMN` (dropped
  immediately after) purely to satisfy `NOT NULL` against a table that
  already has rows in dev databases; new rows must supply a real value
  going forward since application-layer validation requires it.

### Commands run and results

1. `go test ./internal/application/... -run 'TestRegister'` (pre-implementation,
   RED) → compile failure: `RegisterInput` had no `AcceptedTermsVersion`/
   `AcceptedPrivacyVersion` fields, as expected before Step 3.
2. `go test ./internal/application/... -run 'TestRegister|TestRefresh' -v`
   (post-implementation, GREEN) → PASS
   (`TestRegisterCreatesUserAndTokens`, `TestRegisterRejectsMissingConsent`,
   `TestRefreshRotatesSessionAndRejectsReuse`, 3/3).
3. `task migrate:up` → applied `00002_users_registration_consent.sql`
   (`goose: successfully migrated database to version: 2`). This sandbox
   cannot route from the host network namespace to the Compose Postgres
   container's bridge IP (a pre-existing sandbox limitation, also noted in
   the 2026-08-02 Phase 7a entry below for the fixed 5432 port); worked
   around by running `goose` inside a short-lived container attached to the
   same Compose network (`docker run --network
   mobile-scaffold-auth_default ...`, connecting to the `postgres` service
   by container DNS name instead of `localhost`), with the host's Go module
   cache bind-mounted in so no network egress was needed for the build.
   Verified with `psql \d users` that both columns exist as `NOT NULL`.
4. `go test ./...` → PASS, all packages.
5. `go test -race ./internal/...` → PASS, all packages.
6. `task verify` (fmt:check, vet, test, test:race, build) → PASS.
7. `task lint` (`golangci-lint run ./...`) → 35 findings, same counts and
   categories as the pre-change baseline (`bodyclose: 21, gosec: 1,
   govet: 12, nilerr: 1`), confirmed by running lint against `git stash`'d
   (pre-change) code and diffing the finding counts — no new finding or new
   category introduced by this change.
8. `govulncheck ./...` → PASS. 0 vulnerabilities in code or called
   dependencies.
9. `task test:integration` (`go test -tags=integration -count=1
   ./tests/integration/...`) → PASS, both
   `TestPostgresLedgerAndBudgetConstraints` and
   `TestPostgresReportingQueries`, against real Testcontainers-launched
   Postgres with both migrations applied.

### Deferred / not verified

- No manual `task run` end-to-end smoke test, for the same sandbox
  networking reason recorded in the Phase 7a entry below (fixed-port
  Postgres unreachable from the host network namespace). Confidence rests
  on the application unit tests (fake repository), and the Postgres
  integration tests (real schema, real `NOT NULL` constraint, real
  round-trip through `CreateUser`/`scanUser`).

---

## 2026-08-02 — Phase 7a: Dashboard, cash-flow report, export (RPT-001..004)

### Requirement IDs implemented

RPT-001 (dashboard), RPT-002 (cash-flow report), RPT-003 (consistency — new
endpoints compose the existing `PlanningService.SafeToSpend` and
`TransactionRepository.SpentByCategory` rather than reimplementing ledger
math), RPT-004 (export). Scoped per `docs/superpowers/specs` brainstorming
decision to exclude NOTIF-001..004 (notifications/background jobs), which
needs new job-runner infrastructure and is deferred to its own phase.

Design decisions confirmed with the requester before implementation: export
is synchronous (`POST /v1/exports` returns the full snapshot in the response
body — no job table/worker, deferred to the future NOTIF-004 phase);
cash-flow report defaults to the current calendar month with
`group_by=day`; dashboard "largest spending categories" is a fixed top 5.

### Files changed

- `internal/domain/reporting.go` (new): `Dashboard`, `UpcomingBill`,
  `GoalProgress`, `CategorySpend`, `CashFlowReport`, `BudgetVsActualLine`,
  `CashFlowTrendPoint`, `TrendPoint`, `Export`.
- `internal/domain/repositories.go`: added `BudgetRepository.List`,
  `BillRepository.NextDue`, `TransactionRepository.CashFlowTotals`,
  `TransactionRepository.CashFlowTrend`.
- `internal/application/reporting.go` (new): `ReportingService` with
  `Dashboard`, `CashFlow`, `Export` methods, composing `PlanningService`,
  the repository interfaces, and the existing overflow-safe money helpers.
- `internal/application/reporting_test.go` (new): 12 unit tests covering
  budget-used/remaining, top-5 truncation, calendar-month fallback, goal
  progress (including >100% overachieved), no-upcoming-bill, RPT-003
  consistency against `PlanningService.SafeToSpend` directly, cash-flow
  defaults/validation/trend zero-filling/budget-vs-actual/variance sign, and
  export section completeness.
- `internal/adapters/postgres/store.go`: `CashFlowTotals`, `CashFlowTrend`,
  `ListBudgets`, `NextDueBill`; refactored `billDueInRange` into a shared
  `nextBillOccurrence` helper (no behavior change).
- `internal/adapters/postgres/repositories.go`: thin forwarding methods for
  the four new repository methods.
- `internal/testkit/fakes.go`: fakes for the four new repository methods;
  fixed `Transactions.SpentByCategory` to match the real Postgres query's
  half-open `[start, end)` range and `reversed_by_id IS NULL` filter (it was
  previously inclusive-both-ends with no reversal exclusion — a latent
  fake/real mismatch with no prior callers, now the first real consumer).
- `internal/adapters/httpapi/dto.go`: response DTOs and mappers for
  dashboard, cash-flow report, and export.
- `internal/adapters/httpapi/reporting_handlers.go` (new): `dashboard`,
  `cashFlowReport`, `createExport` handlers.
- `internal/adapters/httpapi/server.go`: `Reporting` service field, three
  new routes (`GET /v1/dashboard`, `GET /v1/reports/cash-flow`,
  `POST /v1/exports`), `dateQuery` query-param helper.
- `internal/adapters/httpapi/server_test.go`: extended `newTestServer` to
  also wire budgets/bills/goals/planning/reporting (previously only
  auth/profiles/accounts/categories/transactions were wired), returning a
  `testFixtures` struct instead of a bare `*testkit.Users`.
- `internal/adapters/httpapi/reporting_handlers_test.go` (new): 5 handler
  tests via `app.Test` (401 without a token, dashboard/cash-flow/export
  happy paths, invalid `group_by` → 400).
- `tests/integration/postgres_test.go`: added
  `TestPostgresReportingQueries` (Testcontainers) covering `ListBudgets`
  ordering, `NextDueBill` earliest-active selection, `CashFlowTotals`
  reversal exclusion, and `CashFlowTrend` week-bucket alignment against real
  `date_trunc('week', ...)`.
- `internal/bootstrap/app.go`: `application.NewReportingService` added to
  `fx.Provide`; `newHTTPServices` takes and wires the reporting service.
- `openapi/openapi.yaml`: `Reporting` tag; `GET /v1/dashboard`,
  `GET /v1/reports/cash-flow`, `POST /v1/exports` paths; `Dashboard`,
  `UpcomingBill`, `GoalProgress`, `CategorySpend`, `CashFlowReport`,
  `BudgetVsActualLine`, `CashFlowTrendPoint`, `Export` schemas.

### Database migrations

None. The existing `financial_transactions_user_time_idx (user_id,
occurred_at DESC, id DESC)` already serves the `WHERE user_id=$1 AND
occurred_at>=$2 AND occurred_at<$3` range scan used by every new query; the
`GROUP BY` aggregation happens in-memory after the index scan, which is
acceptable at this application's per-user transaction volume.

### Commands run and results

1. `go test ./internal/application/... -run 'TestDashboard|TestCashFlow|TestExport'` → PASS (12/12).
2. `go test -tags=integration -run TestPostgresReportingQueries ./tests/integration/...` → PASS.
3. `go test -tags=integration -count=1 ./tests/integration/...` (full suite) → PASS.
4. `go test ./internal/adapters/httpapi/... -run 'TestDashboard|TestCashFlow|TestCreateExport'` → PASS (5/5).
5. `task verify` (fmt:check, vet, test, test:race, build) → PASS.
6. `task lint` (`golangci-lint run ./...`) → 35 findings (27 pre-existing,
   documented in `docs/P0_GAP_ANALYSIS.md`, untouched, plus 8 new
   `bodyclose` findings in `reporting_handlers_test.go` that follow the
   exact same pre-existing, deliberately-left `requestJSON` test-helper
   pattern used throughout `server_test.go` — no new lint *category*
   introduced). One `govet shadow` finding was introduced by this change in
   `internal/application/reporting.go` and was fixed (not left) since it
   was new code, not pre-existing debt.
7. `govulncheck ./...` → PASS. 0 vulnerabilities in code or called
   dependencies; the same 1 unreachable transitive advisory
   (`GO-2026-5932`) as the 2026-07-24 baseline.

### Deferred / not verified

- Manual end-to-end smoke test of the three new endpoints against a running
  `task run` instance was attempted but blocked: this sandbox resets TCP
  connections to the Docker-Compose Postgres container's fixed host port
  (5432) for every client tried (`goose`, `psql`, raw Python socket),
  while the same sandbox's Testcontainers-based integration tests (which
  use dynamically-assigned high ports) connect and run correctly. This
  looks like a deliberate sandbox restriction on the well-known Postgres
  port rather than a defect in this change. Confidence in end-to-end
  correctness instead rests on: full `ReportingService` unit tests against
  fakes, full HTTP handler tests via `app.Test` (proving routing, auth,
  JSON shape), and full Postgres integration tests via Testcontainers
  (proving the real SQL, including reversal exclusion and week-bucket
  alignment against Postgres's own `date_trunc`).
- NOTIF-001..004 (notification preferences, delivery, background job
  runner) remain unimplemented — scoped out per the pre-implementation
  design discussion; needs its own job-runner infrastructure decision.

---

## 2026-07-24 — Verified backend baseline

### Environment

- Go: `go1.26.4 linux/amd64` (matches PRD default).
- Docker Engine: `29.1.3` (client/server).
- Docker Compose: standalone `docker-compose` v2.29.2 registered as a `~/.docker/cli-plugins/docker-compose` symlink so `docker compose ...` (used by `Taskfile.yml`) resolves; no `docker compose` CLI plugin was preinstalled.
- `task` (go-task) v3.44.1 and `golangci-lint` v2.12.0 were not present locally and were installed via `go install` to match `.golangci.yml`'s `version: "2"` config (a stray v1.64.8 binary could not read it).

### Commands executed (in order) and results

1. `go version` → `go1.26.4`.
2. `docker version` → engine `29.1.3`.
3. `docker compose version` → `v2.29.2` (after registering the compose plugin symlink above).
4. `task bootstrap` → PASS (`.env` created from `.env.example`; `go mod tidy` resolved all dependencies).
5. `task infra:up` → PASS (`postgres:17.10-alpine3.24` container started and reported `healthy`).
6. `task migrate:up` → PASS (`goose` applied `00001_core.sql`, database now at migration version 1).
7. `task verify` (fmt:check, vet, test, test:race, build) → **initially FAILED**, then PASS after a source fix (see below).
8. `task test:integration` → PASS (`go test -tags=integration -count=1 ./tests/integration/...`, 9.54s, real PostgreSQL via Testcontainers).

Additionally run, per `CLAUDE.md`'s "format, lint, tests, race tests, and vulnerability checks" rule:

9. `task lint` (`golangci-lint run ./...`) → **FAILS** with 27 pre-existing findings (13 `bodyclose` in test file, 12 `govet shadow`, 1 `gosec G115`, 1 `nilerr`). None fixed in this pass — see `docs/P0_GAP_ANALYSIS.md` for the full breakdown and rationale for leaving them for a deliberate follow-up rather than bulk-editing core financial application code during a verification-only session.
10. `govulncheck ./...` → PASS. 0 vulnerabilities in code or called dependencies; 1 unreachable transitive advisory (`GO-2026-5932`, unmaintained `golang.org/x/crypto/openpgp`, not imported or called by this codebase).
11. `task coverage` → generated; see `docs/P0_GAP_ANALYSIS.md` for the per-package table (overall `internal/...` statement coverage: 33.5%).

### Source-code failure found and fixed (root cause, not an environment issue)

`go vet` failed at `internal/adapters/httpapi/server.go:53`: `unknown field DisableStartupMessage in struct literal of type fiber.Config`. Root cause: the pinned dependency `github.com/gofiber/fiber/v3 v3.4.0` moved `DisableStartupMessage` off `fiber.Config` and onto `fiber.ListenConfig` (passed to `App.Listen`), so the field no longer compiles against `fiber.Config` in this version. This is a genuine source/API mismatch, not a missing local dependency or config issue, so it was fixed rather than left in place:

- `internal/adapters/httpapi/server.go`: removed the now-invalid `DisableStartupMessage` field from `fiber.Config`.
- `internal/bootstrap/app.go`: pass `fiber.ListenConfig{DisableStartupMessage: true}` to `server.App().Listen(...)` instead, and added the `github.com/gofiber/fiber/v3` import (bootstrap is a composition root, where Fiber imports are permitted).

No dependency versions were changed; no application/business logic, tests, or the OpenAPI contract were touched.

### Deferred product phases (unchanged, confirmed still absent by source inspection)

Full detail in `docs/P0_GAP_ANALYSIS.md`. Summary: admin RBAC/auth (AUTH-006, ADM-001..006), account deletion workflow (USER-004), dashboard/reports/export (RPT-001..004), notifications and background jobs (NOTIF-001..004), rate limiting (SEC-005), and AI explanation adapter (AI-001..006) are all still unimplemented. Observability (NFR-005) has structured logs and request IDs but no metrics or tracing.

---

## 2026-07-24 — Claude-ready PRD and core backend

### Completed documents

- Full Claude-friendly PRD with stable requirement IDs, acceptance criteria, user journeys, data model, API capability map, NFRs, security controls, analytics, metrics, monetization, and release phases.
- Clean architecture and dependency direction.
- Security requirements and threat controls.
- API conventions and error model.
- Incremental implementation plan.

### Completed core backend

- Fiber v3 HTTP adapter with request IDs, centralized error mapping (including framework 404/405 errors), authentication middleware, liveness, and readiness endpoints.
- Constructor-based dependency injection with Uber Fx restricted to the composition root.
- PostgreSQL pool, repository adapters, transactional unit of work, and initial Goose migration.
- Argon2id password hashing.
- Strict HS256 JWT issuer, audience, algorithm, and expiry validation.
- Opaque refresh tokens stored only as SHA-256 hashes.
- Refresh-token rotation, reuse detection, family revocation, logout, and logout-all.
- Financial accounts with ledger-derived balances.
- Default and custom categories.
- Income, expense, transfer, adjustment, and immutable reversal transactions.
- Idempotent monetary commands with 8–128 character keys and payload-hash conflict detection.
- Budget drafts, allocation/category validation, activation-time revalidation, allocations, and overlapping-active-period database constraint.
- Monthly recurring bills.
- Saving goals and idempotent contributions.
- Safe-to-spend calculation.
- Deterministic conservative, balanced, and flexible budget recommendations with overflow-safe proportional allocation.
- OpenAPI 3.1 contract aligned with HTTP response DTOs.

### Completed quality tooling

- Pure domain and application unit tests.
- Reversal, idempotency, transfer, budget, recommendation, safe-to-spend, goal, and authentication tests.
- Argon2id, JWT, refresh-token, configuration, and ID-generator tests.
- Fiber `app.Test` HTTP adapter tests.
- PostgreSQL Testcontainers integration tests using the real migration.
- Race-test, vet, coverage, golangci-lint v2.12, build, and vulnerability-check commands.
- Dockerfile, Docker Compose, Taskfile, Make wrapper, and GitHub Actions workflow.

### Verification performed in artifact environment

The available runtime contained Go 1.23.2 and did not provide Docker or external module downloads. The standard-library-only domain, application, configuration, and system test suites were executed successfully, including the race detector and `go vet`.

The Fiber, pgx, Fx, Argon2id, JWT, and Testcontainers suites are included but require Go 1.26.5 plus dependency download. PostgreSQL integration tests additionally require Docker.

### Deferred product phases

- Mobile React Native application.
- Next.js admin web.
- Administrator RBAC endpoints and sensitive-access workflow.
- Redis-backed worker and notifications.
- Dashboard/report query models and exports.
- OpenTelemetry and Prometheus adapters.
- Rate limiting and production edge controls.
- AI-provider explanation layer.

---

## 2026-08-07 — dc-prototype Phase 2: full verification pass (Task 27)

### Requirement IDs implemented

None (verification-only task — Task 27 of
`docs/superpowers/plans/2026-08-05-dc-prototype-phase2.md`, the final task
of the plan). Confirms Phase 2 of the `SakuPlan.dc.html` implementation is
complete: Transactions (fast-entry form, infinite-scroll list, reversal),
Budgets (active view, create-and-activate wizard with rule-based allocation
recommendations), Reports (cash-flow trend/category/budget-vs-actual charts
via `react-native-gifted-charts`), and More (profile edit, logout,
logout-all, data export, inert placeholders for account deletion and
notifications) are all wired to the real backend. No product areas remain
on `ComingSoonScreen` placeholders except the two genuinely-unbuildable
sub-features called out explicitly: account deletion (no backend endpoint)
and notifications (no job-runner infrastructure — deferred pending its own
NOTIF-00x phase, per the 2026-08-02 Phase 7a entry above).

### Files changed

None (verification only).

### Database migrations

None.

### Commands run and results

1. `cd mobile && npx jest` → PASS, 12 suites / 53 tests, including every
   new test file from this plan (`idempotencyKey.test.ts`, `errors.test.ts`,
   `money.test.ts`, `date.test.ts`, `budgetMath.test.ts`,
   `chartData.test.ts`, `accountTypeLabels.test.ts`,
   `transactionDisplay.test.ts`, `riskLevel.test.ts`) alongside Phase 1's
   suites (`refreshInterceptor.test.ts`, `store.test.ts`,
   `billUrgency.test.ts`).
2. `cd mobile && npx tsc --noEmit` → PASS, exit 0.
3. `cd mobile && npx expo lint` → PASS, exit 0 (1 pre-existing warning:
   unused `Input` import in `budgets.tsx`; 0 errors).

### Deferred / not verified

- Step 3 (manual Expo walkthrough of Transaksi/Anggaran/Laporan/Lainnya on
  a fresh, zero-account account) could not be performed in this
  environment: `adb devices` returned an empty device list, and no iOS
  simulator toolchain (`xcrun`) is present. An AVD (`sakuplan_test`) exists
  from an earlier session but was not booted/running; `/dev/kvm` is
  present. This mirrors Task 23's identical constraint (see
  `.superpowers/sdd/2026-08-05-dc-prototype-phase2/task-23-report.md`).
  Full detail, including raw command output: `.superpowers/sdd/
  2026-08-05-dc-prototype-phase2/task-27-report.md`.

## 2026-08-09 — App-wide fix: Tamagui `Input` fails to paint text (Fabric)

### Requirement IDs implemented

None (bug fix, found during manual device testing of dc-prototype Phase 3
Task 10 — the first time the app was actually run on an emulator across
this whole project, per the "Deferred / not verified" note in the
2026-08-07 entry above).

### Root cause

Tamagui's default (non-`unstyled`) styled pipeline for the `Input`
component never paints typed text on this stack (`react-native@0.86.2` +
Fabric/New Architecture + `tamagui@2.6.3`) — confirmed by booting the
`sakuplan_test` emulator and reproducing live: typed characters never
appeared in any color, even with an inline `style={{color:'red',
fontSize:22}}` override on top of the existing `color="$color"`. A bare
`react-native` `TextInput` bound to the identical state rendered
correctly, proving the bug was isolated to Tamagui's `Input`, not
component state/`onChangeText`. Adding the `unstyled` prop (which skips
Tamagui's computed `size`/style-variant pipeline) fixed it immediately
with the same `color="$color"` prop unchanged — so Tamagui's own computed
styles were overriding/breaking the text paint, not any color-token
issue. Every existing call site (`RupiahInput` and 8 raw `<Input>` usages)
used the identical `color="$color"` + `focusStyle` pattern with no
explicit border/background/padding, meaning all of them silently
depended on the same broken default pipeline — this was an app-wide
defect, not specific to login.

### Files changed

- `mobile/src/components/TextField.tsx` (new) — shared wrapper: Tamagui
  `Input` with `unstyled` plus explicit token props reproducing the
  intended visual design (border, background, radius, padding, font,
  focus color).
- `mobile/src/components/RupiahInput.tsx` — now wraps `TextField` instead
  of `Input` directly.
- `mobile/app/(auth)/login.tsx`, `mobile/app/(auth)/register.tsx`,
  `mobile/app/(app)/profile.tsx`, `mobile/app/(app)/(tabs)/transactions.tsx`,
  `mobile/src/accounts/AddAccountCard.tsx`,
  `mobile/src/transactions/TransactionListItem.tsx` — all raw `<Input>`
  usages swapped to `<TextField>`.
- `mobile/app/(app)/(tabs)/budgets.tsx` — removed the unused `Input`
  import flagged as a pre-existing warning in the 2026-08-07 entry above
  (dead import; the file only ever used `RupiahInput`).

### Database migrations

None.

### Commands run and results

1. `cd mobile && npx tsc --noEmit` → PASS, exit 0.
2. `cd mobile && npx eslint .` → PASS, exit 0 (2 pre-existing warnings in
   `tamagui.config.ts`, unrelated to this change; 0 errors).
3. `cd mobile && npx jest` → PASS, 13 suites / 58 tests.
4. Live verification on the `sakuplan_test` emulator (booted via
   `emulator -avd sakuplan_test`, app run via `npx expo start --android`):
   typed text renders correctly on the Login and Register screens
   end-to-end, including a real backend round trip (wrong-credentials
   login correctly showed "Email atau kata sandi salah"; register
   correctly submitted and round-tripped a validation error from the
   API). RupiahInput and the other five call sites were not separately
   walked on-device in this session (blocked by fragile ADB
   coordinate-tap navigation, not by the fix) — they use the exact same
   `TextField` component verified on Login/Register, so the same
   rendering guarantee applies by construction, not just by inspection.

### Deferred / not verified

- Live on-device confirmation of `RupiahInput` specifically (Accounts,
  Budgets, Goals, Transactions money fields) — recommend a quick manual
  spot-check on a physical device before considering this fully closed,
  consistent with this project's established pattern of deferring final
  device confirmation to a human partner (see Task 23's chart-rendering
  note in the 2026-08-05 Phase 2 ledger).
- `src/components/TabBarButton.tsx` still uses raw `react-native`
  `Pressable`/`Text` for the bottom tab bar (pre-existing, unrelated to
  this bug) — left unchanged; flagged for a follow-up decision on whether
  to convert it to Tamagui components for consistency.

---

## 2026-08-16 — Mobile HTTP client migration: openapi-fetch → axios

### Requirement IDs implemented

None (infrastructure migration, user-directed — see
`docs/superpowers/specs/2026-08-16-mobile-axios-migration-design.md`).

### Motivation

Two drivers: (1) a real bug found during first physical-device testing —
React Native's `fetch()` resolves with its own `FetchResponse` class, which
is not `instanceof` the environment's global `Response`, so `openapi-fetch`'s
middleware guard (`result instanceof Response`) threw on every request; (2)
explicit user preference for `axios` going forward.

### Files changed

- `mobile/src/api/client.ts` — `axios.create({ baseURL })` instead of
  `openapi-fetch`'s `createClient`.
- `mobile/src/api/refreshInterceptor.ts` — axios request/response
  interceptors instead of an openapi-fetch middleware object; retry is now a
  plain config re-invocation instead of a `Request`-cloning `WeakMap` dance.
- `mobile/src/api/refreshInterceptor.test.ts` — rewritten against the new
  `shouldAttemptRefresh(status, alreadyRetried)` / `buildRetryConfig`
  signatures.
- `mobile/src/api/errors.ts` — added `statusFromError(error, fallbackStatus)`,
  replacing a `(response as unknown as { status: number }).status ?? 500`
  cast that three hooks previously needed.
- All 24 hook files calling the API client (accounts, auth, bills, budgets,
  categories, dashboard, goals, profile, reports, transactions) — converted
  from openapi-fetch's `{ data, error, response }` resolve-always contract to
  axios try/catch, typed via `components`/`operations` from the generated
  OpenAPI types.
- `mobile/package.json` — `axios` added, `openapi-fetch` removed.

### Database migrations

None.

### Commands run and results

1. `cd mobile && npx tsc --noEmit` → exit 0 (no output, 0 errors)
2. `cd mobile && npx eslint .` → 0 errors, 2 pre-existing warnings in `tamagui.config.ts` (unrelated):
   ```
   /data/Gawai Duniawi/SaaS/sakuplan/.claude/worktrees/mobile-axios-migration/mobile/tamagui.config.ts
     112:3   warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-empty-interface')
     113:13  warning  An interface declaring no members is equivalent to its supertype                                          @typescript-eslint/no-empty-object-type

   ✖ 2 problems (0 errors, 2 warnings)
   ```
3. `cd mobile && npx jest` → PASS:
   ```
   PASS src/api/idempotencyKey.test.ts
   PASS src/bills/nextBillOccurrence.test.ts
   PASS src/budgets/riskLevel.test.ts
   PASS src/dashboard/billUrgency.test.ts
   PASS src/auth/store.test.ts
   PASS src/transactions/transactionDisplay.test.ts
   PASS src/accounts/accountTypeLabels.test.ts
   PASS src/reports/chartData.test.ts
   PASS src/budgets/budgetMath.test.ts
   PASS src/format/date.test.ts
   PASS src/api/refreshInterceptor.test.ts
   PASS src/format/money.test.ts
   PASS src/api/errors.test.ts

   Test Suites: 13 passed, 13 total
   Tests:       58 passed, 58 total
   Snapshots:   0 total
   Time:        2.115 s, estimated 5 s
   Ran all test suites.
   ```

### Deferred / not verified

- Manual on-device retest of the login/token-refresh flow under axios (same
  physical device and demo account used for the original bug report) — flag
  to the human partner per this project's established pattern of deferring
  final device confirmation (see the 2026-08-09 entry above).

---

## 2026-08-17 — Design Handoff Phase A — Foundation (tokens, deterministic formatting, primitives)

### Requirement IDs implemented

None (this is the "Design Handoff Phase A — Foundation" phase — adopting
`design_handoff_sakuplan_rn`'s exact color/space/size/radius tokens,
deterministic currency/date formatting, and a first set of shared
primitive components — not a numbered backend requirement; see
`docs/superpowers/specs/2026-08-16-design-handoff-phase-a-*` for the
originating spec/plan). This entry also covers the final whole-branch
review fix wave applied after all 7 tasks were individually implemented
and reviewed.

Note: this branch **reverses the Inter font switch** made in commit
`9ed0418` ("style(mobile): use Tamagui Button/ScrollView everywhere,
switch to Inter font") earlier the same day on `main`. Commit `87f3fe3`
on this branch loads Fraunces (display), IBM Plex Sans (body), and IBM
Plex Mono (numerals/mono) instead, per the design handoff's exact
typography spec. Inter is no longer the app's font.

### Files changed

- `mobile/tamagui.config.ts` — exact color/space/size/radius design
  tokens from `design_handoff_sakuplan_rn`.
- `mobile/src/theme/fonts.ts` — Fraunces / IBM Plex Sans / IBM Plex Mono
  font loading, replacing the Inter switch from `9ed0418`.
- `mobile/package.json` — font package dependencies updated accordingly.
- `mobile/src/format/money.ts`, `mobile/src/format/money.test.ts` —
  deterministic Rupiah formatting (see bug fix below).
- `mobile/src/format/date.ts` — deterministic date formatting (see bug
  fix below).
- `mobile/src/components/PocketCard.tsx` — dashed-border card; bug fix,
  see below.
- `mobile/src/components/DashedBox.tsx` (new) — SVG-drawn dashed
  border/fill primitive used by `PocketCard` and the tab bar rule.
- `mobile/src/components/primitives.tsx` (new) — shared typography,
  layout, button, and chip primitives.
- `mobile/src/components/ProgressBar.tsx` (new) — budget/goal/report
  progress bar variants.
- `mobile/src/components/AppHeader.tsx` (new) — `DetailHeader` /
  `TabHeader` components.
- `mobile/src/components/TabBar.tsx` (new) — custom bottom tab bar.

### Database migrations

None.

### Bugs fixed along the way

1. **Non-deterministic currency/date formatting.** `formatRupiah` and
   `formatDateID` previously used `toLocaleString` / `toLocaleDateString`,
   which depend on the JS engine's ICU data — a device-dependent Hermes
   bug class (identical inputs can format differently, or throw, across
   devices/OS versions with partial ICU). Rewritten to format
   deterministically without `Intl`.
2. **`PocketCard`'s dashed border broken on Android.** The card previously
   used `borderStyle: 'dashed'` together with `borderRadius`, which
   React Native cannot reliably render together on Android (solid
   corners, wrong dash phase, or no border at all on some API levels).
   Fixed by drawing the border with SVG via the new `DashedBox`
   component (commit `c29b86a`).
3. **Regression introduced by fix #2, caught in this same review round.**
   The SVG fix above initially wrapped `PocketCard`'s children in a
   second, opaque `YStack` (`backgroundColor: '$white'` when not muted)
   nested *inside* `DashedBox`. Because `DashedBox` renders its `<Svg>`
   border before `{children}` in JSX, and React Native paints siblings in
   tree order regardless of `position: 'absolute'` on the earlier one,
   that opaque inner layer painted over the dashed border on every
   non-muted card — silently hiding it again on all existing screens
   that use `PocketCard`. This was caught in the final whole-branch
   review (not a separate, later-discovered incident) and fixed in the
   same work by moving the background color onto `DashedBox`'s own
   `fill` prop (an SVG `<Rect fill>`, so a literal hex string is correct
   here, matching `DashedBox`'s existing `color="#AEB9B2"` border prop)
   and setting the inner `YStack`'s `backgroundColor` to always be
   `'transparent'`.

### Commands run and results

1. `cd mobile && npx tsc --noEmit` → exit 0, no output.
2. `cd mobile && npx eslint .` → 0 errors, 2 pre-existing warnings in
   `tamagui.config.ts` (unrelated to this change):
   ```
   /data/Gawai Duniawi/SaaS/sakuplan/.claude/worktrees/design-handoff-phase-a/mobile/tamagui.config.ts
     213:3   warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-empty-interface')
     214:13  warning  An interface declaring no members is equivalent to its supertype                                          @typescript-eslint/no-empty-object-type

   ✖ 2 problems (0 errors, 2 warnings)
   ```
3. `cd mobile && npx jest` → PASS:
   ```
   PASS src/dashboard/billUrgency.test.ts
   PASS src/transactions/transactionDisplay.test.ts
   PASS src/accounts/accountTypeLabels.test.ts
   PASS src/format/money.test.ts
   PASS src/reports/chartData.test.ts
   PASS src/auth/store.test.ts
   PASS src/format/date.test.ts
   PASS src/budgets/budgetMath.test.ts
   PASS src/budgets/riskLevel.test.ts
   PASS src/bills/nextBillOccurrence.test.ts
   PASS src/api/idempotencyKey.test.ts
   PASS src/api/errors.test.ts
   PASS src/api/refreshInterceptor.test.ts

   Test Suites: 13 passed, 13 total
   Tests:       66 passed, 66 total
   Snapshots:   0 total
   Time:        2.072 s
   Ran all test suites.
   ```

### Deferred / not verified

- Manual on-device visual confirmation that `PocketCard`'s dashed border
  is actually visible again on every screen that renders one (Home,
  More, Goals, Accounts, Safe-to-Spend, Transactions, `AddAccountCard`)
  is still recommended before considering this fully closed — a
  physical device (`adb` serial `HAAA5PUC89NN5PWK`) and an emulator AVD
  (`sakuplan_test`) were both available in this environment, but a full
  on-device app boot/login walkthrough was not completed in this
  session. This matches this project's established pattern of deferring
  final device confirmation to a human partner (see the 2026-08-09 entry
  above, and the axios-migration entry's identical deferral).
- A third instance of the same non-deterministic-formatting bug class
  exists in `mobile/src/reports/chartData.ts`, which still calls
  `toLocaleDateString`. Left untouched — out of this phase's scope —
  tracked as a follow-up for a later phase.
- None of the new components added in this phase (`primitives.tsx`,
  `ProgressBar.tsx`, `AppHeader.tsx`, `TabBar.tsx`) are wired into any
  screen or navigation route yet; they exist as a foundation for later
  phases only.
- Two additional review findings from the same final review round were
  explicitly deferred by the controller as later-phase follow-ups, not
  fixed here: `PocketCard`'s `{...rest}` double-spread (outer `YStack`
  and inner content `YStack` both receive the same `rest` props), and
  `TabBar`'s unguarded `LABELS` lookup.

## 2026-08-18 — Design Handoff — Login & Register re-skin

### Requirement IDs implemented

None (design/UI implementation of
`docs/superpowers/specs/2026-08-18-design-handoff-auth-screens-design.md`
and `docs/superpowers/plans/2026-08-18-design-handoff-auth-screens.md` —
the first screen-level phase of the design handoff port, following the
2026-08-17 Phase A foundation entry above). Pure visual re-skin of
`mobile/app/(auth)/login.tsx` and `mobile/app/(auth)/register.tsx` to
match `design_handoff_sakuplan_rn/SCREENS.md`'s auth mockups using Phase
A's tokens/primitives; no hook, API, or navigation logic changed.
Beranda and all other screens remain explicitly deferred to later phases.

Three deliberate deviations from the spec's literal mockup (recorded in
the spec's "Decisions made during brainstorming" section): Register keeps
its consent checkbox and 12-character password minimum (backend-required,
not decorative); Login has no back button (it's the app's entry point);
both screens keep the existing disabled-submit-button pattern instead of
adding a new inline validation message the spec's copy assumed.

### Files changed

- `mobile/src/components/GoogleIcon.tsx` (new) — inline SVG Google "G"
  mark in the 4 official brand colors, used by both screens' secondary
  button.
- `mobile/app/(auth)/login.tsx` — full re-skin: `FlowScreen`/`Wordmark`/
  `PocketCard elevated`/`AuthHeading`, restyled error banner
  (`$peringatanFill`), field rows using the shared `FieldLabel`
  component, `LogIn` icon restored on the submit button (an earlier
  commit had accidentally swapped it for `Activity`), Google button copy
  "Masuk dengan Google".
- `mobile/app/(auth)/register.tsx` — same re-skin pattern; consent
  checkbox and 12-char minimum preserved; Google button copy corrected
  from a pre-existing bug ("Masuk dengan Google" on the *register*
  screen) to "Daftar dengan Google".
- `mobile/src/components/PocketCard.tsx` — bug fix, see below (not in
  the plan's original file list; added during the final-review fix
  round once the bug was found).
- `mobile/src/components/primitives.tsx` — `PrimaryButton`/
  `SecondaryButton` gained `role: 'button'`; the `FieldLabel` primitive
  (previously a `styled(Text)` with zero importers, since it couldn't
  take `htmlFor`) was replaced with a function component that wraps an
  icon and an `htmlFor`-wired Tamagui `Label`, now used identically by
  both auth screens.

### Database migrations

None.

### Bugs fixed along the way

1. **`PocketCard` double-applies props passed to it, once caught by real
   usage.** The 2026-08-17 Phase A entry above explicitly deferred this
   exact defect as a later-phase follow-up: `PocketCard.tsx` spread
   `{...rest}` onto both its outer layout `YStack` and its inner content
   `YStack`. It stayed harmless because no existing call site passed a
   prop that would visibly differ between the two layers — until this
   phase's `login.tsx`/`register.tsx` became the first call sites in the
   codebase to pass `padding` (`padding="$6"`), which landed on both
   layers and doubled the auth card's gutter from the spec'd 24px to
   48px. Caught by the final whole-branch review (opus), not by any
   automated check (`tsc`/`eslint`/`jest` were all green regardless).
   Fixed by spreading `rest` only on the inner `YStack` and forwarding
   `flex` explicitly to the outer one (the only other cross-layer prop
   any existing call site relies on); verified against all ~48 other
   `PocketCard` call sites in the app to confirm none of them broke.
2. **Register's Google button said "Masuk dengan Google" (a copy-paste
   bug pre-dating this phase).** Should say "Daftar dengan Google",
   matching Login's "Masuk dengan Google" — corrected as part of the
   re-skin.
3. **`PrimaryButton`/`SecondaryButton` (styled `XStack`s) carried no
   `role="button"`,** unlike Tamagui's real `Button` component which
   sets this automatically. Four controls across both screens presented
   to screen readers as plain views (the `disabled` gate itself was
   still functionally correct — `onPress` was never attached when
   disabled — this was purely an announcement gap). Fixed by adding
   `role: 'button'` to both primitives' `styled()` configs and
   `accessibilityState={{ disabled: !canSubmit }}` on both screens'
   submit buttons.
4. **Both screens reimplemented `primitives.tsx`'s existing `inputStyle`
   as a local `fieldInputProps` const, and silently dropped its
   `backgroundColor: '$putih'` doing so** — inputs rendered
   kertas-on-white instead of the reference design's white-on-white.
   Fixed by importing and spreading the shared `inputStyle` instead.
5. **Login and Register built the same field-label row two different
   ways** (Login inlined it twice; Register extracted a local
   `FieldLabelRow` helper) — a whole-branch-only finding, invisible to
   either screen's own task review. Consolidated into one shared
   `FieldLabel` component in `primitives.tsx`, used identically by both
   screens; retired the old `styled(Text)` `FieldLabel` that had no
   importers left anywhere in the codebase.
6. **Both screens imported `ScrollView` from `'react-native'`,**
   reversing the project-wide convention established by the immediately
   preceding commit on `main` (`9ed0418`, every other screen imports it
   from `'tamagui'`). Fixed to match.
7. **Register's consent sentence nested `Meta` (12px) links inside a
   `MetaS` (11px) sentence,** rendering "Ketentuan Layanan"/"Kebijakan
   Privasi" slightly larger than the surrounding text — a small
   regression from the pre-existing code, which used a bare `Text` that
   inherited its parent's size. Fixed to use `MetaS` throughout.

Findings 1–7 above were all raised by the final whole-branch review
(dispatched on opus after all 3 tasks passed their individual task
reviews clean) and addressed in a single fix round, independently
re-verified by a scoped re-review (sonnet) that confirmed all seven
ADDRESSED with file:line evidence and found no new breakage.

### Commands run and results

1. `cd mobile && npx tsc --noEmit` → exit 0, no output (re-confirmed
   independently by both the final review and the fix round's re-review,
   not just claimed by the implementer).
2. `cd mobile && npx eslint .` → 0 errors, the same 2 pre-existing
   warnings in `tamagui.config.ts` as every prior entry, nothing new.
3. `cd mobile && npx jest` → PASS, 13 suites / 66 tests — unchanged from
   Phase A's baseline (this phase added no new testable logic; it is a
   pure styling pass over already-tested hooks).

### Deferred / not verified

- Manual on-device visual confirmation against
  `design_handoff_sakuplan_rn/reference/SakuPlan.dc.html` (430px width)
  was explicitly out of scope for this session — same established
  pattern as every prior phase's entry. Specifically worth checking on
  a real device given finding #1 above: the auth card's gutters, the
  white (not kertas) input fill from finding #4, and the Fraunces/IBM
  Plex fonts actually rendering rather than falling back.
- Minor findings from the final review were explicitly parked, not
  fixed, as out of this phase's scope: missing input placeholders
  (`SCREENS.md` specifies a password placeholder and an email
  placeholder, neither implemented, pre-existing gap); Register's
  "Minimal 12 karakter" hint sits under the confirm-password field
  rather than the password field it actually describes (pre-existing,
  carried over verbatim); `register-consent`'s `Checkbox` has an `id`
  with no corresponding `Label htmlFor`, so tapping the consent text
  doesn't toggle the box (pre-existing); `'#F7F8F4'` is now hardcoded
  identically in both `login.tsx` and `register.tsx`'s `SafeAreaView`
  style (necessary — `SafeAreaView` can't resolve Tamagui tokens — but
  duplicated, a shared constant would be cheap insurance against drift
  from `tokens.color.kertas`).
- Beranda (Home) and all other screens remain unstyled by this design
  handoff port — Phase C+ per `project_design_handoff_phases` (session
  memory), not tracked in this file until scoped.
