# Responsive Typography & Layout for Tablet — Design

## Context

The mobile app currently renders identically regardless of screen width. On a
tablet, text sized for a ~390px phone reads too small and the auth card (fixed
`maxWidth={440}`) looks cramped in the middle of a much wider screen. This
spec makes the shared design-system foundation ([[project-design-handoff-phases|
the design-handoff primitives]] landed in Phase A, and used so far only by the
re-skinned Login/Register screens) respond to a phone-vs-tablet breakpoint,
so both the two screens using it today and every future design-handoff phase
inherit responsive behavior automatically as they migrate onto these
primitives — no separate typography system to reconcile later.

Screens that don't yet use `primitives.tsx` (Home, Budgets, Accounts, Bills,
Goals, Transactions, More, Profile, Safe-to-Spend, Reports) are unaffected by
this spec. They become responsive when their own design-handoff phase
migrates them onto these primitives, same as the Login/Register phase did for
typography and spacing generally.

## Decisions made during brainstorming

1. **Detection: a screen-width breakpoint via Tamagui's own media-query
   system**, not real-device-type detection (`expo-device`/`Platform.isPad`).
   Reacts live to window size and orientation, works identically across
   iOS/Android, and needs no new dependency — it's the idiomatic Tamagui
   mechanism.
2. **Tamagui has no mechanism for a token's own value to vary by breakpoint**
   (confirmed against the current Tamagui docs, not assumed from memory):
   `fontSize="$4"` always resolves to the same number everywhere. Every
   responsive Tamagui app achieves this by attaching a `$gtSm={{...}}`
   override to each styled component's own definition (or inline per
   instance) — there is no "make the whole `$4` token bigger on tablet"
   shortcut. This spec's approach is built around that constraint, not
   around inventing one.
3. **Scope: typography *and* spacing/layout**, not typography alone — covers
   `primitives.tsx`'s font components, its layout primitives (`Screen`,
   `FlowScreen`, `LedgerRow`, buttons, `Chip`), `PocketCard.tsx`, and
   `inputStyle`.
4. **No tablet mockup exists to match.** `design_handoff_sakuplan_rn`'s
   reference HTML is phone-width only (430px), so there's no "correct"
   tablet value to hit pixel-for-pixel. Typography uses a uniform, computed
   scale factor rather than hand-picked-per-component values (avoids 30+
   independent design judgment calls with nothing to validate them against).
   Spacing/layout uses discrete, hand-picked bumps instead of the same
   formula — spacing reads fine at coarser granularity and the existing
   token scale is itself discrete, so matching that idiom fits the codebase
   better than a second formula.

## Mechanism

### Breakpoint

Add to `mobile/tamagui.config.ts`'s `createTamagui()` call:

```ts
media: {
  sm: { maxWidth: 767 },
  gtSm: { minWidth: 768 },
},
```

768px is the standard tablet threshold (iPad portrait width; matches
Tailwind's `md`). `sm`/`gtSm` are Tamagui's own idiomatic breakpoint names
(used verbatim in Tamagui's own docs examples) — not invented naming. Every
responsive override in this spec keys off `$gtSm` (">= 768px wide").

This is a config-only addition — Tamagui resolves media queries against
`useWindowDimensions()` internally on React Native; no other wiring changes
(no changes to `App`/`_layout.tsx`/`TamaguiProvider` setup). Since this app
has never used a `$gtSm`-style responsive prop before, first real usage
should be verified on an emulator/AVD resized to ≥768px width as part of
this work's testing, not assumed to work from documentation alone.

### Typography scale factor

New file `mobile/src/theme/responsive.ts`:

```ts
/**
 * Uniform scale-up factor for tablet ($gtSm) typography. No tablet mockup
 * exists to match pixel-for-pixel (design_handoff_sakuplan_rn's reference is
 * phone-width only), so this is a single deliberate constant rather than
 * per-component hand-picked values — see
 * docs/superpowers/specs/2026-08-18-responsive-tablet-typography-design.md.
 */
const TABLET_TYPE_SCALE = 1.15

/** Scales a phone-baseline fontSize or lineHeight pixel value for tablet. */
export function scaleForTablet(px: number): number {
  return Math.round(px * TABLET_TYPE_SCALE)
}
```

Applied to `fontSize` and `lineHeight` together (preserves each font's
designed leading ratio). `letterSpacing` is never scaled — it's already a
fine adjustment (0.22–0.44px) where scaling would be imperceptible.

### Spacing/layout bumps

Discrete, hand-picked per site (not computed) — matches the existing token
scale's own discrete idiom:

| Component | Property | Phone | Tablet |
|---|---|---|---|
| `Screen` | `paddingHorizontal` | 20 | 24 |
| `Screen` | `paddingTop` | 20 | 24 |
| `Screen` | `paddingBottom` | 28 | 32 |
| `FlowScreen` | `paddingHorizontal` | 24 | 32 |
| `FlowScreen` | `paddingBottom` | 24 | 32 |
| `PrimaryButton` / `SecondaryButton` | `paddingVertical` | 15 | 18 |
| `Chip` | `minHeight` | 32 | 36 |
| `Chip` | `paddingHorizontal` | 14 | 16 |
| `Chip` | `paddingVertical` | 8 | 10 |
| `LedgerRow` | `pv` variant | `n` (default 13) | `n + 3` (any caller-supplied value, not just the default) |
| `PocketCard` (outer) | `maxWidth` | 440 | 600 — only when the caller didn't pass their own `maxWidth` |
| `PocketCard` (inner, elevated) | `padding` / `gap` | `$5` / `$4` | `$6` / `$5` |
| `PocketCard` (inner, non-elevated) | `padding` / `gap` | `$4` / `$3` | `$5` / `$4` |
| `inputStyle` | `paddingHorizontal` | 14 | 16 |
| `inputStyle` | `paddingVertical` | 13 | 16 |

`Chip.borderRadius` (14) and `PocketCard`'s dashed-border `radius` prop
(8/12) are unchanged — corner radius doesn't need to track size the way
padding and type do, and neither was flagged as reading wrong on tablet.

## Files

- Modify: `mobile/tamagui.config.ts` — add `media` block.
- Create: `mobile/src/theme/responsive.ts` — `scaleForTablet()` helper.
- Modify: `mobile/src/components/primitives.tsx` — every typography
  `styled(Text, …)` export gets a `$gtSm` override built via
  `scaleForTablet()` (flat for single-size components; nested per `variant`
  branch for `Wordmark` and `Amount`, matching Tamagui's documented pattern
  for responsive variants). Layout primitives (`Screen`, `FlowScreen`,
  `LedgerRow`, `PrimaryButton`, `SecondaryButton`, `Chip`) get the discrete
  bumps from the table above. `inputStyle` gets both a `scaleForTablet()`
  `fontSize` and discrete padding bumps (it's a plain exported object
  spread onto `TextField`, not a `styled()` component — `$gtSm` works the
  same way as a plain object key since `TextField` forwards arbitrary props
  to Tamagui's `Input`). `FieldLabel` (a plain function component, not
  `styled()`, since it needs `htmlFor`) gets an inline `$gtSm` prop directly
  on its `<Label>` JSX element — same underlying mechanism, just applied at
  the call site instead of inside a `styled()` config since `FieldLabel`
  isn't one.
- Modify: `mobile/src/components/PocketCard.tsx` — inner `YStack` gets a
  `$gtSm` override for `padding`/`gap` (bump one token step, matching the
  table above). Outer `YStack`'s `maxWidth` gets a conditional `$gtSm`
  override that only applies when the caller didn't pass an explicit
  `maxWidth` — no current call site (of the ~48 in the app) passes one, but
  the conditional keeps a future explicit override from being silently
  fought by this change.

No screen files change — `login.tsx`/`register.tsx` consume these
primitives already and need no edits themselves. No other screens are
touched (see Context: they don't import these primitives yet).

## Explicitly not in scope

- Icon sizes (`<Mail size={14} .../>` etc., passed as literal props at each
  call site in `login.tsx`/`register.tsx`) — not part of the shared
  primitive system, would require touching call sites directly, which this
  spec's mechanism (primitives-only change) deliberately avoids.
- `GoogleIcon`'s fixed `size={18}` — same reasoning.
- Any screen not already importing `primitives.tsx` — inherits this
  automatically when its own design-handoff phase migrates it, not before.
- A third breakpoint tier (e.g. large tablet / desktop-web) — this app has
  no web target today and two tiers (phone/tablet) match the stated
  problem exactly.

## Testing

No new unit-testable logic — this is a pure styling/config change over
components that already render correctly at the phone breakpoint (existing
Login/Register manual verification still applies there unchanged).
Verification: `npx tsc --noEmit`, `npx eslint .`, `npx jest` (existing
suite, unaffected, should stay at the current 13/66 count) all clean.

Manual verification (deferred to the human partner, per this project's
established pattern): run the app on an emulator/AVD resized to ≥768px
width (or a real tablet if available) and confirm (a) `$gtSm` styles are
actually applied at all — first use of Tamagui media queries in this app,
so this isn't just a fidelity check, it's confirming the mechanism works —
and (b) Login/Register read comfortably at that width without the card
looking cramped or type looking oversized/undersized relative to the
card's new 600px cap. Then confirm the same screens on a phone-width
emulator/device still render at the original phone sizes (i.e. `$gtSm`
correctly does *not* apply below 768px) — this is the "returns to regular
on phone" half of the requirement and is just as important to verify as
the tablet half.
