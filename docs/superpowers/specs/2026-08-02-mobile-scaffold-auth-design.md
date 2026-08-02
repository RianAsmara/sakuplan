# Mobile Scaffold + Auth Flow — Design

## Context

The Go API (`services/api`) now covers identity, ledger, budgets, bills,
goals, planning, and reporting (Phases 0–7a). No mobile client exists yet —
`docs/PRD.md` mandates React Native + Expo + TypeScript with Zustand for
local/UI state, and an OpenAPI-generated TypeScript client consuming
`services/api/openapi/openapi.yaml`. This is the first mobile increment:
project scaffold plus the authentication flow (register, login, logout),
not the full P0 mobile screen set. Onboarding and every other PRD §5.1
surface (accounts, transactions, budgets, bills, goals, safe-to-spend,
reports, notifications, AI review, privacy controls) are explicitly out of
scope for this pass.

## Location & tooling

- `services/mobile/`, matching the existing `services/api/` sibling
  convention in this monorepo.
- Expo (TypeScript template), npm (no workspace tooling yet — single
  package; revisit pnpm/turborepo only if admin-web joins the monorepo
  later).

## Navigation — Expo Router

Expo Router (file-based, built on React Navigation) over manual React
Navigation wiring. It maps directly onto the auth gate this flow needs: an
`(auth)` route group for register/login and an `(app)` group for
everything behind it, with a root layout that redirects based on auth
state from the Zustand store.

## UI — Tamagui

Tamagui provides the component/styling/theming system for all screens in
this pass (`YStack`/`XStack` layout primitives, `Input`, `Button`, `Form`,
`Text`, `Spinner`). Setup: `tamagui` + `@tamagui/config` packages, a root
`tamagui.config.ts` defining the custom palette and type tokens from
"Visual design direction" below (not Tamagui's stock default theme), Metro
config updated for Tamagui's compiler, and a single-theme `TamaguiProvider`
(light only — dark mode is a later increment) wrapping the Expo Router
root layout. Chosen over hand-rolled `StyleSheet` styling or NativeWind
because it's a complete, cross-platform (RN + web-ready, relevant if
admin-web ever shares components) design-system foundation rather than
just a styling utility, and is explicitly what was requested.

## API client — `openapi-typescript` + `openapi-fetch`

`openapi-typescript` generates TS types directly from
`services/api/openapi/openapi.yaml` (already current, including the
RPT-001..004 endpoints). `openapi-fetch` is a small typed wrapper around
`fetch` using those generated types — no Java toolchain (unlike
`openapi-generator-cli`), less codegen magic than hook-generators like
`orval`. A `npm run generate:api` script regenerates types from the spec
on demand. Revisit `orval` later if data-heavy screens (accounts,
transactions) would benefit from generated query hooks.

## Server state — TanStack Query

Zustand is reserved strictly for local/UI state per the PRD constraint
(`{ accessToken, user, isAuthenticated }`, held in memory only — never
persisted). TanStack Query owns API state: `useMutation` for
register/login/logout, `useQuery` for `GET /v1/me` (doubles as the
end-to-end "authenticated calls work" proof for this screen).

## Token storage (AUTH-005)

Refresh token is persisted via `expo-secure-store` (iOS Keychain / Android
Keystore-backed) — never `AsyncStorage`, per AUTH-005. The access token
lives only in memory (Zustand) and is reissued from the refresh token on
cold app start via `POST /v1/auth/refresh`. The API client wraps `fetch`
with a 401 interceptor: one silent refresh-and-retry of the failed
request, then a forced logout (clear store + secure storage, redirect to
`(auth)/login`) if the refresh itself fails.

## PRD-alignment findings and resolutions

Re-reading `docs/PRD.md` against the actual `services/api` implementation
surfaced two gaps directly relevant to this pass:

1. **AUTH-001** requires registration to capture accepted terms version and
   privacy version. Neither field exists anywhere in the backend today
   (domain, application, HTTP DTOs, OpenAPI, migrations) — only
   email/password/display_name are implemented. **Resolution:** fix the
   backend first, as a small scoped addition, before building the mobile
   Register screen — see "Backend prerequisite" below.
2. **USER-001**/**NFR-007** require a `locale` profile field and a fully
   localizable UI, with Bahasa Indonesia as the MVP-default language. No
   `locale` field exists in the backend either. **Resolution:** build the
   mobile app with real i18n scaffolding and ship Bahasa Indonesia as the
   default (only) bundled locale for this pass; do not add the backend
   `locale` field yet — that's a small, separate follow-up alongside other
   USER-001 profile work, out of scope here since this pass doesn't touch
   the profile-edit screen.

## Backend prerequisite: AUTH-001 terms/privacy consent

Small, scoped `services/api` addition, implemented and verified (with the
project's usual unit/handler/repository test coverage, migration, and
`task verify`/`task lint`/vulnerability checks) before the mobile Register
screen is wired up:

- `internal/domain`: `User` gains `AcceptedTermsVersion string` and
  `AcceptedPrivacyVersion string` — set once at registration, immutable
  afterward (a point-in-time consent record, not a `USER-001`-editable
  preference).
- Migration: two `NOT NULL` text columns on `users`.
- `RegisterRequest` (application input + HTTP DTO + OpenAPI schema) gains
  required `accepted_terms_version` / `accepted_privacy_version` fields,
  validated non-empty like other required registration fields.
- Exact validation rules (format/allowed values for a "version" string)
  and whether these fields are echoed back in `userResponse` are decided
  during implementation planning, grounded in the real `auth.go` code.

## Localization approach

`expo-localization` + `react-i18next` (or equivalent), with Bahasa
Indonesia as the sole bundled locale for this pass — not because English
is planned next, but because building screens against an i18n layer from
the start (extracted string keys, no hardcoded copy) avoids a rewrite once
additional locales are added, per NFR-007. All Register/Login/Home screen
copy is written in Bahasa Indonesia. `expo-localization` reads the
device's locale for future use (date/number formatting) but the app does
not yet offer a language switcher — matches the "MVP default" framing,
not a full localization feature.

## Visual design direction

The product's core promise — "how much can I safely spend today without
disturbing bills, savings, and essentials until payday?" — is a
protect-vs-free duality, and the product name itself ("saku" = pocket in
Bahasa Indonesia) gives a literal, non-decorative motif to build from.
That's the throughline for every choice below, rather than a generic
fintech look dropped onto Tamagui's default theme.

**Palette** (named, not decorative — each color is a functional register):

| Token | Hex | Role |
|---|---|---|
| Kertas (paper) | `#F5F6F3` | Background — cool-neutral off-white, deliberately not the cream/`#F4F1EA` that's become an AI-design default. |
| Tinta (ink) | `#1E2A22` | Primary text — deep ink-green-black, warmer than pure black. |
| Terjaga (protected) | `#0E6B58` | Primary actions and anything representing committed/protected money (bills, savings, buffer) — deep teal. |
| Leluasa (free) | `#C9A227` | Reserved exclusively for safe-to-spend figures later — brass/gold, the "coin" color. Not used decoratively; this pass mostly banks the meaning for when the dashboard ships. |
| Kulit (leather) | `#7C6A5B` | Secondary text, hairlines, the stitch motif — a ledger-cover reference. |
| Peringatan (warning) | `#B23B33` | Errors only — desaturated brick, not alarm-red. |

**Typography** — three roles, deliberately paired rather than one default
sans everywhere:

- **Fraunces** (display) — screen titles and the wordmark only. Fraunces
  has soft, low-contrast "ink-trap" letterforms, which is the opposite
  personality of the high-contrast fashion-serif (Playfair-adjacent) that
  has become an AI-design cliché — it reads as warm/handmade rather than
  editorial/cold. Used sparingly: titles and the product name, nothing
  else.
- **IBM Plex Sans** (body/UI) — labels, inputs, buttons, copy. Chosen over
  the extremely-default Inter for a system that still reads precise and
  legible but has more character.
- **IBM Plex Mono** (data) — reserved exclusively for monetary figures
  (not used in this pass's screens, which show no money data yet, but
  fixed now so every future amount renders in tabular mono digits —
  deliberate ledger/receipt alignment, not decoration).

**Signature element — the "pocket card."** Every primary content
surface (the Login form, the Register form, the Home content block) sits
inside a Kertas-toned card with a single dashed hairline in Kulit tone
along its top inner edge, evoking a stitched pocket opening — a direct,
literal callback to the product name. This replaces a generic
Material-style drop-shadow card, is the one consistent motif across every
screen, and is where the eventual safe-to-spend "pocket" on the real
dashboard will visually originate from. One motif, used everywhere,
rather than one-off decoration per screen.

**Layout & composition:**

- **Login** — centered wordmark (Fraunces, modest size — this is a return
  visit, not a first-impression hero) → pocket card with Email/Password
  (persistent labels above inputs, not floating placeholders — an
  accessibility requirement, not just a style choice) → primary button
  "Masuk" filled in Terjaga → plain-text link below, "Belum punya akun?
  Buat akun". Inline error banner in Peringatan appears in-flow above the
  fields on failure (never a toast — a failed login is too important to
  risk being missed or auto-dismissed).
- **Register** — same wordmark + pocket-card shell for consistency →
  Display name / Email / Password (with a `Minimal 12 karakter` caption)
  → a required Terms/Privacy checkbox row with two inline tappable links,
  gating the primary button's enabled state → primary button "Buat Akun"
  in the same Terjaga treatment as Login (one consistent primary-action
  color across the flow) → "Sudah punya akun? Masuk" back-link.
- **Home** — this screen has no dashboard data yet in this pass, and a
  bare "Halo, {name}" + logout button would read as an unfinished
  scaffold. Instead: a Fraunces-set greeting with the user's display
  name, a plain-language subtitle that's honest about the current state
  ("Ringkasan keuanganmu akan muncul di sini" — your financial summary
  will appear here) rather than pretending there's more here than there
  is, and the account's real identity data (email, display name) shown
  inside a pocket card — establishing the exact visual pattern that
  future data cards (budget summary, safe-to-spend) will reuse. Logout is
  a clearly secondary, low-emphasis text action, never competing visually
  with a primary button that doesn't exist yet on this screen.

**Voice (Bahasa Indonesia):** second-person "kamu" throughout (matches a
trustworthy-but-approachable consumer register — "Anda" reads more
corporate/admin for this audience), active voice, plain verbs, no filler.
Errors are specific and neutral, never apologetic — e.g. invalid login is
`Email atau kata sandi salah.` (deliberately generic per AUTH-002's
requirement not to reveal whether the email exists, but still a complete,
specific sentence rather than a vague "something went wrong").

**Quality floor:** pocket card max-width ~420–480pt, centered on larger
Android/tablet viewports rather than stretching full-bleed; minimum 44pt
touch targets; every input has a real accessible label (not
placeholder-as-label); motion kept to a minimal fade/slide on card mount
plus standard Tamagui press-state feedback, both skipped when
`AccessibilityInfo.isReduceMotionEnabled()` is true — no elaborate
animation, since restraint here is itself the design choice, not a
missing feature.

## Screens in this pass

- **Register** — email, password, display name, and an explicit "I agree
  to the Terms of Service and Privacy Policy" acknowledgment (linking out
  to both documents) that supplies `accepted_terms_version` /
  `accepted_privacy_version` (current version constants bundled with the
  app) → `POST /v1/auth/register` → store tokens → navigate to Home.
- **Login** — email, password → `POST /v1/auth/login` → store tokens →
  navigate to Home.
- **Home** (authenticated) — `GET /v1/me` via `useQuery`, displays the
  user's email/display name, has a Logout button (`POST /v1/auth/logout`
  → clear tokens → navigate to Login).

Form validation is client-side minimal (required fields, password length
12–128 characters, matching `RegisterRequest` in `openapi.yaml`) — the API
remains the source of truth for validation errors, surfaced inline from
the `ErrorEnvelope` response.

## Testing

Jest + React Native Testing Library (Expo's preset). Unit tests target the
two riskiest, most logic-bearing pieces:

- The Zustand auth store (state transitions: login success, logout,
  hydration from a refreshed token).
- The 401 refresh-interceptor logic (successful silent refresh-and-retry;
  forced logout when refresh also fails).

No full screen-snapshot suite in this first pass — screens are thin
wiring over the store/query hooks already covered by unit tests.

## Out of scope (explicitly deferred)

- Onboarding flow and all other PRD §5.1 mobile surfaces.
- Dark theme (this pass ships the single custom light theme only).
- CSV import, OCR, Android notification parsing (P1 items regardless).
- Any workspace/monorepo tooling beyond a single `services/mobile`
  package.
