# Design Handoff Phase A — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt `design_handoff_sakuplan_rn`'s exact design tokens, deterministic money/date formatting, and shared primitive components into `mobile/`, without touching any existing screen or wiring anything new in yet.

**Architecture:** `mobile/tamagui.config.ts` gets the design's exact color/space/size/radius scale and a font-family swap (Inter → Fraunces/IBM Plex Sans/IBM Plex Mono) while keeping its existing font *keys* (`heading`/`body`/`mono`) and its existing hover/press/focus-state derivation mechanism (the `shade()` helper) so the ~10 existing screens keep compiling and rendering with only the intended value drift. New shared primitive files (`DashedBox`, `primitives`, `ProgressBar`, `AppHeader`, `TabBar`) are added alongside the existing ones (`PocketCard`, `TabBarButton`, `SubScreenHeader`), not in place of them — reconciliation happens screen-by-screen in later phases.

**Tech Stack:** React Native 0.86.2, Expo SDK 57, Tamagui, TypeScript (strict).

**Spec:** `docs/superpowers/specs/2026-08-17-design-handoff-phase-a-foundation-design.md`

## Global Constraints

- No existing screen file is modified in this plan, except `PocketCard.tsx` (a bug fix
  that must remain prop-compatible with all its current call sites) and
  `money.ts`/`date.ts` (internal-only rewrites, same exported function names/signatures).
- Never hardcode a hex value in new primitive/screen-facing code — use tokens. The one
  documented exception is `DashedBox`/`DashedRule`, which take color as a literal string
  because they pass it straight to an SVG `stroke` prop.
- Never format currency with `toLocaleString`/`Intl.NumberFormat`; never format dates
  with `toLocaleDateString`. Both are being fixed in this plan for exactly this reason.
- Code style: no semicolons, single quotes, 2-space indent, matching every existing file.
- Run `npx eslint <file>` after touching a file, and `npx tsc --noEmit` at the end of
  every task, from the `mobile/` directory.

---

## Task 1: Tamagui tokens, spacing/radius scale, and animation rename

**Files:**
- Modify: `mobile/tamagui.config.ts`

**Interfaces:**
- Produces: color tokens `$kertas $tinta $terjaga $leluasa $kulit $peringatan $white
  $putih $hairline $garisPutus $tekan $terjagaFill $terjagaRing $peringatanFill
  $peringatanFillSoft $peringatanFillFaint $peringatanRule $leluasaFill $leluasaRule
  $kulitTrack`; theme tokens `$background $color $borderColor $primary $primaryText
  $accent $danger` (+ their `Hover`/`Press`/`Focus` variants, unchanged mechanism); space
  scale keys `0 0.5 0.75 1 1.25 1.5 2 2.5 3 3.5 4 4.5 5 5.5 6 6.5 7 8 true`; size scale
  keys `0 1 2 3 4 5 6 8 touch header avatar toggleW toggleH true`; radius scale keys
  `0 1 1.5 2 3 4 chip round true`; animation key `quick` (120ms, replaces `fast`); font
  keys `heading`/`body`/`mono` (same names, new families — Task 2 loads the actual font
  assets, this task only declares them).
- Consumes: nothing new (this is the first task).

- [ ] **Step 1: Replace the full contents of `mobile/tamagui.config.ts`**

```ts
import { createAnimations } from '@tamagui/animations-react-native'
import { createFont, createTamagui, createTokens } from 'tamagui'

const color = {
  kertas: '#F7F8F4',
  tinta: '#18251F',
  terjaga: '#006B5E',
  leluasa: '#D2A21B',
  kulit: '#66736C',
  peringatan: '#C3443D',
  white: '#FFFFFF',
  putih: '#FFFFFF',
  hairline: '#D8DDD7',
  garisPutus: '#AEB9B2',
  tekan: '#EEF3EF',
  terjagaFill: 'rgba(0,107,94,0.06)',
  terjagaRing: 'rgba(0,107,94,0.15)',
  peringatanFill: 'rgba(195,68,61,0.06)',
  peringatanFillSoft: 'rgba(195,68,61,0.05)',
  peringatanFillFaint: 'rgba(195,68,61,0.04)',
  peringatanRule: 'rgba(195,68,61,0.12)',
  leluasaFill: 'rgba(210,162,27,0.05)',
  leluasaRule: 'rgba(210,162,27,0.18)',
  kulitTrack: 'rgba(102,115,108,0.35)',
}

// Derives a lighter/darker shade of a hex color. Positive `amount` lightens
// (mixes toward white), negative darkens (mixes toward black) — used to
// generate hover/press/focus state colors from the named palette above
// without hand-picking a second hex value for every interaction state.
function shade(hex: string, amount: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n))
  const num = Number.parseInt(hex.slice(1), 16)
  const r = (num >> 16) & 0xff
  const g = (num >> 8) & 0xff
  const b = num & 0xff
  const mix = (channel: number) =>
    amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount)
  const toHex = (n: number) => clamp(Math.round(mix(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const tokens = createTokens({
  color,
  space: {
    0: 0,
    0.5: 2,
    0.75: 3,
    1: 4,
    1.25: 5,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    4.5: 18,
    5: 20,
    5.5: 22,
    6: 24,
    6.5: 26,
    7: 28,
    8: 32,
    true: 16,
  },
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    touch: 44,
    header: 56,
    avatar: 30,
    toggleW: 44,
    toggleH: 26,
    true: 16,
  },
  radius: {
    0: 0,
    1: 3,
    1.5: 4,
    2: 6,
    3: 8,
    4: 12,
    chip: 14,
    round: 999,
    true: 8,
  },
  zIndex: { 0: 0, 1: 100, 2: 200, true: 0 },
})

const headingFont = createFont({
  family: 'Fraunces_600SemiBold',
  size: { 4: 20, 5: 22, 6: 24, true: 24 },
  weight: { 6: '600' },
  lineHeight: { 4: 26, 5: 28, 6: 30, true: 30 },
  letterSpacing: { 6: 0 },
  face: { '600': { normal: 'Fraunces_600SemiBold' } },
})

const bodyFont = createFont({
  family: 'IBMPlexSans_400Regular',
  size: { 1: 10, 2: 11, 3: 12, 4: 13, 5: 14, 6: 18, 7: 24, true: 14 },
  weight: { 4: '400', 5: '500', 6: '600' },
  lineHeight: { 1: 14, 2: 16, 3: 17, 4: 19, 5: 20, 6: 24, 7: 32, true: 20 },
  letterSpacing: { 1: 0.4, 2: 0.22, true: 0 },
  face: {
    '400': { normal: 'IBMPlexSans_400Regular' },
    '500': { normal: 'IBMPlexSans_500Medium' },
    '600': { normal: 'IBMPlexSans_600SemiBold' },
  },
})

const monoFont = createFont({
  family: 'IBMPlexMono_500Medium',
  // Keys 1 and 3 are outside design_handoff_sakuplan_rn's scale (which starts at 2)
  // but are kept here at their pre-existing pixel values (14 and 20) because existing
  // screens - not touched by this plan - still reference $mono $1 and $3. Dropping
  // them would break those screens outright (undefined token), not just drift their
  // spacing the way the rest of this scale change does.
  size: {
    1: 14,
    2: 11,
    3: 20,
    4: 13,
    5: 14,
    6: 15,
    7: 16,
    8: 17,
    9: 26,
    10: 28,
    11: 36,
    12: 42,
    true: 14,
  },
  weight: { 5: '500' },
  lineHeight: {
    1: 18,
    2: 15,
    3: 26,
    4: 17,
    5: 18,
    6: 20,
    7: 21,
    8: 22,
    9: 30,
    10: 32,
    11: 40,
    12: 46,
    true: 18,
  },
  letterSpacing: { 2: 0.44, true: 0 },
  face: { '500': { normal: 'IBMPlexMono_500Medium' } },
})

const lightTheme = {
  // Base surface + text
  background: tokens.color.kertas,
  backgroundHover: shade(color.kertas, -0.03),
  backgroundPress: shade(color.kertas, -0.06),
  backgroundFocus: shade(color.kertas, -0.03),
  color: tokens.color.tinta,
  colorHover: tokens.color.tinta,
  colorPress: tokens.color.tinta,
  colorFocus: tokens.color.tinta,
  placeholderColor: shade(color.kulit, 0.15),
  outlineColor: shade(color.terjaga, 0.35),

  // Borders — default kulit (leather), focus shifts to the brand teal so a
  // focused field is unmistakable without needing a color-coded label.
  borderColor: tokens.color.kulit,
  borderColorHover: shade(color.kulit, -0.1),
  borderColorPress: tokens.color.terjaga,
  borderColorFocus: tokens.color.terjaga,

  // Primary action (buttons, links)
  primary: tokens.color.terjaga,
  primaryHover: shade(color.terjaga, 0.08),
  primaryPress: shade(color.terjaga, -0.12),
  primaryFocus: shade(color.terjaga, 0.08),
  primaryText: tokens.color.white,

  // Secondary text/hairlines
  accent: tokens.color.leluasa,
  kulit: tokens.color.kulit,

  // Error state
  danger: tokens.color.peringatan,
  dangerHover: shade(color.peringatan, 0.08),
  dangerPress: shade(color.peringatan, -0.12),

  white: tokens.color.white,
}

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

export type AppConfig = typeof config

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
```

- [ ] **Step 2: Lint**

```bash
cd mobile && npx eslint tamagui.config.ts
```
Expected: 0 errors.

- [ ] **Step 3: Check tsc progress**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference `tamagui.config.ts` itself. Errors may appear elsewhere
referencing `Fraunces_600SemiBold`/`IBMPlexSans_*`/`IBMPlexMono_*` not being loadable —
that's expected until Task 2 adds the font packages; do not fix that here.

- [ ] **Step 4: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/tamagui.config.ts
git commit -m "feat(mobile): adopt design_handoff's exact color/space/size/radius tokens"
```

---

## Task 2: Font loading

**Files:**
- Modify: `mobile/package.json` (remove `@expo-google-fonts/inter`, add 3 new font
  packages, via npm)
- Modify: `mobile/src/theme/fonts.ts`

**Interfaces:**
- Consumes: font family names declared in Task 1's `tamagui.config.ts`
  (`Fraunces_600SemiBold`, `IBMPlexSans_400Regular`, `IBMPlexSans_500Medium`,
  `IBMPlexSans_600SemiBold`, `IBMPlexMono_500Medium`).
- Produces: `useAppFontsLoaded(): boolean` (same exported name/signature as before —
  consumed by `mobile/app/_layout.tsx`, which is not touched by this task).

- [ ] **Step 1: Swap the font dependency**

```bash
cd mobile
npm uninstall @expo-google-fonts/inter
npm install @expo-google-fonts/fraunces @expo-google-fonts/ibm-plex-sans @expo-google-fonts/ibm-plex-mono
```

- [ ] **Step 2: Replace the full contents of `mobile/src/theme/fonts.ts`**

```ts
import { useFonts } from 'expo-font'
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces'
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans'
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono'

export function useAppFontsLoaded(): boolean {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_500Medium,
  })
  return fontsLoaded
}
```

- [ ] **Step 3: Lint**

```bash
cd mobile && npx eslint src/theme/fonts.ts
```
Expected: 0 errors.

- [ ] **Step 4: Check tsc — the font-family errors from Task 1 should now be gone**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference `tamagui.config.ts` or `src/theme/fonts.ts`.

- [ ] **Step 5: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/package.json mobile/package-lock.json mobile/src/theme/fonts.ts
git commit -m "feat(mobile): load Fraunces/IBM Plex Sans/IBM Plex Mono instead of Inter"
```

---

## Task 3: Deterministic currency and date formatting

**Files:**
- Modify: `mobile/src/format/money.ts`
- Modify: `mobile/src/format/money.test.ts`
- Modify: `mobile/src/format/date.ts`

**Interfaces:**
- Produces: `formatRupiah(minorUnits: number): string`, `parseRupiahInput(raw: string):
  number` (unchanged signature), `formatDateID(iso: string): string`,
  `formatMonthYearID(date: Date): string` (unchanged signatures) — all consumed
  throughout the existing app, none of which are touched by this task.

- [ ] **Step 1: Replace `formatRupiah` in `mobile/src/format/money.ts`**

Full file:

```ts
export function formatRupiah(minorUnits: number): string {
  const rounded = Math.round(minorUnits)
  const negative = rounded < 0
  const digits = String(Math.abs(rounded))
  let grouped = ''
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) grouped += '.'
    grouped += digits[i]
  }
  return `${negative ? '-' : ''}Rp${grouped}`
}

export function parseRupiahInput(raw: string): number {
  const digitsOnly = raw.replace(/[^0-9]/g, '')
  if (digitsOnly === '') return 0
  return Number.parseInt(digitsOnly, 10)
}
```

This replaces `.toLocaleString('id-ID')` with manual thousands-grouping — deterministic
regardless of the device's ICU data. `parseRupiahInput` is unchanged (it never used
`Intl`).

- [ ] **Step 2: Add regression cases to `mobile/src/format/money.test.ts`**

Add these two `it` blocks inside the existing `describe('formatRupiah', ...)` block,
after the existing 4 cases:

```ts
  it('formats a value with a middle group of all zeros', () => {
    expect(formatRupiah(100000000)).toBe('Rp100.000.000')
  })

  it('formats an exact multiple of a thousand with no fractional remainder', () => {
    expect(formatRupiah(1000000)).toBe('Rp1.000.000')
  })
```

- [ ] **Step 3: Run the money tests**

```bash
cd mobile && npx jest src/format/money.test.ts
```
Expected: PASS, 6/6 (4 existing + 2 new).

- [ ] **Step 4: Replace `formatDateID`/`formatMonthYearID` in `mobile/src/format/date.ts`**

Full file:

```ts
// Fixed Indonesian month tables. These match what `toLocaleDateString('id-ID', ...)`
// currently produces in this project's test/build environment (verified directly) -
// hardcoding them makes the output identical on every device instead of depending on
// whichever ICU data (if any) Hermes finds on that device at runtime.
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTHS_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

export function toRFC3339(date: Date): string {
  return date.toISOString()
}

export function formatDateID(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

export function formatMonthYearID(date: Date): string {
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

export function daysAgo(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() - days)
  return copy
}

export function toDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

`formatDateID` uses local date components (`getDate()`/`getMonth()`/`getFullYear()`),
matching exactly what the previous `toLocaleDateString` call did implicitly (it also
used the local timezone, not UTC, since no `timeZone` option was passed) — this is a
pure internal swap, not a timezone-handling change.

- [ ] **Step 5: Run the full format test suite (no test-file changes needed for date.ts — the existing 2 assertions already pin the exact expected strings)**

```bash
cd mobile && npx jest src/format
```
Expected: PASS, all suites (money + date) green, no failures.

- [ ] **Step 6: Lint**

```bash
cd mobile && npx eslint src/format/money.ts src/format/money.test.ts src/format/date.ts
```
Expected: 0 errors.

- [ ] **Step 7: Check tsc**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference the 3 touched files.

- [ ] **Step 8: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/format/money.ts mobile/src/format/money.test.ts mobile/src/format/date.ts
git commit -m "fix(mobile): make currency and date formatting deterministic (no Intl)"
```

---

## Task 4: DashedBox and the PocketCard bug fix

**Files:**
- Create: `mobile/src/components/DashedBox.tsx`
- Modify: `mobile/src/components/PocketCard.tsx`

**Interfaces:**
- Consumes: color/space tokens from Task 1 (`$white`, `$tinta`).
- Produces: `DashedBox({ children, color?, radius?, strokeWidth?, dash?, fill?,
  style?, ...rest }: ViewProps & {...})`, `DashedRule({ color?, strokeWidth?, dash? })`
  from `DashedBox.tsx` — `DashedRule` isn't consumed until Task 7 (`TabBar.tsx`), but
  lives in the same file as `DashedBox` per the handoff's own file layout. `PocketCard`
  keeps its existing exported signature: a component accepting `children`, optional
  `elevated?: boolean`, optional `tone?: 'muted'`, and arbitrary additional `YStack`
  props (existing call sites pass `flex`, `alignItems`, `justifyContent`, `gap`, etc.
  through it — this task must keep all of those working).

- [ ] **Step 1: Create `mobile/src/components/DashedBox.tsx`**

```tsx
import React from 'react'
import Svg, { Rect } from 'react-native-svg'
import { View, type ViewProps } from 'react-native'

/**
 * The dashed hairline card ("PocketCard") is a brand signature — it is what makes the
 * app read as a paper ledger. React Native CANNOT be trusted with `borderStyle:
 * 'dashed'` + `borderRadius`: on Android the corners render as solid, the dash phase
 * differs from iOS, and on some API levels the border disappears entirely. So this
 * draws it with SVG instead and gets identical output on both platforms.
 *
 * Usage:
 *   <DashedBox color="#AEB9B2" radius={8}>…</DashedBox>
 */
export function DashedBox({
  children,
  color = '#AEB9B2',
  radius = 8,
  strokeWidth = 1.5,
  dash = [5, 4],
  fill = 'transparent',
  style,
  ...rest
}: ViewProps & {
  color?: string
  radius?: number
  strokeWidth?: number
  dash?: [number, number]
  fill?: string
}) {
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  const inset = strokeWidth / 2

  return (
    <View
      {...rest}
      style={style}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout
        if (width !== size.w || height !== size.h) setSize({ w: width, h: height })
      }}
    >
      {size.w > 0 && (
        <Svg
          width={size.w}
          height={size.h}
          style={{ position: 'absolute', left: 0, top: 0 }}
          pointerEvents="none"
        >
          <Rect
            x={inset}
            y={inset}
            width={Math.max(size.w - strokeWidth, 0)}
            height={Math.max(size.h - strokeWidth, 0)}
            rx={radius}
            ry={radius}
            fill={fill}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={dash}
          />
        </Svg>
      )}
      {children}
    </View>
  )
}

/**
 * The 1.5px dashed rule along the top of the tab bar. Same reasoning as DashedBox,
 * minus the corners — a straight dashed line is cheap to draw and always correct.
 */
export function DashedRule({
  color = '#AEB9B2',
  strokeWidth = 1.5,
  dash = [5, 4],
}: {
  color?: string
  strokeWidth?: number
  dash?: [number, number]
}) {
  const [w, setW] = React.useState(0)
  return (
    <View
      style={{ height: strokeWidth, width: '100%' }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && (
        <Svg width={w} height={strokeWidth}>
          <Rect
            x={0}
            y={0}
            width={w}
            height={strokeWidth}
            fill={color}
            strokeDasharray={dash}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        </Svg>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Replace the full contents of `mobile/src/components/PocketCard.tsx`**

This is the one already-shipped, actively-used file this plan modifies. It's split
into three layers instead of the original single `styled(YStack)` call: an outer
`YStack` that receives every extra prop callers pass (so `flex`, `alignItems`,
`justifyContent`, `gap`, etc. keep working exactly as before — several existing
screens rely on this, e.g. `<PocketCard flex={1}>` in `home.tsx`'s side-by-side
summary cards and `<PocketCard tone="muted" alignItems="center" justifyContent="center"
flex={1} gap="$3">` in `ComingSoonScreen.tsx`), a middle `DashedBox` purely for the
border, and an inner `YStack` for background/padding/gap. Passing the same extra props
to both the outer and inner `YStack` is intentional and safe here — for a single-child
wrapper chain like this, duplicating `flex`/`alignItems`/`justifyContent`/`gap` on both
layers produces the same visual result as before, since the middle `DashedBox` doesn't
constrain size differently than its single child would on its own.

```tsx
import type { ReactNode } from 'react'
import { YStack, type YStackProps } from 'tamagui'
import { DashedBox } from './DashedBox'

type PocketCardProps = YStackProps & {
  children?: ReactNode
  elevated?: boolean
  tone?: 'muted'
}

export function PocketCard({ children, elevated = false, tone, ...rest }: PocketCardProps) {
  const isMuted = tone === 'muted'
  return (
    <YStack width="100%" maxWidth={440} alignSelf="center" {...rest}>
      <DashedBox color="#AEB9B2" radius={elevated ? 12 : 8}>
        <YStack
          backgroundColor={isMuted ? 'transparent' : '$white'}
          padding={elevated ? '$5' : '$4'}
          gap={elevated ? '$4' : '$3'}
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

- [ ] **Step 3: Lint**

```bash
cd mobile && npx eslint src/components/DashedBox.tsx src/components/PocketCard.tsx
```
Expected: 0 errors.

- [ ] **Step 4: Check tsc**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference either file, and — importantly — no errors reference any
of `PocketCard`'s existing call sites (`src/components/ComingSoonScreen.tsx`,
`src/accounts/AddAccountCard.tsx`, `src/transactions/TransactionListItem.tsx`,
`app/(app)/(tabs)/more.tsx`, `app/(app)/(tabs)/home.tsx`, `app/(app)/goals.tsx`,
`app/(app)/safe-to-spend.tsx`). If any of those show a new type error, `PocketCardProps`
is missing something a call site passes — read the error and extend the type, don't
loosen it to `any`.

- [ ] **Step 5: Manual visual spot-check (this is the one file in this plan with real
  regression risk — worth a look, not just a type-check)**

Run the app (`cd mobile && npx expo start`) and open Beranda (Home), Lainnya (More),
and one screen with `tone="muted"` (e.g. a "Segera Hadir" card in More, or the empty
state in Goals if there are no goals). Confirm: cards still show a dashed border (now
drawn via SVG — should look the same or better, especially on Android), the two
side-by-side summary cards on Home are still equal width, and the muted/"coming soon"
card still has no background fill.

- [ ] **Step 6: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/components/DashedBox.tsx mobile/src/components/PocketCard.tsx
git commit -m "fix(mobile): draw PocketCard's dashed border with SVG (fixes Android rendering)"
```

---

## Task 5: The primitives type/layout system

**Files:**
- Create: `mobile/src/components/primitives.tsx`

**Interfaces:**
- Consumes: color tokens from Task 1 (`$terjaga`, `$tinta`, `$kulit`, `$kertas`,
  `$hairline`, `$putih`) and animation key `quick` from Task 1.
- Produces (not consumed by anything until later phases): `Wordmark`, `DisplayHeading`,
  `AuthHeading`, `TabTitle`, `DetailTitle`, `SectionHeading`, `GroupLabel`, `Body`,
  `BodyS`, `Meta`, `MetaS`, `Micro`, `Amount`, `FieldLabel`, `Screen`, `FlowScreen`,
  `Hairline`, `LedgerRow`, `inputStyle`, `inputFocusStyle`, `PrimaryButton`,
  `SecondaryButton`, `ButtonLabel`, `InlineAction`, `Chip`, `ChipLabel`.

- [ ] **Step 1: Create `mobile/src/components/primitives.tsx`**

```tsx
import { styled, Text, XStack, YStack, View } from 'tamagui'

/**
 * The whole type system, as components. Nothing in a screen should set fontFamily,
 * fontSize or fontWeight by hand — if a size is missing here, it is missing from the
 * design, and that is worth a question rather than an invention.
 *
 * Names map 1:1 to the table in design_handoff_sakuplan_rn/DESIGN_TOKENS.md.
 */

// --- Fraunces. Wordmark and onboarding/auth headings only. ---

export const Wordmark = styled(Text, {
  fontFamily: '$heading',
  fontWeight: '600',
  color: '$terjaga',
  variants: {
    size: {
      s: { fontSize: 20, lineHeight: 26 }, // home
      m: { fontSize: 22, lineHeight: 28 }, // onboarding
      l: { fontSize: 24, lineHeight: 30 }, // auth
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
})

export const AuthHeading = styled(Text, {
  fontFamily: '$heading',
  fontWeight: '600',
  fontSize: 20,
  lineHeight: 26,
  color: '$tinta',
})

// --- IBM Plex Sans. Everything else. ---

/** Tab screen title. 24/32 SemiBold, left-aligned. */
export const TabTitle = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 24,
  lineHeight: 32,
  color: '$tinta',
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
})

/** "Perlu perhatian", "Riwayat", "Identitas" … */
export const SectionHeading = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 14,
  lineHeight: 20,
  color: '$tinta',
})

/** "Akun" / "Perencanaan" / "Aplikasi" group labels in Lainnya. */
export const GroupLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '500',
  fontSize: 11,
  lineHeight: 16,
  letterSpacing: 0.22,
  color: '$kulit',
})

export const Body = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 14,
  lineHeight: 20,
  color: '$tinta',
})

export const BodyS = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 13,
  lineHeight: 19,
  color: '$tinta',
})

export const Meta = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 12,
  lineHeight: 17,
  color: '$kulit',
})

export const MetaS = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 11,
  lineHeight: 16,
  color: '$kulit',
})

/** 10px, tracked out. Chart labels and the "SARAN AI · …" eyebrow. */
export const Micro = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 10,
  lineHeight: 14,
  letterSpacing: 0.4,
  color: '$kulit',
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
      13: { fontSize: 13, lineHeight: 17 },
      14: { fontSize: 14, lineHeight: 18 },
      15: { fontSize: 15, lineHeight: 20 },
      16: { fontSize: 16, lineHeight: 21 },
      17: { fontSize: 17, lineHeight: 22 },
      26: { fontSize: 26, lineHeight: 30 },
      28: { fontSize: 28, lineHeight: 32 },
      36: { fontSize: 36, lineHeight: 40 },
      42: { fontSize: 42, lineHeight: 46 }, // home hero: line-height 1.1
    },
  } as const,
  defaultVariants: { size: 14 },
})

/** Uppercase mono form label. Always paired with an optional 14px icon. */
export const FieldLabel = styled(Text, {
  fontFamily: '$mono',
  fontWeight: '500',
  fontSize: 11,
  lineHeight: 15,
  letterSpacing: 0.44,
  color: '$kulit',
})

// --- Layout ---

/** Main-app screen body. 20px gutters, 20 top, 28 bottom. */
export const Screen = styled(YStack, {
  flex: 1,
  backgroundColor: '$kertas',
  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: 28,
})

/** Onboarding and auth use wider gutters. */
export const FlowScreen = styled(YStack, {
  flex: 1,
  backgroundColor: '$kertas',
  paddingHorizontal: 24,
  paddingBottom: 24,
})

/** 1px horizontal rule. Applied as the TOP border of each list row. */
export const Hairline = styled(View, {
  height: 1,
  backgroundColor: '$hairline',
  alignSelf: 'stretch',
})

/**
 * A ledger row: full-width, space-between, hairline on top.
 * `pv` matches the design's per-list padding (9 / 12 / 13 / 14).
 */
export const LedgerRow = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  borderTopWidth: 1,
  borderTopColor: '$hairline',
  variants: {
    pv: {
      ':number': (n) => ({ paddingVertical: n }),
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
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: '$terjaga',
  borderRadius: 8,
  paddingVertical: 15,
  pressStyle: { scale: 0.97 },
  animation: 'quick',
})

/** Secondary action. Outlined, transparent fill. */
export const SecondaryButton = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  borderWidth: 1.5,
  borderColor: '$kulit',
  borderRadius: 8,
  backgroundColor: 'transparent',
  paddingVertical: 15,
  pressStyle: { scale: 0.97 },
  animation: 'quick',
})

export const ButtonLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '500',
  fontSize: 14,
  lineHeight: 20,
})

/** Small inline text action: "Ubah", "Tandai lunas", "Lihat anggaran". */
export const InlineAction = styled(Text, {
  fontFamily: '$body',
  fontWeight: '500',
  fontSize: 12,
  lineHeight: 16,
  color: '$terjaga',
  pressStyle: { opacity: 0.7 },
})

/**
 * Selection chip. 32px tall by design — below the 44px minimum, so callers MUST pass
 * hitSlop to the pressable wrapper. Keep the visual size; expand only the touch area.
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
  animation: 'quick',
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
  variants: {
    selected: {
      true: { color: '$putih' },
      false: { color: '$tinta' },
    },
  } as const,
  defaultVariants: { selected: false },
})
```

Note: `fontFamily` uses `$heading`/`$body`/`$mono` (this app's existing font key names
from `tamagui.config.ts`), not the handoff's own `$display`/`$body`/`$mono` — this is
the adaptation called out in the spec's Decisions section.

- [ ] **Step 2: Lint**

```bash
cd mobile && npx eslint src/components/primitives.tsx
```
Expected: 0 errors.

- [ ] **Step 3: Check tsc**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference `primitives.tsx`. If `LedgerRow`'s `':number'` variant
syntax errors under this project's Tamagui version, report it precisely (paste the
error) rather than guessing a fix — that syntax is copied verbatim from the working
handoff skeleton, so a real error here is worth surfacing exactly, not papering over.

- [ ] **Step 4: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/components/primitives.tsx
git commit -m "feat(mobile): add design system primitives (typography, layout, buttons, chips)"
```

---

## Task 6: ProgressBar

**Files:**
- Create: `mobile/src/components/ProgressBar.tsx`

**Interfaces:**
- Consumes: `$kertas`, `$putih` tokens from Task 1.
- Produces (not consumed until later phases): `ProgressBar({ pct: number, height?:
  number, fill: string, track?: string, tick?: boolean })`.

- [ ] **Step 1: Create `mobile/src/components/ProgressBar.tsx`**

```tsx
import { View, XStack } from 'tamagui'

/**
 * Progress bars. Three appear in the design and they differ in ways that matter:
 *
 *  - Budgets (Anggaran):  5px, fill terjaga or peringatan when over, width clamped to 100.
 *  - Goals (Home + Target tabungan): 6px, fill leluasa, PLUS a 2px white dashed tick on
 *    the fill's right edge. That tick is not decoration — it is what makes a savings
 *    bar read differently from a spending bar at a glance.
 *  - Report categories: 6px, fill terjaga, normalized against the largest category.
 */

export function ProgressBar({
  pct,
  height = 6,
  fill,
  track = '$kertas',
  tick = false,
}: {
  /** 0–100. Clamp before passing; this component does not clamp for you. */
  pct: number
  height?: number
  fill: string
  track?: string
  /** The 2px white dashed right edge used by savings goals. */
  tick?: boolean
}) {
  return (
    <View
      height={height}
      borderRadius={3}
      backgroundColor={track}
      overflow="hidden"
      alignSelf="stretch"
    >
      <XStack width={`${pct}%`} height="100%" backgroundColor={fill} justifyContent="flex-end">
        {tick && pct > 0 ? <View width={2} height="100%" backgroundColor="$putih" /> : null}
      </XStack>
    </View>
  )
}
```

- [ ] **Step 2: Lint**

```bash
cd mobile && npx eslint src/components/ProgressBar.tsx
```
Expected: 0 errors.

- [ ] **Step 3: Check tsc**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference `ProgressBar.tsx`.

- [ ] **Step 4: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/components/ProgressBar.tsx
git commit -m "feat(mobile): add ProgressBar (budget/goal/report variants)"
```

---

## Task 7: AppHeader and TabBar

**Files:**
- Create: `mobile/src/components/AppHeader.tsx`
- Create: `mobile/src/components/TabBar.tsx`

**Interfaces:**
- Consumes: `DetailTitle`, `TabTitle`, `Meta` from Task 5's `primitives.tsx`;
  `DashedRule` from Task 4's `DashedBox.tsx`; `$kertas`, `$hairline`, `$tekan`,
  `$terjaga`, `$putih`, `$kulit` tokens from Task 1.
- Produces (not wired into any screen or navigation config until Phase C):
  `DetailHeader({ title: string, onBack?: () => void })`, `TabHeader({ title: string,
  description?: string, action?: React.ReactNode })` from `AppHeader.tsx`;
  `TabBar(props: BottomTabBarProps)` from `TabBar.tsx`.

- [ ] **Step 1: Create `mobile/src/components/AppHeader.tsx`**

Icon import is adapted from the handoff's `@tamagui/lucide-icons` to this project's
actual installed package, `@tamagui/lucide-icons-2` (same icon names, different
package name — every existing screen already imports icons this way).

```tsx
import { router } from 'expo-router'
import { ArrowLeft } from '@tamagui/lucide-icons-2'
import { XStack, YStack, View } from 'tamagui'
import { DetailTitle, TabTitle, Meta } from './primitives'

/**
 * DetailHeader — the header for the 8 sub-screens.
 *
 * 56px bar, kertas background, 1px hairline underneath, icon-only back button.
 * There is no text label next to the arrow; that was removed deliberately.
 * The bar bleeds to the screen edges, so it must sit OUTSIDE the 20px-gutter Screen body.
 */
export function DetailHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <XStack
      height={56}
      alignItems="center"
      paddingHorizontal={16}
      backgroundColor="$kertas"
      borderBottomWidth={1}
      borderBottomColor="$hairline"
    >
      <XStack
        width={44}
        height={44}
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        borderRadius={8}
        pressStyle={{ backgroundColor: '$tekan' }}
        animation="quick"
        onPress={onBack ?? (() => router.back())}
        accessibilityRole="button"
        accessibilityLabel="Kembali"
      >
        <ArrowLeft size={21} color="$terjaga" strokeWidth={2} />
      </XStack>
      <DetailTitle flex={1} marginLeft={8}>
        {title}
      </DetailTitle>
    </XStack>
  )
}

/**
 * TabHeader — the header for Transaksi / Anggaran / Laporan / Lainnya.
 *
 * No back button, no card, no border, no icon. Just a 24/32 SemiBold title, an optional
 * description line, and an optional compact action pinned to the right.
 * Beranda does not use this — it opens with its own brand row.
 */
export function TabHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <XStack justifyContent="space-between" alignItems="flex-start" marginBottom={22}>
      <YStack flex={1}>
        <TabTitle>{title}</TabTitle>
        {description ? <Meta marginTop={5}>{description}</Meta> : null}
      </YStack>
      {action ? <View marginTop={6}>{action}</View> : null}
    </XStack>
  )
}
```

- [ ] **Step 2: Create `mobile/src/components/TabBar.tsx`**

Same icon-package adaptation as Step 1. The route-key map uses `home` (this app's
actual route file, `app/(app)/(tabs)/home.tsx`) instead of the handoff's `index`
(the handoff assumes the file is named `index.tsx`) — do not rename the route file to
match the handoff; adapt the map instead.

```tsx
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Home, ReceiptText, Wallet, BarChart3, MoreHorizontal } from '@tamagui/lucide-icons-2'
import { Text, XStack, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DashedRule } from './DashedBox'

/**
 * Custom tab bar. A stock tab bar cannot express this design, because the active
 * indicator is a 2px rule on the TOP EDGE of the tab item — and inactive items carry
 * the same 2px rule in kulit, so the bar reads as a segmented ledger line rather than
 * as a highlighted pill. That segmented line is the point. Do not replace it with a
 * background or an underline.
 */

const ICONS = {
  home: Home,
  transactions: ReceiptText,
  budgets: Wallet,
  reports: BarChart3,
  more: MoreHorizontal,
} as const

const LABELS = {
  home: 'Beranda',
  transactions: 'Transaksi',
  budgets: 'Anggaran',
  reports: 'Laporan',
  more: 'Lainnya',
} as const

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()

  return (
    <YStack backgroundColor="$putih" flexShrink={0}>
      <DashedRule color="#AEB9B2" strokeWidth={1.5} />
      <XStack paddingBottom={insets.bottom}>
        {state.routes.map((route, index) => {
          const focused = state.index === index
          const key = route.name as keyof typeof ICONS
          const Icon = ICONS[key]
          const color = focused ? '$terjaga' : '$kulit'

          return (
            <YStack
              key={route.key}
              flex={1}
              alignItems="center"
              gap={3}
              paddingTop={14}
              paddingBottom={12}
              paddingHorizontal={4}
              borderTopWidth={2}
              borderTopColor={color}
              pressStyle={{ scale: 0.95 }}
              animation="quick"
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                })
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
              }}
            >
              {Icon ? <Icon size={18} color={color} strokeWidth={2} /> : null}
              <Text
                fontFamily="$body"
                fontWeight="500"
                fontSize={11}
                lineHeight={16}
                color={color}
              >
                {LABELS[key]}
              </Text>
            </YStack>
          )
        })}
      </XStack>
    </YStack>
  )
}
```

- [ ] **Step 3: Confirm `@react-navigation/bottom-tabs` resolves for the type import**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -i "bottom-tabs\|BottomTabBarProps"
```
Expected: no output (no error). If it does error with "Cannot find module
'@react-navigation/bottom-tabs'", add it as a direct dependency:
```bash
npm install --save-dev @react-navigation/bottom-tabs
```
then re-run the check. Do not work around a real resolution failure by typing the prop
as `any`.

- [ ] **Step 4: Lint**

```bash
cd mobile && npx eslint src/components/AppHeader.tsx src/components/TabBar.tsx
```
Expected: 0 errors.

- [ ] **Step 5: Check tsc — this must now be fully clean project-wide**

```bash
cd mobile && npx tsc --noEmit
```
Expected: PASS, 0 errors. All of Phase A's new/modified files are done; nothing in this
plan wires them into a screen, so the whole project should type-check exactly as
cleanly as it did before this plan started.

- [ ] **Step 6: Run the full test suite as a final sanity check**

```bash
cd mobile && npx jest
```
Expected: PASS, same suite count as before this plan plus the 2 new `money.test.ts`
cases from Task 3 (13 suites, 66 tests — 64 from before this plan's mobile work plus
the 2 added here).

```bash
cd mobile && npx eslint .
```
Expected: 0 errors, 2 warnings in `tamagui.config.ts` (the `eslint-disable
@typescript-eslint/no-empty-interface` line and the empty `TamaguiCustomConfig`
interface it guards) — Task 1's rewrite kept that block verbatim, so these are the
same two pre-existing warnings this project already had before this plan, not new ones.

- [ ] **Step 7: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/components/AppHeader.tsx mobile/src/components/TabBar.tsx
git commit -m "feat(mobile): add AppHeader (DetailHeader/TabHeader) and custom TabBar"
```
