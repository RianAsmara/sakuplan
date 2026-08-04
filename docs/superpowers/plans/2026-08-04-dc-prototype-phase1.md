# SakuPlan.dc.html Phase 1 — Auth Redesign + Tab Shell + Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the mobile login/register screens to exactly match the
`SakuPlan.dc.html` Claude Design prototype (claude.ai/design project
`61e9579e-2294-4ca7-9f65-1e858195f4f5`), add the prototype's 5-tab
navigation shell, and wire the Home tab to the real `GET /v1/dashboard`
endpoint.

**Architecture:** Expo Router file-based routing gains a `(tabs)` group
under `(app)`. `PocketCard` gains `elevated` and `tone="muted"` variants to
cover both the prototype's auth-card style (radius 12, shadow) and its
dashboard-tile style (radius 8, flat). A new `useDashboard()` TanStack
Query hook fetches `/v1/dashboard`; a pure `formatRupiah()` helper renders
every `Money` (already-integer IDR minor units) value. Transactions,
Budgets, Reports, and More stay honest placeholders (`tone="muted"`
"coming soon" cards) — their real implementation is a later phase.

**Tech Stack:** Expo SDK 57, Expo Router, Tamagui, TanStack Query,
`@tamagui/lucide-icons-2`, `openapi-fetch` against the generated
`src/api/generated/types.ts`.

## Global Constraints

- Match `SakuPlan.dc.html` exactly for anything in scope (colors, copy,
  spacing values close to its px values mapped onto the existing token
  scale) — it is the approved design source, superseding the earlier
  `docs/superpowers/specs/2026-08-04-auth-home-ui-polish-design.md` for
  login/register specifically (that spec's Home-screen intent is carried
  forward here with real data instead of the placeholder it proposed).
- All Rupiah values are already integer minor units server-side (IDR has
  zero decimal places) — never divide or multiply by 100.
- Bahasa Indonesia UI copy throughout, copied verbatim from the prototype.
- No new backend calls beyond `GET /v1/dashboard` (already covers
  `safe_to_spend_today`, `safe_to_spend_until_payday`, `days_until_payday`
  — do not also call `/v1/planning/safe-to-spend`, it's redundant here).
- Transactions/Budgets/Reports/More/notifications/AI-banner/profile
  navigation are explicitly **out of scope** — render as muted "coming
  soon" placeholders, not half-built real screens.
- The "Masuk/Daftar dengan Google" buttons and the Home header's
  "Notifikasi"/avatar buttons are inert placeholders (no OAuth backend, no
  notifications/profile endpoints wired yet) — each needs a one-line
  comment explaining why it's a no-op, since a button that does nothing is
  non-obvious.
- Presentational-only steps (styling, static placeholder screens) don't
  get new tests, matching this codebase's existing convention (only
  `store.test.ts` and `refreshInterceptor.test.ts` exist, both pure
  logic). Steps introducing real logic (`formatRupiah`, bill urgency) do
  get unit tests.
- Run `npx tsc --noEmit` and `npx eslint <changed files>` after every task
  that touches `.tsx`/`.ts` files, from the `mobile/` directory.

---

### Task 1: `PocketCard` elevated + muted variants

**Files:**
- Modify: `mobile/src/components/PocketCard.tsx`

**Interfaces:**
- Produces: `PocketCard` accepts two new optional props — `elevated?: boolean` (radius-12, shadow, 24px padding — the prototype's auth-card style) and `tone?: 'muted'` (transparent background, no shadow — for "coming soon" placeholders). Default (neither prop) is the prototype's flat dashboard-tile style: radius 8, white background, no shadow, 16px padding.

- [ ] **Step 1: Rewrite the component**

```tsx
import { styled, YStack } from 'tamagui'

export const PocketCard = styled(YStack, {
  name: 'PocketCard',
  backgroundColor: '$white',
  borderWidth: 1.5,
  borderColor: '$borderColor',
  borderStyle: 'dashed',
  borderRadius: '$2',
  padding: '$4',
  gap: '$3',
  width: '100%',
  maxWidth: 440,
  alignSelf: 'center',

  variants: {
    elevated: {
      true: {
        borderRadius: '$3',
        padding: '$5',
        gap: '$4',
        shadowColor: '$tinta',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 4,
      },
    },
    tone: {
      muted: {
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
      },
    },
  } as const,
})
```

- [ ] **Step 2: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/components/PocketCard.tsx`
Expected: both exit 0. (Login/register will fail to type-check until Task
2/3 update their `<PocketCard>` usage to pass `elevated` — that's
expected and resolved by those tasks.)

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/components/PocketCard.tsx
git commit -m "feat(mobile): add elevated and muted PocketCard variants"
```

---

### Task 2: `formatRupiah` money formatter

**Files:**
- Create: `mobile/src/format/money.ts`
- Test: `mobile/src/format/money.test.ts`

**Interfaces:**
- Produces: `formatRupiah(minorUnits: number): string` — e.g. `formatRupiah(1234567)` → `"Rp1.234.567"`, `formatRupiah(-5000)` → `"-Rp5.000"`, `formatRupiah(0)` → `"Rp0"`. Consumed by Task 6 (Home screen).

- [ ] **Step 1: Write the failing test**

```ts
import { formatRupiah } from './money'

describe('formatRupiah', () => {
  it('formats a positive amount with thousands separators', () => {
    expect(formatRupiah(1234567)).toBe('Rp1.234.567')
  })

  it('formats a negative amount with a leading minus before Rp', () => {
    expect(formatRupiah(-5000)).toBe('-Rp5.000')
  })

  it('formats zero', () => {
    expect(formatRupiah(0)).toBe('Rp0')
  })

  it('rounds fractional input to the nearest whole unit', () => {
    expect(formatRupiah(1000.6)).toBe('Rp1.001')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest src/format/money.test.ts`
Expected: FAIL — `Cannot find module './money'`.

- [ ] **Step 3: Implement**

```ts
export function formatRupiah(minorUnits: number): string {
  const rounded = Math.round(minorUnits)
  const negative = rounded < 0
  const digits = Math.abs(rounded).toLocaleString('id-ID')
  return `${negative ? '-' : ''}Rp${digits}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest src/format/money.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/format/money.ts src/format/money.test.ts
git commit -m "feat(mobile): add formatRupiah helper"
```

---

### Task 3: Bill urgency helper

**Files:**
- Create: `mobile/src/dashboard/billUrgency.ts`
- Test: `mobile/src/dashboard/billUrgency.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `billUrgency(dueDateIso: string, now: Date): { label: string; color: '$danger' | '$kulit' }`. Consumed by Task 6 (Home screen). `now` is an explicit parameter (not `new Date()` internally) so it's deterministic in tests.

- [ ] **Step 1: Write the failing test**

```ts
import { billUrgency } from './billUrgency'

describe('billUrgency', () => {
  const now = new Date('2026-08-04T00:00:00')

  it('flags a past due date as overdue, in danger color', () => {
    const result = billUrgency('2026-08-01T00:00:00', now)
    expect(result.color).toBe('$danger')
    expect(result.label).toBe('Terlambat 3 hari')
  })

  it('labels a future due date with days remaining, in muted color', () => {
    const result = billUrgency('2026-08-10T00:00:00', now)
    expect(result.color).toBe('$kulit')
    expect(result.label).toBe('Jatuh tempo 6 hari lagi')
  })

  it('labels a due date of today as due today', () => {
    const result = billUrgency('2026-08-04T00:00:00', now)
    expect(result.color).toBe('$kulit')
    expect(result.label).toBe('Jatuh tempo hari ini')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest src/dashboard/billUrgency.test.ts`
Expected: FAIL — `Cannot find module './billUrgency'`.

- [ ] **Step 3: Implement**

```ts
export function billUrgency(
  dueDateIso: string,
  now: Date
): { label: string; color: '$danger' | '$kulit' } {
  const due = new Date(dueDateIso)
  const days = Math.round((due.getTime() - now.getTime()) / 86_400_000)

  if (days < 0) {
    return { label: `Terlambat ${Math.abs(days)} hari`, color: '$danger' }
  }
  if (days === 0) {
    return { label: 'Jatuh tempo hari ini', color: '$kulit' }
  }
  return { label: `Jatuh tempo ${days} hari lagi`, color: '$kulit' }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest src/dashboard/billUrgency.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/dashboard/billUrgency.ts src/dashboard/billUrgency.test.ts
git commit -m "feat(mobile): add billUrgency helper"
```

---

### Task 4: `useDashboard` query hook

**Files:**
- Create: `mobile/src/dashboard/useDashboard.ts`

**Interfaces:**
- Consumes: `api` from `../api/client` (existing pattern — see
  `src/auth/useCurrentUser.ts`).
- Produces: `useDashboard()` — a TanStack Query hook returning
  `{ data, isLoading, isError }` where `data` is
  `components['schemas']['Dashboard']` (fields: `liquid_balance`,
  `safe_to_spend_today`, `safe_to_spend_until_payday`,
  `days_until_payday`, `budget_total`, `budget_used`, `budget_remaining`,
  `upcoming_bill` (nullable), `goals[]`, `top_categories[]`, all `Money`
  fields being plain `number`). Consumed by Task 6 (Home screen).

- [ ] **Step 1: Implement (no test — thin wrapper matching the untested `useCurrentUser` pattern exactly)**

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/dashboard')
      if (error || !data) {
        throw new Error('failed_to_load_dashboard')
      }
      return data
    },
  })
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/dashboard/useDashboard.ts
git commit -m "feat(mobile): add useDashboard query hook"
```

---

### Task 5: Rewrite Login and Register screens to match the prototype

**Files:**
- Modify: `mobile/app/(auth)/login.tsx`
- Modify: `mobile/app/(auth)/register.tsx`

**Interfaces:**
- Consumes: `PocketCard` with `elevated` prop (Task 1), existing
  `useLogin`/`useRegister` hooks (unchanged).
- Produces: nothing new consumed elsewhere.

Changes from the current screens, both driven by the prototype markup:
inputs get solid (not dashed) borders with a `focusStyle` teal glow
matching `box-shadow:0 0 0 3px rgba(14,107,88,0.15)`; the error banner
becomes a left-accent tinted box instead of a solid fill; an "atau"
divider plus an inert "Masuk/Daftar dengan Google" button is added below
the primary action; Register gains a confirm-password field the prototype
has and the current screen doesn't. `PocketCard` becomes `elevated`.
Safe-area and keyboard-avoidance wrapping (from the superseded
2026-08-04 polish spec) are folded in here since they're still correct
and haven't been implemented yet.

- [ ] **Step 1: Rewrite `login.tsx`**

```tsx
import { useState } from 'react'
import { Link } from 'expo-router'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native'
import { Button, Input, Label, Text, XStack, YStack } from 'tamagui'
import { LogIn, Lock, Mail } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../src/components/PocketCard'
import { useLogin } from '../../src/auth/useLogin'

// Design-only placeholder: no OAuth backend exists yet
// (see docs/design/sakuplan-claude-design-prompt.md, "Priority: redesign
// Login and Register now"). Intentionally a no-op until Google sign-in
// is scoped as a real requirement.
function handleGoogleSignIn() {}

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()

  const canSubmit = email.trim().length > 0 && password.length > 0 && !login.isPending

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack flex={1} backgroundColor="$background" padding="$5" justifyContent="center" gap="$6">
            <Text fontFamily="$heading" fontSize="$5" textAlign="center" color="$color">
              SakuPlan
            </Text>

            <PocketCard elevated>
              <Text fontFamily="$heading" fontSize="$4" color="$color">
                Masuk
              </Text>

              {login.isError ? (
                <YStack
                  backgroundColor="rgba(178,59,51,0.06)"
                  borderLeftWidth={3}
                  borderLeftColor="$danger"
                  borderRadius="$1"
                  padding="$3"
                >
                  <Text fontFamily="$body" color="$tinta" fontSize="$2">
                    Email atau kata sandi salah.
                  </Text>
                </YStack>
              ) : null}

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <Mail size={14} color="$kulit" />
                  <Label htmlFor="login-email" fontFamily="$body" fontSize="$2" color="$kulit">
                    Email
                  </Label>
                </XStack>
                <Input
                  id="login-email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  color="$color"
                  focusStyle={{ borderColor: '$borderColorFocus' }}
                />
              </YStack>

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <Lock size={14} color="$kulit" />
                  <Label htmlFor="login-password" fontFamily="$body" fontSize="$2" color="$kulit">
                    Kata sandi
                  </Label>
                </XStack>
                <Input
                  id="login-password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="password"
                  color="$color"
                  focusStyle={{ borderColor: '$borderColorFocus' }}
                />
              </YStack>

              <Button
                icon={LogIn}
                backgroundColor="$primary"
                color="$primaryText"
                disabled={!canSubmit}
                opacity={canSubmit ? 1 : 0.5}
                onPress={() => login.mutate({ email, password })}
              >
                {login.isPending ? 'Memuat...' : 'Masuk'}
              </Button>

              <XStack alignItems="center" gap="$3">
                <YStack flex={1} height={1} backgroundColor="$background" />
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  atau
                </Text>
                <YStack flex={1} height={1} backgroundColor="$background" />
              </XStack>

              <YStack gap="$2">
                <Button
                  backgroundColor="$white"
                  borderWidth={1.5}
                  borderColor="$borderColor"
                  color="$color"
                  onPress={handleGoogleSignIn}
                >
                  Masuk dengan Google
                </Button>
                <Text fontFamily="$body" fontSize="$1" color="$kulit" textAlign="center">
                  Pratinjau desain — integrasi belum tersedia.
                </Text>
              </YStack>

              <XStack justifyContent="center" gap="$2">
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  Belum punya akun?
                </Text>
                <Link href="/(auth)/register">
                  <Text fontFamily="$body" fontSize="$2" color="$primary" textDecorationLine="underline">
                    Daftar
                  </Text>
                </Link>
              </XStack>
            </PocketCard>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Rewrite `register.tsx`**

```tsx
import { useState } from 'react'
import { Link } from 'expo-router'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Checkbox, Input, Label, Text, XStack, YStack } from 'tamagui'
import { Check, Lock, Mail, User, UserPlus } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../src/components/PocketCard'
import { useRegister } from '../../src/auth/useRegister'

// Design-only placeholder: no OAuth backend exists yet
// (see docs/design/sakuplan-claude-design-prompt.md, "Priority: redesign
// Login and Register now"). Intentionally a no-op until Google sign-in
// is scoped as a real requirement.
function handleGoogleSignIn() {}

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack flex={1} backgroundColor="$background" padding="$5" justifyContent="center" gap="$6">
            <Text fontFamily="$heading" fontSize="$5" textAlign="center" color="$color">
              SakuPlan
            </Text>

            <PocketCard elevated>
              <Text fontFamily="$heading" fontSize="$4" color="$color">
                Buat Akun
              </Text>

              {register.isError ? (
                <YStack
                  backgroundColor="rgba(178,59,51,0.06)"
                  borderLeftWidth={3}
                  borderLeftColor="$danger"
                  borderRadius="$1"
                  padding="$3"
                >
                  <Text fontFamily="$body" color="$tinta" fontSize="$2">
                    Terjadi kesalahan. Coba lagi.
                  </Text>
                </YStack>
              ) : null}

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <User size={14} color="$kulit" />
                  <Label htmlFor="register-name" fontFamily="$body" fontSize="$2" color="$kulit">
                    Nama
                  </Label>
                </XStack>
                <Input
                  id="register-name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  color="$color"
                  focusStyle={{ borderColor: '$borderColorFocus' }}
                />
              </YStack>

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <Mail size={14} color="$kulit" />
                  <Label htmlFor="register-email" fontFamily="$body" fontSize="$2" color="$kulit">
                    Email
                  </Label>
                </XStack>
                <Input
                  id="register-email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  color="$color"
                  focusStyle={{ borderColor: '$borderColorFocus' }}
                />
              </YStack>

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <Lock size={14} color="$kulit" />
                  <Label htmlFor="register-password" fontFamily="$body" fontSize="$2" color="$kulit">
                    Kata sandi
                  </Label>
                </XStack>
                <Input
                  id="register-password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="newPassword"
                  color="$color"
                  focusStyle={{ borderColor: '$borderColorFocus' }}
                />
              </YStack>

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <Lock size={14} color="$kulit" />
                  <Label htmlFor="register-confirm" fontFamily="$body" fontSize="$2" color="$kulit">
                    Konfirmasi kata sandi
                  </Label>
                </XStack>
                <Input
                  id="register-confirm"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  textContentType="newPassword"
                  color="$color"
                  focusStyle={{ borderColor: '$borderColorFocus' }}
                />
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  Minimal 12 karakter
                </Text>
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
                <Text fontFamily="$body" fontSize="$1" color="$kulit" flexShrink={1}>
                  Saya menyetujui{' '}
                  <Text color="$primary" textDecorationLine="underline">
                    Ketentuan Layanan
                  </Text>{' '}
                  dan{' '}
                  <Text color="$primary" textDecorationLine="underline">
                    Kebijakan Privasi
                  </Text>
                </Text>
              </XStack>

              <Button
                icon={UserPlus}
                backgroundColor="$primary"
                color="$primaryText"
                disabled={!canSubmit}
                opacity={canSubmit ? 1 : 0.5}
                onPress={() => register.mutate({ email, password, displayName })}
              >
                {register.isPending ? 'Memuat...' : 'Daftar'}
              </Button>

              <XStack alignItems="center" gap="$3">
                <YStack flex={1} height={1} backgroundColor="$background" />
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  atau
                </Text>
                <YStack flex={1} height={1} backgroundColor="$background" />
              </XStack>

              <YStack gap="$2">
                <Button
                  backgroundColor="$white"
                  borderWidth={1.5}
                  borderColor="$borderColor"
                  color="$color"
                  onPress={handleGoogleSignIn}
                >
                  Daftar dengan Google
                </Button>
                <Text fontFamily="$body" fontSize="$1" color="$kulit" textAlign="center">
                  Pratinjau desain — integrasi belum tersedia.
                </Text>
              </YStack>

              <XStack justifyContent="center" gap="$2">
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  Sudah punya akun?
                </Text>
                <Link href="/(auth)/login">
                  <Text fontFamily="$body" fontSize="$2" color="$primary" textDecorationLine="underline">
                    Masuk
                  </Text>
                </Link>
              </XStack>
            </PocketCard>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 3: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint "app/(auth)/login.tsx" "app/(auth)/register.tsx"`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
cd mobile && git add "app/(auth)/login.tsx" "app/(auth)/register.tsx"
git commit -m "feat(mobile): redesign login/register to match SakuPlan.dc.html"
```

---

### Task 6: Root layout gets `SafeAreaProvider`

**Files:**
- Modify: `mobile/app/_layout.tsx`

**Interfaces:**
- Produces: `SafeAreaView` (used by Task 5 and Task 9) now has the
  required provider context — without this, `SafeAreaView` from
  `react-native-safe-area-context` throws/no-ops.

- [ ] **Step 1: Wrap the existing tree in `SafeAreaProvider`**

Read the current file first — it's `mobile/app/_layout.tsx` (`TamaguiProvider` → `Theme` → `QueryClientProvider` → `StatusBar` + `Slot`, plus a font-loading early return). Add the import and wrap both the loading-state return and the main return's outermost element:

```tsx
import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { TamaguiProvider, Theme, YStack, Spinner } from 'tamagui'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import tamaguiConfig from '../tamagui.config'
import { useAppFontsLoaded } from '../src/theme/fonts'

const queryClient = new QueryClient()

export default function RootLayout() {
  const fontsLoaded = useAppFontsLoaded()

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
          <Theme name="light">
            <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
              <Spinner size="large" color="$primary" />
            </YStack>
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <Theme name="light">
          <QueryClientProvider client={queryClient}>
            <StatusBar style="dark" />
            <Slot />
          </QueryClientProvider>
        </Theme>
      </TamaguiProvider>
    </SafeAreaProvider>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add app/_layout.tsx
git commit -m "feat(mobile): add SafeAreaProvider to root layout"
```

---

### Task 7: `TabBarButton` — active-tab top-border indicator

**Files:**
- Create: `mobile/src/components/TabBarButton.tsx`

**Interfaces:**
- Consumes: nothing new (takes the `BottomTabBarButtonProps` shape
  `expo-router`'s `Tabs.Screen` passes to a custom `tabBarButton`).
- Produces: `TabBarButton`, a drop-in `tabBarButton` renderer used by
  Task 8's tab layout — every tab item, active or not, is this same
  component; it reads `accessibilityState?.selected` to swap its
  top-border and label color between `$primary` (active) and `$kulit`
  (inactive), matching the prototype's `tabHomeColor`/`tabTxnColor`/etc.
  pattern exactly (same active color for every tab, not a per-tab
  palette).

- [ ] **Step 1: Implement**

```tsx
import { Pressable, Text, type GestureResponderEvent } from 'react-native'
import type { PropsWithChildren } from 'react'

interface TabBarButtonProps {
  accessibilityState?: { selected?: boolean }
  onPress?: (e: GestureResponderEvent) => void
  label: string
}

export function TabBarButton({
  accessibilityState,
  onPress,
  label,
}: PropsWithChildren<TabBarButtonProps>) {
  const active = accessibilityState?.selected ?? false
  const color = active ? '#0E6B58' : '#7C6A5B'

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingTop: 14,
        paddingBottom: 12,
        borderTopWidth: 2,
        borderTopColor: color,
      }}
    >
      <Text style={{ fontFamily: 'IBMPlexSans_500Medium', fontSize: 11, color }}>{label}</Text>
    </Pressable>
  )
}
```

Check `mobile/src/theme/fonts.ts` for the exact loaded font-weight key
name (`IBMPlexSans_500Medium` is the `@expo-google-fonts/ibm-plex-sans`
convention used elsewhere in this codebase for `weight: 2 / 500` per
`tamagui.config.ts`'s `bodyFont`) — use whatever that file actually loads
under `500` weight; this component is outside Tamagui's `fontFamily="$body"`
token system since `Pressable`/`Text` here are the plain React Native
primitives, not Tamagui's themed `Text`.

- [ ] **Step 2: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/components/TabBarButton.tsx`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/components/TabBarButton.tsx
git commit -m "feat(mobile): add TabBarButton with active top-border indicator"
```

---

### Task 8: `ComingSoonScreen` shared placeholder

**Files:**
- Create: `mobile/src/components/ComingSoonScreen.tsx`

**Interfaces:**
- Consumes: `PocketCard` with `tone="muted"` (Task 1).
- Produces: `ComingSoonScreen({ title, icon: IconComponent })` — a full
  screen (title heading + centered muted card with icon and copy).
  Consumed by Task 9's four placeholder tab screens.

- [ ] **Step 1: Implement**

```tsx
import type { ComponentType } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, YStack } from 'tamagui'
import { PocketCard } from './PocketCard'

interface ComingSoonScreenProps {
  title: string
  icon: ComponentType<{ size?: number; color?: string }>
}

export function ComingSoonScreen({ title, icon: Icon }: ComingSoonScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <YStack flex={1} backgroundColor="$background" padding="$5" gap="$5">
        <Text fontFamily="$heading" fontSize="$4" color="$color">
          {title}
        </Text>
        <PocketCard tone="muted" alignItems="center" justifyContent="center" flex={1} gap="$3">
          <Icon size={28} color="$kulit" />
          <Text fontFamily="$body" fontSize="$2" color="$kulit" textAlign="center">
            Fitur ini akan segera hadir.
          </Text>
        </PocketCard>
      </YStack>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/components/ComingSoonScreen.tsx`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/components/ComingSoonScreen.tsx
git commit -m "feat(mobile): add ComingSoonScreen placeholder component"
```

---

### Task 9: Home screen wired to `/v1/dashboard`

**Files:**
- Create: `mobile/app/(app)/(tabs)/home.tsx`
- Delete: `mobile/app/(app)/home.tsx` (content replaced by the file above)

**Interfaces:**
- Consumes: `useCurrentUser` (existing, unchanged), `useDashboard` (Task
  4), `formatRupiah` (Task 2), `billUrgency` (Task 3), `PocketCard`
  (Task 1, default/non-elevated style for every tile on this screen).
- Produces: nothing new consumed elsewhere.

The prototype's "Notifikasi" header button and the avatar-initial button
are both inert here — no notifications endpoint and no Profile screen
exist yet in this phase. The `hasAI` recommendation banner from the
prototype is omitted entirely (AI recommendation review is a separate,
later phase per the earlier scoping conversation).

- [ ] **Step 1: Implement**

```tsx
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Text, XStack, YStack, Spinner } from 'tamagui'
import { Bell } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../../src/components/PocketCard'
import { useCurrentUser } from '../../../src/auth/useCurrentUser'
import { useDashboard } from '../../../src/dashboard/useDashboard'
import { formatRupiah } from '../../../src/format/money'
import { billUrgency } from '../../../src/dashboard/billUrgency'

// Placeholder: no notifications endpoint exists yet. Inert until
// NOTIF-001 is implemented on the mobile client.
function handleNotifications() {}

export default function HomeScreen() {
  const { data: user } = useCurrentUser()
  const dashboard = useDashboard()

  const userInitial = user?.display_name?.trim()?.[0]?.toUpperCase() ?? '?'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$4">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontFamily="$heading" fontSize="$4" color="$primary">
              SakuPlan
            </Text>
            <XStack alignItems="center" gap="$3">
              <XStack onPress={handleNotifications} alignItems="center" gap="$1">
                <Bell size={16} color="$color" />
              </XStack>
              <YStack
                width={30}
                height={30}
                borderRadius={15}
                borderWidth={1.5}
                borderColor="$primary"
                backgroundColor="$white"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontFamily="$mono" fontSize="$1" color="$primary">
                  {userInitial}
                </Text>
              </YStack>
            </XStack>
          </XStack>

          {dashboard.isLoading || !dashboard.data ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : dashboard.isError ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat ringkasan. Coba lagi nanti.
              </Text>
            </PocketCard>
          ) : (
            <>
              <Text fontFamily="$body" fontSize="$2" color="$kulit">
                {`Halo, ${user?.display_name ?? ''}. Kelola pengeluaran dan lihat berapa yang aman kamu belanjakan hari ini.`}
              </Text>

              <PocketCard>
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  AMAN DIBELANJAKAN HARI INI
                </Text>
                <Text fontFamily="$mono" fontSize="$6" color="$primary">
                  {formatRupiah(dashboard.data.safe_to_spend_today)}
                </Text>
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  {`${formatRupiah(dashboard.data.safe_to_spend_until_payday)} aman sampai gajian · ${dashboard.data.days_until_payday} hari lagi`}
                </Text>
              </PocketCard>

              <XStack gap="$3">
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    SALDO CAIR
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color="$color">
                    {formatRupiah(dashboard.data.liquid_balance)}
                  </Text>
                </PocketCard>
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    ANGGARAN TERPAKAI
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color="$color">
                    {formatRupiah(dashboard.data.budget_used)}
                    <Text fontFamily="$body" fontSize="$1" color="$kulit">
                      {` / ${formatRupiah(dashboard.data.budget_total)}`}
                    </Text>
                  </Text>
                </PocketCard>
              </XStack>

              {dashboard.data.upcoming_bill ? (
                <PocketCard>
                  <XStack justifyContent="space-between" alignItems="center">
                    <YStack>
                      <Text fontFamily="$body" fontSize="$1" color="$kulit">
                        TAGIHAN BERIKUTNYA
                      </Text>
                      <Text fontFamily="$body" fontSize="$3" color="$color">
                        {dashboard.data.upcoming_bill.name}
                      </Text>
                      <Text
                        fontFamily="$body"
                        fontSize="$1"
                        color={billUrgency(dashboard.data.upcoming_bill.due_date, new Date()).color}
                      >
                        {billUrgency(dashboard.data.upcoming_bill.due_date, new Date()).label}
                      </Text>
                    </YStack>
                    <Text fontFamily="$mono" fontSize="$3" color="$color">
                      {formatRupiah(dashboard.data.upcoming_bill.amount)}
                    </Text>
                  </XStack>
                </PocketCard>
              ) : null}

              {dashboard.data.goals[0] ? (
                <PocketCard>
                  <XStack justifyContent="space-between">
                    <Text fontFamily="$body" fontSize="$1" color="$kulit">
                      {`TARGET TABUNGAN · ${dashboard.data.goals[0].name}`}
                    </Text>
                    <Text fontFamily="$mono" fontSize="$2" color="$accent">
                      {`${dashboard.data.goals[0].progress_percent}%`}
                    </Text>
                  </XStack>
                  <YStack height={6} borderRadius="$1" backgroundColor="$background" overflow="hidden">
                    <YStack
                      height="100%"
                      width={`${Math.min(dashboard.data.goals[0].progress_percent, 100)}%`}
                      backgroundColor="$accent"
                    />
                  </YStack>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    {`${formatRupiah(dashboard.data.goals[0].contributed)} dari ${formatRupiah(dashboard.data.goals[0].target_amount)}`}
                  </Text>
                </PocketCard>
              ) : null}

              {dashboard.data.top_categories.length > 0 ? (
                <PocketCard>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    KATEGORI TERBESAR BULAN INI
                  </Text>
                  {dashboard.data.top_categories.map((category) => (
                    <XStack key={category.category_id} justifyContent="space-between">
                      <Text fontFamily="$body" fontSize="$2" color="$color">
                        {category.name}
                      </Text>
                      <Text fontFamily="$mono" fontSize="$2" color="$color">
                        {formatRupiah(category.amount)}
                      </Text>
                    </XStack>
                  ))}
                </PocketCard>
              ) : null}
            </>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Delete the old Home screen file**

```bash
cd mobile && git rm "app/(app)/home.tsx"
```

- [ ] **Step 3: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint "app/(app)/(tabs)/home.tsx"`
Expected: both exit 0. (Full app won't compile/run correctly until Task
10's tab layout and Task 11's redirect updates land — that's expected;
this step only confirms this file itself is well-typed.)

- [ ] **Step 4: Commit**

```bash
cd mobile && git add "app/(app)/(tabs)/home.tsx"
git commit -m "feat(mobile): wire Home screen to GET /v1/dashboard"
```

---

### Task 10: Tab shell — layout + 4 placeholder screens

**Files:**
- Create: `mobile/app/(app)/(tabs)/_layout.tsx`
- Create: `mobile/app/(app)/(tabs)/transactions.tsx`
- Create: `mobile/app/(app)/(tabs)/budgets.tsx`
- Create: `mobile/app/(app)/(tabs)/reports.tsx`
- Create: `mobile/app/(app)/(tabs)/more.tsx`

**Interfaces:**
- Consumes: `TabBarButton` (Task 7), `ComingSoonScreen` (Task 8).
- Produces: the five routes `/(app)/(tabs)/home`,
  `/(app)/(tabs)/transactions`, `/(app)/(tabs)/budgets`,
  `/(app)/(tabs)/reports`, `/(app)/(tabs)/more`, navigable via the bottom
  tab bar. Consumed by Task 11 (redirect targets).

- [ ] **Step 1: Implement the tab layout**

```tsx
import { Tabs } from 'expo-router'
import { TabBarButton } from '../../../src/components/TabBarButton'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1.5,
          borderTopColor: '#7C6A5B',
          borderStyle: 'dashed',
          height: 56,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ tabBarButton: (props) => <TabBarButton {...props} label="Beranda" /> }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ tabBarButton: (props) => <TabBarButton {...props} label="Transaksi" /> }}
      />
      <Tabs.Screen
        name="budgets"
        options={{ tabBarButton: (props) => <TabBarButton {...props} label="Anggaran" /> }}
      />
      <Tabs.Screen
        name="reports"
        options={{ tabBarButton: (props) => <TabBarButton {...props} label="Laporan" /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ tabBarButton: (props) => <TabBarButton {...props} label="Lainnya" /> }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 2: Implement the four placeholder screens**

```tsx
// mobile/app/(app)/(tabs)/transactions.tsx
import { Receipt } from '@tamagui/lucide-icons-2'
import { ComingSoonScreen } from '../../../src/components/ComingSoonScreen'

export default function TransactionsScreen() {
  return <ComingSoonScreen title="Transaksi" icon={Receipt} />
}
```

```tsx
// mobile/app/(app)/(tabs)/budgets.tsx
import { Wallet } from '@tamagui/lucide-icons-2'
import { ComingSoonScreen } from '../../../src/components/ComingSoonScreen'

export default function BudgetsScreen() {
  return <ComingSoonScreen title="Anggaran" icon={Wallet} />
}
```

```tsx
// mobile/app/(app)/(tabs)/reports.tsx
import { BarChart3 } from '@tamagui/lucide-icons-2'
import { ComingSoonScreen } from '../../../src/components/ComingSoonScreen'

export default function ReportsScreen() {
  return <ComingSoonScreen title="Laporan" icon={BarChart3} />
}
```

```tsx
// mobile/app/(app)/(tabs)/more.tsx
import { Menu } from '@tamagui/lucide-icons-2'
import { ComingSoonScreen } from '../../../src/components/ComingSoonScreen'

export default function MoreScreen() {
  return <ComingSoonScreen title="Lainnya" icon={Menu} />
}
```

- [ ] **Step 3: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint "app/(app)/(tabs)"`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
cd mobile && git add "app/(app)/(tabs)"
git commit -m "feat(mobile): add 5-tab navigation shell"
```

---

### Task 11: Update redirect targets to the new Home route

**Files:**
- Modify: `mobile/app/index.tsx:18`
- Modify: `mobile/app/(app)/_layout.tsx:7`

**Interfaces:**
- Consumes: the `/(app)/(tabs)/home` route (Task 10).

- [ ] **Step 1: Update `app/index.tsx`**

Change line 18 from:

```tsx
  return <Redirect href={accessToken ? '/(app)/home' : '/(auth)/login'} />
```

to:

```tsx
  return <Redirect href={accessToken ? '/(app)/(tabs)/home' : '/(auth)/login'} />
```

- [ ] **Step 2: Update `app/(app)/_layout.tsx`**

The file is currently:

```tsx
import { Redirect, Slot } from 'expo-router'
import { useAuthStore } from '../../src/auth/store'

export default function AppGroupLayout() {
  const accessToken = useAuthStore((state) => state.accessToken)
  if (!accessToken) {
    return <Redirect href="/(auth)/login" />
  }
  return <Slot />
}
```

No change needed to this file's logic — `<Slot />` already forwards to
whatever child route matches, and `(tabs)` is now that child. Verify by
reading the file and confirming it still matches the above; if it does,
no edit is required for this file.

- [ ] **Step 3: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd mobile && git add app/index.tsx
git commit -m "feat(mobile): redirect to the new tabbed Home route"
```

---

### Task 12: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full mobile test suite**

Run: `cd mobile && npx jest`
Expected: all suites pass, including the new `money.test.ts` (4 tests)
and `billUrgency.test.ts` (3 tests) alongside the existing
`refreshInterceptor.test.ts` and `store.test.ts`.

- [ ] **Step 2: Run full type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx expo lint`
Expected: both exit 0.

- [ ] **Step 3: Manual verification in Expo**

Start the app (`task run` from repo root, or `cd mobile && npx expo
start`) and walk through: Login screen matches the prototype (solid
input borders with teal focus glow, tinted error banner on a failed
login, Google button + "atau" divider, safe-area/keyboard behavior on a
small device size); Register screen additionally has the confirm-password
field and rejects mismatched passwords via `canSubmit`; after a real
login, the 5-tab bar appears with Beranda active (teal top border);
Home shows real numbers from `GET /v1/dashboard` (compare against
whatever the seeded/test account's actual balances are — not the
prototype's hardcoded mock figures); Transaksi/Anggaran/Laporan/Lainnya
each show the muted "Fitur ini akan segera hadir" placeholder.

- [ ] **Step 4: Update `docs/PROGRESS.md`**

Add an entry noting Phase 1 of the `SakuPlan.dc.html` implementation is
complete: auth screens redesigned, 5-tab shell added, Home wired to
`GET /v1/dashboard`; Transactions/Budgets/Reports/More/notifications/
AI-review/profile remain as later phases.

- [ ] **Step 5: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan" && git add docs/PROGRESS.md
git commit -m "docs: record Phase 1 dc-prototype implementation progress"
```
