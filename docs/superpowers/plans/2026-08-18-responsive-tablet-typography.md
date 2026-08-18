# Responsive Typography & Layout for Tablet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shared design-system primitives (`mobile/src/components/primitives.tsx`, `mobile/src/components/PocketCard.tsx`) respond to a phone-vs-tablet breakpoint — bigger type and more generous spacing at ≥768px width, unchanged at phone widths — so today's Login/Register screens and every future design-handoff phase inherit responsive behavior automatically.

**Architecture:** Add a `media` breakpoint block (`sm`/`gtSm` at 768px, Tamagui's own idiom) to `tamagui.config.ts`. Add a small `scaleForTablet()` helper (uniform 1.15× factor, since no tablet mockup exists to match exactly) and apply it to every typography component's `fontSize`/`lineHeight` via Tamagui's `$gtSm` responsive-prop mechanism. Apply discrete, hand-picked spacing bumps to the layout primitives, matching the codebase's existing discrete token idiom. No screen files change.

**Tech Stack:** Expo / React Native / Tamagui v2.6 (existing stack, no new dependencies).

**Spec:** `docs/superpowers/specs/2026-08-18-responsive-tablet-typography-design.md`

## Global Constraints

- Every `$gtSm` override in this plan keys off the `sm`/`gtSm` breakpoint added in Task 1 (768px). No other media keys are introduced.
- Typography `fontSize`/`lineHeight` pairs always use `scaleForTablet()` from `mobile/src/theme/responsive.ts` — never a hand-typed tablet number for type. `letterSpacing` is never scaled.
- Spacing/layout bumps use the exact literal values given per component below — don't invent different numbers or apply a formula to them.
- No screen files under `mobile/app/**` are touched by this plan.
- No new dependencies (Tamagui's media-query resolution is built in).
- Run `cd mobile && npx tsc --noEmit && npx eslint . && npx jest` before every commit; each must be clean (0 tsc errors; 0 eslint errors, only the 2 pre-existing `tamagui.config.ts` warnings; jest all passing).

---

### Task 1: Breakpoint config + `scaleForTablet` helper

**Files:**
- Modify: `mobile/tamagui.config.ts`
- Create: `mobile/src/theme/responsive.ts`
- Create: `mobile/src/theme/responsive.test.ts`

**Interfaces:**
- Produces: `scaleForTablet(px: number): number` from `mobile/src/theme/responsive.ts`, consumed by Task 2. Produces the `sm`/`gtSm` media keys in `tamagui.config.ts`'s `createTamagui()` call, which every `$gtSm` prop in Tasks 2 and 3 resolves against at runtime (no import needed for that part — it's config, not a value).

- [ ] **Step 1: Add the `media` block to `tamagui.config.ts`**

In `mobile/tamagui.config.ts`, the `createTamagui({...})` call currently ends:

```ts
export const config = createTamagui({
  animations: createAnimations({
    quick: { type: 'timing', duration: 120 },
    medium: { type: 'timing', duration: 200 },
  }),
  defaultFont: 'body',
  fonts: { heading: headingFont, body: bodyFont, mono: monoFont },
  tokens,
  themes: { light: lightTheme },
})
```

Change it to:

```ts
export const config = createTamagui({
  animations: createAnimations({
    quick: { type: 'timing', duration: 120 },
    medium: { type: 'timing', duration: 200 },
  }),
  defaultFont: 'body',
  fonts: { heading: headingFont, body: bodyFont, mono: monoFont },
  tokens,
  themes: { light: lightTheme },
  media: {
    sm: { maxWidth: 767 },
    gtSm: { minWidth: 768 },
  },
})
```

- [ ] **Step 2: Write the failing test for `scaleForTablet`**

Create `mobile/src/theme/responsive.test.ts`:

```ts
import { scaleForTablet } from './responsive'

describe('scaleForTablet', () => {
  it('scales up by the tablet type factor, rounded to the nearest pixel', () => {
    expect(scaleForTablet(20)).toBe(23)
    expect(scaleForTablet(11)).toBe(13)
    expect(scaleForTablet(14)).toBe(16)
  })

  it('rounds .5 up, not to even (matches JS Math.round, not banker\'s rounding)', () => {
    expect(scaleForTablet(30)).toBe(35) // 30 * 1.15 = 34.5 -> 35
  })

  it('returns 0 for 0', () => {
    expect(scaleForTablet(0)).toBe(0)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd mobile && npx jest src/theme/responsive.test.ts`
Expected: FAIL — `Cannot find module './responsive'` (the module doesn't exist yet).

- [ ] **Step 4: Create the helper**

Create `mobile/src/theme/responsive.ts`:

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

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd mobile && npx jest src/theme/responsive.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Full verification**

```bash
cd mobile && npx tsc --noEmit
cd mobile && npx eslint .
cd mobile && npx jest
```

Expected: tsc 0 errors; eslint 0 errors (2 pre-existing `tamagui.config.ts` warnings only); jest PASS, 14 suites / 69 tests (13/66 existing + this task's new 1 suite / 3 tests).

- [ ] **Step 7: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/tamagui.config.ts mobile/src/theme/responsive.ts mobile/src/theme/responsive.test.ts
git commit -m "feat(mobile): add tablet breakpoint and scaleForTablet helper"
```

---

### Task 2: Responsive typography and layout in `primitives.tsx`

**Files:**
- Modify: `mobile/src/components/primitives.tsx`

**Interfaces:**
- Consumes: `scaleForTablet` from `mobile/src/theme/responsive.ts` (Task 1).
- No exported names, signatures, or prop shapes change — every existing consumer (`login.tsx`, `register.tsx`) keeps working unmodified. This task only adds `$gtSm` keys to existing `styled()` configs and one inline prop on `FieldLabel`'s `<Label>`.

- [ ] **Step 1: Replace the full contents of `mobile/src/components/primitives.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Label, styled, Text, XStack, YStack, View } from 'tamagui'
import { scaleForTablet } from '../theme/responsive'

/**
 * The whole type system, as components. Nothing in a screen should set fontFamily,
 * fontSize or fontWeight by hand — if a size is missing here, it is missing from the
 * design, and that is worth a question rather than an invention.
 *
 * Names map 1:1 to the table in design_handoff_sakuplan_rn/DESIGN_TOKENS.md.
 *
 * Every fontSize/lineHeight pair also carries a $gtSm (>=768px, tablet) override via
 * scaleForTablet() — see docs/superpowers/specs/2026-08-18-responsive-tablet-typography-design.md.
 */

// --- Fraunces. Wordmark and onboarding/auth headings only. ---

export const Wordmark = styled(Text, {
  fontFamily: '$heading',
  fontWeight: '600',
  color: '$terjaga',
  variants: {
    size: {
      s: {
        fontSize: 20,
        lineHeight: 26,
        $gtSm: { fontSize: scaleForTablet(20), lineHeight: scaleForTablet(26) },
      }, // home
      m: {
        fontSize: 22,
        lineHeight: 28,
        $gtSm: { fontSize: scaleForTablet(22), lineHeight: scaleForTablet(28) },
      }, // onboarding
      l: {
        fontSize: 24,
        lineHeight: 30,
        $gtSm: { fontSize: scaleForTablet(24), lineHeight: scaleForTablet(30) },
      }, // auth
    },
  } as const,
  defaultVariants: { size: 's' },
})

export const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontWeight: '600',
  fontSize: 24,
  lineHeight: 30,
  color: '$tinta',
  $gtSm: { fontSize: scaleForTablet(24), lineHeight: scaleForTablet(30) },
})

export const AuthHeading = styled(Text, {
  fontFamily: '$heading',
  fontWeight: '600',
  fontSize: 20,
  lineHeight: 26,
  color: '$tinta',
  $gtSm: { fontSize: scaleForTablet(20), lineHeight: scaleForTablet(26) },
})

// --- IBM Plex Sans. Everything else. ---

/** Tab screen title. 24/32 SemiBold, left-aligned. */
export const TabTitle = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 24,
  lineHeight: 32,
  color: '$tinta',
  $gtSm: { fontSize: scaleForTablet(24), lineHeight: scaleForTablet(32) },
})

/** Detail screen title. 18/24 SemiBold, one line. */
export const DetailTitle = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 18,
  lineHeight: 24,
  color: '$tinta',
  numberOfLines: 1,
  ellipsizeMode: 'tail',
  $gtSm: { fontSize: scaleForTablet(18), lineHeight: scaleForTablet(24) },
})

/** "Perlu perhatian", "Riwayat", "Identitas" … */
export const SectionHeading = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 14,
  lineHeight: 20,
  color: '$tinta',
  $gtSm: { fontSize: scaleForTablet(14), lineHeight: scaleForTablet(20) },
})

/** "Akun" / "Perencanaan" / "Aplikasi" group labels in Lainnya. */
export const GroupLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '500',
  fontSize: 11,
  lineHeight: 16,
  letterSpacing: 0.22,
  color: '$kulit',
  $gtSm: { fontSize: scaleForTablet(11), lineHeight: scaleForTablet(16) },
})

export const Body = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 14,
  lineHeight: 20,
  color: '$tinta',
  $gtSm: { fontSize: scaleForTablet(14), lineHeight: scaleForTablet(20) },
})

export const BodyS = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 13,
  lineHeight: 19,
  color: '$tinta',
  $gtSm: { fontSize: scaleForTablet(13), lineHeight: scaleForTablet(19) },
})

export const Meta = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 12,
  lineHeight: 17,
  color: '$kulit',
  $gtSm: { fontSize: scaleForTablet(12), lineHeight: scaleForTablet(17) },
})

export const MetaS = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 11,
  lineHeight: 16,
  color: '$kulit',
  $gtSm: { fontSize: scaleForTablet(11), lineHeight: scaleForTablet(16) },
})

/** 10px, tracked out. Chart labels and the "SARAN AI · …" eyebrow. */
export const Micro = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 10,
  lineHeight: 14,
  letterSpacing: 0.4,
  color: '$kulit',
  $gtSm: { fontSize: scaleForTablet(10), lineHeight: scaleForTablet(14) },
})

// --- IBM Plex Mono. Numbers and field labels. ---

/**
 * Every currency figure. `tabular` is on by default and must stay on — it is what
 * keeps the ledger columns from shifting as digits change. Pass already-formatted
 * text (via `formatRupiah` from `src/format/money.ts`) as children — this component
 * does not format numbers itself.
 */
export const Amount = styled(Text, {
  fontFamily: '$mono',
  fontWeight: '500',
  color: '$tinta',
  fontVariant: ['tabular-nums'],
  variants: {
    size: {
      13: {
        fontSize: 13,
        lineHeight: 17,
        $gtSm: { fontSize: scaleForTablet(13), lineHeight: scaleForTablet(17) },
      },
      14: {
        fontSize: 14,
        lineHeight: 18,
        $gtSm: { fontSize: scaleForTablet(14), lineHeight: scaleForTablet(18) },
      },
      15: {
        fontSize: 15,
        lineHeight: 20,
        $gtSm: { fontSize: scaleForTablet(15), lineHeight: scaleForTablet(20) },
      },
      16: {
        fontSize: 16,
        lineHeight: 21,
        $gtSm: { fontSize: scaleForTablet(16), lineHeight: scaleForTablet(21) },
      },
      17: {
        fontSize: 17,
        lineHeight: 22,
        $gtSm: { fontSize: scaleForTablet(17), lineHeight: scaleForTablet(22) },
      },
      26: {
        fontSize: 26,
        lineHeight: 30,
        $gtSm: { fontSize: scaleForTablet(26), lineHeight: scaleForTablet(30) },
      },
      28: {
        fontSize: 28,
        lineHeight: 32,
        $gtSm: { fontSize: scaleForTablet(28), lineHeight: scaleForTablet(32) },
      },
      36: {
        fontSize: 36,
        lineHeight: 40,
        $gtSm: { fontSize: scaleForTablet(36), lineHeight: scaleForTablet(40) },
      },
      42: {
        fontSize: 42,
        lineHeight: 46,
        $gtSm: { fontSize: scaleForTablet(42), lineHeight: scaleForTablet(46) },
      }, // home hero: line-height 1.1
    },
  } as const,
  defaultVariants: { size: 14 },
})

/**
 * Icon + uppercase mono form label on one row, with `htmlFor` wired to the
 * paired input's `id`. The `styled(Text)` route can't take `htmlFor` — this
 * is a plain component built on Tamagui's `Label` for that reason, so its
 * tablet override is an inline `$gtSm` prop rather than a styled() config key.
 */
export function FieldLabel({
  htmlFor,
  icon,
  children,
}: {
  htmlFor: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <XStack alignItems="center" gap="$2">
      {icon}
      <Label
        htmlFor={htmlFor}
        fontFamily="$mono"
        fontWeight="500"
        fontSize={11}
        lineHeight={15}
        letterSpacing={0.44}
        color="$kulit"
        $gtSm={{ fontSize: scaleForTablet(11), lineHeight: scaleForTablet(15) }}
      >
        {children}
      </Label>
    </XStack>
  )
}

// --- Layout ---

/** Main-app screen body. 20px gutters, 20 top, 28 bottom; 24/24/32 on tablet. */
export const Screen = styled(YStack, {
  flex: 1,
  backgroundColor: '$kertas',
  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: 28,
  $gtSm: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
})

/** Onboarding and auth use wider gutters; wider still on tablet. */
export const FlowScreen = styled(YStack, {
  flex: 1,
  backgroundColor: '$kertas',
  paddingHorizontal: 24,
  paddingBottom: 24,
  $gtSm: { paddingHorizontal: 32, paddingBottom: 32 },
})

/** 1px horizontal rule. Applied as the TOP border of each list row. */
export const Hairline = styled(View, {
  height: 1,
  backgroundColor: '$hairline',
  alignSelf: 'stretch',
})

/**
 * A ledger row: full-width, space-between, hairline on top.
 * `pv` matches the design's per-list padding (9 / 12 / 13 / 14); +3px on tablet,
 * whatever value the caller passes.
 */
export const LedgerRow = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  borderTopWidth: 1,
  borderTopColor: '$hairline',
  variants: {
    pv: {
      ':number': (n) => ({ paddingVertical: n, $gtSm: { paddingVertical: n + 3 } }),
    },
  } as const,
  defaultVariants: { pv: 13 },
})

/** Solid-border input. The default everywhere except onboarding. */
export const inputStyle = {
  borderWidth: 1.5,
  borderColor: '$kulit',
  borderRadius: 8,
  backgroundColor: '$putih',
  paddingHorizontal: 14,
  paddingVertical: 13,
  fontFamily: '$body',
  fontSize: 14,
  color: '$tinta',
  $gtSm: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: scaleForTablet(14),
  },
} as const

/** Focus treatment: border goes brand green, plus a 3px soft ring. */
export const inputFocusStyle = {
  borderColor: '$terjaga',
  shadowColor: 'rgba(0,107,94,0.15)',
  shadowRadius: 0,
  shadowOpacity: 1,
  shadowOffset: { width: 0, height: 0 },
  // RN has no spread-only shadow; on native, emulate the ring with an outline View
  // or accept the border-only focus. Do not fake it with elevation.
} as const

/** Primary action. Full-width brand green. */
export const PrimaryButton = styled(XStack, {
  role: 'button',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: '$terjaga',
  borderRadius: 8,
  paddingVertical: 15,
  pressStyle: { scale: 0.97 },
  transition: 'quick',
  $gtSm: { paddingVertical: 18 },
})

/** Secondary action. Outlined, transparent fill. */
export const SecondaryButton = styled(XStack, {
  role: 'button',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  borderWidth: 1.5,
  borderColor: '$kulit',
  borderRadius: 8,
  backgroundColor: 'transparent',
  paddingVertical: 15,
  pressStyle: { scale: 0.97 },
  transition: 'quick',
  $gtSm: { paddingVertical: 18 },
})

export const ButtonLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '500',
  fontSize: 14,
  lineHeight: 20,
  $gtSm: { fontSize: scaleForTablet(14), lineHeight: scaleForTablet(20) },
})

/** Small inline text action: "Ubah", "Tandai lunas", "Lihat anggaran". */
export const InlineAction = styled(Text, {
  fontFamily: '$body',
  fontWeight: '500',
  fontSize: 12,
  lineHeight: 16,
  color: '$terjaga',
  pressStyle: { opacity: 0.7 },
  $gtSm: { fontSize: scaleForTablet(12), lineHeight: scaleForTablet(16) },
})

/**
 * Selection chip. 32px tall by design — below the 44px minimum, so callers MUST pass
 * hitSlop to the pressable wrapper. Keep the visual size; expand only the touch area.
 * A bit taller/wider on tablet (36 / 16 / 10).
 */
export const Chip = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 32,
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 14,
  borderWidth: 1,
  pressStyle: { scale: 0.95 },
  transition: 'quick',
  $gtSm: { minHeight: 36, paddingHorizontal: 16, paddingVertical: 10 },
  variants: {
    selected: {
      true: { backgroundColor: '$terjaga', borderColor: '$terjaga' },
      false: { backgroundColor: '$putih', borderColor: '$kulit' },
    },
  } as const,
  defaultVariants: { selected: false },
})

export const ChipLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 12,
  lineHeight: 16,
  $gtSm: { fontSize: scaleForTablet(12), lineHeight: scaleForTablet(16) },
  variants: {
    selected: {
      true: { color: '$putih' },
      false: { color: '$tinta' },
    },
  } as const,
  defaultVariants: { selected: false },
})
```

- [ ] **Step 2: Verify**

```bash
cd mobile && npx tsc --noEmit
cd mobile && npx eslint .
cd mobile && npx jest
```

Expected: tsc 0 errors; eslint 0 errors (2 pre-existing warnings only); jest PASS, 14 suites / 69 tests (unchanged from Task 1 — this task adds no new tests, it's styling-only over an already-tested-elsewhere surface, same reasoning as the Login/Register re-skin plan).

- [ ] **Step 3: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/components/primitives.tsx
git commit -m "feat(mobile): responsive typography and spacing for tablet in primitives.tsx"
```

---

### Task 3: Responsive `PocketCard`

**Files:**
- Modify: `mobile/src/components/PocketCard.tsx`

**Interfaces:**
- Consumes: nothing new (no import of `scaleForTablet` — this file only uses discrete token/pixel bumps, per the spec). Relies on the `gtSm` media key from Task 1 existing in `tamagui.config.ts` for its `$gtSm` props to resolve.
- No exported signature changes — `PocketCardProps` and every existing call site (~48 across the app, plus `login.tsx`/`register.tsx`) keep working unmodified.

- [ ] **Step 1: Replace the full contents of `mobile/src/components/PocketCard.tsx`**

```tsx
import type { ReactNode } from 'react'
import { YStack, type YStackProps } from 'tamagui'
import { DashedBox } from './DashedBox'

type PocketCardProps = YStackProps & {
  children?: ReactNode
  elevated?: boolean
  tone?: 'muted'
}

export function PocketCard({
  children,
  elevated = false,
  tone,
  flex,
  width,
  maxWidth,
  alignSelf,
  ...rest
}: PocketCardProps) {
  const isMuted = tone === 'muted'
  return (
    <YStack
      width={width ?? '100%'}
      maxWidth={maxWidth ?? 440}
      alignSelf={alignSelf ?? 'center'}
      flex={flex}
      {...(maxWidth === undefined ? { $gtSm: { maxWidth: 600 } } : {})}
    >
      <DashedBox
        color="#AEB9B2"
        fill={isMuted ? 'transparent' : '#FFFFFF'}
        radius={elevated ? 12 : 8}
        style={{ alignSelf: 'stretch', width: '100%', flexGrow: 1 }}
      >
        <YStack
          backgroundColor="transparent"
          padding={elevated ? '$5' : '$4'}
          gap={elevated ? '$4' : '$3'}
          $gtSm={{ padding: elevated ? '$6' : '$5', gap: elevated ? '$5' : '$4' }}
          shadowColor={elevated && !isMuted ? '$tinta' : undefined}
          shadowOffset={elevated && !isMuted ? { width: 0, height: 6 } : undefined}
          shadowOpacity={elevated ? (isMuted ? 0 : 0.1) : undefined}
          shadowRadius={elevated && !isMuted ? 20 : undefined}
          elevation={elevated ? (isMuted ? 0 : 4) : undefined}
          {...rest}
        >
          {children}
        </YStack>
      </DashedBox>
    </YStack>
  )
}
```

The `maxWidth` bump only applies when the caller didn't pass their own `maxWidth` — no current call site does (verify this still holds: `grep -rn "<PocketCard" app src --include="*.tsx" | grep maxWidth` should return nothing), but the conditional keeps a future explicit override from being silently fought by this change rather than assuming it'll never happen.

- [ ] **Step 2: Verify no call site passes an explicit `maxWidth`**

```bash
cd mobile && grep -rn "<PocketCard" app src --include="*.tsx" | grep maxWidth
```

Expected: no output. If this finds a match, stop and report it — the conditional in Step 1 already handles it correctly, but it means the "no current call site" claim above is wrong and needs correcting in this task's report.

- [ ] **Step 3: Verify**

```bash
cd mobile && npx tsc --noEmit
cd mobile && npx eslint .
cd mobile && npx jest
```

Expected: tsc 0 errors; eslint 0 errors (2 pre-existing warnings only); jest PASS, 14 suites / 69 tests (unchanged from Task 2).

- [ ] **Step 4: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/components/PocketCard.tsx
git commit -m "feat(mobile): responsive max-width and padding for PocketCard on tablet"
```

- [ ] **Step 5: Manual on-device visual verification reminder**

No automated command for this — flag it to the user, matching the spec's Testing section. Run the app on an emulator/AVD resized to ≥768px width (or a real tablet) and confirm: (a) `$gtSm` styles actually apply — this is the first use of Tamagui media queries in this app, so it's confirming the mechanism works, not just fidelity; (b) Login/Register read comfortably at that width, card isn't cramped, type isn't oversized/undersized relative to the 600px card cap. Then confirm the same screens on a phone-width emulator/device still render at the original phone sizes (the "returns to regular on phone" half of the requirement) — equally important to check.
