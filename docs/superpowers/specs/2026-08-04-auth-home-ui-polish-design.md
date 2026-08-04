# Auth + Home Screen UI Polish — Design

## Context

The mobile auth flow (login, register) and the Home screen shipped as a
functional scaffold in the mobile-scaffold-auth pass
(`2026-08-02-mobile-scaffold-auth-design.md`). They work, but the visual
execution is a wireframe: `PocketCard` is only a dashed top border on the
same background color as the page, so it doesn't read as a card; inputs
got a `color="$color"` patch for a white-text bug but no other styling;
there's no `SafeAreaView` anywhere despite `react-native-safe-area-context`
being an installed dependency; and there's no keyboard-avoidance around
the forms, so on smaller phones the keyboard can cover the Register
submit button.

This pass is presentation-only. It does not add new screens, new API
calls, or new business logic. In particular, the Home screen is **not**
being wired to real `RPT-001` dashboard data (liquid balance,
safe-to-spend, budget used/remaining, etc.) — that's a full feature
implementation against `docs/PRD.md` §8.11 that needs its own scoping.
This pass only restructures Home to *look* like a dashboard shell using
the data already available (`display_name`, `email`, auth status), with
an explicit "coming soon" tile standing in for the future real summary.

## Structural fixes

- Wrap `app/_layout.tsx`'s root in `SafeAreaProvider` (from
  `react-native-safe-area-context`) — required context for `SafeAreaView`
  from the same package to work; currently missing entirely.
- Each screen (`login`, `register`, `home`) wraps its content in
  `SafeAreaView` (`edges={['top', 'bottom']}`) instead of a bare `YStack`
  at the root, so content clears the notch and home indicator.
- Login and Register wrap their form content in `KeyboardAvoidingView`
  (`behavior="padding"` iOS / default Android) + `ScrollView`
  (`keyboardShouldPersistTaps="handled"`, `contentContainerStyle` set to
  allow centering when content fits, scrolling when it doesn't) so the
  keyboard never hides the submit button.

## `PocketCard` → ticket-stub identity

Currently: dashed top border only, `$background` fill (identical to the
page) — invisible as a card. New treatment:

- Full dashed border (all sides), not just top — reinforces the
  "ticket/pocket stub" metaphor implied by the component's name.
- Background lifts to `$white` off the page's `$kertas`, a deliberate
  subtle contrast rather than the previous exact match.
- Soft shadow (`shadowColor="$tinta"`, low opacity, moderate blur; `elevation`
  set for Android parity) for real elevation.
- New `tone="muted"` variant (Tamagui `variants`) for empty/coming-soon
  content: transparent background, `$kulit` border, no shadow. Used by the
  Home financial-summary placeholder tile (see below) so "not real yet"
  content is visually distinct from "real" content, not a broken-looking
  copy of it.

## Input styling

Introduce `src/components/FormInput.tsx`, a `styled(Input, …)` wrapper
carrying the treatment all five auth inputs need identically: explicit
`size="$4"`, visible `borderWidth={1}` / `borderColor="$borderColor"`,
`borderRadius="$2"`, `backgroundColor="$white"`, and `focusStyle={{
borderColor: '$borderColorFocus' }}` so the teal focus ring (already
defined in `tamagui.config.ts` but never wired to anything) actually
shows. Login and Register swap their bare `Input` usages for this.

## Error banner

Currently a solid `$peringatan` (red) fill — reads as alarming/heavy for
a form validation message. New treatment: light red-tinted background
(new `dangerBackground` theme token — `shade(color.peringatan, 0.88)`)
with a `borderLeftWidth={4}` / `borderLeftColor="$danger"` accent instead
of a full fill. Text switches from `$white` to `$peringatan` for
sufficient contrast against the light tint.

## Button interaction

Introduce `src/components/PrimaryButton.tsx`, a `styled(Button, …)`
wrapper adding `animation="fast"` (already defined in
`tamagui.config.ts`, currently unused anywhere) and `pressStyle={{ scale:
0.97, opacity: 0.9 }}` for tactile feedback. Used for the Login and
Register submit buttons. The Home logout action gets its own inline
treatment (icon button, see below) since it's a secondary/ghost action,
not a primary one — it doesn't need this component.

## Home → dashboard shell

Restructured from a centered single-column stack into a top-anchored
dashboard layout:

- **Header row**: an avatar-initial badge (48×48 circle, `$primary`
  background, first letter of `display_name` in `$primaryText`) next to a
  two-line greeting ("Halo," in `$kulit` / the name in `$heading` +
  `$color`), with the logout action as an icon-only button
  (`LogOut` from `@tamagui/lucide-icons-2`, `$kulit`, transparent
  background) pinned to the row's right edge — replacing the old
  bottom-centered "Keluar" text link.
- **Account status tile** (`PocketCard`, default ticket-stub style): the
  user's email plus a small status pill — a dot + "Aktif" label in
  `$primary` on a faint `$backgroundHover` pill background — replacing the
  old plain "Akun kamu sudah aktif." sentence.
- **Financial summary tile** (`PocketCard tone="muted"`): a centered
  chart icon (`PieChart` from `@tamagui/lucide-icons-2`, `$kulit`, reduced
  opacity) above the existing copy "Ringkasan keuanganmu akan muncul di
  sini" — the muted tone makes clear this is a placeholder for future
  `RPT-001` data, not an unfinished real tile.
- Both tiles keep the app's existing vertical rhythm (`gap="$4"`/`"$6"`
  tokens already in use).

## Non-goals

- No dark theme work (still light-only, per the original scaffold design).
- No new API integration (Home stays on `useCurrentUser`/`useLogout`
  only).
- No changes to auth business logic, validation rules, or navigation
  structure.

## Testing

Purely presentational — no new business logic, so no new unit tests.
Existing tests (`refreshInterceptor.test.ts`, `store.test.ts`) are
unaffected since they don't touch rendering. Verification is `tsc`,
`eslint`, and manually exercising all three screens (including a
small-screen simulator size, to confirm the keyboard-avoidance fix) via
Expo before reporting done, per this repo's UI-change convention.
