# Design Handoff — Login & Register Re-skin — Design

## Context

Continuing the design-handoff port (see `docs/superpowers/specs/2026-08-17-design-handoff-phase-a-foundation-design.md`
and memory `project_design_handoff_phases.md`). Phase A landed the token/font/
primitive foundation with nothing wired into any screen. This is the first
screen-level phase: re-skin `mobile/app/(auth)/login.tsx` and
`mobile/app/(auth)/register.tsx` to match `design_handoff_sakuplan_rn/SCREENS.md`'s
"Auth (login / register)" section exactly, using Phase A's primitives.
Beranda and all other screens are explicitly deferred — not part of this spec.

Both screens already work end-to-end against the real backend (`useLogin`,
`useRegister`); this is a pure visual re-skin. No hook, no API call, no
navigation logic changes.

## Decisions made during brainstorming

Three deliberate deviations from `SCREENS.md`'s literal mockup, per the design
handoff's own rule ("follow the app's conventions for structure, the spec for
appearance"):

1. **Register's consent checkbox and 12-character password minimum stay.**
   `accepted_terms_version`/`accepted_privacy_version` are required fields in
   the backend's `RegisterRequest` schema (confirmed in `api/openapi/openapi.yaml`)
   — not optional prototype fluff the spec happens to omit. Both get restyled
   to match the new tokens but are not removed.
2. **No "← Kembali" back button on Login.** The spec's generic auth-screen
   template has one, but Login is this app's actual entry point — there is no
   prior screen to return to. Register keeps its existing "already have an
   account? Masuk" footer link (functionally the same "go back" affordance).
3. **Keep disabling the submit button on incomplete fields, not a separate
   inline "wajib diisi" validation message.** The spec's copy for this
   ("Email dan kata sandi wajib diisi.") assumes a prototype where the button
   is always pressable; this app already prevents empty submission via
   `canSubmit`, so that message would never fire. Real backend errors
   (`login.isError`, `register.isError`) still show in the error banner,
   restyled to spec.

## Layout

Both screens: `FlowScreen` (24px gutters, from `mobile/src/components/primitives.tsx`)
replaces the current ad-hoc `SafeAreaView` + `KeyboardAvoidingView` + `ScrollView`
+ `YStack padding="$5"` stack — `FlowScreen` is itself a `YStack`, so it still
needs to sit inside the same `SafeAreaView`/`KeyboardAvoidingView`/`ScrollView`
wrapper chain (those aren't primitives concerns, they're RN keyboard/safe-area
handling, unchanged).

Centered brand block: `Wordmark` (primitive, `size="l"` → Fraunces 24) showing
"SakuPlan", then a new greeting line (currently absent on both screens) —
"Kelola pengeluaran dan lihat berapa yang aman kamu belanjakan hari ini."
(`Meta` primitive: Plex Sans 400·13·kulit).

Auth card: `<PocketCard elevated padding="$6">` — 24px padding overrides the
primitive's elevated default of 20px (`$5`) via the existing prop-forwarding
in `PocketCard.tsx` (no changes to that file). Radius 12 and the shadow are
already what `elevated` provides.

## Card contents, top to bottom

1. **Heading** — `AuthHeading` primitive ("Masuk" / "Buat Akun").
2. **Error banner**, shown when `login.isError` / `register.isError`:
   `borderLeftWidth={3}` `borderLeftColor="$danger"`, `backgroundColor="$peringatanFill"`
   (the Phase A alpha-fill token — replaces the current hardcoded
   `rgba(178,59,51,0.06)`, which was already the wrong/approximate color),
   `borderRadius="$1.5"` (radius scale key `1.5` = 4, matching spec's "radius 4"),
   `padding: 10px 12px` → `paddingHorizontal="$3"` `paddingVertical="$2.5"`
   (space scale: `3`=12, `2.5`=10). Text: `BodyS` primitive color `$tinta`
   (spec: Plex Sans 400·12/1.5 — close enough to `BodyS`'s 13/19 that reusing
   the primitive is preferable to inventing a one-off size; note this as a
   minor, acceptable rounding, not a fidelity gap worth a new primitive).
3. **Fields**, each: icon (14px, `$kulit`) + `FieldLabel` primitive (replaces
   the current `Label` + small `Text`) on one row, `TextField` below with
   spec-matching overrides passed as props (not changing `TextField.tsx`):
   `borderWidth={1.5}` `borderRadius="$3"` (radius key `3`=8)
   `paddingHorizontal="$3.5"` (space key `3.5`=14) `paddingVertical={13}`
   (no exact token for 13; raw number, consistent with how `DashedBox`/other
   primitives use raw pixel values when no token matches) `fontSize="$5"`
   (body font key `5`=14) `fontFamily="$body"`.
   - Login: Email (`Mail` icon), Kata sandi (`Lock` icon).
   - Register: Nama (`User` icon), Email (`Mail`), Kata sandi (`Lock`),
     Konfirmasi kata sandi (`Lock`) — unchanged field set, restyled.
   - Register's existing "Minimal 12 karakter" helper text and consent
     checkbox block are kept, restyled with the new tokens (`MetaS`/`Meta`
     primitives for the small print, checkbox border/fill using `$kulit`/
     `$terjaga` as it already does — no visual spec exists for this since
     it's app-specific, so match the surrounding card's new type scale by
     inspection, not a literal spec value).
4. **Primary button** — `PrimaryButton` + `ButtonLabel` primitives, icon +
   `gap="$2"` (8px). Login: `LogIn` icon (spec-mandated; the current commit
   has `Activity` here, which looks like an unintended icon swap from an
   earlier formatting pass — restoring `LogIn` to match the spec, not
   introducing a new deviation). Register: `UserPlus` icon (already correct
   in the current file). Label text unchanged ("Masuk" / "Daftar", with the
   existing pending-state "Memuat..." swap preserved).
5. **Divider** — two `flex: 1` 1px `$kertas` rules with "atau" (`Meta`
   primitive) between, `gap="$3"` (12px). Replaces the current
   `backgroundColor="$background"` rules (background and kertas resolve to
   the same token today, this just uses the token name the spec/primitives
   system actually names it).
6. **Google button** — `SecondaryButton` + `ButtonLabel`. The current button
   has no icon at all (text-only). Add a small inline SVG "G" mark (18px) in
   Google's official 4 colors (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) —
   new file `mobile/src/components/GoogleIcon.tsx`, since no existing icon
   set (Lucide) has this, and `react-native-svg` is already a dependency
   (used by `DashedBox`). `handleGoogleSignIn` stays the existing no-op
   placeholder — this is a visual-only addition, not a new integration.
7. **Footer switch** — `InlineAction` primitive for the action word
   ("Daftar" / "Masuk"), plain `Meta` for the surrounding text, unchanged
   `Link` navigation.

## Files

- Modify: `mobile/app/(auth)/login.tsx`
- Modify: `mobile/app/(auth)/register.tsx`
- Create: `mobile/src/components/GoogleIcon.tsx`

No hook files, no `PocketCard.tsx`, no `TextField.tsx`, no navigation config
touched.

## Testing

No new unit-testable logic (this is a styling pass over existing, already-
tested hooks). Verification: `npx tsc --noEmit`, `npx eslint .`, `npx jest`
(existing suite, unaffected, should stay at the current count) all clean.
Manual on-device visual check against `design_handoff_sakuplan_rn/reference/SakuPlan.dc.html`
(open in a browser at 430px width) for both screens — this project's
established pattern of deferring final device confirmation to the human
partner applies here too; call this out explicitly as deferred, don't skip
mentioning it.
