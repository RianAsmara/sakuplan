# CLAUDE.md — implementation brief for SakuPlan (React Native + Tamagui)

Read this first, then `DESIGN_TOKENS.md`, then `SCREENS.md`. Work screen by screen.

## What you are doing

Porting a finished mobile design into an **existing React Native app that already uses Tamagui**.
The design lives in `reference/SakuPlan.dc.html` — an HTML prototype. It is a **design reference,
not code to copy**. Recreate it in the app's own environment and conventions.

The port must be **visually exact**. This is a hi-fi design: colors, type, spacing, and the
conditional color logic are all final and all specified to the pixel in `DESIGN_TOKENS.md`.
Where the app's existing conventions conflict with the spec, follow the app's conventions for
*structure* (routing, state, file layout) and the spec for *appearance*.

## Start here

`code/` contains a working skeleton. Copy it in, adapting paths and imports to the host project:

```
code/
  tamagui.config.ts          Tokens, three font families, light theme
  lib/format.ts              IDR + date formatting (no Intl — read the comment)
  lib/finance.ts             ALL financial logic + selectors. Pure. Port as-is.
  data/seed.ts               Prototype data, verbatim. Keep for dev + tests.
  store/AppStore.tsx         Context + actions wired to lib/finance.ts
  components/
    primitives.tsx           The type scale and layout atoms as components
    DashedBox.tsx            SVG dashed card border (REQUIRED — see below)
    ProgressBar.tsx          The three bar variants
    AppHeader.tsx            DetailHeader + TabHeader
    TabBar.tsx               Custom bottom bar with the segmented top rule
  app/
    _layout.tsx              Font loading + providers
    (tabs)/_layout.tsx       The 5 tabs
    (tabs)/index.tsx         ★ Beranda — full reference conversion
    safe-to-spend.tsx        ★ Detail-screen reference conversion
```

The two ★ files are the pattern. Build the remaining 11 screens the same way.

## Order of work

1. Drop in `tamagui.config.ts`, load the three fonts, verify text renders in Fraunces / Plex Sans / Plex Mono.
2. Port `lib/finance.ts` + `lib/format.ts` and **write unit tests against `data/seed.ts`** before any UI.
   Expected values with `FROZEN_TODAY` (2026-08-04) and the seed state:
   liquid `Rp5.370.000` · unpaid bills `Rp2.150.000` · remaining budget `Rp1.530.000` ·
   safety buffer `Rp500.000` · safe-until-payday `Rp1.190.000` · days to payday `21` ·
   safe-today `Rp56.667`. Home therefore shows the **positive** treatment plus one overdue
   bill (Iuran RT) and one blown budget (Hiburan) in "Perlu perhatian".
3. Routing shell: 5 tabs + 8 detail routes outside the tabs group + `(onboarding)` + `(auth)`.
4. Primitives, `DashedBox`, `ProgressBar`, the two headers, the tab bar.
5. Screens, in this order: Beranda → Transaksi → Anggaran → Laporan → Lainnya → the 8 detail
   screens → onboarding → auth. Beranda and safe-to-spend are already written.

## Rules that are not negotiable

**Never hardcode a hex value in a screen.** Use `$terjaga`, `$peringatan`, etc. The only
exceptions are the two components that take colors as plain strings because they pass them to
SVG (`DashedBox`) — those are already written.

**Never use `borderStyle: 'dashed'` together with `borderRadius`.** It renders wrong on Android
(solid corners, or no border at all). Use `<DashedBox>`. A dashed border with *no* radius is fine.

**Numbers are always IBM Plex Mono 500 with tabular figures.** Use the `<Amount>` primitive.
A currency figure in Plex Sans is a bug, and proportional digits make the ledger columns jitter.

**Never format currency with `toLocaleString` or `Intl.NumberFormat`.** Use `fmtIDR`. Hermes on
Android silently falls back to en-US grouping without full ICU, which turns `Rp1.234.567` into
`Rp1,234,567` on some devices only. `fmtIDR` is deterministic.

**Colors carry meaning. Do not reassign them.**
- `terjaga` green = safe, positive, primary action, income.
- `peringatan` red = overdue, over budget, destructive.
- `leluasa` amber = savings goals and AI suggestions, **and nothing else**.
Amber on a budget row, or green on an over-budget bar, breaks the whole scanning model.

**A negative daily allowance is never rendered as a minus number.** It becomes
"Batas harian terlampaui" in red, with the absolute value. See `(tabs)/index.tsx`.

**Selectors return status, screens pick colors.** `lib/finance.ts` returns `over: true` or
`state: 'overdue'`. Do not push hex values back into the logic layer.

**Keep every Indonesian string verbatim.** Do not translate, reword, or "improve" copy. The
strings in `SCREENS.md` are the source of truth. Same for the `·` separators and the `›` chevrons.

**Layout with flex + `gap`.** No margin-based spacing between siblings, no absolute positioning
except where the design genuinely overlays (only the toggle knob and the DashedBox border).

**Minimum 44px touch targets.** Two places in the design fall short and both need a wrapper that
expands the touch area without changing the visual size: the 32px chips and the 30px avatar.
`(tabs)/index.tsx` shows the avatar treatment; chips need `hitSlop`.

## Dependencies you will need

```
@tamagui/core @tamagui/shorthands @tamagui/animations-react-native @tamagui/lucide-icons
react-native-svg react-native-safe-area-context expo-router expo-font
@expo-google-fonts/fraunces @expo-google-fonts/ibm-plex-sans @expo-google-fonts/ibm-plex-mono
```

Icons are Lucide throughout, 1.5–2 stroke width. `@tamagui/lucide-icons` gives you the same set
the prototype's inline SVGs were drawn from — the mapping is in `SCREENS.md`.

## Things the prototype fakes, that you must decide with the user

1. `TODAY` is frozen at 2026-08-04. Swap in a real clock but keep it injectable for tests.
2. `BCA` is hardcoded as the source account for bill payments and goal contributions.
3. The Laporan cash-flow chart uses a hardcoded 6-month series.
4. Auth does not authenticate; "Masuk dengan Google" is a no-op.
5. Onboarding does not persist — finishing it only sets the display name.
6. No data layer at all: everything is in-memory and resets on reload.
7. The safety buffer is subtracted in the safe-to-spend maths but is not shown as a line on the
   breakdown screen. Ask before changing this.

Do not silently invent solutions for these. Ask, or leave a clearly marked `TODO(handoff)`.

## Definition of done, per screen

- Side by side with the prototype at 430px wide, spacing and type match.
- No hex literals, no raw `<Text>` with inline sizes, no `toLocaleString`.
- Conditional states verified: over-budget rows, overdue bills, negative safe-to-spend,
  AI consent off, empty AI list, read vs unread notifications, paid vs unpaid bills.
- Touch targets ≥ 44px.
- Renders correctly on both iOS and Android — check the dashed borders specifically.
