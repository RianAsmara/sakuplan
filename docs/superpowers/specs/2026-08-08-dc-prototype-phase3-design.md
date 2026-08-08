# dc-prototype Phase 3 — Onboarding, Accounts, Bills, Goals, Safe-to-Spend Detail — Design

## Context

Phase 1 (`2026-08-04-dc-prototype-phase1.md`) and Phase 2
(`2026-08-05-dc-prototype-phase2.md`) implemented `SakuPlan.dc.html`'s
auth screens, 5-tab shell, Home, Transactions, Budgets, Reports, and More.
The prototype also specifies a 4-step onboarding wizard and five more
screens reachable from Home/More: Accounts, Bills, Goals, a Safe-to-Spend
breakdown, and a dedicated Profile screen (currently inlined in More).

This phase implements the subset of those that the backend already
supports end-to-end: Onboarding, Accounts, Bills (view-only), Goals
(view + contribute), Safe-to-Spend detail, and extracting Profile into
its own screen. Explicitly excluded, because their backend doesn't exist
yet: Notifications, the AI-recommendation approve/reject queue (only a
stateless one-shot `/v1/planning/recommendations` exists, already used by
the Budgets creation wizard), and Privacy's per-device session list /
account deletion. Those stay exactly as they are today — the "Segera
hadir" (coming soon) rows already in More.

Visual/UX direction: match `SakuPlan.dc.html` faithfully — same layout,
spacing, typography (Fraunces headings, IBM Plex Sans body, IBM Plex Mono
for money), and interaction chrome as Phases 1–2 did for auth/Home/etc.
Colors use the app's existing Tamagui tokens (`$terjaga`, `$leluasa`,
`$peringatan`, `$kulit`, `$tinta`, `$kertas`), which are this codebase's
adaptation of the prototype's palette — not the prototype's literal hex
values, for consistency with every screen already shipped.

## Navigation architecture

`app/(app)/_layout.tsx` is currently a bare `<Slot/>` wrapping the
`(tabs)` group. Five new routes are added as siblings of `(tabs)` under
`app/(app)/`: `accounts.tsx`, `bills.tsx`, `goals.tsx`,
`safe-to-spend.tsx`, `profile.tsx`. Being outside `(tabs)`, they render
without the tab bar automatically — matching the prototype's
`showTabBar: !isSubScreen`.

New shared component `src/components/SubScreenHeader.tsx`: a back-arrow
icon button (`ArrowLeft` from `@tamagui/lucide-icons-2`, `router.back()`)
plus a title, in a `XStack` matching the prototype's `isSubScreen` header
block (56px row, bottom border, title truncates with ellipsis). Used by
all five new screens.

`more.tsx`'s "Akun & saldo" and "Profil & preferensi" rows become real
`router.push('/(app)/accounts')` / `router.push('/(app)/profile')` links
(currently either absent or inert). The Home screen's `goSTS`-equivalent
tap target (the safe-to-spend hero card) becomes
`router.push('/(app)/safe-to-spend')`. Home's goal-progress tile and a
new "Target Tabungan" row wired into More both link to
`router.push('/(app)/goals')`; a "Tagihan Berulang" row is added to
More's "Perencanaan" section (currently missing) linking to
`router.push('/(app)/bills')`.

The current inline profile-edit `PocketCard` in `more.tsx` (identity,
payday, minimum buffer, AI consent — all wired to `useUpdateProfile`
already) moves verbatim into the new `profile.tsx`. `more.tsx` keeps its
avatar summary card, export/logout/logout-all card, and the "Segera
Hadir" placeholder card exactly as they are — the prototype's Privacy
screen (where those would eventually move) is out of scope this phase,
and there's no reason to strand already-working functionality.

## Onboarding

New route `app/(onboarding)/index.tsx` (own group, outside `(auth)` and
`(app)`, so it isn't gated by the access-token redirect in
`(app)/_layout.tsx`), shown once immediately after a successful
`submitRegister`-equivalent (`useRegister`'s `onSuccess`) — the register
screen navigates to it instead of straight into `(app)`. Existing users
logging in are unaffected (they go straight to `(app)/(tabs)/home` as
today).

Four-step wizard, one local component holding `step`/form state (0–3),
`Lanjut`/`Kembali`/`Mulai Pakai SakuPlan` footer buttons exactly as the
prototype lays out (`obShowBack`/`obShowNext`/`obShowFinish`). No
client-side validation beyond numeric input filtering — the prototype
itself has none, and per this repo's rules the Go API is the source of
truth for validation; backend rejections surface the same inline-banner
pattern Login/Register already use for their errors.

- **Step 0 — Nama & tanggal gajian**: name + payday text inputs, local
  state only.
- **Step 1 — Penghasilan bulanan**: monthly income, `RupiahInput`, local
  state only.
- **Step 2 — Anggaran pertama**: category allocation rows. Pre-filled
  from `GET /v1/categories`'s real seeded default `expense` categories
  (Makanan dan Minuman, Transportasi, Tagihan, Tempat Tinggal, Kesehatan,
  Pendidikan, Hiburan — not the prototype's 3 hardcoded demo names), each
  with a `RupiahInput` allocation amount defaulting to 0. A running total
  is shown (`obCatsTotalFmt` equivalent).
- **Step 3 — Ringkasan**: read-only summary of name, payday, income, and
  total allocated, matching the prototype.
- **Finish** (`Mulai Pakai SakuPlan`): calls `useUpdateProfile` (payday)
  then `useCreateAndActivateBudget` (existing hook — `POST /v1/budgets`
  + activate) with `start_date`/`end_date` set to the current calendar
  month (the same convention the Budgets wizard already uses),
  `expected_income` from step 1, and one allocation per step-2 category
  with a non-zero amount. On success, navigate to `(app)/(tabs)/home`.
  On failure, show an inline error banner and stay on step 3 (matches
  how Login/Register handle mutation failure today).

## Accounts screen

`GET /v1/accounts` via the existing `useAccounts` hook (unchanged). Total
balance (sum of all account balances, via existing `formatRupiah`) above
a list of accounts (name, `accountTypeLabels`-mapped type, balance),
`PocketCard`-styled rows — same shape as the prototype's `accountList`.
No create-account affordance on this screen: the prototype doesn't show
one here either (`AddAccountCard` already lives on the Transactions
account-picker empty state and is untouched by this phase).

## Bills screen

New `src/bills/useBills.ts` (`GET /v1/bills`, matches `useAccounts`'
shape). Each `Bill` carries `due_day` (1–31) and `frequency: 'monthly'`,
not a resolved date, so a new pure helper
`src/bills/nextBillOccurrence.ts` (unit-tested) resolves the next
occurrence date from `due_day` + "now" — same category of pure
date-math helper as the prototype's own `nextPaydayDate`, and mirrors
this codebase's existing `nextPaydayDate` used for onboarding/profile.
That resolved date feeds the existing `billUrgency()` helper
(`src/dashboard/billUrgency.ts`, already used by Home for the single
`upcoming_bill`) to produce the same "Terlambat N hari" / "Jatuh tempo
hari ini" / "Jatuh tempo N hari lagi" labels for every bill in the list,
not just the next one.

No "Tandai lunas" (mark paid) action — there is no backend endpoint for
it (`Bill` has no paid/unpaid state, only the recurring definition
itself), so this is a firm scope cut, not a placeholder. The list is
read-only: name, urgency label/color, amount.

## Goals screen

Two data sources, both already-fetchable:
- `GET /v1/goals` (new `src/goals/useGoals.ts`) for `id`, `name`,
  `target_amount`, `target_date`, `status` — filtered to `active`.
- `GET /v1/dashboard`'s `goals: GoalProgress[]` (already computed
  server-side via `ContributedTotal`) for `contributed` and
  `progress_percent` per `goal_id` — reusing the same dashboard fetch
  Home already makes (new `useDashboard` call on this screen; goal
  progress must not be recomputed client-side per this repo's "Go API
  owns all financial business rules" rule).

Rendered as `PocketCard`s: name, progress bar + percent, "{contributed}
dari {target}" plus a formatted deadline from `target_date`. Each card
has a collapsed "Tambah Dana" button that expands to an inline
amount + **account picker** (using the existing `useAccounts` list) +
"Simpan" — the prototype's `g.isAdding` form only has an amount field,
but `POST /v1/goals/{id}/contributions` requires `account_id`
(`GoalContributionRequest`), so an account selector is a necessary,
deliberate addition beyond the prototype, not an omission. New
`src/goals/useContributeToGoal.ts` mutation, idempotency-keyed like the
existing transaction/budget mutations, invalidating both `['goals']` and
`['dashboard']` on success (dashboard's goal progress must reflect the
new contribution immediately, matching how other mutations already
invalidate the dashboard query). No create-goal affordance — the
prototype doesn't show one on this screen.

## Safe-to-Spend detail screen

`GET /v1/planning/safe-to-spend` via the existing `useSafeToSpend` hook,
unchanged. The prototype's mock breakdown (liquid − unpaid bills − sisa
anggaran = aman sampai gajian) doesn't match the real `SafeToSpend`
schema's actual fields, so the real breakdown is shown instead: hero
figure (`daily`, "Aman dibelanjakan hari ini"), then a line-item
breakdown of `liquid_balance`, `upcoming_bills`, minus
`remaining_savings_commitment`, minus `minimum_buffer`, equals
`until_payday`, plus `days_remaining` — i.e., the same fields
`SafeToSpend` actually returns, laid out in the prototype's visual style
(dashed-border card, `IBM Plex Mono` amounts, `+`/`−`/`=` rows), not a
forced reproduction of the mock's specific three line items.

## Testing

New pure logic gets unit tests: `nextBillOccurrence` (day-of-month
resolution including month-end clamping, same edge cases as the
existing `nextPaydayDate`-style helpers already tested elsewhere).
Existing `billUrgency` tests are untouched. New hooks
(`useBills`, `useGoals`, `useContributeToGoal`) follow the existing
hook pattern exactly (`useAccounts`/`useSafeToSpend`/
`useCreateAndActivateBudget`) so no new test infrastructure is needed —
consistent with this repo not unit-testing thin React Query wrappers
elsewhere. `tsc --noEmit` and `expo lint` must pass. Manual Expo
walkthrough of all five new screens plus the onboarding flow on a fresh
registration, per this repo's established UI-verification convention
(screenshots where the emulator cooperates; documented gaps where it
doesn't, as every prior phase's `PROGRESS.md` entry has done).

## Non-goals

- Notifications screen, AI-recommendation approve/reject screen,
  Privacy screen (session list, account deletion) — no backend support;
  stay as today's "Segera hadir" placeholders.
- Bill/goal/account creation UI on these new screens — the prototype
  doesn't show any, so none is added.
- Bill "mark paid" — no backend endpoint.
- Onboarding skip — every new registration goes through it.
