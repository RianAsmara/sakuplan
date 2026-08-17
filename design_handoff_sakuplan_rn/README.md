# Handoff: SakuPlan — React Native + Tamagui

## Overview

SakuPlan is an Indonesian personal-finance app for salaried households. Its central idea is one
number: **how much can I safely spend today?** — computed from liquid cash minus unpaid bills,
minus the unspent remainder of this month's budgets, minus a user-set safety buffer, divided by
the days left until payday. Every other screen exists to make that number trustworthy or to keep
it accurate.

The design covers 13 screens (5 tabs, 8 detail screens), a 4-step onboarding flow, and
login/register. All copy is in Bahasa Indonesia. Currency is IDR.

## About the design files

`reference/SakuPlan.dc.html` is a **design reference created in HTML** — an interactive prototype
showing the intended look and behavior. **It is not production code and should not be copied.**
The task is to recreate this design in the target React Native codebase, using its existing
patterns and libraries — in this case **Tamagui**, which the project already uses.

The prototype's logic *is* worth porting, and it has already been extracted for you into
`code/lib/finance.ts` as pure, typed, UI-free functions. That file is the one part of this bundle
you can use close to as-is.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, borders, and the conditional color logic
are final. Recreate the UI exactly, using Tamagui tokens rather than literal values.
`DESIGN_TOKENS.md` lists every value in the design; `SCREENS.md` specifies every screen
component-by-component with verbatim copy.

Two things are explicitly *not* final and are marked as such throughout: the report chart's data
series, and the hardcoded source account (`BCA`) for bill payments and goal contributions.

## Where to start

**Read `CLAUDE.md`.** It is the implementation brief — order of work, non-negotiable rules,
dependency list, expected test values, and the list of things the prototype fakes that need a
product decision. Then `DESIGN_TOKENS.md` for values, then `SCREENS.md` for per-screen specs.

`code/` is a working skeleton: Tamagui config, the extracted logic, a store, the shared
primitives, and **two fully converted reference screens** — Beranda (`app/(tabs)/index.tsx`) and
Rincian aman belanja (`app/safe-to-spend.tsx`). Those two demonstrate the pattern for the
remaining eleven: one is a tab screen with conditional states, the other is a detail screen with
the bleeding header.

## Screens

| # | Screen | Route | Kind |
| --- | --- | --- | --- |
| 1 | Beranda | `(tabs)/index` | tab — **converted** |
| 2 | Transaksi | `(tabs)/transactions` | tab |
| 3 | Anggaran | `(tabs)/budgets` | tab |
| 4 | Laporan | `(tabs)/reports` | tab |
| 5 | Lainnya | `(tabs)/more` | tab |
| 6 | Akun & saldo | `accounts` | detail |
| 7 | Tagihan berulang | `bills` | detail |
| 8 | Target tabungan | `goals` | detail |
| 9 | Rincian aman belanja | `safe-to-spend` | detail — **converted** |
| 10 | Notifikasi | `notifications` | detail |
| 11 | Rekomendasi AI | `ai-review` | detail |
| 12 | Privasi & keamanan | `privacy` | detail |
| 13 | Profil & preferensi | `profile` | detail |
| — | Onboarding (4 steps) | `(onboarding)` | flow, outside the tab shell |
| — | Login / Register | `(auth)` | flow, outside the tab shell |

Full specs — layout, exact type, exact colors, verbatim copy, states — in `SCREENS.md`.

## Interactions & behavior

No screen transitions or scroll-linked animation exist in the design. The only motion is press
feedback (`scale` 0.95–0.98, or `opacity` 0.7 on list rows, 120ms) and the AI-consent toggle knob
(150ms). Everything else is instant.

Behavior that carries product meaning, all specified in `SCREENS.md`:

- **Adding a transaction** moves the account balance, increments the matching budget's `spent`
  (expenses only), and prepends to history. Savings accounts cannot fund a transaction.
- **Marking a bill paid** debits an account and records the payment as a transaction.
- **Contributing to a goal** does the same, in the opposite direction.
- **AI suggestions never apply themselves.** Approve overwrites a budget's allocation or creates a
  new budget; reject discards. Both consume the suggestion. Turning consent off hides AI entirely.
- **Account deletion** requires typing `HAPUS` exactly; the confirm button stays at
  `opacity: 0.4` until then.
- **Negative safe-to-spend** is reframed, not shown as a minus figure — see `SCREENS.md` § Beranda.

## State management

One state object, ported to React context in `code/store/AppStore.tsx` with every mutation
delegated to a pure function in `lib/finance.ts`. If the host project already has a store, move
the state into it — the mutations are already `(state) => patch` functions, so the swap is
mechanical.

State shape (`AppState` in `lib/finance.ts`): `userName`, `paydayDay`, `safetyBuffer`, `aiConsent`,
`accounts[]`, `transactions[]`, `budgets[]`, `bills[]`, `goals[]`, `notifications[]`,
`aiSuggestions[]`, `sessions[]`. Numeric settings are held as strings because they are bound to
text inputs.

Derived values are never stored — `computeDerived(state, today)` recalculates on every render, and
selectors (`attentionItems`, `budgetRows`, `billRows`, `categoryBars`, …) derive the rest.

**There is no data layer.** The prototype is in-memory and resets on reload. Persistence, auth and
sync are all yours to design.

## Design tokens

See `DESIGN_TOKENS.md` for the complete list. In brief:

- **Colors** — terjaga `#006B5E` (primary/safe), tinta `#18251F` (text), kertas `#F7F8F4`
  (background), kulit `#66736C` (secondary), leluasa `#D2A21B` (savings + AI only), peringatan
  `#C3443D` (warnings/destructive), hairline `#D8DDD7`, dashed `#AEB9B2`.
- **Type** — Fraunces 600 (wordmark and onboarding/auth headings only), IBM Plex Sans 400/500/600
  (all UI), IBM Plex Mono 500 (every number and every field label).
- **Spacing** — 20px screen gutters in the app, 24px in the flows; section rhythm 18/20/22.
- **Radius** — 3, 4, 6, 8, 12, 14 (chips), full (dots and avatar).
- **Elevation** — one shadow, on the auth card. Cards are defined by a 1.5px dashed hairline.

## Assets

None to transfer. All iconography is Lucide (`@tamagui/lucide-icons`), drawn inline in the
prototype at 13–21px with 2px strokes; the per-screen mapping is in `SCREENS.md`. Fonts come from
Google Fonts via `@expo-google-fonts/*`. The only literal artwork is the 4-color Google mark on
the auth buttons — keep its official colors exactly (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`).

There is no photography or illustration in the design.

## Files in this bundle

```
README.md            ← you are here
CLAUDE.md            Implementation brief. Read this next.
DESIGN_TOKENS.md     Every color, type spec, space, radius and border in the design.
SCREENS.md           All 13 screens + both flows, specified component-by-component.
code/                Working skeleton: config, extracted logic, primitives, 2 converted screens.
reference/
  SakuPlan.dc.html   The HTML prototype. Design reference only — do not port directly.
```

The prototype opens in any browser. It is best viewed at 430px wide.
