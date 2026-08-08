# dc-prototype Phase 3 — Onboarding, Accounts, Bills, Goals, Safe-to-Spend Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `SakuPlan.dc.html` prototype surface that Phases 1–2
left out but the Go backend already fully supports: a 4-step post-registration
onboarding wizard, and four new sub-screens (Accounts, Bills, Goals,
Safe-to-Spend detail), plus extracting the existing inline profile editor out
of More into its own screen. Design spec:
`docs/superpowers/specs/2026-08-08-dc-prototype-phase3-design.md`.

**Architecture:** Five new routes as siblings of `(tabs)` under
`app/(app)/` (`accounts.tsx`, `bills.tsx`, `goals.tsx`, `safe-to-spend.tsx`,
`profile.tsx`), each using a new shared `SubScreenHeader` component
(back-arrow + title) since they're outside the `(tabs)` group and so render
without the tab bar automatically. A new top-level `app/onboarding.tsx`
(no group — it just needs the auth token already in the Zustand store from a
just-completed registration, not any layout gating) runs once, immediately
after `useRegister` succeeds. Every new screen follows the exact structural
template every existing tab already uses: `SafeAreaView(edges=['top'])` →
`ScrollView` → `YStack padding="$5" gap="$4"`, `PocketCard` for content
blocks, `formatRupiah`/`RupiahInput` for money, plain `useQuery`/`useMutation`
hooks under `src/<domain>/` mirroring `useAccounts`/`useSafeToSpend`/
`useCreateAndActivateBudget` exactly. Colors/fonts/spacing follow the
prototype's exact layout using this app's already-established Tamagui tokens
(`$terjaga`/`$kertas`/etc.) — the same approach Phases 1–2 used, not the
prototype's literal hex values.

**Tech Stack additions:** None. Every package this plan needs
(`@tanstack/react-query`, `expo-router`, `@tamagui/lucide-icons-2`) is already
installed.

## Global Constraints

- Bahasa Indonesia UI copy throughout, informal "kamu" register, matching
  every existing screen. Every user-facing string in this plan is written
  out verbatim.
- All `Money` fields are integer minor units server-side — never divide or
  multiply by 100. Every rendered money value goes through `formatRupiah`;
  every money value collected from a text input goes through `RupiahInput`.
- `POST /v1/goals/{id}/contributions` requires an `Idempotency-Key` header
  (same contract as `createTransaction`/`reverseTransaction`) — use
  `generateIdempotencyKey()` from `src/api/idempotencyKey.ts`, called fresh
  inside the `mutationFn` (never memoized/reused across retries).
- Every mutation hook throws `ApiError` (`src/api/errors.ts`) carrying the
  real HTTP status, never a bare `Error`, matching every existing mutation
  hook (`useCreateAccount`, `useUpdateProfile`, `useCreateTransaction`, etc.).
- `GET /v1/accounts` does **not** return a current balance — only
  `initial_balance` (the value at account creation). The real ledger balance
  is only available per-account via `GET /v1/accounts/{id}/balance`. The
  Accounts screen (Task 7) fetches these in parallel with `useQueries`, not
  a single bulk endpoint (none exists).
- `Bill` has no due-instance/paid state (only the recurring definition:
  `due_day`, `frequency`) and there is no mark-paid endpoint — the Bills
  screen (Task 6) is read-only and computes due-date urgency client-side
  from `due_day`, the same category of pure date math as the existing
  `nextPaydayDate`-style helpers, not a persisted "paid" flag.
- `POST /v1/goals/{id}/contributions` requires `account_id` in its body —
  the prototype's "Tambah Dana" mini-form only has an amount field, so the
  real form (Task 9) adds an account picker. This is a deliberate, necessary
  addition beyond the prototype, not a scope error.
- No create-account/create-bill/create-goal UI on any of these four screens
  — the prototype doesn't show any there either.
- No Notifications screen, no AI-recommendation approve/reject screen, no
  Privacy screen (session list, account deletion) — zero backend support;
  they remain exactly as today's "Segera hadir" rows in More.
- Run `npx tsc --noEmit` and `npx eslint <changed files>` from `mobile/`
  after every task that touches `.tsx`/`.ts` files.
- New pure logic gets unit tests (`nextBillOccurrence`). Thin React
  Query hook wrappers and presentational screens don't, matching every
  existing hook/screen in this codebase.

---

## Task Group A — Shared utilities and components

### Task 1: Verify generated API types are current

**Files:** none (verification only).

**Interfaces:** confirms `mobile/src/api/generated/types.ts` already includes
every operation this plan uses (`listBills`, `listGoals`, `contributeToGoal`,
`getAccountBalance`) before any code depends on them.

- [ ] **Step 1: Regenerate and diff**

Run:
```bash
cd mobile && npm run generate:api && git diff --stat src/api/generated/types.ts
```
Expected: no output (file already matches `openapi.yaml`). If there IS a
diff, stop and escalate rather than continuing on stale assumptions.

- [ ] **Step 2: No commit needed.**

---

### Task 2: `SubScreenHeader` shared component

**Files:**
- Create: `mobile/src/components/SubScreenHeader.tsx`

**Interfaces:**
- Produces: `SubScreenHeader({ title }: { title: string })` — a back-arrow
  icon button (`router.back()`) plus a title, in a 56px row with a bottom
  border. Consumed by Tasks 6, 7, 8, 9, 10 (every new sub-screen).

- [ ] **Step 1: Write the component**

```tsx
import { useRouter } from 'expo-router'
import { Button, Text, XStack } from 'tamagui'
import { ArrowLeft } from '@tamagui/lucide-icons-2'

export function SubScreenHeader({ title }: { title: string }) {
  const router = useRouter()
  return (
    <XStack
      alignItems="center"
      height={56}
      // Numeric, not the "$5" token: cancels out the parent screen's
      // YStack padding="$5" (= 24px, see tamagui.config.ts's `space` scale)
      // so this header spans full-bleed edge-to-edge, matching the
      // prototype's isSubScreen header exactly. Tamagui's margin props
      // don't reliably accept a "-$5" token string, so this uses the
      // token's known pixel value directly.
      marginHorizontal={-24}
      marginTop={-24}
      marginBottom="$3"
      paddingHorizontal="$3"
      backgroundColor="$background"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      <Button
        size="$3"
        circular
        chromeless
        icon={<ArrowLeft size={21} color="$primary" />}
        onPress={() => router.back()}
        accessibilityLabel="Kembali"
      />
      <Text
        flex={1}
        fontFamily="$body"
        fontWeight="600"
        fontSize="$4"
        color="$color"
        numberOfLines={1}
        marginLeft="$2"
      >
        {title}
      </Text>
    </XStack>
  )
}
```

The negative horizontal/top margins cancel out the parent screen's
`YStack padding="$5"` so this header spans the screen's full width and sits
flush with the top safe area, matching the prototype's edge-to-edge
`isSubScreen` header bar exactly.

- [ ] **Step 2: Typecheck and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/components/SubScreenHeader.tsx`
Expected: both PASS, 0 errors.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/components/SubScreenHeader.tsx
git commit -m "feat(mobile): add SubScreenHeader for new sub-screens"
```

---

### Task 3: `nextBillOccurrence` pure helper

**Files:**
- Create: `mobile/src/bills/nextBillOccurrence.ts`
- Test: `mobile/src/bills/nextBillOccurrence.test.ts`

**Interfaces:**
- Produces: `nextBillOccurrence(dueDay: number, now: Date): Date` — resolves
  a 1–31 day-of-month recurrence rule to the next concrete occurrence date
  on/after `now`, clamping to the last real day of a short month (e.g.
  `dueDay=31` in February → Feb 28/29). Consumed by Task 6 (Bills screen),
  feeding the existing `billUrgency()` helper.

- [ ] **Step 1: Write the failing tests**

```ts
import { nextBillOccurrence } from './nextBillOccurrence'

describe('nextBillOccurrence', () => {
  it('returns this month\'s occurrence when the due day is still ahead', () => {
    const now = new Date(2026, 7, 4) // 4 Aug 2026
    expect(nextBillOccurrence(10, now)).toEqual(new Date(2026, 7, 10))
  })

  it('rolls over to next month when the due day already passed', () => {
    const now = new Date(2026, 7, 20) // 20 Aug 2026
    expect(nextBillOccurrence(10, now)).toEqual(new Date(2026, 8, 10))
  })

  it('treats today as the occurrence, not overdue', () => {
    const now = new Date(2026, 7, 4)
    expect(nextBillOccurrence(4, now)).toEqual(new Date(2026, 7, 4))
  })

  it('clamps a day-of-month beyond a short month\'s length', () => {
    const now = new Date(2026, 1, 1) // 1 Feb 2026 (28 days, not a leap year)
    expect(nextBillOccurrence(31, now)).toEqual(new Date(2026, 1, 28))
  })

  it('rolls a December-clamped occurrence into January of the next year', () => {
    const now = new Date(2026, 11, 15) // 15 Dec 2026
    expect(nextBillOccurrence(10, now)).toEqual(new Date(2027, 0, 10))
  })
})
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `cd mobile && npx jest src/bills/nextBillOccurrence.test.ts`
Expected: FAIL — `Cannot find module './nextBillOccurrence'`.

- [ ] **Step 3: Implement**

```ts
export function nextBillOccurrence(dueDay: number, now: Date): Date {
  const clampedDay = Math.max(1, Math.min(31, dueDay))

  function candidateFor(year: number, month: number): Date {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
    return new Date(year, month, Math.min(clampedDay, lastDayOfMonth))
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisMonth = candidateFor(today.getFullYear(), today.getMonth())
  if (thisMonth >= today) return thisMonth

  const nextMonthIndex = today.getMonth() + 1
  return candidateFor(today.getFullYear(), nextMonthIndex)
}
```

- [ ] **Step 4: Run tests, confirm they pass**

Run: `cd mobile && npx jest src/bills/nextBillOccurrence.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/bills/nextBillOccurrence.ts src/bills/nextBillOccurrence.test.ts
git commit -m "feat(mobile): add nextBillOccurrence date helper"
```

---

### Task 4: `useBills` and `useGoals` query hooks

**Files:**
- Create: `mobile/src/bills/useBills.ts`
- Create: `mobile/src/goals/useGoals.ts`

**Interfaces:**
- Produces: `useBills()` — `useQuery<Bill[]>`, `GET /v1/bills`. Consumed by
  Task 6.
- Produces: `useGoals()` — `useQuery<Goal[]>`, `GET /v1/goals` (defaults to
  `include_inactive=false`, i.e. active goals only). Consumed by Task 9.

- [ ] **Step 1: Write both hooks**

```ts
// mobile/src/bills/useBills.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useBills() {
  return useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/bills')
      if (error || !data) throw new Error('failed_to_load_bills')
      return data.data
    },
  })
}
```

```ts
// mobile/src/goals/useGoals.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/goals')
      if (error || !data) throw new Error('failed_to_load_goals')
      return data.data
    },
  })
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/bills/useBills.ts src/goals/useGoals.ts`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/bills/useBills.ts src/goals/useGoals.ts
git commit -m "feat(mobile): add useBills and useGoals query hooks"
```

---

### Task 5: `useAccountBalances` and `useContributeToGoal` mutation/query hooks

**Files:**
- Create: `mobile/src/accounts/useAccountBalances.ts`
- Create: `mobile/src/goals/useContributeToGoal.ts`

**Interfaces:**
- Produces: `useAccountBalances(accountIds: string[])` — returns
  `{ balancesById: Map<string, number>, isLoading: boolean, isError: boolean }`,
  one `GET /v1/accounts/{id}/balance` call per id via `useQueries`. Consumed
  by Task 7.
- Produces: `useContributeToGoal()` — `useMutation`, input
  `{ goalId: string; accountId: string; amount: number }`, `POST
  /v1/goals/{id}/contributions`, idempotency-keyed, invalidates `['goals']`
  and `['dashboard']` on success (dashboard's `goals[].contributed`/
  `progress_percent` must reflect the new contribution immediately).
  Consumed by Task 9.

- [ ] **Step 1: Write `useAccountBalances`**

```ts
// mobile/src/accounts/useAccountBalances.ts
import { useQueries } from '@tanstack/react-query'
import { api } from '../api/client'

export function useAccountBalances(accountIds: string[]) {
  const results = useQueries({
    queries: accountIds.map((id) => ({
      queryKey: ['accounts', id, 'balance'],
      queryFn: async () => {
        const { data, error } = await api.GET('/v1/accounts/{id}/balance', {
          params: { path: { id } },
        })
        if (error || !data) throw new Error('failed_to_load_account_balance')
        return data
      },
    })),
  })

  const balancesById = new Map<string, number>()
  for (const result of results) {
    if (result.data) balancesById.set(result.data.account_id, result.data.balance)
  }

  return {
    balancesById,
    isLoading: results.some((result) => result.isLoading),
    isError: results.some((result) => result.isError),
  }
}
```

- [ ] **Step 2: Write `useContributeToGoal`**

```ts
// mobile/src/goals/useContributeToGoal.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import { generateIdempotencyKey } from '../api/idempotencyKey'

export function useContributeToGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      goalId,
      accountId,
      amount,
    }: {
      goalId: string
      accountId: string
      amount: number
    }) => {
      const { data, error, response } = await api.POST('/v1/goals/{id}/contributions', {
        params: {
          path: { id: goalId },
          header: { 'Idempotency-Key': generateIdempotencyKey() },
        },
        body: { account_id: accountId, amount },
      })
      if (error || !data) throw new ApiError('failed_to_contribute_to_goal', response.status)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/accounts/useAccountBalances.ts src/goals/useContributeToGoal.ts`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
cd mobile && git add src/accounts/useAccountBalances.ts src/goals/useContributeToGoal.ts
git commit -m "feat(mobile): add useAccountBalances and useContributeToGoal"
```

---

## Task Group B — New sub-screens

### Task 6: Bills screen

**Files:**
- Create: `mobile/app/(app)/bills.tsx`

**Interfaces:**
- Consumes: `useBills()` (Task 4), `nextBillOccurrence` (Task 3),
  `billUrgency` (existing, `src/dashboard/billUrgency.ts`),
  `SubScreenHeader` (Task 2), `formatRupiah`, `toDateOnly` (existing,
  `src/format/date.ts`).

- [ ] **Step 1: Write the screen**

```tsx
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { SubScreenHeader } from '../../src/components/SubScreenHeader'
import { PocketCard } from '../../src/components/PocketCard'
import { useBills } from '../../src/bills/useBills'
import { nextBillOccurrence } from '../../src/bills/nextBillOccurrence'
import { billUrgency } from '../../src/dashboard/billUrgency'
import { formatRupiah } from '../../src/format/money'

export default function BillsScreen() {
  const bills = useBills()
  const now = new Date()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$3">
          <SubScreenHeader title="Tagihan Berulang" />

          {bills.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : bills.isError ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat tagihan. Coba lagi nanti.
              </Text>
            </PocketCard>
          ) : bills.data && bills.data.length > 0 ? (
            <PocketCard>
              {bills.data.map((bill) => {
                const occurrence = nextBillOccurrence(bill.due_day, now)
                const urgency = billUrgency(occurrence.toISOString(), now)
                return (
                  <XStack
                    key={bill.id}
                    justifyContent="space-between"
                    alignItems="center"
                    paddingVertical="$3"
                    borderTopWidth={1}
                    borderTopColor="$borderColor"
                  >
                    <YStack>
                      <Text fontFamily="$body" fontSize="$3" color="$color">
                        {bill.name}
                      </Text>
                      <Text fontFamily="$body" fontSize="$1" color={urgency.color}>
                        {urgency.label}
                      </Text>
                    </YStack>
                    <Text fontFamily="$mono" fontSize="$3" color="$color">
                      {formatRupiah(bill.amount)}
                    </Text>
                  </XStack>
                )
              })}
            </PocketCard>
          ) : (
            <PocketCard tone="muted">
              <Text fontFamily="$body" fontSize="$3" color="$color" textAlign="center">
                Belum ada tagihan berulang
              </Text>
            </PocketCard>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
```

`occurrence.toISOString()` (not a `'YYYY-MM-DD'` date-only string) is
required here: `nextBillOccurrence` builds a local-midnight `Date`
instant, and `billUrgency` reconstructs it with `new Date(dueDateIso)`.
Round-tripping through a date-only string would have `new Date()`
reparse it as **UTC** midnight instead of local midnight — silently
shifting the instant by the timezone offset, which is exactly the
Asia/Jakarta date-shift bug already found and fixed once elsewhere in
this codebase. `toISOString()` preserves the exact instant, so the round
trip is lossless.

- [ ] **Step 2: Typecheck and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint app/'(app)'/bills.tsx`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "app/(app)/bills.tsx"
git commit -m "feat(mobile): add Bills screen"
```

---

### Task 7: Accounts screen

**Files:**
- Create: `mobile/app/(app)/accounts.tsx`

**Interfaces:**
- Consumes: `useAccounts()` (existing), `useAccountBalances()` (Task 5),
  `accountTypeLabel` (existing, `src/accounts/accountTypeLabels.ts`),
  `SubScreenHeader` (Task 2), `formatRupiah`.

- [ ] **Step 1: Write the screen**

```tsx
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { SubScreenHeader } from '../../src/components/SubScreenHeader'
import { PocketCard } from '../../src/components/PocketCard'
import { useAccounts } from '../../src/accounts/useAccounts'
import { useAccountBalances } from '../../src/accounts/useAccountBalances'
import { accountTypeLabel } from '../../src/accounts/accountTypeLabels'
import { formatRupiah } from '../../src/format/money'

export default function AccountsScreen() {
  const accounts = useAccounts()
  const accountIds = (accounts.data ?? []).map((account) => account.id)
  const balances = useAccountBalances(accountIds)

  const totalBalance = [...balances.balancesById.values()].reduce((sum, value) => sum + value, 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$3">
          <SubScreenHeader title="Akun & Saldo" />

          {accounts.isLoading || balances.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : accounts.isError || balances.isError ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat akun. Coba lagi nanti.
              </Text>
            </PocketCard>
          ) : (
            <>
              <PocketCard>
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  TOTAL SALDO
                </Text>
                <Text fontFamily="$mono" fontSize="$6" color="$color">
                  {formatRupiah(totalBalance)}
                </Text>
              </PocketCard>

              <PocketCard>
                {(accounts.data ?? []).map((account) => (
                  <XStack
                    key={account.id}
                    justifyContent="space-between"
                    alignItems="center"
                    paddingVertical="$3"
                    borderTopWidth={1}
                    borderTopColor="$borderColor"
                  >
                    <YStack>
                      <Text fontFamily="$body" fontSize="$3" color="$color">
                        {account.name}
                      </Text>
                      <Text fontFamily="$body" fontSize="$1" color="$kulit">
                        {accountTypeLabel(account.type)}
                      </Text>
                    </YStack>
                    <Text fontFamily="$mono" fontSize="$3" color="$color">
                      {formatRupiah(balances.balancesById.get(account.id) ?? 0)}
                    </Text>
                  </XStack>
                ))}
              </PocketCard>
            </>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint app/'(app)'/accounts.tsx`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "app/(app)/accounts.tsx"
git commit -m "feat(mobile): add Accounts screen"
```

---

### Task 8: Safe-to-Spend detail screen

**Files:**
- Create: `mobile/app/(app)/safe-to-spend.tsx`

**Interfaces:**
- Consumes: `useSafeToSpend()` (existing, `src/budgets/useSafeToSpend.ts`),
  `SubScreenHeader` (Task 2), `formatRupiah`.
- Real `SafeToSpend` fields used (not the prototype's mock line items,
  which don't match the real schema — see design spec §"Safe-to-Spend
  detail screen"): `daily`, `liquid_balance`, `upcoming_bills`,
  `remaining_savings_commitment`, `minimum_buffer`, `until_payday`,
  `days_remaining`.

- [ ] **Step 1: Write the screen**

```tsx
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { SubScreenHeader } from '../../src/components/SubScreenHeader'
import { PocketCard } from '../../src/components/PocketCard'
import { useSafeToSpend } from '../../src/budgets/useSafeToSpend'
import { formatRupiah } from '../../src/format/money'

function BreakdownRow({
  label,
  amount,
  emphasis,
}: {
  label: string
  amount: string
  emphasis?: boolean
}) {
  return (
    <XStack
      justifyContent="space-between"
      paddingVertical="$3"
      borderTopWidth={1}
      borderTopColor="$borderColor"
    >
      <Text fontFamily="$body" fontSize="$2" color={emphasis ? '$color' : '$kulit'}>
        {label}
      </Text>
      <Text
        fontFamily="$mono"
        fontSize="$3"
        color={emphasis ? '$primary' : '$color'}
      >
        {amount}
      </Text>
    </XStack>
  )
}

export default function SafeToSpendScreen() {
  const safeToSpend = useSafeToSpend()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$3">
          <SubScreenHeader title="Aman Dibelanjakan" />

          {safeToSpend.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : safeToSpend.isError || !safeToSpend.data ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat rincian. Coba lagi nanti.
              </Text>
            </PocketCard>
          ) : (
            <>
              <PocketCard elevated>
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  AMAN DIBELANJAKAN HARI INI
                </Text>
                <Text fontFamily="$mono" fontSize="$7" color="$primary">
                  {formatRupiah(safeToSpend.data.daily)}
                </Text>
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  {`${formatRupiah(safeToSpend.data.until_payday)} · ${safeToSpend.data.days_remaining} hari sampai gajian`}
                </Text>
              </PocketCard>

              <Text fontFamily="$body" fontSize="$1" color="$kulit">
                RINCIAN PERHITUNGAN
              </Text>
              <PocketCard>
                <BreakdownRow
                  label="Saldo cair"
                  amount={formatRupiah(safeToSpend.data.liquid_balance)}
                />
                <BreakdownRow
                  label="− Tagihan belum lunas"
                  amount={formatRupiah(safeToSpend.data.upcoming_bills)}
                />
                <BreakdownRow
                  label="− Sisa komitmen tabungan"
                  amount={formatRupiah(safeToSpend.data.remaining_savings_commitment)}
                />
                <BreakdownRow
                  label="− Dana darurat minimum"
                  amount={formatRupiah(safeToSpend.data.minimum_buffer)}
                />
                <BreakdownRow
                  label="= Aman sampai gajian"
                  amount={formatRupiah(safeToSpend.data.until_payday)}
                  emphasis
                />
              </PocketCard>
            </>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint app/'(app)'/safe-to-spend.tsx`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "app/(app)/safe-to-spend.tsx"
git commit -m "feat(mobile): add Safe-to-Spend detail screen"
```

---

### Task 9: Goals screen

**Files:**
- Create: `mobile/app/(app)/goals.tsx`

**Interfaces:**
- Consumes: `useGoals()` (Task 4), `useDashboard()` (existing, for
  `goals[].contributed`/`progress_percent`), `useContributeToGoal()`
  (Task 5), `useAccounts()` (existing, for the account picker),
  `SubScreenHeader` (Task 2), `formatRupiah`, `formatDateID`.

- [ ] **Step 1: Write the screen**

```tsx
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { SubScreenHeader } from '../../src/components/SubScreenHeader'
import { PocketCard } from '../../src/components/PocketCard'
import { RupiahInput } from '../../src/components/RupiahInput'
import { useGoals } from '../../src/goals/useGoals'
import { useDashboard } from '../../src/dashboard/useDashboard'
import { useContributeToGoal } from '../../src/goals/useContributeToGoal'
import { useAccounts } from '../../src/accounts/useAccounts'
import { formatRupiah } from '../../src/format/money'
import { formatDateID } from '../../src/format/date'

function GoalCard({
  goal,
  contributed,
  progressPercent,
}: {
  goal: { id: string; name: string; target_amount: number; target_date?: string }
  contributed: number
  progressPercent: number
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [amount, setAmount] = useState(0)
  const [accountId, setAccountId] = useState<string | null>(null)
  const accounts = useAccounts()
  const contribute = useContributeToGoal()

  const canSave = amount > 0 && accountId !== null && !contribute.isPending

  function handleSave() {
    if (!accountId) return
    contribute.mutate(
      { goalId: goal.id, accountId, amount },
      {
        onSuccess: () => {
          setIsAdding(false)
          setAmount(0)
          setAccountId(null)
        },
      }
    )
  }

  return (
    <PocketCard>
      <XStack justifyContent="space-between">
        <Text fontFamily="$body" fontSize="$3" color="$color">
          {goal.name}
        </Text>
        <Text fontFamily="$mono" fontSize="$2" color="$accent">
          {`${Math.min(progressPercent, 100)}%`}
        </Text>
      </XStack>
      <YStack height={6} borderRadius="$1" backgroundColor="$background" overflow="hidden">
        <YStack height="100%" width={`${Math.min(progressPercent, 100)}%`} backgroundColor="$accent" />
      </YStack>
      <Text fontFamily="$body" fontSize="$1" color="$kulit">
        {`${formatRupiah(contributed)} dari ${formatRupiah(goal.target_amount)}${
          goal.target_date ? ` · target ${formatDateID(goal.target_date)}` : ''
        }`}
      </Text>

      {isAdding ? (
        <YStack gap="$2">
          {contribute.isError ? (
            <Text fontFamily="$body" fontSize="$1" color="$danger">
              Gagal menambah dana. Coba lagi.
            </Text>
          ) : null}
          <RupiahInput value={amount} onChangeValue={setAmount} />
          <XStack gap="$2" flexWrap="wrap">
            {(accounts.data ?? []).map((account) => (
              <Button
                key={account.id}
                size="$3"
                backgroundColor={accountId === account.id ? '$primary' : '$white'}
                color={accountId === account.id ? '$primaryText' : '$color'}
                borderWidth={1.5}
                borderColor={accountId === account.id ? '$primary' : '$borderColor'}
                onPress={() => setAccountId(account.id)}
              >
                {account.name}
              </Button>
            ))}
          </XStack>
          <XStack gap="$2">
            <Button
              flex={1}
              backgroundColor="$white"
              borderWidth={1.5}
              borderColor="$borderColor"
              color="$color"
              onPress={() => setIsAdding(false)}
            >
              Batal
            </Button>
            <Button
              flex={1}
              backgroundColor="$primary"
              color="$primaryText"
              disabled={!canSave}
              opacity={canSave ? 1 : 0.5}
              onPress={handleSave}
            >
              {contribute.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </XStack>
        </YStack>
      ) : (
        <Button
          backgroundColor="transparent"
          borderWidth={1.5}
          borderColor="$primary"
          color="$primary"
          onPress={() => setIsAdding(true)}
        >
          Tambah Dana
        </Button>
      )}
    </PocketCard>
  )
}

export default function GoalsScreen() {
  const goals = useGoals()
  const dashboard = useDashboard()

  const progressByGoalId = new Map(
    (dashboard.data?.goals ?? []).map((progress) => [progress.goal_id, progress])
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$3">
          <SubScreenHeader title="Target Tabungan" />

          {goals.isLoading || dashboard.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : goals.isError || dashboard.isError ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat target tabungan. Coba lagi nanti.
              </Text>
            </PocketCard>
          ) : goals.data && goals.data.length > 0 ? (
            goals.data.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                contributed={progressByGoalId.get(goal.id)?.contributed ?? 0}
                progressPercent={progressByGoalId.get(goal.id)?.progress_percent ?? 0}
              />
            ))
          ) : (
            <PocketCard tone="muted">
              <Text fontFamily="$body" fontSize="$3" color="$color" textAlign="center">
                Belum ada target tabungan
              </Text>
            </PocketCard>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint app/'(app)'/goals.tsx`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "app/(app)/goals.tsx"
git commit -m "feat(mobile): add Goals screen with contribution form"
```

---

### Task 10: Extract Profile into its own screen; wire More's navigation

**Files:**
- Create: `mobile/app/(app)/profile.tsx`
- Modify: `mobile/app/(app)/(tabs)/more.tsx`

**Interfaces:**
- Consumes: `useCurrentUser()`, `useUpdateProfile()` (both existing,
  moved verbatim from `more.tsx`), `SubScreenHeader` (Task 2).
- `more.tsx` gains `useRouter` from `expo-router` and four navigation rows.

- [ ] **Step 1: Create `profile.tsx` with the profile-edit card moved out of `more.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Checkbox, Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { Check } from '@tamagui/lucide-icons-2'
import { SubScreenHeader } from '../../src/components/SubScreenHeader'
import { PocketCard } from '../../src/components/PocketCard'
import { RupiahInput } from '../../src/components/RupiahInput'
import { useCurrentUser } from '../../src/auth/useCurrentUser'
import { useUpdateProfile } from '../../src/profile/useUpdateProfile'

export default function ProfileScreen() {
  const { data: user, isLoading } = useCurrentUser()
  const updateProfile = useUpdateProfile()

  const [initialized, setInitialized] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [payday, setPayday] = useState(1)
  const [minimumBuffer, setMinimumBuffer] = useState(0)
  const [aiConsent, setAiConsent] = useState(false)

  useEffect(() => {
    if (user && !initialized) {
      /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
         of editable profile form state from the query result once it loads;
         not a per-render derived value. */
      setDisplayName(user.display_name)
      setPayday(user.payday)
      setMinimumBuffer(user.minimum_buffer)
      setAiConsent(user.ai_consent)
      setInitialized(true)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [user, initialized])

  function handleSaveProfile() {
    if (!user) return
    updateProfile.mutate({
      display_name: displayName.trim(),
      currency: user.currency,
      timezone: user.timezone,
      payday: Math.min(31, Math.max(1, payday)),
      minimum_buffer: minimumBuffer,
      ai_consent: aiConsent,
    })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$4">
          <SubScreenHeader title="Profil & Preferensi" />

          {isLoading || !user ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : (
            <PocketCard elevated>
              {updateProfile.isSuccess ? (
                <Text fontFamily="$body" fontSize="$2" color="$primary">
                  Perubahan disimpan.
                </Text>
              ) : updateProfile.isError ? (
                <Text fontFamily="$body" fontSize="$2" color="$danger">
                  Gagal menyimpan perubahan. Coba lagi.
                </Text>
              ) : null}

              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  NAMA
                </Text>
                <Input
                  value={displayName}
                  onChangeText={setDisplayName}
                  color="$color"
                  focusStyle={{ borderColor: '$borderColorFocus' }}
                />
              </YStack>

              <XStack gap="$3">
                <YStack flex={1} gap="$2">
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    MATA UANG
                  </Text>
                  <Text fontFamily="$body" fontSize="$2" color="$kulit">
                    {user.currency}
                  </Text>
                </YStack>
                <YStack flex={1} gap="$2">
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    ZONA WAKTU
                  </Text>
                  <Text fontFamily="$body" fontSize="$2" color="$kulit">
                    {user.timezone}
                  </Text>
                </YStack>
              </XStack>
              <Text fontFamily="$body" fontSize="$1" color="$kulit">
                Mata uang dan zona waktu belum bisa diganti.
              </Text>

              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  TANGGAL GAJIAN (1-31)
                </Text>
                <Input
                  keyboardType="number-pad"
                  value={String(payday)}
                  onChangeText={(text) => setPayday(Number.parseInt(text, 10) || 1)}
                  color="$color"
                  focusStyle={{ borderColor: '$borderColorFocus' }}
                />
              </YStack>

              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  DANA DARURAT MINIMUM
                </Text>
                <RupiahInput value={minimumBuffer} onChangeValue={setMinimumBuffer} />
              </YStack>

              <XStack alignItems="center" gap="$3">
                <Checkbox
                  id="ai-consent"
                  checked={aiConsent}
                  onCheckedChange={(value) => setAiConsent(value === true)}
                  backgroundColor={aiConsent ? '$primary' : undefined}
                  borderColor="$kulit"
                >
                  <Checkbox.Indicator>
                    <Check color="$primaryText" />
                  </Checkbox.Indicator>
                </Checkbox>
                <Text fontFamily="$body" fontSize="$2" color="$color" flexShrink={1}>
                  Izinkan SakuPlan memakai AI untuk menjelaskan rekomendasi anggaran
                </Text>
              </XStack>

              <Button
                backgroundColor="$primary"
                color="$primaryText"
                disabled={displayName.trim().length === 0 || updateProfile.isPending}
                onPress={handleSaveProfile}
              >
                {updateProfile.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </PocketCard>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Strip the inline profile card out of `more.tsx` and add navigation rows**

Replace the whole file's contents with:

```tsx
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { ChevronRight, PiggyBank, Receipt, User, Wallet } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../../src/components/PocketCard'
import { useCurrentUser } from '../../../src/auth/useCurrentUser'
import { useLogout } from '../../../src/auth/useLogout'
import { useLogoutAll } from '../../../src/auth/useLogoutAll'
import { useExportData } from '../../../src/profile/useExportData'

// Placeholder: NOTIF-001..004 have zero backend support (confirmed via
// docs/P0_GAP_ANALYSIS.md) — no preferences model, no delivery, nothing to
// wire this row up to yet.
function handleNotifications() {}

// Placeholder: USER-004 (account deletion) has zero backend support — the
// `deletion_pending` status exists in the domain/schema but no endpoint,
// handler, or job ever sets or drives it.
function handleDeleteAccount() {}

function NavRow({
  icon,
  label,
  onPress,
}: {
  icon: ReactNode
  label: string
  onPress: () => void
}) {
  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      paddingVertical="$3"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
    >
      <XStack alignItems="center" gap="$3">
        {icon}
        <Text fontFamily="$body" fontSize="$3" color="$color">
          {label}
        </Text>
      </XStack>
      <ChevronRight size={16} color="$kulit" />
    </XStack>
  )
}

export default function MoreScreen() {
  const router = useRouter()
  const { data: user, isLoading } = useCurrentUser()
  const logout = useLogout()
  const logoutAll = useLogoutAll()
  const exportData = useExportData()

  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)

  const userInitial = user?.display_name?.trim()?.[0]?.toUpperCase() ?? '?'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$4">
          <Text fontFamily="$heading" fontSize="$4" color="$color">
            Lainnya
          </Text>

          {isLoading || !user ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : (
            <>
              <PocketCard>
                <XStack alignItems="center" gap="$3">
                  <YStack
                    width={44}
                    height={44}
                    borderRadius={22}
                    borderWidth={1.5}
                    borderColor="$primary"
                    backgroundColor="$white"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontFamily="$mono" fontSize="$3" color="$primary">
                      {userInitial}
                    </Text>
                  </YStack>
                  <YStack>
                    <Text fontFamily="$body" fontSize="$3" color="$color">
                      {user.display_name}
                    </Text>
                    <Text fontFamily="$body" fontSize="$2" color="$kulit">
                      {user.email}
                    </Text>
                  </YStack>
                </XStack>
              </PocketCard>

              <YStack>
                <Text fontFamily="$body" fontSize="$1" color="$kulit" marginBottom="$1">
                  AKUN
                </Text>
                <NavRow
                  icon={<User size={16} color="$kulit" />}
                  label="Profil & preferensi"
                  onPress={() => router.push('/(app)/profile')}
                />
                <NavRow
                  icon={<Wallet size={16} color="$kulit" />}
                  label="Akun & saldo"
                  onPress={() => router.push('/(app)/accounts')}
                />
              </YStack>

              <YStack>
                <Text fontFamily="$body" fontSize="$1" color="$kulit" marginBottom="$1">
                  PERENCANAAN
                </Text>
                <NavRow
                  icon={<Receipt size={16} color="$kulit" />}
                  label="Tagihan berulang"
                  onPress={() => router.push('/(app)/bills')}
                />
                <NavRow
                  icon={<PiggyBank size={16} color="$kulit" />}
                  label="Target tabungan"
                  onPress={() => router.push('/(app)/goals')}
                />
              </YStack>

              <PocketCard>
                <Text fontFamily="$heading" fontSize="$4" color="$color">
                  Akun
                </Text>

                <Button
                  backgroundColor="$white"
                  borderWidth={1.5}
                  borderColor="$borderColor"
                  color="$color"
                  disabled={exportData.isPending}
                  onPress={() => exportData.mutate()}
                >
                  {exportData.isPending ? 'Menyiapkan ekspor...' : 'Unduh Data Saya'}
                </Button>
                {exportData.isError ? (
                  <Text fontFamily="$body" fontSize="$1" color="$danger">
                    Gagal mengekspor data. Coba lagi.
                  </Text>
                ) : null}

                <Button
                  backgroundColor="$white"
                  borderWidth={1.5}
                  borderColor="$borderColor"
                  color="$color"
                  disabled={logout.isPending}
                  onPress={() => logout.mutate()}
                >
                  {logout.isPending ? 'Keluar...' : 'Keluar'}
                </Button>

                {confirmLogoutAll ? (
                  <YStack gap="$2">
                    <Text fontFamily="$body" fontSize="$2" color="$kulit">
                      Yakin ingin keluar dari semua perangkat?
                    </Text>
                    <XStack gap="$2">
                      <Button
                        flex={1}
                        backgroundColor="$danger"
                        color="$white"
                        disabled={logoutAll.isPending}
                        onPress={() => logoutAll.mutate()}
                      >
                        {logoutAll.isPending ? 'Memproses...' : 'Ya, Keluar'}
                      </Button>
                      <Button flex={1} backgroundColor="$white" borderWidth={1.5} borderColor="$borderColor" color="$color" onPress={() => setConfirmLogoutAll(false)}>
                        Batal
                      </Button>
                    </XStack>
                  </YStack>
                ) : (
                  <Text
                    fontFamily="$body"
                    fontSize="$2"
                    color="$danger"
                    textDecorationLine="underline"
                    onPress={() => setConfirmLogoutAll(true)}
                  >
                    Keluar dari semua perangkat
                  </Text>
                )}
              </PocketCard>

              <PocketCard tone="muted">
                <Text fontFamily="$heading" fontSize="$4" color="$color">
                  Segera Hadir
                </Text>
                <XStack justifyContent="space-between" onPress={handleNotifications}>
                  <Text fontFamily="$body" fontSize="$2" color="$kulit">
                    Notifikasi
                  </Text>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    Segera hadir
                  </Text>
                </XStack>
                <XStack justifyContent="space-between" onPress={handleDeleteAccount}>
                  <Text fontFamily="$body" fontSize="$2" color="$danger">
                    Hapus Akun
                  </Text>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    Segera hadir
                  </Text>
                </XStack>
              </PocketCard>
            </>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
```

`useUpdateProfile` is no longer imported by `more.tsx` (moved to
`profile.tsx`) — confirm no unused-import lint error results.

- [ ] **Step 3: Typecheck and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint "app/(app)/profile.tsx" "app/(app)/(tabs)/more.tsx"`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
cd mobile && git add "app/(app)/profile.tsx" "app/(app)/(tabs)/more.tsx"
git commit -m "feat(mobile): extract Profile screen, wire More navigation rows"
```

---

### Task 11: Wire Home's Safe-to-Spend card and goal tile to the new screens

**Files:**
- Modify: `mobile/app/(app)/(tabs)/home.tsx`

**Interfaces:** no new hooks — purely wraps two existing blocks in
pressable navigation.

- [ ] **Step 1: Add `useRouter` and make the two tiles pressable**

In `home.tsx`, add the import:

```tsx
import { useRouter } from 'expo-router'
```

Inside `HomeScreen`, add `const router = useRouter()` alongside the
existing `useCurrentUser`/`useDashboard` calls.

Change the safe-to-spend `PocketCard` (the one showing "AMAN DIBELANJAKAN
HARI INI") to add `onPress={() => router.push('/(app)/safe-to-spend')}
pressStyle={{ opacity: 0.85 }}`.

Change the goal-progress `PocketCard` (the one showing `TARGET TABUNGAN ·
{name}`) to add `onPress={() => router.push('/(app)/goals')}
pressStyle={{ opacity: 0.85 }}`.

- [ ] **Step 2: Typecheck and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint "app/(app)/(tabs)/home.tsx"`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "app/(app)/(tabs)/home.tsx"
git commit -m "feat(mobile): wire Home's STS card and goal tile to new screens"
```

---

## Task Group C — Onboarding

### Task 12: Onboarding screen — steps 0–2 (name/payday, income, categories)

**Files:**
- Create: `mobile/app/onboarding.tsx`

**Interfaces:**
- Consumes: `useCategories('expense')` (existing), `RupiahInput`,
  `formatRupiah`.
- Produces: local component state (`step`, `name`, `payday`, `income`,
  `allocations: Record<string, number>`) that Task 13 extends with the
  step-3 summary and finish handler.

- [ ] **Step 1: Write the wizard shell and steps 0–2**

```tsx
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { useCategories } from '../src/categories/useCategories'
import { RupiahInput } from '../src/components/RupiahInput'
import { formatRupiah } from '../src/format/money'

const STEP_LABELS = ['1', '2', '3', '4']

export default function OnboardingScreen() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [payday, setPayday] = useState('25')
  const [income, setIncome] = useState(0)
  const [allocations, setAllocations] = useState<Record<string, number>>({})

  const expenseCategories = useCategories('expense')

  const allocatedTotal = Object.values(allocations).reduce((sum, value) => sum + value, 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top', 'bottom']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$6" gap="$5" flex={1}>
          <YStack gap="$1">
            <Text fontFamily="$heading" fontSize="$5" color="$primary">
              SakuPlan
            </Text>
            <Text fontFamily="$mono" fontSize="$1" color="$kulit" letterSpacing={1}>
              {`LANGKAH ${STEP_LABELS[step]} DARI 4`}
            </Text>
          </YStack>

          {step === 0 ? (
            <YStack flex={1} gap="$4">
              <YStack gap="$1">
                <Text fontFamily="$heading" fontSize="$5" color="$color">
                  Halo. Siapa nama kamu?
                </Text>
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  Dan kapan tanggal gajianmu setiap bulan?
                </Text>
              </YStack>
              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  NAMA
                </Text>
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="Nama kamu"
                  color="$color"
                  focusStyle={{ borderColor: '$borderColorFocus' }}
                />
              </YStack>
              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  TANGGAL GAJIAN
                </Text>
                <Input
                  keyboardType="number-pad"
                  value={payday}
                  onChangeText={(text) => setPayday(text.replace(/[^0-9]/g, ''))}
                  placeholder="25"
                  color="$color"
                  focusStyle={{ borderColor: '$borderColorFocus' }}
                />
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  {`Setiap tanggal ${payday || '-'} tiap bulan.`}
                </Text>
              </YStack>
            </YStack>
          ) : null}

          {step === 1 ? (
            <YStack flex={1} gap="$4">
              <YStack gap="$1">
                <Text fontFamily="$heading" fontSize="$5" color="$color">
                  Berapa penghasilan bulananmu?
                </Text>
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  Ini dasar perhitungan aman-belanja kamu.
                </Text>
              </YStack>
              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  PENGHASILAN PER BULAN
                </Text>
                <RupiahInput value={income} onChangeValue={setIncome} />
              </YStack>
            </YStack>
          ) : null}

          {step === 2 ? (
            <YStack flex={1} gap="$4">
              <YStack gap="$1">
                <Text fontFamily="$heading" fontSize="$5" color="$color">
                  Buat anggaran pertamamu
                </Text>
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  Alokasikan penghasilanmu ke kategori utama. Bisa diubah kapan saja nanti.
                </Text>
              </YStack>
              {expenseCategories.isLoading ? (
                <Spinner size="small" color="$primary" />
              ) : (
                <YStack gap="$2">
                  {(expenseCategories.data ?? []).map((category) => (
                    <XStack
                      key={category.id}
                      justifyContent="space-between"
                      alignItems="center"
                      borderWidth={1.5}
                      borderColor="$borderColor"
                      borderRadius="$2"
                      padding="$3"
                    >
                      <Text fontFamily="$body" fontSize="$2" color="$color">
                        {category.name}
                      </Text>
                      <RupiahInput
                        value={allocations[category.id] ?? 0}
                        onChangeValue={(value) =>
                          setAllocations((prev) => ({ ...prev, [category.id]: value }))
                        }
                        width={140}
                        textAlign="right"
                      />
                    </XStack>
                  ))}
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    {`Total dialokasikan: ${formatRupiah(allocatedTotal)}`}
                  </Text>
                </YStack>
              )}
            </YStack>
          ) : null}

          <XStack gap="$2" marginTop="$4">
            {step > 0 ? (
              <Button
                flex={1}
                backgroundColor="transparent"
                borderWidth={1.5}
                borderColor="$kulit"
                color="$color"
                onPress={() => setStep((current) => Math.max(0, current - 1))}
              >
                Kembali
              </Button>
            ) : null}
            <Button
              flex={2}
              backgroundColor="$primary"
              color="$primaryText"
              onPress={() => setStep((current) => Math.min(3, current + 1))}
            >
              Lanjut
            </Button>
          </XStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
```

Step 3 (summary + finish) is deliberately not in this task — Task 13
replaces the final `Lanjut` button with the real step-3 UI and submit
handler, since it needs two new mutation calls this task doesn't touch.

- [ ] **Step 2: Typecheck and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint app/onboarding.tsx`
Expected: both PASS (step 3 renders nothing yet, which is fine — it's
finished in the next task).

- [ ] **Step 3: Commit**

```bash
cd mobile && git add app/onboarding.tsx
git commit -m "feat(mobile): add onboarding wizard steps 0-2"
```

---

### Task 13: Onboarding step 3 (summary) and finish handler

**Files:**
- Modify: `mobile/app/onboarding.tsx`

**Interfaces:**
- Consumes: `useUpdateProfile()` (existing), `useCreateAndActivateBudget()`
  (existing), `startOfMonth`/`endOfMonth`/`toRFC3339` (existing,
  `src/format/date.ts`), `ApiError` (existing).

- [ ] **Step 1: Add step 3, the finish handler, and wire the footer buttons**

Add these imports to `app/onboarding.tsx`:

```tsx
import { useRouter } from 'expo-router'
import { useUpdateProfile } from '../src/profile/useUpdateProfile'
import { useCreateAndActivateBudget } from '../src/budgets/useCreateAndActivateBudget'
import { startOfMonth, endOfMonth, toRFC3339 } from '../src/format/date'
```

Inside `OnboardingScreen`, add:

```tsx
const router = useRouter()
const updateProfile = useUpdateProfile()
const createAndActivateBudget = useCreateAndActivateBudget()

function handleFinish() {
  const paydayNumber = Math.min(31, Math.max(1, Number.parseInt(payday, 10) || 1))
  updateProfile.mutate(
    {
      display_name: name.trim(),
      currency: 'IDR',
      timezone: 'Asia/Jakarta',
      payday: paydayNumber,
      minimum_buffer: 0,
      ai_consent: false,
    },
    {
      onSuccess: () => {
        const now = new Date()
        const nonZeroAllocations = Object.fromEntries(
          Object.entries(allocations).filter(([, value]) => value > 0)
        )
        createAndActivateBudget.mutate(
          {
            start_date: toRFC3339(startOfMonth(now)),
            end_date: toRFC3339(endOfMonth(now)),
            expected_income: income,
            savings_commitment: 0,
            minimum_buffer: 0,
            source: 'manual',
            allocations: nonZeroAllocations,
          },
          {
            onSuccess: () => router.replace('/(app)/(tabs)/home'),
          }
        )
      },
    }
  )
}

const isFinishing = updateProfile.isPending || createAndActivateBudget.isPending
const finishError = updateProfile.isError || createAndActivateBudget.isError
```

`createAndActivateBudget`'s existing implementation (already shipped —
see `src/budgets/useCreateAndActivateBudget.ts`) always throws `ApiError`
on failure, including the 409 overlapping-period case, so `isError` alone
is sufficient here — no need to branch on error type, and no need to
import `ApiError` into this file.

Note: `currency`/`timezone` are hardcoded to the app's only supported
values (`IDR`/`Asia/Jakarta`, matching `UpdateProfileRequest`'s existing
required fields and this app's IDR-only scope, same rationale as
`AddAccountCard`'s hardcoded `currency: 'IDR'`) — the onboarding UI never
exposes them, matching the prototype.

Add the step-3 block, right after the `step === 2` block:

```tsx
{step === 3 ? (
  <YStack flex={1} gap="$4">
    <YStack gap="$1">
      <Text fontFamily="$heading" fontSize="$5" color="$color">
        {`Semua siap, ${name || 'kamu'}.`}
      </Text>
      <Text fontFamily="$body" fontSize="$2" color="$kulit">
        Berikut ringkasan sebelum kamu mulai.
      </Text>
    </YStack>
    <YStack borderWidth={1.5} borderColor="$borderColor" borderRadius="$2" padding="$4" gap="$3">
      <XStack justifyContent="space-between">
        <Text fontFamily="$body" fontSize="$2" color="$kulit">
          Penghasilan/bulan
        </Text>
        <Text fontFamily="$mono" fontSize="$2" color="$color">
          {formatRupiah(income)}
        </Text>
      </XStack>
      <XStack justifyContent="space-between">
        <Text fontFamily="$body" fontSize="$2" color="$kulit">
          Tanggal gajian
        </Text>
        <Text fontFamily="$mono" fontSize="$2" color="$color">
          {payday}
        </Text>
      </XStack>
      <XStack justifyContent="space-between">
        <Text fontFamily="$body" fontSize="$2" color="$kulit">
          Total anggaran
        </Text>
        <Text fontFamily="$mono" fontSize="$2" color="$color">
          {formatRupiah(allocatedTotal)}
        </Text>
      </XStack>
    </YStack>
    {finishError ? (
      <Text fontFamily="$body" fontSize="$2" color="$danger">
        Gagal menyiapkan akunmu. Coba lagi.
      </Text>
    ) : null}
  </YStack>
) : null}
```

Replace the footer `XStack` (the one with `Kembali`/`Lanjut`) so the last
step shows a finish button instead:

```tsx
<XStack gap="$2" marginTop="$4">
  {step > 0 ? (
    <Button
      flex={1}
      backgroundColor="transparent"
      borderWidth={1.5}
      borderColor="$kulit"
      color="$color"
      onPress={() => setStep((current) => Math.max(0, current - 1))}
    >
      Kembali
    </Button>
  ) : null}
  {step < 3 ? (
    <Button
      flex={2}
      backgroundColor="$primary"
      color="$primaryText"
      onPress={() => setStep((current) => Math.min(3, current + 1))}
    >
      Lanjut
    </Button>
  ) : (
    <Button
      flex={2}
      backgroundColor="$primary"
      color="$primaryText"
      disabled={isFinishing}
      opacity={isFinishing ? 0.5 : 1}
      onPress={handleFinish}
    >
      {isFinishing ? 'Menyiapkan...' : 'Mulai Pakai SakuPlan'}
    </Button>
  )}
</XStack>
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint app/onboarding.tsx`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add app/onboarding.tsx
git commit -m "feat(mobile): add onboarding step 3 summary and finish handler"
```

---

### Task 14: Route registration to onboarding after a successful register

**Files:**
- Modify: `mobile/app/(auth)/register.tsx`

**Interfaces:** no new hooks — adds a `router.replace` call to the
existing `register.mutate(...)` call site.

- [ ] **Step 1: Navigate to onboarding on success**

Add the import:

```tsx
import { useRouter } from 'expo-router'
```

Inside `RegisterScreen`, add `const router = useRouter()` alongside the
existing `useState`/`useRegister` calls.

Change the submit button's `onPress` from:

```tsx
onPress={() => register.mutate({ email, password, displayName })}
```

to:

```tsx
onPress={() =>
  register.mutate(
    { email, password, displayName },
    { onSuccess: () => router.replace('/onboarding') }
  )
}
```

`useRegister`'s own `onSuccess` (which sets the Zustand session) still
runs first — react-query calls the hook-level `onSuccess` before the
per-call `onSuccess` passed to `.mutate()`. `(auth)/_layout.tsx`'s
`accessToken`-based `<Redirect href="/(app)/home">` will also want to
fire once the store updates, but this explicit `router.replace` runs
immediately after and is the most recent navigation action, so it wins —
the user lands on `/onboarding`, not `/home`. Existing users logging in
via `login.tsx` are unaffected (that screen's `onPress` isn't touched).

- [ ] **Step 2: Typecheck and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint "app/(auth)/register.tsx"`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "app/(auth)/register.tsx"
git commit -m "feat(mobile): route fresh registrations through onboarding"
```

---

## Task Group D — Verification

### Task 15: Full verification pass

**Files:**
- Modify: `docs/PROGRESS.md`

**Interfaces:** none — verification and documentation only.

- [ ] **Step 1: Full test suite**

Run: `cd mobile && npx jest`
Expected: PASS, including the 5 new `nextBillOccurrence` tests alongside
every pre-existing suite (should read as N+5 tests where N is Phase 2's
final count of 53).

- [ ] **Step 2: Full typecheck and lint**

Run: `cd mobile && npx tsc --noEmit && npx expo lint`
Expected: both PASS, 0 errors (pre-existing warnings noted in Phase 2's
`PROGRESS.md` entry are acceptable if still present; no new warnings from
files this plan touched).

- [ ] **Step 3: Manual Expo walkthrough**

Boot the app (`npx expo start --android` or `--ios`, whichever this
environment supports) and, on a **fresh registration** (new email), walk:
register → onboarding (all 4 steps, entering a name/payday/income and at
least one category allocation) → confirm landing on Home → tap the
safe-to-spend hero card → confirm the breakdown screen renders real
numbers and `Kembali` returns to Home → tap the goal tile (if the
onboarding budget produced one; otherwise skip) → More → Profil &
preferensi (confirm the moved-out form still saves) → Akun & saldo
(confirm the account created during registration/earlier testing shows
with a real balance) → Tagihan berulang (confirm empty-state copy if no
bills exist yet, since this phase adds no bill-creation UI) → Target
tabungan. Capture screenshots where the emulator/simulator cooperates;
if `adb`/`xcrun` access is unavailable in this environment (as it was for
parts of Phase 1 and Phase 2 per their `PROGRESS.md` entries), document
that gap explicitly rather than claiming an unverified walkthrough passed.

- [ ] **Step 4: Update `docs/PROGRESS.md`**

Append a new entry (following the exact structure of the existing
2026-08-07 Phase 2 entry) documenting: requirement IDs (none — design/UI
implementation of this plan), files changed (list every file from Tasks
2–14), database migrations (none), commands run and their results (Steps
1–3 above, verbatim), and deferred/not verified (the manual-walkthrough
gaps from Step 3, if any; explicitly restate that Notifications, AI
recommendations, and Privacy/session-management/account-deletion remain
out of scope pending their own backend phases).

- [ ] **Step 5: Commit**

```bash
git add docs/PROGRESS.md
git commit -m "docs: record Phase 3 dc-prototype implementation progress"
```
