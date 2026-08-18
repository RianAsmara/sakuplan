# Design Handoff — Login & Register Re-skin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin `mobile/app/(auth)/login.tsx` and `mobile/app/(auth)/register.tsx` to match `design_handoff_sakuplan_rn/SCREENS.md`'s auth spec exactly, using Phase A's primitives — pure visual change, no hook/API/navigation logic touched.

**Architecture:** Both screens swap their ad-hoc `YStack`/`Text`/`Button` styling for the primitives built in Phase A (`FlowScreen`, `Wordmark`, `AuthHeading`, `PrimaryButton`, `SecondaryButton`, `ButtonLabel`, `InlineAction`, `Meta`, `BodyS`) plus a new small `GoogleIcon` SVG component. `TextField` and `PocketCard` are not modified — call sites pass spec-matching props to them instead (both already support this via prop-forwarding).

**Tech Stack:** React Native/Expo, Tamagui, `react-native-svg` (already a dependency).

**Spec:** `docs/superpowers/specs/2026-08-18-design-handoff-auth-screens-design.md`

## Global Constraints

- Pure re-skin: no changes to `useLogin`/`useRegister`, validation logic (`canSubmit`, `passwordsMatch`), navigation (`Link` targets), or any existing copy/text content — only visual/structural presentation changes.
- Register's consent checkbox and 12-character password minimum stay (backend-required).
- No back button on Login (it's the app's entry screen); Register keeps its existing footer link.
- No new inline "wajib diisi" validation message — keep the existing disabled-submit-button pattern.
- Do not modify `mobile/src/components/PocketCard.tsx` or `mobile/src/components/TextField.tsx` — use their existing prop-forwarding instead.
- Code style: no semicolons, single quotes, 2-space indent (both files currently use double-quotes/semicolons from an earlier formatter pass — this plan reverts them to the project's actual convention as part of the rewrite, matching every other file in the codebase).
- One correction found during planning: `FieldLabel` (the primitives.tsx component built on Tamagui `Text`) doesn't support `htmlFor`, which both screens currently use for accessibility (associating a field's label with its input). Use Tamagui's `Label` component instead, styled with `FieldLabel`'s exact visual values (`fontFamily="$mono" fontWeight="500" fontSize={11} lineHeight={15} letterSpacing={0.44} color="$kulit"`) — same appearance, correct accessibility semantics preserved. Field label text is written in actual uppercase (`EMAIL`, not `Email`) to match `DESIGN_TOKENS.md`'s "UPPERCASE" spec, since `FieldLabel`'s definition has no `textTransform` — this matches the existing pattern already used elsewhere in this app's dashboard cards (e.g. `home.tsx`'s `"SALDO CAIR"`), which also bake uppercase into the string rather than relying on CSS transform.

---

## Task 1: GoogleIcon component

**Files:**
- Create: `mobile/src/components/GoogleIcon.tsx`

**Interfaces:**
- Produces: `GoogleIcon({ size?: number })` — an 18px-by-default inline SVG rendering Google's official 4-color "G" mark. Consumed by Tasks 2 and 3.

- [ ] **Step 1: Create `mobile/src/components/GoogleIcon.tsx`**

```tsx
import Svg, { Path } from 'react-native-svg'

/**
 * Google's official 4-color "G" mark, inline SVG (no icon set has this —
 * Lucide doesn't include brand marks). Colors are fixed per DESIGN_TOKENS.md
 * and must never be swapped for design tokens: `#4285F4`, `#34A853`,
 * `#FBBC05`, `#EA4335`.
 */
export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <Path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.348 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
      />
      <Path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.581C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </Svg>
  )
}
```

- [ ] **Step 2: Lint**

```bash
cd mobile && npx eslint src/components/GoogleIcon.tsx
```
Expected: 0 errors.

- [ ] **Step 3: Check tsc**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference `GoogleIcon.tsx`.

- [ ] **Step 4: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/components/GoogleIcon.tsx
git commit -m "feat(mobile): add GoogleIcon (official 4-color mark)"
```

---

## Task 2: Re-skin Login

**Files:**
- Modify: `mobile/app/(auth)/login.tsx`

**Interfaces:**
- Consumes: `GoogleIcon` from Task 1; `FlowScreen`, `Wordmark`, `AuthHeading`, `BodyS`, `Meta`, `PrimaryButton`, `SecondaryButton`, `ButtonLabel`, `InlineAction` from `mobile/src/components/primitives.tsx` (Phase A); `PocketCard`, `TextField` unchanged from existing files.

- [ ] **Step 1: Replace the full contents of `mobile/app/(auth)/login.tsx`**

```tsx
import { LogIn, Lock, Mail } from '@tamagui/lucide-icons-2'
import { Link } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native'
import { Label, XStack, YStack } from 'tamagui'
import { useLogin } from '../../src/auth/useLogin'
import { GoogleIcon } from '../../src/components/GoogleIcon'
import { PocketCard } from '../../src/components/PocketCard'
import {
  AuthHeading,
  BodyS,
  ButtonLabel,
  FlowScreen,
  InlineAction,
  Meta,
  PrimaryButton,
  SecondaryButton,
  Wordmark,
} from '../../src/components/primitives'
import { TextField } from '../../src/components/TextField'

// Design-only placeholder: no OAuth backend exists yet
// (see docs/design/sakuplan-claude-design-prompt.md, "Priority: redesign
// Login and Register now"). Intentionally a no-op until Google sign-in
// is scoped as a real requirement.
function handleGoogleSignIn() {}

const fieldInputProps = {
  borderWidth: 1.5,
  borderRadius: '$3',
  paddingHorizontal: '$3.5',
  paddingVertical: 13,
  fontSize: '$5',
} as const

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()

  const canSubmit = email.trim().length > 0 && password.length > 0 && !login.isPending

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <FlowScreen justifyContent="center" gap="$6">
            <YStack alignItems="center" gap="$2">
              <Wordmark size="l">SakuPlan</Wordmark>
              <Meta textAlign="center">
                Kelola pengeluaran dan lihat berapa yang aman kamu belanjakan hari ini.
              </Meta>
            </YStack>

            <PocketCard elevated padding="$6" gap="$4">
              <AuthHeading>Masuk</AuthHeading>

              {login.isError ? (
                <YStack
                  backgroundColor="$peringatanFill"
                  borderLeftWidth={3}
                  borderLeftColor="$danger"
                  borderRadius="$1.5"
                  paddingHorizontal="$3"
                  paddingVertical="$2.5"
                >
                  <BodyS color="$tinta">Email atau kata sandi salah.</BodyS>
                </YStack>
              ) : null}

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <Mail size={14} color="$kulit" />
                  <Label
                    htmlFor="login-email"
                    fontFamily="$mono"
                    fontWeight="500"
                    fontSize={11}
                    lineHeight={15}
                    letterSpacing={0.44}
                    color="$kulit"
                  >
                    EMAIL
                  </Label>
                </XStack>
                <TextField
                  id="login-email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  {...fieldInputProps}
                />
              </YStack>

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <Lock size={14} color="$kulit" />
                  <Label
                    htmlFor="login-password"
                    fontFamily="$mono"
                    fontWeight="500"
                    fontSize={11}
                    lineHeight={15}
                    letterSpacing={0.44}
                    color="$kulit"
                  >
                    KATA SANDI
                  </Label>
                </XStack>
                <TextField
                  id="login-password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="password"
                  {...fieldInputProps}
                />
              </YStack>

              <PrimaryButton
                gap="$2"
                opacity={canSubmit ? 1 : 0.5}
                disabled={!canSubmit}
                onPress={() => login.mutate({ email, password })}
              >
                <LogIn size={16} color="$primaryText" />
                <ButtonLabel color="$primaryText">
                  {login.isPending ? 'Memuat...' : 'Masuk'}
                </ButtonLabel>
              </PrimaryButton>

              <XStack alignItems="center" gap="$3">
                <YStack flex={1} height={1} backgroundColor="$kertas" />
                <Meta>atau</Meta>
                <YStack flex={1} height={1} backgroundColor="$kertas" />
              </XStack>

              <YStack gap="$2">
                <SecondaryButton onPress={handleGoogleSignIn}>
                  <GoogleIcon size={18} />
                  <ButtonLabel color="$tinta">Masuk dengan Google</ButtonLabel>
                </SecondaryButton>
                <Meta textAlign="center">Pratinjau desain — integrasi belum tersedia.</Meta>
              </YStack>

              <XStack justifyContent="center" gap="$2">
                <Meta>Belum punya akun?</Meta>
                <Link href="/(auth)/register">
                  <InlineAction>Daftar</InlineAction>
                </Link>
              </XStack>
            </PocketCard>
          </FlowScreen>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

Note: `backgroundColor="#F7F8F4"` on the `SafeAreaView` is the literal `$kertas` hex (Phase A's exact value) — `SafeAreaView` is a plain RN component, not Tamagui, so it can't resolve `$kertas` as a token string; this matches how the pre-existing code already hardcoded this one spot (previously `#F5F6F3`, the old approximate value — now corrected to the exact one).

- [ ] **Step 2: Lint**

```bash
cd mobile && npx eslint "app/(auth)/login.tsx"
```
Expected: 0 errors.

- [ ] **Step 3: Check tsc**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference `login.tsx`.

- [ ] **Step 4: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add "mobile/app/(auth)/login.tsx"
git commit -m "style(mobile): re-skin Login to match design_handoff exactly"
```

---

## Task 3: Re-skin Register

**Files:**
- Modify: `mobile/app/(auth)/register.tsx`

**Interfaces:**
- Consumes: same as Task 2 (`GoogleIcon`, primitives, `PocketCard`, `TextField`).

- [ ] **Step 1: Replace the full contents of `mobile/app/(auth)/register.tsx`**

```tsx
import { Check, Lock, Mail, User, UserPlus } from '@tamagui/lucide-icons-2'
import { Link } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Checkbox, Label, XStack, YStack } from 'tamagui'
import { useRegister } from '../../src/auth/useRegister'
import { GoogleIcon } from '../../src/components/GoogleIcon'
import { PocketCard } from '../../src/components/PocketCard'
import {
  AuthHeading,
  BodyS,
  ButtonLabel,
  FlowScreen,
  InlineAction,
  Meta,
  MetaS,
  PrimaryButton,
  SecondaryButton,
  Wordmark,
} from '../../src/components/primitives'
import { TextField } from '../../src/components/TextField'

// Design-only placeholder: no OAuth backend exists yet
// (see docs/design/sakuplan-claude-design-prompt.md, "Priority: redesign
// Login and Register now"). Intentionally a no-op until Google sign-in
// is scoped as a real requirement.
function handleGoogleSignIn() {}

const fieldInputProps = {
  borderWidth: 1.5,
  borderRadius: '$3',
  paddingHorizontal: '$3.5',
  paddingVertical: 13,
  fontSize: '$5',
} as const

function FieldLabelRow({
  htmlFor,
  icon,
  text,
}: {
  htmlFor: string
  icon: React.ReactNode
  text: string
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
      >
        {text}
      </Label>
    </XStack>
  )
}

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [consentAccepted, setConsentAccepted] = useState(false)
  const register = useRegister()

  const passwordsMatch = password.length > 0 && password === confirmPassword
  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 12 &&
    passwordsMatch &&
    consentAccepted &&
    !register.isPending

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <FlowScreen justifyContent="center" gap="$6">
            <YStack alignItems="center" gap="$2">
              <Wordmark size="l">SakuPlan</Wordmark>
              <Meta textAlign="center">
                Kelola pengeluaran dan lihat berapa yang aman kamu belanjakan hari ini.
              </Meta>
            </YStack>

            <PocketCard elevated padding="$6" gap="$4">
              <AuthHeading>Buat Akun</AuthHeading>

              {register.isError ? (
                <YStack
                  backgroundColor="$peringatanFill"
                  borderLeftWidth={3}
                  borderLeftColor="$danger"
                  borderRadius="$1.5"
                  paddingHorizontal="$3"
                  paddingVertical="$2.5"
                >
                  <BodyS color="$tinta">Terjadi kesalahan. Coba lagi.</BodyS>
                </YStack>
              ) : null}

              <YStack gap="$2">
                <FieldLabelRow htmlFor="register-name" icon={<User size={14} color="$kulit" />} text="NAMA" />
                <TextField id="register-name" value={displayName} onChangeText={setDisplayName} {...fieldInputProps} />
              </YStack>

              <YStack gap="$2">
                <FieldLabelRow htmlFor="register-email" icon={<Mail size={14} color="$kulit" />} text="EMAIL" />
                <TextField
                  id="register-email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  {...fieldInputProps}
                />
              </YStack>

              <YStack gap="$2">
                <FieldLabelRow htmlFor="register-password" icon={<Lock size={14} color="$kulit" />} text="KATA SANDI" />
                <TextField
                  id="register-password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="newPassword"
                  {...fieldInputProps}
                />
              </YStack>

              <YStack gap="$2">
                <FieldLabelRow
                  htmlFor="register-confirm"
                  icon={<Lock size={14} color="$kulit" />}
                  text="KONFIRMASI KATA SANDI"
                />
                <TextField
                  id="register-confirm"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  textContentType="newPassword"
                  {...fieldInputProps}
                />
                <MetaS>Minimal 12 karakter</MetaS>
              </YStack>

              <XStack alignItems="center" gap="$3">
                <Checkbox
                  id="register-consent"
                  checked={consentAccepted}
                  onCheckedChange={(value) => setConsentAccepted(value === true)}
                  backgroundColor={consentAccepted ? '$primary' : undefined}
                  borderColor="$kulit"
                >
                  <Checkbox.Indicator>
                    <Check color="$primaryText" />
                  </Checkbox.Indicator>
                </Checkbox>
                <MetaS flexShrink={1}>
                  Saya menyetujui{' '}
                  <Meta color="$primary" textDecorationLine="underline">
                    Ketentuan Layanan
                  </Meta>{' '}
                  dan{' '}
                  <Meta color="$primary" textDecorationLine="underline">
                    Kebijakan Privasi
                  </Meta>
                </MetaS>
              </XStack>

              <PrimaryButton
                gap="$2"
                opacity={canSubmit ? 1 : 0.5}
                disabled={!canSubmit}
                onPress={() => register.mutate({ email, password, displayName })}
              >
                <UserPlus size={16} color="$primaryText" />
                <ButtonLabel color="$primaryText">
                  {register.isPending ? 'Memuat...' : 'Daftar'}
                </ButtonLabel>
              </PrimaryButton>

              <XStack alignItems="center" gap="$3">
                <YStack flex={1} height={1} backgroundColor="$kertas" />
                <Meta>atau</Meta>
                <YStack flex={1} height={1} backgroundColor="$kertas" />
              </XStack>

              <YStack gap="$2">
                <SecondaryButton onPress={handleGoogleSignIn}>
                  <GoogleIcon size={18} />
                  <ButtonLabel color="$tinta">Daftar dengan Google</ButtonLabel>
                </SecondaryButton>
                <Meta textAlign="center">Pratinjau desain — integrasi belum tersedia.</Meta>
              </YStack>

              <XStack justifyContent="center" gap="$2">
                <Meta>Sudah punya akun?</Meta>
                <Link href="/(auth)/login">
                  <InlineAction>Masuk</InlineAction>
                </Link>
              </XStack>
            </PocketCard>
          </FlowScreen>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

Note: the register button label was "Masuk dengan Google" in the pre-existing code (a copy bug — register's Google button should say "Daftar dengan Google", matching Login saying "Masuk dengan Google"). This plan corrects it as part of the re-skin, matching `SCREENS.md`'s explicit spec: *"Masuk dengan Google" / "Daftar dengan Google"*.

- [ ] **Step 2: Lint**

```bash
cd mobile && npx eslint "app/(auth)/register.tsx"
```
Expected: 0 errors.

- [ ] **Step 3: Check tsc — this is the last task, project-wide should be fully clean**

```bash
cd mobile && npx tsc --noEmit
```
Expected: PASS, 0 errors.

- [ ] **Step 4: Run the full test suite and lint as a final sanity check**

```bash
cd mobile && npx jest
```
Expected: PASS, 13 suites / 66 tests (unchanged — this plan adds no new tests, since there's no new testable logic).

```bash
cd mobile && npx eslint .
```
Expected: 0 errors, 2 pre-existing warnings in `tamagui.config.ts`.

- [ ] **Step 5: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add "mobile/app/(auth)/register.tsx"
git commit -m "style(mobile): re-skin Register to match design_handoff exactly, fix Google button copy"
```

- [ ] **Step 6: Manual on-device visual verification reminder**

No automated command for this — flag it to the user. Compare both screens
against `design_handoff_sakuplan_rn/reference/SakuPlan.dc.html` (open in a
browser at 430px width) on a physical device or emulator: confirm the
Fraunces wordmark and IBM Plex fonts render (not a fallback font), the
dashed card border is visible (uses the already-fixed `PocketCard`), field
labels are uppercase mono text properly associated with their inputs, the
Google mark shows all 4 colors, and Register's consent checkbox still gates
submission correctly.
