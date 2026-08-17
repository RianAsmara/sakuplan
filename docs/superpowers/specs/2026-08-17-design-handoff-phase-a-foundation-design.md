# Design Handoff Phase A — Tokens, Formatting, Primitives Foundation — Design

## Context

`design_handoff_sakuplan_rn/` is a hi-fidelity design package (read `CLAUDE.md` there
first) for porting SakuPlan's UI to an exact visual spec. Investigation found this is
**not** a green-field port: 10 of its 13 screens already exist in `mobile/` and are wired
to the real Go backend (not the handoff's in-memory prototype store). The handoff's
`code/lib/finance.ts` and `code/store/AppStore.tsx` recompute financial state
client-side from fake data — that's incompatible with this project's hard rule that the
Go API owns all financial business rules, and this app's hooks already get that data
from the real backend. So this work is being decomposed into phases, and **only the
appearance layer** of the handoff is being adopted, never its state/logic layer,
per the handoff's own stated rule: *"Where the app's existing conventions conflict with
the spec, follow the app's conventions for structure... and the spec for appearance."*

**This spec covers Phase A only: tokens, deterministic formatting, and shared
primitive components.** No existing screen is touched. Later phases (B: tab screens,
C: remaining tab screens + tab bar wiring, D: detail screens, E: onboarding) consume
what Phase A builds. Notifications, AI-review, and Privacy stay out of scope — confirmed
via the OpenAPI spec that no backend endpoints exist for them yet, same conclusion the
earlier dc-prototype Phase 3 design doc reached.

## Decisions made during brainstorming

- **Fonts**: adopt the handoff's three-family system (Fraunces 600 display-only, IBM
  Plex Sans for UI, IBM Plex Mono for numbers), reversing the Inter-only switch made
  earlier in this same session. Keep the existing font **key names** (`heading`/`body`/
  `mono`) rather than the handoff's `display`/`body`/`mono` — ~10 existing screens
  already reference `fontFamily="$heading"`; renaming the key breaks all of them for no
  visual benefit. Only which family backs each key changes.
- **Colors**: adopt the handoff's hex values exactly (every one of the 7 base tokens
  currently differs from `DESIGN_TOKENS.md` by a small but real amount — Phase 3
  approximated rather than matched). Add the tokens that don't exist yet: `hairline`,
  `garisPutus`, `tekan`, `putih` (alias/rename of the existing `white`), and the alpha-fill
  tokens (`terjagaFill`, `terjagaRing`, `peringatanFill`, `peringatanFillSoft`,
  `peringatanFillFaint`, `peringatanRule`, `leluasaFill`, `leluasaRule`, `kulitTrack`).
- **Spacing/size/radius**: adopt the handoff's exact scale wholesale rather than trying
  to preserve the current one. The two scales are not compatible at several keys (e.g.
  current `$5`=24 vs handoff `$5`=20; current radius `$2`=8 vs handoff radius `$2`=6) —
  existing screens using those specific keys will visibly shift until their own re-skin
  phase (B–E) verifies them against the prototype at 430px. This is an accepted,
  temporary, self-correcting side effect, not a defect to fix in Phase A.
- **Import style**: keep importing from the `tamagui` package (as the app already does),
  not `@tamagui/core` + `@tamagui/shorthands` as the handoff's skeleton does — this is a
  structural/tooling choice with no visual effect, so it follows the app's existing
  convention per the handoff's own rule.
- **Animation naming**: the handoff's primitive code references `animation="quick"`
  (matching `DESIGN_TOKENS.md`'s stated 120ms press-feedback duration). The app's current
  `createAnimations` call defines `fast: {duration: 120}` — rename that key to `quick`
  rather than editing every primitive to say `fast`, after confirming (via a repo-wide
  grep in the implementation step) that nothing else references `animation="fast"`.
- **Deterministic formatting is in scope, added beyond the original 3-part summary**:
  the app's *existing* `src/format/money.ts` (`formatRupiah`) uses
  `.toLocaleString('id-ID')`, and `src/format/date.ts` (`formatDateID`,
  `formatMonthYearID`) use `toLocaleDateString('id-ID', ...)` — exactly the
  device-dependent bug `design_handoff_sakuplan_rn/CLAUDE.md` warns about (Hermes on
  Android silently falls back to en-US grouping without full ICU on some devices,
  turning `Rp1.234.567` into `Rp1,234,567`). This is a real, live correctness bug in
  shipped code, not just a fidelity gap. Fix: rewrite the internals of the *existing*
  `formatRupiah`/`formatDateID` functions to the handoff's manual digit-grouping /
  fixed-month-name-table approach (ported from `code/lib/format.ts`), keeping the
  existing function **names and signatures** unchanged so none of the ~10 existing
  screens' call sites need to change. Existing tests in `money.test.ts`/`date.test.ts`
  should still pass unchanged (Node's Jest environment has full ICU, so the bug never
  manifested in tests — only on-device); add cases if the port surfaces any real
  behavioral difference.

## Scope boundary: nothing is wired into existing screens or navigation

Phase A only creates/updates shared, currently-unconsumed-or-internal files. Concretely:

- `PocketCard.tsx` is rewritten to use the new `DashedBox` (fixing a real Android bug:
  it currently does `borderStyle: 'dashed'` + `borderRadius` directly, which is the
  exact broken pattern the handoff's `CLAUDE.md` documents). This *is* a Phase A file
  because `PocketCard` is infrastructure, not a screen, and every existing screen that
  uses it keeps working identically (same props, same visual intent) — this is a bug
  fix, not a redesign.
- `AppHeader.tsx` (new) is **not** wired in place of the existing `SubScreenHeader.tsx`.
  Both exist side by side until a later phase migrates each detail screen's header
  one at a time.
- `TabBar.tsx` (new) is **not** wired into `app/(app)/(tabs)/_layout.tsx` in Phase A.
  Swapping the tab bar affects all 5 tab screens simultaneously and should land
  together with their content re-skin, not before it (avoids a visually mismatched
  transition state: new-style tab bar under still-old-style screen content). It
  becomes the first step of Phase C.
  `TabBar.tsx`'s route-key map (`index`/`transactions`/`budgets`/`reports`/`more`) must
  be adapted to the app's actual route file name for Beranda, which is `home.tsx`, not
  `index.tsx` — use `home` as the map key, don't rename the route file.
- `TabBarButton.tsx` and `SubScreenHeader.tsx` are **not** deleted in Phase A — they're
  still what the shipped screens use. Removed later, once their last call site migrates.
- `inputStyle`/`inputFocusStyle` (plain style-value objects in `primitives.tsx`) are
  exported for later phases to apply to the app's **existing** `TextField.tsx` — that
  component already fixes a separate, real Android text-rendering bug (Tamagui's
  default `Input` pipeline; see `docs/PROGRESS.md`'s 2026-08-09 entry) via its
  `unstyled` approach. Phase A does not touch `TextField.tsx` or replace it with a new
  input implementation, to avoid reintroducing that bug.
- `lib/finance.ts` and `store/AppStore.tsx` are **not** ported at all, ever, per the
  Context section above.

## Files

**Modify:**
- `mobile/tamagui.config.ts` — colors (exact hex + new tokens), space/size/radius scale
  (handoff's exact values), animation key rename (`fast`→`quick`), font family swap
  (same `heading`/`body`/`mono` keys, new families).
- `mobile/src/theme/fonts.ts` — load `Fraunces_600SemiBold`, `IBMPlexSans_400Regular`/
  `_500Medium`/`_600SemiBold`, `IBMPlexMono_500Medium` instead of the four Inter weights.
- `mobile/package.json` — remove `@expo-google-fonts/inter`, add
  `@expo-google-fonts/fraunces`, `@expo-google-fonts/ibm-plex-sans`,
  `@expo-google-fonts/ibm-plex-mono`.
- `mobile/src/format/money.ts` — rewrite `formatRupiah`'s internals to manual digit
  grouping (no `toLocaleString`), same signature. `parseRupiahInput` is unaffected
  (already digit-stripping, no Intl involved).
- `mobile/src/format/date.ts` — rewrite `formatDateID`/`formatMonthYearID`'s internals
  to a fixed Indonesian month-name table (no `toLocaleDateString`), same signatures.
  `toRFC3339`, `startOfMonth`, `endOfMonth`, `addMonths`, `daysAgo`, `toDateOnly` are
  unaffected (no Intl involved).
- `mobile/src/components/PocketCard.tsx` — use `DashedBox` internally instead of
  `borderStyle: 'dashed'` directly; same exported props/variants (`elevated`, `tone`).

**Create:**
- `mobile/src/components/DashedBox.tsx` — `DashedBox` (SVG dashed-rect card border) and
  `DashedRule` (SVG dashed horizontal line), ported near-verbatim from
  `design_handoff_sakuplan_rn/code/components/DashedBox.tsx`.
- `mobile/src/components/primitives.tsx` — the full type-scale-as-components system
  (`Wordmark`, `DisplayHeading`, `AuthHeading`, `TabTitle`, `DetailTitle`,
  `SectionHeading`, `GroupLabel`, `Body`, `BodyS`, `Meta`, `MetaS`, `Micro`, `Amount`,
  `FieldLabel`) plus layout atoms (`Screen`, `FlowScreen`, `Hairline`, `LedgerRow`,
  `inputStyle`, `inputFocusStyle`, `PrimaryButton`, `SecondaryButton`, `ButtonLabel`,
  `InlineAction`, `Chip`, `ChipLabel`), ported near-verbatim from
  `design_handoff_sakuplan_rn/code/components/primitives.tsx`.
- `mobile/src/components/ProgressBar.tsx` — the three-variant progress bar (budgets,
  goals-with-tick, report categories), ported near-verbatim.
- `mobile/src/components/AppHeader.tsx` — `DetailHeader` and `TabHeader`, ported
  near-verbatim (not wired into any screen yet).
- `mobile/src/components/TabBar.tsx` — the custom segmented-rule tab bar, ported with
  the route-key map adapted to `home` (not `index`) for Beranda (not wired into
  `_layout.tsx` yet).

**Icon import adaptation** (applies to `AppHeader.tsx` and `TabBar.tsx`): the handoff's
code imports icons from `@tamagui/lucide-icons`; this app has `@tamagui/lucide-icons-2`
installed instead (a different package name), which every existing screen already
imports from. Change the import source, not the icon names — `ArrowLeft`, `Home`,
`ReceiptText`, `Wallet`, `BarChart3`, `MoreHorizontal` all exist in both packages under
the same names. `TabBar.tsx` also imports `BottomTabBarProps` from
`@react-navigation/bottom-tabs` for typing — confirm that resolves (it's a transitive
dependency of `expo-router`); if it's not directly resolvable, add it as a direct
`devDependency` rather than loosening the type to `any`.

## Testing

- `npx tsc --noEmit`, `npx eslint .` clean, matching this project's existing standard.
- `money.test.ts`/`date.test.ts`: existing tests must still pass; add a couple of cases
  exercising values likely to expose grouping bugs if the port is wrong (e.g. exactly
  1000, exactly 1000000, a value with all-zero groups) since the whole point of this
  change is a bug that Jest's full-ICU environment can't otherwise catch by itself —
  the new tests assert against hand-computed expected strings, not against
  `toLocaleString`'s output, so they'd actually fail if the port regressed to Intl.
- No test needed for the new component files themselves (`DashedBox`, `primitives`,
  `ProgressBar`, `AppHeader`, `TabBar`) — they're unstyled-config/presentational and
  unconsumed by any screen in this phase; visual correctness is verified when a later
  phase actually renders a screen with them, side-by-side with the prototype at 430px
  per the handoff's definition of done.
- Manual/visual verification of Phase A itself is limited to: app still boots, existing
  10 screens still render without crashing (spacing/color drift on old screens is
  expected and accepted, per the Decisions section — not a regression to chase down now).

## Files touched

`mobile/tamagui.config.ts`, `mobile/src/theme/fonts.ts`, `mobile/package.json`,
`mobile/src/format/money.ts`, `mobile/src/format/date.ts`,
`mobile/src/components/PocketCard.tsx`, `mobile/src/components/DashedBox.tsx` (new),
`mobile/src/components/primitives.tsx` (new), `mobile/src/components/ProgressBar.tsx`
(new), `mobile/src/components/AppHeader.tsx` (new), `mobile/src/components/TabBar.tsx`
(new).
