# SakuPlan.dc.html Phase 2 — Transactions, Budgets, Reports, More Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four `ComingSoonScreen` placeholder tabs (Transactions,
Budgets, Reports, More) added in Phase 1 with real screens wired to the
already-fully-implemented Go backend (`api/openapi/openapi.yaml`). No backend
changes are in scope.

**Architecture:** Each screen gets its own small set of `useQuery`/
`useMutation` hooks under `src/<domain>/`, following the exact
`useDashboard`/`useCurrentUser`/`useLogout` pattern from Phase 1 (thin
wrappers around `api` from `src/api/client.ts`, no direct token handling).
Screens are assembled in `app/(app)/(tabs)/*.tsx` following `home.tsx`'s
structural template (`SafeAreaView(edges=['top'])` → `ScrollView` → `YStack
padding="$5" gap="$4"`). A small set of new pure helpers (money-input
parsing, date formatting, idempotency-key generation, budget math, chart
data transforms) get unit tests, matching the `formatRupiah`/`billUrgency`
convention. Reports gets its own charting library —
`react-native-gifted-charts` — installed alongside a **hard, verified
runtime dependency it needs but doesn't declare cleanly**: `expo-linear-gradient`
(see Task 21, this is not optional).

**Tech Stack additions:** `react-native-gifted-charts` (`gifted-charts-core`
comes along as its transitive dependency), `expo-linear-gradient`. No other
new packages — `Share` (transaction data export) and cursor pagination
(`useInfiniteQuery`) both come from libraries already installed
(`react-native` core, `@tanstack/react-query`).

## Global Constraints

- Bahasa Indonesia UI copy throughout, informal "kamu" register, matching
  the tone already established in Login/Register/Home. Every user-facing
  string in this plan is written out verbatim — no "TODO: copy" placeholders.
- All `Money` fields are already integer minor units server-side (IDR has
  zero decimal places) — never divide or multiply by 100. Every money value
  rendered goes through `formatRupiah`; every money value collected from a
  text input goes through `parseRupiahInput` (Task 3).
- Every mutation that requires an `Idempotency-Key` header
  (`createTransaction`, `reverseTransaction`; NOT `contributeToGoal` since
  Goals are out of scope this phase) uses `generateIdempotencyKey()` (Task
  2) called **fresh inside the `mutationFn`**, so every `.mutate()` call —
  including a manual retry after a failure — gets a new key. This
  deliberately means a 409 idempotency conflict is never silently retried
  with the same key; the user must explicitly resubmit, which naturally
  mints a new key.
- 409 responses (idempotency conflicts, overlapping budget periods) are
  surfaced as an inline `$danger` message with Indonesian copy — never an
  uncaught throw, never a silent auto-retry. This requires a small shared
  `ApiError` class (Task 2) that preserves the HTTP status code through
  `useMutation`'s `error`, since `openapi-fetch`'s `error` field alone loses
  the distinction between "409" and "network failure".
- No full Accounts management screen this phase (no list/archive/balance
  UI) — only the minimal inline create-account form from Phase requirements
  (Task 9), consumed by Transactions' empty state.
- No Budget edit/list screens — there is no `PUT`/`GET /v1/budgets` (plural)
  endpoint. Once a budget is active, the mobile UI only ever reads it
  (`GET /v1/budgets/active`); creation is compressed into a single
  create-then-activate action (Task 18) specifically to avoid ever leaving
  an un-activated, unreachable draft budget behind (there is no "list
  drafts" endpoint to recover it from if the user backs out mid-flow).
- No Bills/Goals screens this phase — out of scope per the task brief
  (bills/goals only appear indirectly via `Dashboard`, already wired in
  Phase 1).
- Account deletion (USER-004) and notification preferences (NOTIF-001..004)
  have zero backend support (confirmed via `docs/P0_GAP_ANALYSIS.md` and a
  full read of `openapi.yaml`) — they render as inert rows in More (Task
  26), each with a one-line comment explaining why, matching Phase 1's
  convention for the inert Google-auth buttons.
- Run `npx tsc --noEmit` and `npx eslint <changed files>` after every task
  that touches `.tsx`/`.ts` files, from the `mobile/` directory.
- Presentational-only steps don't get new tests; steps introducing real
  logic do (money/date parsing, idempotency key generation, budget math,
  chart data transforms, account-type/transaction-type/risk-level label
  maps) — this phase has substantially more pure logic than Phase 1, so
  Task Group A is larger than Phase 1's equivalent.

---

## Task Group A — Shared money/date/API utilities

### Task 1: Verify generated API types are current

**Files:** none (verification only).

**Interfaces:** confirms `mobile/src/api/generated/types.ts` already includes
every operation this plan uses (`listAccounts`, `createAccount`,
`listCategories`, `listTransactions`, `createTransaction`,
`reverseTransaction`, `createBudgetDraft`, `activateBudget`,
`getActiveBudget`, `getSafeToSpend`, `createBudgetRecommendation`,
`getCashFlowReport`, `updateCurrentUser`, `logoutAll`, `createExport`) before
any code in this plan depends on them.

- [ ] **Step 1: Regenerate and diff**

Run:
```bash
cd mobile && npm run generate:api && git diff --stat src/api/generated/types.ts
```
Expected: no output from `git diff --stat` (the file is byte-identical to
what's already committed). If there IS a diff, **stop** — it means
`openapi.yaml` and the committed generated types have drifted apart, which
invalidates the type assumptions the rest of this plan is built on. Escalate
rather than silently continuing.

- [ ] **Step 2: No commit needed** (no working-tree changes expected from
Step 1).

---

### Task 2: Idempotency key generator + typed `ApiError`

**Files:**
- Create: `mobile/src/api/idempotencyKey.ts`
- Test: `mobile/src/api/idempotencyKey.test.ts`
- Create: `mobile/src/api/errors.ts`
- Test: `mobile/src/api/errors.test.ts`

**Interfaces:**
- Produces: `generateIdempotencyKey(): string` — 8–128 chars (the
  `Idempotency-Key` header bound per `openapi.yaml`), unique per call.
  Consumed by Task 13 (`useCreateTransaction`/`useReverseTransaction`) and
  Task 18 (`useCreateAndActivateBudget` — activation itself has no
  idempotency header, but this file is a natural place to keep the one
  helper both transaction mutations need).
- Produces: `class ApiError extends Error { status: number }` — thrown by
  every mutation hook in this plan in place of a bare `Error`, so
  components can distinguish "409 conflict" from "other failure" via
  `error instanceof ApiError && error.status === 409`.

No native crypto primitive is available here: this project has no
`expo-crypto` and Hermes (the JS engine RN 0.86/Expo SDK 57 ships) has no
built-in Web Crypto API, so `crypto.randomUUID()` does not exist at runtime
— confirmed by grepping `node_modules/react-native` and the installed
`node_modules/@expo` packages for any `randomUUID`/crypto polyfill; none
exists, and none of `expo-crypto`/`react-native-get-random-values` are
installed. Rather than adding a new dependency for this, `generateIdempotencyKey`
uses `Date.now()` + an in-module counter + `Math.random()` — the API only
needs *uniqueness* (idempotency keys are scoped per authenticated user), not
cryptographic unguessability.

- [ ] **Step 1: Write the failing tests**

```ts
// mobile/src/api/idempotencyKey.test.ts
import { generateIdempotencyKey } from './idempotencyKey'

describe('generateIdempotencyKey', () => {
  it('generates a string within the 8-128 char bound required by the API', () => {
    const key = generateIdempotencyKey()
    expect(key.length).toBeGreaterThanOrEqual(8)
    expect(key.length).toBeLessThanOrEqual(128)
  })

  it('generates a different key on every call', () => {
    const keys = new Set(Array.from({ length: 20 }, () => generateIdempotencyKey()))
    expect(keys.size).toBe(20)
  })
})
```

```ts
// mobile/src/api/errors.test.ts
import { ApiError } from './errors'

describe('ApiError', () => {
  it('carries the HTTP status code alongside the message', () => {
    const err = new ApiError('failed_to_create_transaction', 409)
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('failed_to_create_transaction')
    expect(err.status).toBe(409)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest src/api/idempotencyKey.test.ts src/api/errors.test.ts`
Expected: FAIL — `Cannot find module './idempotencyKey'` / `'./errors'`.

- [ ] **Step 3: Implement**

```ts
// mobile/src/api/idempotencyKey.ts
let counter = 0

// Generates a sufficiently unique key for the Idempotency-Key header
// (8-128 chars per openapi.yaml). Not a cryptographic UUID — Hermes has no
// built-in Web Crypto API and this project has no expo-crypto/
// react-native-get-random-values dependency — but uniqueness (not
// unguessability) is all the idempotency contract requires, since keys are
// scoped to the authenticated user's own requests.
export function generateIdempotencyKey(): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER
  const random = Math.random().toString(36).slice(2)
  return `${Date.now().toString(36)}-${counter.toString(36)}-${random}`
}
```

```ts
// mobile/src/api/errors.ts

// Thrown by mutation hooks in place of a bare Error so components can
// branch on HTTP status (e.g. 409 idempotency/overlap conflicts) via
// `error instanceof ApiError && error.status === 409` — openapi-fetch's
// `{ data, error, response }` triple already exposes `response.status`,
// this class just carries it through react-query's `mutation.error`.
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest src/api/idempotencyKey.test.ts src/api/errors.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/api/idempotencyKey.ts src/api/errors.ts`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
cd mobile && git add src/api/idempotencyKey.ts src/api/idempotencyKey.test.ts src/api/errors.ts src/api/errors.test.ts
git commit -m "feat(mobile): add idempotency key generator and typed ApiError"
```

---

### Task 3: Rupiah input parsing + `RupiahInput` component

**Files:**
- Modify: `mobile/src/format/money.ts`
- Modify: `mobile/src/format/money.test.ts`
- Create: `mobile/src/components/RupiahInput.tsx`

**Interfaces:**
- Produces: `parseRupiahInput(raw: string): number` — strips everything but
  digits and parses to an integer (minor units), e.g.
  `parseRupiahInput('150.000')` → `150000`, `parseRupiahInput('Rp 1.234')`
  → `1234`, `parseRupiahInput('')` → `0`. Consumed by `RupiahInput` below,
  and by every money-entry field in Tasks 9, 15, 20, 24.
- Produces: `RupiahInput` — a controlled Tamagui `Input` taking
  `value: number` (minor units) / `onChangeValue: (minorUnits: number) => void`,
  displaying the live-formatted digits (via `formatRupiah`, with the `Rp`
  prefix stripped since the field itself is the amount, not a label).
  Presentational only — no test, matching the codebase's convention that
  only the underlying pure functions (`formatRupiah`, `parseRupiahInput`)
  get unit tests.

- [ ] **Step 1: Add failing tests for `parseRupiahInput`**

Append to `mobile/src/format/money.test.ts`:

```ts
import { formatRupiah, parseRupiahInput } from './money'

describe('parseRupiahInput', () => {
  it('parses a thousands-separated string to minor units', () => {
    expect(parseRupiahInput('150.000')).toBe(150000)
  })

  it('ignores a leading Rp prefix and spaces', () => {
    expect(parseRupiahInput('Rp 1.234.567')).toBe(1234567)
  })

  it('returns 0 for an empty string', () => {
    expect(parseRupiahInput('')).toBe(0)
  })

  it('returns 0 for a string with no digits', () => {
    expect(parseRupiahInput('abc')).toBe(0)
  })
})
```

(Change the existing `import { formatRupiah } from './money'` line to the
combined import shown above.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/format/money.test.ts`
Expected: FAIL — `parseRupiahInput` is not exported.

- [ ] **Step 3: Implement**

Append to `mobile/src/format/money.ts`:

```ts
export function parseRupiahInput(raw: string): number {
  const digitsOnly = raw.replace(/[^0-9]/g, '')
  if (digitsOnly === '') return 0
  return Number.parseInt(digitsOnly, 10)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/format/money.test.ts`
Expected: PASS, 8/8 (4 existing `formatRupiah` + 4 new `parseRupiahInput`).

- [ ] **Step 5: Implement `RupiahInput`**

```tsx
// mobile/src/components/RupiahInput.tsx
import { Input, type InputProps } from 'tamagui'
import { formatRupiah, parseRupiahInput } from '../format/money'

interface RupiahInputProps extends Omit<InputProps, 'value' | 'onChangeText'> {
  value: number
  onChangeValue: (minorUnits: number) => void
}

export function RupiahInput({ value, onChangeValue, ...rest }: RupiahInputProps) {
  return (
    <Input
      keyboardType="numeric"
      value={value === 0 ? '' : formatRupiah(value).replace('Rp', '')}
      onChangeText={(text) => onChangeValue(parseRupiahInput(text))}
      placeholder="0"
      color="$color"
      focusStyle={{ borderColor: '$borderColorFocus' }}
      {...rest}
    />
  )
}
```

- [ ] **Step 6: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/format/money.ts src/components/RupiahInput.tsx`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
cd mobile && git add src/format/money.ts src/format/money.test.ts src/components/RupiahInput.tsx
git commit -m "feat(mobile): add parseRupiahInput and RupiahInput component"
```

---

### Task 4: Date helpers

**Files:**
- Create: `mobile/src/format/date.ts`
- Test: `mobile/src/format/date.test.ts`

**Interfaces:**
- Produces: `toRFC3339(date: Date): string`, `formatDateID(iso: string): string`
  (e.g. `"5 Agu 2026"`), `formatMonthYearID(date: Date): string` (e.g.
  `"Agustus 2026"`), `startOfMonth(date: Date): Date`,
  `endOfMonth(date: Date): Date`, `addMonths(date: Date, months: number): Date`,
  `daysAgo(date: Date, days: number): Date`, `toDateOnly(date: Date): string`
  (formats the Date's LOCAL components as `YYYY-MM-DD`, no UTC conversion —
  added as a fix-round addendum after code review caught that
  `toRFC3339(...).slice(0, 10)` silently shifts the calendar day backward
  in this app's fixed `Asia/Jakarta` (UTC+7) timezone whenever the source
  `Date` is local midnight, since `toISOString()` converts to UTC before
  the caller can slice out a date-only substring; `toDateOnly` reads the
  Date's own `getFullYear`/`getMonth`/`getDate` instead, so it is immune to
  that shift). Consumed by Task 15 (transaction date quick-toggle), Task 20
  (budget period defaults — via `toRFC3339`, not `toDateOnly`: `CreateBudgetRequest`'s
  `start_date`/`end_date` are `date-time` fields where the full UTC instant
  is exactly what's wanted, not a sliced date-only string), Task 23
  (Reports month navigation — via `toDateOnly`, since `GET /v1/reports/cash-flow`'s
  `start`/`end` query params are `date`-only format), Task 14 (transaction
  list item date display, via `formatDateID`).

Transactions in this phase deliberately don't get a full date picker: no
date-picker library is installed (`@react-native-community/datetimepicker`
would need native linking and isn't Expo-Go-safe without a dev client), so
the fast-entry form (Task 15) only offers "Hari ini" / "Kemarin" — covering
the overwhelming majority of real entries — rather than building a
from-scratch calendar widget for an edge case.

- [ ] **Step 1: Write the failing tests**

```ts
// mobile/src/format/date.test.ts
import { addMonths, daysAgo, endOfMonth, formatDateID, formatMonthYearID, startOfMonth, toRFC3339 } from './date'

describe('toRFC3339', () => {
  it('renders an ISO 8601 UTC timestamp', () => {
    expect(toRFC3339(new Date('2026-08-05T00:00:00.000Z'))).toBe('2026-08-05T00:00:00.000Z')
  })
})

describe('formatDateID', () => {
  it('formats a date with an abbreviated Indonesian month', () => {
    expect(formatDateID('2026-08-05T00:00:00.000Z')).toBe('5 Agu 2026')
  })
})

describe('formatMonthYearID', () => {
  it('formats a full Indonesian month and year', () => {
    expect(formatMonthYearID(new Date('2026-08-05T00:00:00.000Z'))).toBe('Agustus 2026')
  })
})

describe('startOfMonth / endOfMonth', () => {
  it('returns the first calendar day of the month at midnight', () => {
    const start = startOfMonth(new Date(2026, 7, 15))
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(7)
    expect(start.getDate()).toBe(1)
  })

  it('returns the last calendar day of the month at midnight', () => {
    const end = endOfMonth(new Date(2026, 7, 15))
    expect(end.getMonth()).toBe(7)
    expect(end.getDate()).toBe(31)
  })
})

describe('addMonths', () => {
  it('shifts to the 1st of a month N months away', () => {
    const shifted = addMonths(new Date(2026, 7, 15), -1)
    expect(shifted.getMonth()).toBe(6)
    expect(shifted.getDate()).toBe(1)
  })
})

describe('daysAgo', () => {
  it('subtracts N days from the given date', () => {
    const yesterday = daysAgo(new Date(2026, 7, 5), 1)
    expect(yesterday.getDate()).toBe(4)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/format/date.test.ts`
Expected: FAIL — `Cannot find module './date'`.

- [ ] **Step 3: Implement**

```ts
// mobile/src/format/date.ts
export function toRFC3339(date: Date): string {
  return date.toISOString()
}

export function formatDateID(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatMonthYearID(date: Date): string {
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/format/date.test.ts`
Expected: PASS, 7/7.

- [ ] **Step 5: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/format/date.ts`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
cd mobile && git add src/format/date.ts src/format/date.test.ts
git commit -m "feat(mobile): add date formatting and month-range helpers"
```

---

### Task 5: Budget allocation math

**Files:**
- Create: `mobile/src/budgets/budgetMath.ts`
- Test: `mobile/src/budgets/budgetMath.test.ts`

**Interfaces:**
- Produces: `sumAllocations(allocations: Record<string, number>): number`,
  `computeUnallocated(expectedIncome: number, savingsCommitment: number, minimumBuffer: number, allocations: Record<string, number>): number`.
  Consumed by Task 20 (budget-creation wizard's "belum dialokasikan" banner).

- [ ] **Step 1: Write the failing tests**

```ts
// mobile/src/budgets/budgetMath.test.ts
import { computeUnallocated, sumAllocations } from './budgetMath'

describe('sumAllocations', () => {
  it('sums all values in the allocation map', () => {
    expect(sumAllocations({ a: 100000, b: 250000 })).toBe(350000)
  })

  it('returns 0 for an empty map', () => {
    expect(sumAllocations({})).toBe(0)
  })
})

describe('computeUnallocated', () => {
  it('subtracts savings, buffer, and allocations from expected income', () => {
    expect(computeUnallocated(5000000, 500000, 300000, { food: 1000000, transport: 500000 })).toBe(2700000)
  })

  it('goes negative when allocations exceed what is available', () => {
    expect(computeUnallocated(1000000, 0, 0, { food: 1500000 })).toBe(-500000)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/budgets/budgetMath.test.ts`
Expected: FAIL — `Cannot find module './budgetMath'`.

- [ ] **Step 3: Implement**

```ts
// mobile/src/budgets/budgetMath.ts
export function sumAllocations(allocations: Record<string, number>): number {
  return Object.values(allocations).reduce((sum, value) => sum + value, 0)
}

export function computeUnallocated(
  expectedIncome: number,
  savingsCommitment: number,
  minimumBuffer: number,
  allocations: Record<string, number>
): number {
  return expectedIncome - savingsCommitment - minimumBuffer - sumAllocations(allocations)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/budgets/budgetMath.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/budgets/budgetMath.ts`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
cd mobile && git add src/budgets/budgetMath.ts src/budgets/budgetMath.test.ts
git commit -m "feat(mobile): add budget allocation math helpers"
```

---

### Task 6: Cash-flow chart data transforms

**Files:**
- Create: `mobile/src/reports/chartData.ts`
- Test: `mobile/src/reports/chartData.test.ts`

**Interfaces:**
- Consumes: nothing new (plain object shapes matching
  `components['schemas']['CashFlowTrendPoint'/'CategorySpend'/'BudgetVsActualLine']`).
- Produces: `toTrendLines(trend): { income: {value,label}[]; expenses: {value,label}[] }`,
  `toCategoryBarData(categories, color, limit = 6): {value,label,frontColor}[]`
  (sorted desc, capped), `toBudgetVsActualBarData(lines, colors): {value,label?,frontColor,spacing}[]`
  (interleaved budgeted/actual pairs per category, for a grouped-bar
  layout). Field names (`value`, `label`, `frontColor`, `spacing`) are
  verified against `gifted-charts-core`'s actual `lineDataItem`/`barDataItem`
  types (see Task 21) so Task 23 can pass these straight into
  `<LineChart>`/`<BarChart>` `data` props with no further mapping. Consumed
  by Task 23 (Reports screen).

- [ ] **Step 1: Write the failing tests**

```ts
// mobile/src/reports/chartData.test.ts
import { toBudgetVsActualBarData, toCategoryBarData, toTrendLines } from './chartData'

describe('toTrendLines', () => {
  it('splits trend points into income and expense line-chart series with short Indonesian date labels', () => {
    const trend = [
      { bucket_start: '2026-08-01T00:00:00Z', income: 100000, expenses: 40000, net: 60000 },
      { bucket_start: '2026-08-02T00:00:00Z', income: 0, expenses: 20000, net: -20000 },
    ]
    const result = toTrendLines(trend)
    expect(result.income).toEqual([
      { value: 100000, label: '1 Agu' },
      { value: 0, label: '2 Agu' },
    ])
    expect(result.expenses).toEqual([
      { value: 40000, label: '1 Agu' },
      { value: 20000, label: '2 Agu' },
    ])
  })
})

describe('toCategoryBarData', () => {
  it('sorts descending by amount and caps to the limit', () => {
    const categories = [
      { category_id: 'a', name: 'Makanan', amount: 200000 },
      { category_id: 'b', name: 'Transport', amount: 500000 },
      { category_id: 'c', name: 'Hiburan', amount: 100000 },
    ]
    const result = toCategoryBarData(categories, '#0E6B58', 2)
    expect(result).toEqual([
      { value: 500000, label: 'Transport', frontColor: '#0E6B58' },
      { value: 200000, label: 'Makanan', frontColor: '#0E6B58' },
    ])
  })
})

describe('toBudgetVsActualBarData', () => {
  it('interleaves a budgeted bar and a color-coded actual bar per category', () => {
    const lines = [
      { category_id: 'a', name: 'Makanan', budgeted: 500000, actual: 400000, variance: 100000 },
      { category_id: 'b', name: 'Transport', budgeted: 300000, actual: 350000, variance: -50000 },
    ]
    const result = toBudgetVsActualBarData(lines, {
      budgeted: '#0E6B58',
      actualOver: '#B23B33',
      actualUnder: '#C9A227',
    })
    expect(result).toEqual([
      { value: 500000, label: 'Makanan', frontColor: '#0E6B58', spacing: 2 },
      { value: 400000, frontColor: '#C9A227', spacing: 20 },
      { value: 300000, label: 'Transport', frontColor: '#0E6B58', spacing: 2 },
      { value: 350000, frontColor: '#B23B33', spacing: 0 },
    ])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/reports/chartData.test.ts`
Expected: FAIL — `Cannot find module './chartData'`.

- [ ] **Step 3: Implement**

```ts
// mobile/src/reports/chartData.ts
interface TrendPoint {
  bucket_start: string
  income: number
  expenses: number
}

interface CategorySpend {
  category_id: string
  name: string
  amount: number
}

interface BudgetVsActualLine {
  category_id: string
  name: string
  budgeted: number
  actual: number
}

interface ChartPoint {
  value: number
  label: string
}

interface ChartBar {
  value: number
  label?: string
  frontColor: string
  spacing: number
}

function shortDayLabelID(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function toTrendLines(trend: TrendPoint[]): { income: ChartPoint[]; expenses: ChartPoint[] } {
  return {
    income: trend.map((point) => ({ value: point.income, label: shortDayLabelID(point.bucket_start) })),
    expenses: trend.map((point) => ({ value: point.expenses, label: shortDayLabelID(point.bucket_start) })),
  }
}

export function toCategoryBarData(
  categories: CategorySpend[],
  color: string,
  limit = 6
): { value: number; label: string; frontColor: string }[] {
  return [...categories]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((category) => ({ value: category.amount, label: category.name, frontColor: color }))
}

export function toBudgetVsActualBarData(
  lines: BudgetVsActualLine[],
  colors: { budgeted: string; actualOver: string; actualUnder: string }
): ChartBar[] {
  const bars: ChartBar[] = []
  lines.forEach((line, index) => {
    const overBudget = line.actual > line.budgeted
    bars.push({ value: line.budgeted, label: line.name, frontColor: colors.budgeted, spacing: 2 })
    bars.push({
      value: line.actual,
      frontColor: overBudget ? colors.actualOver : colors.actualUnder,
      spacing: index === lines.length - 1 ? 0 : 20,
    })
  })
  return bars
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/reports/chartData.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/reports/chartData.ts`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
cd mobile && git add src/reports/chartData.ts src/reports/chartData.test.ts
git commit -m "feat(mobile): add cash-flow chart data transforms"
```

---

## Task Group B — Accounts (minimal, consumed by Transactions)

### Task 7: `accountTypeLabel` helper

**Files:**
- Create: `mobile/src/accounts/accountTypeLabels.ts`
- Test: `mobile/src/accounts/accountTypeLabels.test.ts`

**Interfaces:**
- Produces: `ACCOUNT_TYPES: AccountType[]` (the five enum values from
  `openapi.yaml`'s `AccountType` schema: `cash, bank, ewallet, savings, other`
  — verified directly against the spec, not guessed), `accountTypeLabel(type): string`.
  Consumed by Task 9 (`AddAccountCard`).

- [ ] **Step 1: Write the failing test**

```ts
// mobile/src/accounts/accountTypeLabels.test.ts
import { accountTypeLabel } from './accountTypeLabels'

describe('accountTypeLabel', () => {
  it('maps every AccountType enum value to Indonesian copy', () => {
    expect(accountTypeLabel('cash')).toBe('Tunai')
    expect(accountTypeLabel('bank')).toBe('Bank')
    expect(accountTypeLabel('ewallet')).toBe('E-Wallet')
    expect(accountTypeLabel('savings')).toBe('Tabungan')
    expect(accountTypeLabel('other')).toBe('Lainnya')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/accounts/accountTypeLabels.test.ts`
Expected: FAIL — `Cannot find module './accountTypeLabels'`.

- [ ] **Step 3: Implement**

```ts
// mobile/src/accounts/accountTypeLabels.ts
import type { components } from '../api/client'

type AccountType = components['schemas']['AccountType']

export const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'ewallet', 'savings', 'other']

export function accountTypeLabel(type: AccountType): string {
  switch (type) {
    case 'cash':
      return 'Tunai'
    case 'bank':
      return 'Bank'
    case 'ewallet':
      return 'E-Wallet'
    case 'savings':
      return 'Tabungan'
    case 'other':
      return 'Lainnya'
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/accounts/accountTypeLabels.test.ts`
Expected: PASS, 1/1.

- [ ] **Step 5: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/accounts/accountTypeLabels.ts`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
cd mobile && git add src/accounts/accountTypeLabels.ts src/accounts/accountTypeLabels.test.ts
git commit -m "feat(mobile): add account type label helper"
```

---

### Task 8: `useAccounts` + `useCreateAccount` hooks

**Files:**
- Create: `mobile/src/accounts/useAccounts.ts`
- Create: `mobile/src/accounts/useCreateAccount.ts`

**Interfaces:**
- Produces: `useAccounts()` — `useQuery` returning
  `components['schemas']['Account'][]`, key `['accounts']`. Consumed by
  Task 9, Task 15 (Transactions empty-state gate + account picker).
- Produces: `useCreateAccount()` — `useMutation` posting
  `components['schemas']['CreateAccountRequest']`, invalidates `['accounts']`
  on success. Consumed by Task 9.

- [ ] **Step 1: Implement `useAccounts`**

```ts
// mobile/src/accounts/useAccounts.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/accounts')
      if (error || !data) throw new Error('failed_to_load_accounts')
      return data.data
    },
  })
}
```

- [ ] **Step 2: Implement `useCreateAccount`**

```ts
// mobile/src/accounts/useCreateAccount.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import type { components } from '../api/client'

type CreateAccountRequest = components['schemas']['CreateAccountRequest']

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAccountRequest) => {
      const { data, error, response } = await api.POST('/v1/accounts', { body: input })
      if (error || !data) throw new ApiError('failed_to_create_account', response.status)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
```

- [ ] **Step 3: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/accounts/useAccounts.ts src/accounts/useCreateAccount.ts`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
cd mobile && git add src/accounts/useAccounts.ts src/accounts/useCreateAccount.ts
git commit -m "feat(mobile): add useAccounts and useCreateAccount hooks"
```

---

### Task 9: `AddAccountCard` inline creation form

**Files:**
- Create: `mobile/src/accounts/AddAccountCard.tsx`

**Interfaces:**
- Consumes: `useCreateAccount` (Task 8), `ACCOUNT_TYPES`/`accountTypeLabel`
  (Task 7), `RupiahInput` (Task 3), `PocketCard` (Phase 1).
- Produces: `<AddAccountCard />` — a self-contained card with name/type/
  initial-balance fields and a submit button. No `currency` field
  (`CreateAccountRequest.currency` is optional, defaults server-side to
  `IDR`, and this app is IDR-only per the Register screen's hardcoded
  `Currency: "IDR"`) and no `spendable` toggle (defaulted from `type` —
  everything except `savings` is spendable, matching how `spendable`
  affects safe-to-spend math). Consumed by Task 15 (Transactions empty
  state).

- [ ] **Step 1: Implement**

```tsx
// mobile/src/accounts/AddAccountCard.tsx
import { useState } from 'react'
import { Button, Input, Text, XStack, YStack } from 'tamagui'
import { PocketCard } from '../components/PocketCard'
import { RupiahInput } from '../components/RupiahInput'
import { useCreateAccount } from './useCreateAccount'
import { ACCOUNT_TYPES, accountTypeLabel } from './accountTypeLabels'
import type { components } from '../api/client'

type AccountType = components['schemas']['AccountType']

export function AddAccountCard() {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('cash')
  const [initialBalance, setInitialBalance] = useState(0)
  const createAccount = useCreateAccount()

  const canSubmit = name.trim().length > 0 && !createAccount.isPending

  return (
    <PocketCard elevated>
      <Text fontFamily="$heading" fontSize="$4" color="$color">
        Tambahkan Akun Pertamamu
      </Text>
      <Text fontFamily="$body" fontSize="$2" color="$kulit">
        Kamu butuh minimal satu akun sebelum bisa mencatat transaksi.
      </Text>

      {createAccount.isError ? (
        <Text fontFamily="$body" fontSize="$2" color="$danger">
          Gagal menambahkan akun. Coba lagi.
        </Text>
      ) : null}

      <YStack gap="$2">
        <Text fontFamily="$body" fontSize="$1" color="$kulit">
          NAMA AKUN
        </Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Contoh: Dompet, BCA"
          color="$color"
          focusStyle={{ borderColor: '$borderColorFocus' }}
        />
      </YStack>

      <YStack gap="$2">
        <Text fontFamily="$body" fontSize="$1" color="$kulit">
          JENIS AKUN
        </Text>
        <XStack gap="$2" flexWrap="wrap">
          {ACCOUNT_TYPES.map((option) => (
            <Button
              key={option}
              size="$3"
              backgroundColor={type === option ? '$primary' : '$white'}
              color={type === option ? '$primaryText' : '$color'}
              borderWidth={1.5}
              borderColor={type === option ? '$primary' : '$borderColor'}
              onPress={() => setType(option)}
            >
              {accountTypeLabel(option)}
            </Button>
          ))}
        </XStack>
      </YStack>

      <YStack gap="$2">
        <Text fontFamily="$body" fontSize="$1" color="$kulit">
          SALDO AWAL
        </Text>
        <RupiahInput value={initialBalance} onChangeValue={setInitialBalance} />
      </YStack>

      <Button
        backgroundColor="$primary"
        color="$primaryText"
        disabled={!canSubmit}
        opacity={canSubmit ? 1 : 0.5}
        onPress={() =>
          createAccount.mutate({
            name: name.trim(),
            type,
            initial_balance: initialBalance,
            // Savings accounts are conventionally excluded from
            // "safe to spend" math; every other type counts as spendable.
            spendable: type !== 'savings',
          })
        }
      >
        {createAccount.isPending ? 'Menyimpan...' : 'Simpan Akun'}
      </Button>
    </PocketCard>
  )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/accounts/AddAccountCard.tsx`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/accounts/AddAccountCard.tsx
git commit -m "feat(mobile): add inline account creation card"
```

---

## Task Group C — Transactions

### Task 10: `useCategories` hook

**Files:**
- Create: `mobile/src/categories/useCategories.ts`

**Interfaces:**
- Produces: `useCategories(kind?: components['schemas']['CategoryKind'])` —
  `useQuery` keyed `['categories', kind ?? 'all']`, returning
  `components['schemas']['Category'][]`. Consumed by Task 15 (transaction
  category picker), Task 19 (budget allocation category names), Task 20
  (budget wizard's expense category list).

- [ ] **Step 1: Implement**

```ts
// mobile/src/categories/useCategories.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { components } from '../api/client'

type CategoryKind = components['schemas']['CategoryKind']

export function useCategories(kind?: CategoryKind) {
  return useQuery({
    queryKey: ['categories', kind ?? 'all'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/categories', {
        params: { query: kind ? { kind } : {} },
      })
      if (error || !data) throw new Error('failed_to_load_categories')
      return data.data
    },
  })
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/categories/useCategories.ts`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/categories/useCategories.ts
git commit -m "feat(mobile): add useCategories query hook"
```

---

### Task 11: Transaction display helpers

**Files:**
- Create: `mobile/src/transactions/transactionDisplay.ts`
- Test: `mobile/src/transactions/transactionDisplay.test.ts`

**Interfaces:**
- Produces: `transactionTypeMeta(type: components['schemas']['TransactionType']): { label: string; color: string; sign: -1 | 0 | 1 }`
  and `formatSignedRupiah(type, amount: number): string`. Consumed by Task
  14 (`TransactionListItem`).

- [ ] **Step 1: Write the failing tests**

```ts
// mobile/src/transactions/transactionDisplay.test.ts
import { formatSignedRupiah, transactionTypeMeta } from './transactionDisplay'

describe('transactionTypeMeta', () => {
  it('labels income green with a positive sign', () => {
    expect(transactionTypeMeta('income')).toEqual({ label: 'Pemasukan', color: '$primary', sign: 1 })
  })

  it('labels expense red with a negative sign', () => {
    expect(transactionTypeMeta('expense')).toEqual({ label: 'Pengeluaran', color: '$danger', sign: -1 })
  })

  it('labels transfer neutral with no sign', () => {
    expect(transactionTypeMeta('transfer')).toEqual({ label: 'Transfer', color: '$kulit', sign: 0 })
  })

  it('labels adjustment neutral with no sign', () => {
    expect(transactionTypeMeta('adjustment')).toEqual({ label: 'Penyesuaian', color: '$accent', sign: 0 })
  })

  it('labels reversal red with no sign', () => {
    expect(transactionTypeMeta('reversal')).toEqual({ label: 'Pembatalan', color: '$danger', sign: 0 })
  })
})

describe('formatSignedRupiah', () => {
  it('prefixes expense amounts with a minus', () => {
    expect(formatSignedRupiah('expense', 50000)).toBe('-Rp50.000')
  })

  it('prefixes income amounts with a plus', () => {
    expect(formatSignedRupiah('income', 50000)).toBe('+Rp50.000')
  })

  it('leaves transfer/adjustment amounts unsigned', () => {
    expect(formatSignedRupiah('transfer', 50000)).toBe('Rp50.000')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/transactions/transactionDisplay.test.ts`
Expected: FAIL — `Cannot find module './transactionDisplay'`.

- [ ] **Step 3: Implement**

```ts
// mobile/src/transactions/transactionDisplay.ts
import { formatRupiah } from '../format/money'
import type { components } from '../api/client'

type TransactionType = components['schemas']['TransactionType']

export function transactionTypeMeta(type: TransactionType): { label: string; color: string; sign: -1 | 0 | 1 } {
  switch (type) {
    case 'income':
      return { label: 'Pemasukan', color: '$primary', sign: 1 }
    case 'expense':
      return { label: 'Pengeluaran', color: '$danger', sign: -1 }
    case 'transfer':
      return { label: 'Transfer', color: '$kulit', sign: 0 }
    case 'adjustment':
      return { label: 'Penyesuaian', color: '$accent', sign: 0 }
    case 'reversal':
      return { label: 'Pembatalan', color: '$danger', sign: 0 }
  }
}

export function formatSignedRupiah(type: TransactionType, amount: number): string {
  const { sign } = transactionTypeMeta(type)
  if (sign === 0) return formatRupiah(amount)
  return formatRupiah(sign * amount)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/transactions/transactionDisplay.test.ts`
Expected: PASS, 8/8.

- [ ] **Step 5: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/transactions/transactionDisplay.ts`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
cd mobile && git add src/transactions/transactionDisplay.ts src/transactions/transactionDisplay.test.ts
git commit -m "feat(mobile): add transaction type display helpers"
```

---

### Task 12: `useInfiniteTransactions` hook

**Files:**
- Create: `mobile/src/transactions/useInfiniteTransactions.ts`

**Interfaces:**
- Produces: `useInfiniteTransactions()` — `useInfiniteQuery` over
  `GET /v1/transactions?limit=50&cursor=...`, keyed `['transactions']`,
  `getNextPageParam` reads `next_cursor` (an empty string `""` from the
  backend means "no more pages" — confirmed by reading
  `api/internal/adapters/postgres/store.go`'s `ListTransactions`, which
  sets `next := ""` when there's no further page — so `|| undefined`
  correctly stops pagination). Consumed by Task 16 (Transactions screen's
  list).

- [ ] **Step 1: Implement**

```ts
// mobile/src/transactions/useInfiniteTransactions.ts
import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useInfiniteTransactions() {
  return useInfiniteQuery({
    queryKey: ['transactions'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.GET('/v1/transactions', {
        params: { query: { limit: 50, cursor: pageParam } },
      })
      if (error || !data) throw new Error('failed_to_load_transactions')
      return data
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  })
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/transactions/useInfiniteTransactions.ts`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/transactions/useInfiniteTransactions.ts
git commit -m "feat(mobile): add useInfiniteTransactions cursor-paginated hook"
```

---

### Task 13: `useCreateTransaction` + `useReverseTransaction` hooks

**Files:**
- Create: `mobile/src/transactions/useCreateTransaction.ts`
- Create: `mobile/src/transactions/useReverseTransaction.ts`

**Interfaces:**
- Produces: `useCreateTransaction()` — `useMutation` posting
  `components['schemas']['CreateTransactionRequest']` with a fresh
  `Idempotency-Key` header per call (Task 2), invalidates `['transactions']`
  and `['dashboard']` on success (dashboard's budget/safe-to-spend numbers
  change whenever a transaction is created). Throws `ApiError` (Task 2) so
  callers can detect 409. Consumed by Task 15.
- Produces: `useReverseTransaction()` — same shape, posts
  `{ reason: string }` to `/v1/transactions/{id}/reverse` with a fresh
  `Idempotency-Key`. Consumed by Task 14.

**Both mutations require `Idempotency-Key` per `openapi.yaml`'s
`components.parameters.IdempotencyKey` on `createTransaction` and
`reverseTransaction` — flagged explicitly here since a missing header on
either would be a 400 the type system won't catch for us (the generated
`operations["createTransaction"]["parameters"]["header"]` type is
required, not optional, so TypeScript does actually catch an omitted
header at compile time — but it's still worth stating explicitly for a
reviewer.)**

- [ ] **Step 1: Implement `useCreateTransaction`**

```ts
// mobile/src/transactions/useCreateTransaction.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import { generateIdempotencyKey } from '../api/idempotencyKey'
import type { components } from '../api/client'

type CreateTransactionRequest = components['schemas']['CreateTransactionRequest']

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTransactionRequest) => {
      const { data, error, response } = await api.POST('/v1/transactions', {
        params: { header: { 'Idempotency-Key': generateIdempotencyKey() } },
        body: input,
      })
      if (error || !data) throw new ApiError('failed_to_create_transaction', response.status)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
```

- [ ] **Step 2: Implement `useReverseTransaction`**

```ts
// mobile/src/transactions/useReverseTransaction.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import { generateIdempotencyKey } from '../api/idempotencyKey'

export function useReverseTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error, response } = await api.POST('/v1/transactions/{id}/reverse', {
        params: {
          path: { id },
          header: { 'Idempotency-Key': generateIdempotencyKey() },
        },
        body: { reason },
      })
      if (error || !data) throw new ApiError('failed_to_reverse_transaction', response.status)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
```

- [ ] **Step 3: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/transactions/useCreateTransaction.ts src/transactions/useReverseTransaction.ts`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
cd mobile && git add src/transactions/useCreateTransaction.ts src/transactions/useReverseTransaction.ts
git commit -m "feat(mobile): add useCreateTransaction and useReverseTransaction hooks"
```

---

### Task 14: `TransactionListItem` component

**Files:**
- Create: `mobile/src/transactions/TransactionListItem.tsx`

**Interfaces:**
- Consumes: `transactionTypeMeta`/`formatSignedRupiah` (Task 11),
  `useReverseTransaction` (Task 13), `formatDateID` (Task 4), `PocketCard`.
- Produces: `<TransactionListItem transaction categoriesById />` — a card
  per transaction with an inline (not native-`Alert`, since `Alert.prompt`
  is iOS-only and this needs to work on both platforms) reversal-reason
  form that expands in place. Consumed by Task 16.

- [ ] **Step 1: Implement**

```tsx
// mobile/src/transactions/TransactionListItem.tsx
import { useState } from 'react'
import { Button, Input, Text, XStack, YStack } from 'tamagui'
import type { components } from '../api/client'
import { PocketCard } from '../components/PocketCard'
import { formatDateID } from '../format/date'
import { ApiError } from '../api/errors'
import { formatSignedRupiah, transactionTypeMeta } from './transactionDisplay'
import { useReverseTransaction } from './useReverseTransaction'

type Transaction = components['schemas']['Transaction']
type Category = components['schemas']['Category']

interface TransactionListItemProps {
  transaction: Transaction
  categoriesById: Map<string, Category>
}

export function TransactionListItem({ transaction, categoriesById }: TransactionListItemProps) {
  const [showReversalForm, setShowReversalForm] = useState(false)
  const [reason, setReason] = useState('')
  const reverseTransaction = useReverseTransaction()

  const meta = transactionTypeMeta(transaction.type)
  const categoryName = transaction.category_id ? categoriesById.get(transaction.category_id)?.name : undefined
  const canReverse = transaction.type !== 'reversal' && !transaction.reversed_by_id
  const isConflict = reverseTransaction.error instanceof ApiError && reverseTransaction.error.status === 409

  return (
    <PocketCard>
      <XStack justifyContent="space-between" alignItems="center">
        <YStack flex={1} gap="$1">
          <Text fontFamily="$body" fontSize="$1" color={meta.color}>
            {meta.label.toUpperCase()}
          </Text>
          <Text fontFamily="$body" fontSize="$3" color="$color">
            {categoryName ?? transaction.note ?? meta.label}
          </Text>
          <Text fontFamily="$body" fontSize="$1" color="$kulit">
            {formatDateID(transaction.occurred_at)}
          </Text>
        </YStack>
        <Text fontFamily="$mono" fontSize="$3" color={meta.color}>
          {formatSignedRupiah(transaction.type, transaction.amount)}
        </Text>
      </XStack>

      {canReverse && showReversalForm ? (
        <YStack gap="$2">
          <Input
            placeholder="Alasan pembatalan"
            value={reason}
            onChangeText={setReason}
            color="$color"
            focusStyle={{ borderColor: '$borderColorFocus' }}
          />
          {isConflict ? (
            <Text fontFamily="$body" fontSize="$1" color="$danger">
              Transaksi ini sudah pernah dibatalkan.
            </Text>
          ) : reverseTransaction.isError ? (
            <Text fontFamily="$body" fontSize="$1" color="$danger">
              Gagal membatalkan transaksi. Coba lagi.
            </Text>
          ) : null}
          <XStack gap="$2">
            <Button
              flex={1}
              size="$3"
              backgroundColor="$danger"
              color="$white"
              disabled={reason.trim().length === 0 || reverseTransaction.isPending}
              onPress={() => reverseTransaction.mutate({ id: transaction.id, reason: reason.trim() })}
            >
              {reverseTransaction.isPending ? 'Membatalkan...' : 'Konfirmasi Pembatalan'}
            </Button>
            <Button
              flex={1}
              size="$3"
              backgroundColor="$white"
              borderWidth={1.5}
              borderColor="$borderColor"
              color="$color"
              onPress={() => setShowReversalForm(false)}
            >
              Batal
            </Button>
          </XStack>
        </YStack>
      ) : canReverse ? (
        <Button
          size="$3"
          backgroundColor="$white"
          borderWidth={1.5}
          borderColor="$borderColor"
          color="$danger"
          onPress={() => setShowReversalForm(true)}
        >
          Batalkan Transaksi
        </Button>
      ) : null}
    </PocketCard>
  )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/transactions/TransactionListItem.tsx`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/transactions/TransactionListItem.tsx
git commit -m "feat(mobile): add TransactionListItem with inline reversal form"
```

---

### Task 15: Transactions screen — empty state + fast-entry form

**Files:**
- Modify: `mobile/app/(app)/(tabs)/transactions.tsx` (replace the Phase 1
  `ComingSoonScreen` placeholder entirely)

**Interfaces:**
- Consumes: `useAccounts` (Task 8), `AddAccountCard` (Task 9),
  `useCategories` (Task 10), `useCreateTransaction` (Task 13),
  `RupiahInput` (Task 3), `toRFC3339`/`daysAgo` (Task 4), `ApiError`
  (Task 2).
- Produces: the top half of the screen (empty state or fast-entry form).
  Task 16 appends the transaction list below this in the same file.

Transfer is only offered as a transaction type once the user has **2 or
more** accounts (a transfer needs a distinct source and destination); with
0–1 accounts the segmented control only shows Pemasukan/Pengeluaran/
Penyesuaian, with a small caption explaining why Transfer is hidden.

- [ ] **Step 1: Implement**

```tsx
// mobile/app/(app)/(tabs)/transactions.tsx
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { PocketCard } from '../../../src/components/PocketCard'
import { RupiahInput } from '../../../src/components/RupiahInput'
import { ApiError } from '../../../src/api/errors'
import { daysAgo, toRFC3339 } from '../../../src/format/date'
import { useAccounts } from '../../../src/accounts/useAccounts'
import { AddAccountCard } from '../../../src/accounts/AddAccountCard'
import { useCategories } from '../../../src/categories/useCategories'
import { useCreateTransaction } from '../../../src/transactions/useCreateTransaction'
import type { components } from '../../../src/api/client'

type CreateTransactionType = components['schemas']['CreateTransactionType']

const TYPE_LABELS: Record<CreateTransactionType, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  transfer: 'Transfer',
  adjustment: 'Penyesuaian',
}

export default function TransactionsScreen() {
  const accounts = useAccounts()
  const [type, setType] = useState<CreateTransactionType>('expense')
  const [accountId, setAccountId] = useState<string | undefined>(undefined)
  const [destinationAccountId, setDestinationAccountId] = useState<string | undefined>(undefined)
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [dateChoice, setDateChoice] = useState<'today' | 'yesterday'>('today')

  const categories = useCategories(type === 'income' || type === 'expense' ? type : undefined)
  const createTransaction = useCreateTransaction()

  const hasAccounts = (accounts.data?.length ?? 0) > 0
  const canOfferTransfer = (accounts.data?.length ?? 0) >= 2
  const availableTypes: CreateTransactionType[] = canOfferTransfer
    ? ['income', 'expense', 'transfer', 'adjustment']
    : ['income', 'expense', 'adjustment']

  const isConflict = createTransaction.error instanceof ApiError && createTransaction.error.status === 409

  const canSubmit = (() => {
    if (!accountId || amount <= 0 || createTransaction.isPending) return false
    if (type === 'income' || type === 'expense') return !!categoryId
    if (type === 'transfer') return !!destinationAccountId && destinationAccountId !== accountId
    if (type === 'adjustment') return reason.trim().length > 0
    return false
  })()

  function handleSubmit() {
    if (!accountId) return
    const occurredAt = toRFC3339(dateChoice === 'today' ? new Date() : daysAgo(new Date(), 1))
    createTransaction.mutate(
      {
        type,
        account_id: accountId,
        destination_account_id: type === 'transfer' ? destinationAccountId : undefined,
        category_id: type === 'income' || type === 'expense' ? categoryId : undefined,
        amount,
        occurred_at: occurredAt,
        note: note.trim() || undefined,
        reason: type === 'adjustment' ? reason.trim() : undefined,
      },
      {
        onSuccess: () => {
          setAmount(0)
          setNote('')
          setReason('')
        },
      }
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$4">
          <Text fontFamily="$heading" fontSize="$4" color="$color">
            Transaksi
          </Text>

          {accounts.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : !hasAccounts ? (
            <AddAccountCard />
          ) : (
            <PocketCard elevated>
              <Text fontFamily="$heading" fontSize="$4" color="$color">
                Catat Transaksi Baru
              </Text>

              {isConflict ? (
                <Text fontFamily="$body" fontSize="$2" color="$danger">
                  Transaksi ini sepertinya sudah tersimpan. Periksa riwayat di bawah.
                </Text>
              ) : createTransaction.isError ? (
                <Text fontFamily="$body" fontSize="$2" color="$danger">
                  Gagal menyimpan transaksi. Coba lagi.
                </Text>
              ) : null}

              <XStack gap="$2" flexWrap="wrap">
                {availableTypes.map((option) => (
                  <Button
                    key={option}
                    size="$3"
                    backgroundColor={type === option ? '$primary' : '$white'}
                    color={type === option ? '$primaryText' : '$color'}
                    borderWidth={1.5}
                    borderColor={type === option ? '$primary' : '$borderColor'}
                    onPress={() => setType(option)}
                  >
                    {TYPE_LABELS[option]}
                  </Button>
                ))}
              </XStack>
              {!canOfferTransfer ? (
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  Tambahkan satu akun lagi untuk bisa mencatat transfer.
                </Text>
              ) : null}

              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  AKUN
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {accounts.data?.map((account) => (
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
              </YStack>

              {type === 'transfer' ? (
                <YStack gap="$2">
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    AKUN TUJUAN
                  </Text>
                  <XStack gap="$2" flexWrap="wrap">
                    {accounts.data
                      ?.filter((account) => account.id !== accountId)
                      .map((account) => (
                        <Button
                          key={account.id}
                          size="$3"
                          backgroundColor={destinationAccountId === account.id ? '$primary' : '$white'}
                          color={destinationAccountId === account.id ? '$primaryText' : '$color'}
                          borderWidth={1.5}
                          borderColor={destinationAccountId === account.id ? '$primary' : '$borderColor'}
                          onPress={() => setDestinationAccountId(account.id)}
                        >
                          {account.name}
                        </Button>
                      ))}
                  </XStack>
                </YStack>
              ) : null}

              {type === 'income' || type === 'expense' ? (
                <YStack gap="$2">
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    KATEGORI
                  </Text>
                  <XStack gap="$2" flexWrap="wrap">
                    {categories.data?.map((category) => (
                      <Button
                        key={category.id}
                        size="$3"
                        backgroundColor={categoryId === category.id ? '$primary' : '$white'}
                        color={categoryId === category.id ? '$primaryText' : '$color'}
                        borderWidth={1.5}
                        borderColor={categoryId === category.id ? '$primary' : '$borderColor'}
                        onPress={() => setCategoryId(category.id)}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </XStack>
                </YStack>
              ) : null}

              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  JUMLAH
                </Text>
                <RupiahInput value={amount} onChangeValue={setAmount} />
              </YStack>

              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  TANGGAL
                </Text>
                <XStack gap="$2">
                  <Button
                    flex={1}
                    size="$3"
                    backgroundColor={dateChoice === 'today' ? '$primary' : '$white'}
                    color={dateChoice === 'today' ? '$primaryText' : '$color'}
                    borderWidth={1.5}
                    borderColor={dateChoice === 'today' ? '$primary' : '$borderColor'}
                    onPress={() => setDateChoice('today')}
                  >
                    Hari ini
                  </Button>
                  <Button
                    flex={1}
                    size="$3"
                    backgroundColor={dateChoice === 'yesterday' ? '$primary' : '$white'}
                    color={dateChoice === 'yesterday' ? '$primaryText' : '$color'}
                    borderWidth={1.5}
                    borderColor={dateChoice === 'yesterday' ? '$primary' : '$borderColor'}
                    onPress={() => setDateChoice('yesterday')}
                  >
                    Kemarin
                  </Button>
                </XStack>
              </YStack>

              {type === 'adjustment' ? (
                <YStack gap="$2">
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    ALASAN PENYESUAIAN
                  </Text>
                  <Input
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Contoh: Koreksi saldo awal"
                    color="$color"
                    focusStyle={{ borderColor: '$borderColorFocus' }}
                  />
                </YStack>
              ) : (
                <YStack gap="$2">
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    CATATAN (OPSIONAL)
                  </Text>
                  <Input
                    value={note}
                    onChangeText={setNote}
                    color="$color"
                    focusStyle={{ borderColor: '$borderColorFocus' }}
                  />
                </YStack>
              )}

              <Button
                backgroundColor="$primary"
                color="$primaryText"
                disabled={!canSubmit}
                opacity={canSubmit ? 1 : 0.5}
                onPress={handleSubmit}
              >
                {createTransaction.isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
              </Button>
            </PocketCard>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint "app/(app)/(tabs)/transactions.tsx"`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "app/(app)/(tabs)/transactions.tsx"
git commit -m "feat(mobile): wire Transactions screen empty state and fast-entry form"
```

---

### Task 16: Transactions screen — infinite list + reversal

**Files:**
- Modify: `mobile/app/(app)/(tabs)/transactions.tsx`

**Interfaces:**
- Consumes: `useInfiniteTransactions` (Task 12), `useCategories()` (all
  kinds, Task 10, for the category-name lookup map), `TransactionListItem`
  (Task 14).
- Produces: completes the Transactions screen — nothing new consumed
  elsewhere.

- [ ] **Step 1: Add the imports**

At the top of `app/(app)/(tabs)/transactions.tsx`, add:

```tsx
import { useMemo } from 'react'
import { FlatList } from 'react-native'
import { useInfiniteTransactions } from '../../../src/transactions/useInfiniteTransactions'
import { TransactionListItem } from '../../../src/transactions/TransactionListItem'
```

(`useState` import from Task 15 stays; add `useMemo` to the same `'react'`
import line.)

- [ ] **Step 2: Add the list state inside `TransactionsScreen`**

Right after the `createTransaction` hook call from Task 15, add:

```tsx
  const allCategories = useCategories()
  const transactions = useInfiniteTransactions()
  const categoriesById = useMemo(
    () => new Map((allCategories.data ?? []).map((category) => [category.id, category])),
    [allCategories.data]
  )
  const transactionItems = transactions.data?.pages.flatMap((page) => page.data) ?? []
```

- [ ] **Step 3: Render the list below the fast-entry card**

Add this JSX immediately after the `{accounts.isLoading ? ... : ...}`
conditional block from Task 15, still inside the outer `<YStack padding="$5" gap="$4">`:

```tsx
          {hasAccounts ? (
            <YStack gap="$3">
              <Text fontFamily="$body" fontSize="$1" color="$kulit">
                RIWAYAT TRANSAKSI
              </Text>
              {transactions.isLoading ? (
                <YStack alignItems="center" paddingTop="$4">
                  <Spinner size="large" color="$primary" />
                </YStack>
              ) : transactions.isError ? (
                <PocketCard>
                  <Text fontFamily="$body" fontSize="$2" color="$danger">
                    Gagal memuat riwayat transaksi. Coba lagi nanti.
                  </Text>
                </PocketCard>
              ) : transactionItems.length === 0 ? (
                <PocketCard tone="muted">
                  <Text fontFamily="$body" fontSize="$2" color="$kulit" textAlign="center">
                    Belum ada transaksi. Catat transaksi pertamamu di atas.
                  </Text>
                </PocketCard>
              ) : (
                <FlatList
                  data={transactionItems}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <YStack height="$2" />}
                  renderItem={({ item }) => (
                    <TransactionListItem transaction={item} categoriesById={categoriesById} />
                  )}
                  onEndReached={() => {
                    if (transactions.hasNextPage && !transactions.isFetchingNextPage) {
                      transactions.fetchNextPage()
                    }
                  }}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={
                    transactions.isFetchingNextPage ? (
                      <YStack alignItems="center" paddingVertical="$3">
                        <Spinner color="$primary" />
                      </YStack>
                    ) : null
                  }
                />
              )}
            </YStack>
          ) : null}
```

`scrollEnabled={false}` on the inner `FlatList` is deliberate — the screen's
outer `ScrollView` (from Task 15) is what actually scrolls, since this
`FlatList` is embedded inside it rather than being the screen's root
scroll container; `onEndReached` still fires correctly because `FlatList`
computes its own content layout regardless of whether its own scrolling is
enabled.

- [ ] **Step 4: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint "app/(app)/(tabs)/transactions.tsx"`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
cd mobile && git add "app/(app)/(tabs)/transactions.tsx"
git commit -m "feat(mobile): add infinite-scroll transaction list with reversal"
```

---

## Task Group D — Budgets

### Task 17: `useSafeToSpend` + `useActiveBudget` hooks + risk-level labels

**Files:**
- Create: `mobile/src/budgets/useSafeToSpend.ts`
- Create: `mobile/src/budgets/useActiveBudget.ts`
- Create: `mobile/src/budgets/riskLevel.ts`
- Test: `mobile/src/budgets/riskLevel.test.ts`

**Interfaces:**
- Produces: `useSafeToSpend()` — `useQuery` over
  `GET /v1/planning/safe-to-spend`, key `['planning', 'safe-to-spend']`.
  This is **not** redundant with `useDashboard` (Phase 1) despite both
  touching "safe to spend": `Dashboard` only exposes
  `safe_to_spend_today`/`safe_to_spend_until_payday`/`days_until_payday`,
  while `SafeToSpend` additionally exposes `daily`, `risk_level`,
  `upcoming_bills`, and `remaining_savings_commitment` — fields the active
  budget view (Task 19) needs and Dashboard doesn't carry. Confirmed by
  diffing the two schemas in `openapi.yaml`.
- Produces: `useActiveBudget()` — `useQuery` over `GET /v1/budgets/active`,
  returning `Budget | null` (a 404 response — read via `response.status`,
  not the typed `error` field, since `openapi-fetch` doesn't distinguish
  "expected empty state" from "real error" for us — is treated as "no
  active budget", not an error state).
- Produces: `riskLevelMeta(risk: 'healthy'|'attention'|'high'): { label: string; color: string }`.
  Consumed by Task 19.

- [ ] **Step 1: Write the failing test for `riskLevel`**

```ts
// mobile/src/budgets/riskLevel.test.ts
import { riskLevelMeta } from './riskLevel'

describe('riskLevelMeta', () => {
  it('labels healthy in the primary color', () => {
    expect(riskLevelMeta('healthy')).toEqual({ label: 'Sehat', color: '$primary' })
  })

  it('labels attention in the accent color', () => {
    expect(riskLevelMeta('attention')).toEqual({ label: 'Perhatian', color: '$accent' })
  })

  it('labels high risk in the danger color', () => {
    expect(riskLevelMeta('high')).toEqual({ label: 'Waspada', color: '$danger' })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/budgets/riskLevel.test.ts`
Expected: FAIL — `Cannot find module './riskLevel'`.

- [ ] **Step 3: Implement all three files**

```ts
// mobile/src/budgets/riskLevel.ts
import type { components } from '../api/client'

type RiskLevel = components['schemas']['SafeToSpend']['risk_level']

export function riskLevelMeta(risk: RiskLevel): { label: string; color: string } {
  switch (risk) {
    case 'healthy':
      return { label: 'Sehat', color: '$primary' }
    case 'attention':
      return { label: 'Perhatian', color: '$accent' }
    case 'high':
      return { label: 'Waspada', color: '$danger' }
  }
}
```

```ts
// mobile/src/budgets/useSafeToSpend.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useSafeToSpend() {
  return useQuery({
    queryKey: ['planning', 'safe-to-spend'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/planning/safe-to-spend')
      if (error || !data) throw new Error('failed_to_load_safe_to_spend')
      return data
    },
  })
}
```

```ts
// mobile/src/budgets/useActiveBudget.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useActiveBudget() {
  return useQuery({
    queryKey: ['budgets', 'active'],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/v1/budgets/active')
      if (response.status === 404) return null
      if (error || !data) throw new Error('failed_to_load_active_budget')
      return data
    },
  })
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/budgets/riskLevel.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/budgets/riskLevel.ts src/budgets/useSafeToSpend.ts src/budgets/useActiveBudget.ts`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
cd mobile && git add src/budgets/riskLevel.ts src/budgets/riskLevel.test.ts src/budgets/useSafeToSpend.ts src/budgets/useActiveBudget.ts
git commit -m "feat(mobile): add safe-to-spend, active budget, and risk-level helpers"
```

---

### Task 18: `useCreateBudgetRecommendation` + `useCreateAndActivateBudget` hooks

**Files:**
- Create: `mobile/src/budgets/useCreateBudgetRecommendation.ts`
- Create: `mobile/src/budgets/useCreateAndActivateBudget.ts`

**Interfaces:**
- Produces: `useCreateBudgetRecommendation()` — `useMutation` posting
  `components['schemas']['RecommendationRequest']` to
  `/v1/planning/recommendations`, returning a `Recommendation` (rule-based;
  "No LLM is involved in monetary calculations" per the spec's own
  description). Consumed by Task 20.
- Produces: `useCreateAndActivateBudget()` — a single `useMutation` that
  calls `POST /v1/budgets` then immediately `POST /v1/budgets/{id}/activate`
  on the resulting draft, invalidating `['budgets', 'active']` on success.
  **This deliberately compresses two API calls behind one user action** —
  there is no `GET`/`list` endpoint for draft budgets, so a draft the user
  creates but never activates becomes permanently unreachable from the
  mobile UI while still blocking future budget creation via the 409
  overlap check. Folding create+activate into one mutation removes that
  failure mode entirely for the normal path. Consumed by Task 20.

- [ ] **Step 1: Implement `useCreateBudgetRecommendation`**

```ts
// mobile/src/budgets/useCreateBudgetRecommendation.ts
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import type { components } from '../api/client'

type RecommendationRequest = components['schemas']['RecommendationRequest']

export function useCreateBudgetRecommendation() {
  return useMutation({
    mutationFn: async (input: RecommendationRequest) => {
      const { data, error, response } = await api.POST('/v1/planning/recommendations', { body: input })
      if (error || !data) throw new ApiError('failed_to_create_recommendation', response.status)
      return data
    },
  })
}
```

- [ ] **Step 2: Implement `useCreateAndActivateBudget`**

```ts
// mobile/src/budgets/useCreateAndActivateBudget.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import type { components } from '../api/client'

type CreateBudgetRequest = components['schemas']['CreateBudgetRequest']

export function useCreateAndActivateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateBudgetRequest) => {
      const draftResult = await api.POST('/v1/budgets', { body: input })
      if (draftResult.error || !draftResult.data) {
        throw new ApiError('failed_to_create_budget_draft', draftResult.response.status)
      }
      const activateResult = await api.POST('/v1/budgets/{id}/activate', {
        params: { path: { id: draftResult.data.id } },
      })
      if (activateResult.error || !activateResult.data) {
        throw new ApiError('failed_to_activate_budget', activateResult.response.status)
      }
      return activateResult.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'active'] })
    },
  })
}
```

- [ ] **Step 3: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/budgets/useCreateBudgetRecommendation.ts src/budgets/useCreateAndActivateBudget.ts`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
cd mobile && git add src/budgets/useCreateBudgetRecommendation.ts src/budgets/useCreateAndActivateBudget.ts
git commit -m "feat(mobile): add budget recommendation and create-and-activate hooks"
```

---

### Task 19: Budgets screen — active budget read-only view

**Files:**
- Modify: `mobile/app/(app)/(tabs)/budgets.tsx` (replace the Phase 1
  `ComingSoonScreen` placeholder)

**Interfaces:**
- Consumes: `useActiveBudget` (Task 17), `useSafeToSpend` (Task 17),
  `riskLevelMeta` (Task 17), `useCategories()` (Task 10, all kinds, for
  allocation name lookup), `formatRupiah`, `formatDateID`.
- Produces: the "has an active budget" branch. Task 20 adds the "no active
  budget → wizard" branch to the same file.

- [ ] **Step 1: Implement**

```tsx
// mobile/app/(app)/(tabs)/budgets.tsx
import { useMemo } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { PocketCard } from '../../../src/components/PocketCard'
import { formatDateID } from '../../../src/format/date'
import { formatRupiah } from '../../../src/format/money'
import { useActiveBudget } from '../../../src/budgets/useActiveBudget'
import { useSafeToSpend } from '../../../src/budgets/useSafeToSpend'
import { riskLevelMeta } from '../../../src/budgets/riskLevel'
import { useCategories } from '../../../src/categories/useCategories'

export default function BudgetsScreen() {
  const activeBudget = useActiveBudget()
  const safeToSpend = useSafeToSpend()
  const allCategories = useCategories()
  const categoriesById = useMemo(
    () => new Map((allCategories.data ?? []).map((category) => [category.id, category])),
    [allCategories.data]
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$4">
          <Text fontFamily="$heading" fontSize="$4" color="$color">
            Anggaran
          </Text>

          {activeBudget.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : activeBudget.isError ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat anggaran. Coba lagi nanti.
              </Text>
            </PocketCard>
          ) : activeBudget.data ? (
            <>
              <PocketCard>
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  PERIODE ANGGARAN AKTIF
                </Text>
                <Text fontFamily="$body" fontSize="$3" color="$color">
                  {`${formatDateID(activeBudget.data.start_date)} – ${formatDateID(activeBudget.data.end_date)}`}
                </Text>
              </PocketCard>

              <XStack gap="$3">
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    PEMASUKAN DIHARAPKAN
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color="$color">
                    {formatRupiah(activeBudget.data.expected_income)}
                  </Text>
                </PocketCard>
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    KOMITMEN TABUNGAN
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color="$color">
                    {formatRupiah(activeBudget.data.savings_commitment)}
                  </Text>
                </PocketCard>
              </XStack>

              {safeToSpend.data ? (
                <PocketCard>
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontFamily="$body" fontSize="$1" color="$kulit">
                      AMAN DIBELANJAKAN PER HARI
                    </Text>
                    <Text fontFamily="$body" fontSize="$1" color={riskLevelMeta(safeToSpend.data.risk_level).color}>
                      {riskLevelMeta(safeToSpend.data.risk_level).label.toUpperCase()}
                    </Text>
                  </XStack>
                  <Text fontFamily="$mono" fontSize="$5" color="$primary">
                    {formatRupiah(safeToSpend.data.daily)}
                  </Text>
                  <Text fontFamily="$body" fontSize="$2" color="$kulit">
                    {`${safeToSpend.data.days_remaining} hari lagi sampai gajian · Tagihan mendatang ${formatRupiah(safeToSpend.data.upcoming_bills)}`}
                  </Text>
                </PocketCard>
              ) : null}

              <PocketCard>
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  ALOKASI KATEGORI
                </Text>
                {activeBudget.data.allocations.map((allocation) => (
                  <XStack key={allocation.id} justifyContent="space-between">
                    <Text fontFamily="$body" fontSize="$2" color="$color">
                      {categoriesById.get(allocation.category_id)?.name ?? 'Kategori'}
                    </Text>
                    <Text fontFamily="$mono" fontSize="$2" color="$color">
                      {formatRupiah(allocation.amount)}
                    </Text>
                  </XStack>
                ))}
              </PocketCard>
            </>
          ) : (
            <Text fontFamily="$body" fontSize="$2" color="$kulit">
              PLACEHOLDER_FOR_TASK_20
            </Text>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
```

(The `PLACEHOLDER_FOR_TASK_20` text is intentional and temporary — Task 20
replaces it with the create-budget wizard in the next task. Its presence
verifies the "no active budget" branch actually renders before layering
more complexity on top.)

- [ ] **Step 2: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint "app/(app)/(tabs)/budgets.tsx"`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "app/(app)/(tabs)/budgets.tsx"
git commit -m "feat(mobile): add active budget read-only view"
```

---

### Task 20: Budgets screen — create-draft wizard

**Files:**
- Modify: `mobile/app/(app)/(tabs)/budgets.tsx`

**Interfaces:**
- Consumes: `useCategories('expense')` (Task 10), `useCreateBudgetRecommendation`/
  `useCreateAndActivateBudget` (Task 18), `computeUnallocated` (Task 5),
  `startOfMonth`/`endOfMonth`/`toRFC3339` (Task 4), `RupiahInput` (Task 3),
  `ApiError` (Task 2).
- Produces: completes the Budgets screen.

- [ ] **Step 1: Add the imports**

At the top of `app/(app)/(tabs)/budgets.tsx`, add:

```tsx
import { useState } from 'react'
import { Button, Input } from 'tamagui'
import { RupiahInput } from '../../../src/components/RupiahInput'
import { ApiError } from '../../../src/api/errors'
import { endOfMonth, startOfMonth, toRFC3339 } from '../../../src/format/date'
import { computeUnallocated } from '../../../src/budgets/budgetMath'
import { useCreateBudgetRecommendation } from '../../../src/budgets/useCreateBudgetRecommendation'
import { useCreateAndActivateBudget } from '../../../src/budgets/useCreateAndActivateBudget'
import type { components } from '../../../src/api/client'
```

(Merge `useState` into the existing `'react'` import line alongside
`useMemo` from Task 19.)

- [ ] **Step 2: Add the `BudgetWizard` component**

Add this above the default-exported `BudgetsScreen` function:

```tsx
type RecommendationMode = components['schemas']['RecommendationRequest']['mode']

function BudgetWizard() {
  const [step, setStep] = useState<'basics' | 'allocate' | 'review'>('basics')
  const [expectedIncome, setExpectedIncome] = useState(0)
  const [savingsCommitment, setSavingsCommitment] = useState(0)
  const [minimumBuffer, setMinimumBuffer] = useState(0)
  const [mode, setMode] = useState<RecommendationMode>('balanced')
  const [allocations, setAllocations] = useState<Record<string, number>>({})
  const [usedRecommendation, setUsedRecommendation] = useState(false)

  const expenseCategories = useCategories('expense')
  const recommend = useCreateBudgetRecommendation()
  const createAndActivate = useCreateAndActivateBudget()

  const unallocated = computeUnallocated(expectedIncome, savingsCommitment, minimumBuffer, allocations)
  const isConflict = createAndActivate.error instanceof ApiError && createAndActivate.error.status === 409

  function handleGetRecommendation() {
    recommend.mutate(
      {
        expected_income: expectedIncome,
        fixed_bills: 0,
        debt_payments: 0,
        minimum_buffer: minimumBuffer,
        requested_savings: savingsCommitment,
        mode,
      },
      {
        onSuccess: (data) => {
          setAllocations(data.allocations)
          setSavingsCommitment(data.savings_commitment)
          setMinimumBuffer(data.minimum_buffer)
          setUsedRecommendation(true)
        },
      }
    )
  }

  function handleSubmit() {
    const now = new Date()
    createAndActivate.mutate({
      start_date: toRFC3339(startOfMonth(now)),
      end_date: toRFC3339(endOfMonth(now)),
      expected_income: expectedIncome,
      savings_commitment: savingsCommitment,
      minimum_buffer: minimumBuffer,
      source: usedRecommendation ? 'rule_based' : 'manual',
      allocations,
    })
  }

  return (
    <PocketCard elevated>
      <Text fontFamily="$heading" fontSize="$4" color="$color">
        Buat Anggaran Bulan Ini
      </Text>

      {step === 'basics' ? (
        <YStack gap="$3">
          <YStack gap="$2">
            <Text fontFamily="$body" fontSize="$1" color="$kulit">
              PEMASUKAN DIHARAPKAN
            </Text>
            <RupiahInput value={expectedIncome} onChangeValue={setExpectedIncome} />
          </YStack>
          <YStack gap="$2">
            <Text fontFamily="$body" fontSize="$1" color="$kulit">
              KOMITMEN TABUNGAN
            </Text>
            <RupiahInput value={savingsCommitment} onChangeValue={setSavingsCommitment} />
          </YStack>
          <YStack gap="$2">
            <Text fontFamily="$body" fontSize="$1" color="$kulit">
              DANA DARURAT MINIMUM
            </Text>
            <RupiahInput value={minimumBuffer} onChangeValue={setMinimumBuffer} />
          </YStack>
          <YStack gap="$2">
            <Text fontFamily="$body" fontSize="$1" color="$kulit">
              GAYA ALOKASI
            </Text>
            <XStack gap="$2">
              {(['conservative', 'balanced', 'flexible'] as RecommendationMode[]).map((option) => (
                <Button
                  key={option}
                  flex={1}
                  size="$3"
                  backgroundColor={mode === option ? '$primary' : '$white'}
                  color={mode === option ? '$primaryText' : '$color'}
                  borderWidth={1.5}
                  borderColor={mode === option ? '$primary' : '$borderColor'}
                  onPress={() => setMode(option)}
                >
                  {option === 'conservative' ? 'Konservatif' : option === 'balanced' ? 'Seimbang' : 'Fleksibel'}
                </Button>
              ))}
            </XStack>
          </YStack>
          <Button
            backgroundColor="$white"
            borderWidth={1.5}
            borderColor="$borderColor"
            color="$color"
            disabled={expectedIncome <= 0 || recommend.isPending}
            onPress={handleGetRecommendation}
          >
            {recommend.isPending ? 'Menghitung...' : 'Dapatkan Saran Alokasi'}
          </Button>
          <Button
            backgroundColor="$primary"
            color="$primaryText"
            disabled={expectedIncome <= 0}
            onPress={() => setStep('allocate')}
          >
            Lanjut
          </Button>
        </YStack>
      ) : null}

      {step === 'allocate' ? (
        <YStack gap="$3">
          {expenseCategories.data?.map((category) => (
            <YStack key={category.id} gap="$2">
              <Text fontFamily="$body" fontSize="$2" color="$color">
                {category.name}
              </Text>
              <RupiahInput
                value={allocations[category.id] ?? 0}
                onChangeValue={(value) => setAllocations((prev) => ({ ...prev, [category.id]: value }))}
              />
            </YStack>
          ))}
          <PocketCard tone="muted">
            <Text fontFamily="$body" fontSize="$2" color={unallocated < 0 ? '$danger' : '$kulit'}>
              {`Belum dialokasikan: ${formatRupiah(unallocated)}`}
            </Text>
          </PocketCard>
          <XStack gap="$2">
            <Button flex={1} backgroundColor="$white" borderWidth={1.5} borderColor="$borderColor" color="$color" onPress={() => setStep('basics')}>
              Kembali
            </Button>
            <Button flex={1} backgroundColor="$primary" color="$primaryText" onPress={() => setStep('review')}>
              Lanjut
            </Button>
          </XStack>
        </YStack>
      ) : null}

      {step === 'review' ? (
        <YStack gap="$3">
          <Text fontFamily="$body" fontSize="$2" color="$kulit">
            {`Pemasukan ${formatRupiah(expectedIncome)} · Tabungan ${formatRupiah(savingsCommitment)} · Dana darurat ${formatRupiah(minimumBuffer)}`}
          </Text>
          <Text fontFamily="$body" fontSize="$2" color={unallocated < 0 ? '$danger' : '$kulit'}>
            {`Belum dialokasikan: ${formatRupiah(unallocated)}`}
          </Text>
          {isConflict ? (
            <Text fontFamily="$body" fontSize="$2" color="$danger">
              Sudah ada anggaran aktif atau draf yang tumpang tindih untuk periode ini. Muat ulang layar ini.
            </Text>
          ) : createAndActivate.isError ? (
            <Text fontFamily="$body" fontSize="$2" color="$danger">
              Gagal membuat anggaran. Coba lagi.
            </Text>
          ) : null}
          <XStack gap="$2">
            <Button flex={1} backgroundColor="$white" borderWidth={1.5} borderColor="$borderColor" color="$color" onPress={() => setStep('allocate')}>
              Kembali
            </Button>
            <Button
              flex={1}
              backgroundColor="$primary"
              color="$primaryText"
              disabled={unallocated < 0 || createAndActivate.isPending}
              opacity={unallocated < 0 ? 0.5 : 1}
              onPress={handleSubmit}
            >
              {createAndActivate.isPending ? 'Membuat...' : 'Buat & Aktifkan Anggaran'}
            </Button>
          </XStack>
        </YStack>
      ) : null}
    </PocketCard>
  )
}
```

- [ ] **Step 3: Wire the wizard into the "no active budget" branch**

Replace the temporary `PLACEHOLDER_FOR_TASK_20` block from Task 19 with:

```tsx
          ) : (
            <>
              <PocketCard tone="muted">
                <Text fontFamily="$body" fontSize="$3" color="$color" textAlign="center">
                  Belum ada anggaran aktif
                </Text>
                <Text fontFamily="$body" fontSize="$2" color="$kulit" textAlign="center">
                  Buat anggaran bulan ini supaya kamu tahu batas amanmu.
                </Text>
              </PocketCard>
              <BudgetWizard />
            </>
          )}
```

(This replaces the previous `<Text ...>PLACEHOLDER_FOR_TASK_20</Text>`
branch's contents — same `) : (` / `)}` position in the ternary chain.)

- [ ] **Step 4: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint "app/(app)/(tabs)/budgets.tsx"`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
cd mobile && git add "app/(app)/(tabs)/budgets.tsx"
git commit -m "feat(mobile): add create-and-activate budget wizard"
```

---

## Task Group E — Reports

### Task 21: Install `react-native-gifted-charts` (and its hidden required peer, `expo-linear-gradient`)

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/package-lock.json`

**Interfaces:** installs the charting library used by Task 23.

**This is the one place this plan deviates from "no new dependencies beyond
react-native-gifted-charts" — for a concrete, verified technical reason,
not a preference.** `react-native-gifted-charts`'s `peerDependencies`
list both `expo-linear-gradient` and `react-native-linear-gradient`
(confirmed via `npm view react-native-gifted-charts peerDependencies`).
Unpacking the actual published package (`npm pack react-native-gifted-charts@1.4.77`)
shows `dist/index.js` re-exports `BarChart` from `./BarChart`, whose
`index.js` unconditionally imports `RenderStackBars`, which unconditionally
imports `../Components/common/LinearGradient` — a module whose **top-level**
code (not gated behind any gradient-usage check) does:

```js
try {
  LinearGradient = require('react-native-linear-gradient').LinearGradient
} catch (e) {
  try {
    LinearGradient = require('expo-linear-gradient').LinearGradient
  } catch (e) {
    throw new Error('Gradient package was not found. Make sure "react-native-linear-gradient" or "expo-linear-gradient" is installed')
  }
}
```

Because this runs the moment **anything** imports `react-native-gifted-charts`
(module evaluation order, not lazy/on-demand), installing only
`react-native-gifted-charts` will crash Reports at import time — even
though this plan's chart usage (Task 23) never enables gradient fills.
`react-native-linear-gradient` requires native linking and is **not**
Expo-Go-safe; `expo-linear-gradient` is a standard first-party Expo module
already shipped inside the Expo Go client for matching SDK versions, so it
is the only Expo-Go-compatible way to satisfy this. Both packages'
`peerDependencies`/`gifted-charts-core` dependency were verified directly
against the installed tarball contents, not assumed from documentation.

- [ ] **Step 1: Install both packages, pinning the version this plan was verified against**

```bash
cd mobile && npm install react-native-gifted-charts@1.4.77 && npx expo install expo-linear-gradient
```

- [ ] **Step 2: Confirm the import chain resolves**

Run:
```bash
cd mobile && node -e "require.resolve('react-native-gifted-charts'); require.resolve('expo-linear-gradient'); console.log('ok')"
```
Expected: prints `ok`. (This only confirms Node module resolution, not
Metro/RN bundling — the real smoke test is Task 23's manual Expo run.)

- [ ] **Step 3: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: exit 0 (no `.tsx` changes yet in this task, this just confirms
the new packages don't break the existing build).

- [ ] **Step 4: Commit**

```bash
cd mobile && git add package.json package-lock.json
git commit -m "chore(mobile): install react-native-gifted-charts and its expo-linear-gradient peer"
```

---

### Task 22: `useCashFlowReport` hook

**Files:**
- Create: `mobile/src/reports/useCashFlowReport.ts`

**Interfaces:**
- Produces: `useCashFlowReport({ start, end }: { start: string; end: string })` —
  `useQuery` over `GET /v1/reports/cash-flow?start&end&group_by=day`, key
  `['reports', 'cash-flow', start, end]`, returning
  `components['schemas']['CashFlowReport']`. Consumed by Task 23.
  `group_by` is hardcoded to `'day'` (not exposed as a UI toggle this
  phase — a single month's worth of daily points is exactly what the
  trend chart needs; `week` grouping is left for a future iteration).

- [ ] **Step 1: Implement**

```ts
// mobile/src/reports/useCashFlowReport.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useCashFlowReport({ start, end }: { start: string; end: string }) {
  return useQuery({
    queryKey: ['reports', 'cash-flow', start, end],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/reports/cash-flow', {
        params: { query: { start, end, group_by: 'day' } },
      })
      if (error || !data) throw new Error('failed_to_load_cash_flow_report')
      return data
    },
  })
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/reports/useCashFlowReport.ts`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/reports/useCashFlowReport.ts
git commit -m "feat(mobile): add useCashFlowReport hook"
```

---

### Task 23: Reports screen assembly

**Files:**
- Modify: `mobile/app/(app)/(tabs)/reports.tsx` (replace the Phase 1
  `ComingSoonScreen` placeholder)

**Interfaces:**
- Consumes: `useCashFlowReport` (Task 22), `toTrendLines`/`toCategoryBarData`/
  `toBudgetVsActualBarData` (Task 6), `startOfMonth`/`endOfMonth`/
  `addMonths`/`toDateOnly`/`formatMonthYearID` (Task 4), `formatRupiah`,
  `LineChart`/`BarChart` from `react-native-gifted-charts` (Task 21).
- Produces: nothing new consumed elsewhere.

`{start,end}` for `GET /v1/reports/cash-flow` use `date` format (not
`date-time`) per the query parameter schema in `openapi.yaml`, so this task
formats with `toDateOnly` (Task 4's fix-round addendum), **not**
`toRFC3339(...).slice(0, 10)` — the latter converts to UTC before slicing,
which silently shifts the date backward by one day in this app's fixed
`Asia/Jakarta` (UTC+7) timezone whenever `startOfMonth`/`endOfMonth`'s
local-midnight `Date` crosses into the previous UTC day (e.g. local
midnight Aug 1 becomes `2026-07-31T17:00:00.000Z`, so `.slice(0, 10)` would
wrongly yield `"2026-07-31"`). `toDateOnly` reads the `Date`'s own local
components instead, so it isn't affected by the UTC conversion.

- [ ] **Step 1: Implement**

```tsx
// mobile/app/(app)/(tabs)/reports.tsx
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons-2'
import { BarChart, LineChart } from 'react-native-gifted-charts'
import { PocketCard } from '../../../src/components/PocketCard'
import { formatRupiah } from '../../../src/format/money'
import { addMonths, endOfMonth, formatMonthYearID, startOfMonth, toDateOnly } from '../../../src/format/date'
import { toBudgetVsActualBarData, toCategoryBarData, toTrendLines } from '../../../src/reports/chartData'
import { useCashFlowReport } from '../../../src/reports/useCashFlowReport'

const COLORS = {
  primary: '#0E6B58',
  accent: '#C9A227',
  danger: '#B23B33',
}

export default function ReportsScreen() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const start = toDateOnly(startOfMonth(month))
  const end = toDateOnly(endOfMonth(month))
  const report = useCashFlowReport({ start, end })

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$4">
          <Text fontFamily="$heading" fontSize="$4" color="$color">
            Laporan
          </Text>

          <XStack alignItems="center" justifyContent="space-between">
            <XStack onPress={() => setMonth((prev) => addMonths(prev, -1))} padding="$2">
              <ChevronLeft size={20} color="$color" />
            </XStack>
            <Text fontFamily="$body" fontSize="$3" color="$color">
              {formatMonthYearID(month)}
            </Text>
            <XStack onPress={() => setMonth((prev) => addMonths(prev, 1))} padding="$2">
              <ChevronRight size={20} color="$color" />
            </XStack>
          </XStack>

          {report.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : report.isError ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat laporan. Coba lagi nanti.
              </Text>
            </PocketCard>
          ) : report.data && report.data.income === 0 && report.data.expenses === 0 ? (
            <PocketCard tone="muted">
              <Text fontFamily="$body" fontSize="$2" color="$kulit" textAlign="center">
                Belum ada transaksi di bulan ini.
              </Text>
            </PocketCard>
          ) : report.data ? (
            <>
              <XStack gap="$3">
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    PEMASUKAN
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color="$primary">
                    {formatRupiah(report.data.income)}
                  </Text>
                </PocketCard>
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    PENGELUARAN
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color="$danger">
                    {formatRupiah(report.data.expenses)}
                  </Text>
                </PocketCard>
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    ARUS KAS BERSIH
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color={report.data.net_cash_flow >= 0 ? '$primary' : '$danger'}>
                    {formatRupiah(report.data.net_cash_flow)}
                  </Text>
                </PocketCard>
              </XStack>

              <PocketCard>
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  TREN ARUS KAS
                </Text>
                {(() => {
                  const { income, expenses } = toTrendLines(report.data.trend)
                  return (
                    <LineChart
                      data={income}
                      data2={expenses}
                      color={COLORS.primary}
                      color2={COLORS.danger}
                      thickness={2}
                      hideRules
                      yAxisTextStyle={{ color: '#7C6A5B', fontSize: 10 }}
                      xAxisLabelTextStyle={{ color: '#7C6A5B', fontSize: 10 }}
                      curved
                      initialSpacing={8}
                      noOfSections={4}
                      height={160}
                    />
                  )
                })()}
                <XStack gap="$4">
                  <XStack alignItems="center" gap="$1">
                    <YStack width={8} height={8} borderRadius={4} backgroundColor="$primary" />
                    <Text fontFamily="$body" fontSize="$1" color="$kulit">
                      Pemasukan
                    </Text>
                  </XStack>
                  <XStack alignItems="center" gap="$1">
                    <YStack width={8} height={8} borderRadius={4} backgroundColor="$danger" />
                    <Text fontFamily="$body" fontSize="$1" color="$kulit">
                      Pengeluaran
                    </Text>
                  </XStack>
                </XStack>
              </PocketCard>

              {report.data.category_breakdown.length > 0 ? (
                <PocketCard>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    PENGELUARAN PER KATEGORI
                  </Text>
                  <BarChart
                    data={toCategoryBarData(report.data.category_breakdown, COLORS.primary)}
                    horizontal
                    barWidth={18}
                    spacing={16}
                    yAxisLabelWidth={90}
                    barBorderRadius={4}
                    height={report.data.category_breakdown.length * 36}
                  />
                </PocketCard>
              ) : null}

              {report.data.budget_vs_actual.length > 0 ? (
                <PocketCard>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    ANGGARAN VS AKTUAL
                  </Text>
                  <BarChart
                    data={toBudgetVsActualBarData(report.data.budget_vs_actual, {
                      budgeted: COLORS.primary,
                      actualOver: COLORS.danger,
                      actualUnder: COLORS.accent,
                    })}
                    barWidth={14}
                    barBorderRadius={3}
                    yAxisTextStyle={{ color: '#7C6A5B', fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: '#7C6A5B', fontSize: 9 }}
                    height={160}
                  />
                  <XStack gap="$4">
                    <XStack alignItems="center" gap="$1">
                      <YStack width={8} height={8} borderRadius={4} backgroundColor="$primary" />
                      <Text fontFamily="$body" fontSize="$1" color="$kulit">
                        Dianggarkan
                      </Text>
                    </XStack>
                    <XStack alignItems="center" gap="$1">
                      <YStack width={8} height={8} borderRadius={4} backgroundColor="$accent" />
                      <Text fontFamily="$body" fontSize="$1" color="$kulit">
                        Aktual (sesuai anggaran)
                      </Text>
                    </XStack>
                    <XStack alignItems="center" gap="$1">
                      <YStack width={8} height={8} borderRadius={4} backgroundColor="$danger" />
                      <Text fontFamily="$body" fontSize="$1" color="$kulit">
                        Aktual (lebih dari anggaran)
                      </Text>
                    </XStack>
                  </XStack>
                </PocketCard>
              ) : null}
            </>
          ) : null}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint "app/(app)/(tabs)/reports.tsx"`
Expected: both exit 0. `react-native-gifted-charts`' prop names
(`data`/`data2`/`color`/`color2`/`horizontal`/`frontColor`/`spacing`/etc.)
were verified against the actual shipped `.d.ts` files in
`gifted-charts-core@0.1.81` during planning, but this is the first time
they're used against real screen data in this codebase — if any prop
fails to type-check, consult
`mobile/node_modules/gifted-charts-core/dist/{LineChart,BarChart}/types.d.ts`
directly rather than guessing.

- [ ] **Step 3: Manual smoke test**

Run: `cd mobile && npx expo start`, open the app, log in, and open the
Laporan tab specifically (this is the one screen in this plan whose
correctness can't be fully confirmed by `tsc`/`eslint` alone — a bad
runtime prop combination in a chart library can render blank/crash without
a type error). Confirm the trend chart, category bars, and budget-vs-actual
bars all render without a red-box error.

- [ ] **Step 4: Commit**

```bash
cd mobile && git add "app/(app)/(tabs)/reports.tsx"
git commit -m "feat(mobile): wire Reports screen to GET /v1/reports/cash-flow with charts"
```

---

## Task Group F — More / Profile

### Task 24: `useUpdateProfile` hook

**Files:**
- Create: `mobile/src/profile/useUpdateProfile.ts`

**Interfaces:**
- Produces: `useUpdateProfile()` — `useMutation` calling
  `PUT /v1/me` (note: `PUT`, not `PATCH` — `updateCurrentUser`'s
  `UpdateProfileRequest` requires **all** of `display_name, currency,
  timezone, payday, minimum_buffer, ai_consent` per `openapi.yaml`, so
  every call must include the current, unedited values for the fields the
  UI treats as read-only), updates the `['me']` query cache with the fresh
  `User` on success (rather than just invalidating, to avoid a refetch
  flash). Consumed by Task 26.

- [ ] **Step 1: Implement**

```ts
// mobile/src/profile/useUpdateProfile.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import type { components } from '../api/client'

type UpdateProfileRequest = components['schemas']['UpdateProfileRequest']

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateProfileRequest) => {
      const { data, error, response } = await api.PUT('/v1/me', { body: input })
      if (error || !data) throw new ApiError('failed_to_update_profile', response.status)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data)
    },
  })
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/profile/useUpdateProfile.ts`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/profile/useUpdateProfile.ts
git commit -m "feat(mobile): add useUpdateProfile hook"
```

---

### Task 25: `useLogoutAll` + `useExportData` hooks

**Files:**
- Create: `mobile/src/auth/useLogoutAll.ts`
- Create: `mobile/src/profile/useExportData.ts`

**Interfaces:**
- Produces: `useLogoutAll()` — `useMutation` calling
  `POST /v1/auth/logout-all` (no body — confirmed against `openapi.yaml`;
  unlike `logout`, it needs no `refresh_token`, since it revokes every
  session for the authenticated user server-side), then clears the local
  session exactly like `useLogout` does. Consumed by Task 26.
- Produces: `useExportData()` — `useMutation` calling `POST /v1/exports`,
  then handing the JSON result to React Native's built-in `Share.share`
  (from `'react-native'` core — no new dependency, and no
  `expo-file-system` write needed since `Share.share({ message })` accepts
  a plain string directly on both platforms). This is the "download my
  data" action — `POST /v1/exports` is a synchronous full data dump per
  its spec description, not a report visualization, so it's on the More
  screen, not Reports. Consumed by Task 26.

- [ ] **Step 1: Implement `useLogoutAll`**

```ts
// mobile/src/auth/useLogoutAll.ts
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { clearRefreshToken } from './secureTokens'
import { useAuthStore } from './store'

export function useLogoutAll() {
  return useMutation({
    mutationFn: async () => {
      await api.POST('/v1/auth/logout-all')
    },
    onSettled: async () => {
      await clearRefreshToken()
      useAuthStore.getState().clearSession()
    },
  })
}
```

- [ ] **Step 2: Implement `useExportData`**

```ts
// mobile/src/profile/useExportData.ts
import { useMutation } from '@tanstack/react-query'
import { Share } from 'react-native'
import { api } from '../api/client'
import { ApiError } from '../api/errors'

export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.POST('/v1/exports')
      if (error || !data) throw new ApiError('failed_to_export_data', response.status)
      await Share.share({
        title: 'Data SakuPlan',
        message: JSON.stringify(data, null, 2),
      })
      return data
    },
  })
}
```

- [ ] **Step 3: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint src/auth/useLogoutAll.ts src/profile/useExportData.ts`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
cd mobile && git add src/auth/useLogoutAll.ts src/profile/useExportData.ts
git commit -m "feat(mobile): add logout-all and export-data hooks"
```

---

### Task 26: More screen assembly

**Files:**
- Modify: `mobile/app/(app)/(tabs)/more.tsx` (replace the Phase 1
  `ComingSoonScreen` placeholder)

**Interfaces:**
- Consumes: `useCurrentUser` (Phase 1), `useUpdateProfile` (Task 24),
  `useLogout` (Phase 1), `useLogoutAll` (Task 25), `useExportData` (Task
  25), `RupiahInput` (Task 3).
- Produces: nothing new consumed elsewhere. After `useLogout`/`useLogoutAll`
  clear the session, `app/(app)/_layout.tsx`'s existing
  `if (!accessToken) return <Redirect href="/(auth)/login" />` (Phase 1,
  unchanged) handles navigation automatically — no explicit `router.replace`
  needed here.

Currency and timezone are rendered as read-only text, not editable inputs
— this app is IDR/Asia-Jakarta-only in practice (Register hardcodes
`Currency: "IDR"`, `Timezone: "Asia/Jakarta"`) and there's no in-app
currency-conversion or timezone-migration logic to make changing them safe.
The submit handler still sends the user's *current* `currency`/`timezone`
values in the `PUT` body, since `UpdateProfileRequest` requires them.

Account deletion (USER-004) and notification preferences (NOTIF-001..004)
render as inert rows — tapping does nothing, each with a code comment
explaining why, matching Phase 1's convention for the inert Google-auth
buttons.

- [ ] **Step 1: Implement**

```tsx
// mobile/app/(app)/(tabs)/more.tsx
import { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Checkbox, Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { Check } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../../src/components/PocketCard'
import { RupiahInput } from '../../../src/components/RupiahInput'
import { useCurrentUser } from '../../../src/auth/useCurrentUser'
import { useLogout } from '../../../src/auth/useLogout'
import { useLogoutAll } from '../../../src/auth/useLogoutAll'
import { useUpdateProfile } from '../../../src/profile/useUpdateProfile'
import { useExportData } from '../../../src/profile/useExportData'

// Placeholder: NOTIF-001..004 have zero backend support (confirmed via
// docs/P0_GAP_ANALYSIS.md) — no preferences model, no delivery, nothing to
// wire this row up to yet.
function handleNotifications() {}

// Placeholder: USER-004 (account deletion) has zero backend support — the
// `deletion_pending` status exists in the domain/schema but no endpoint,
// handler, or job ever sets or drives it.
function handleDeleteAccount() {}

export default function MoreScreen() {
  const { data: user, isLoading } = useCurrentUser()
  const logout = useLogout()
  const logoutAll = useLogoutAll()
  const updateProfile = useUpdateProfile()
  const exportData = useExportData()

  const [initialized, setInitialized] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [payday, setPayday] = useState(1)
  const [minimumBuffer, setMinimumBuffer] = useState(0)
  const [aiConsent, setAiConsent] = useState(false)
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)

  useEffect(() => {
    if (user && !initialized) {
      setDisplayName(user.display_name)
      setPayday(user.payday)
      setMinimumBuffer(user.minimum_buffer)
      setAiConsent(user.ai_consent)
      setInitialized(true)
    }
  }, [user, initialized])

  const userInitial = user?.display_name?.trim()?.[0]?.toUpperCase() ?? '?'

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

              <PocketCard elevated>
                <Text fontFamily="$heading" fontSize="$4" color="$color">
                  Profil
                </Text>

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

- [ ] **Step 2: Type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx eslint "app/(app)/(tabs)/more.tsx"`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "app/(app)/(tabs)/more.tsx"
git commit -m "feat(mobile): wire More screen to profile, logout, and export"
```

---

## Task 27: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full mobile test suite**

Run: `cd mobile && npx jest`
Expected: all suites pass, including every new test file from this plan:
`idempotencyKey.test.ts` (2), `errors.test.ts` (1), `money.test.ts` (8),
`date.test.ts` (7), `budgetMath.test.ts` (4), `chartData.test.ts` (3),
`accountTypeLabels.test.ts` (1), `transactionDisplay.test.ts` (8),
`riskLevel.test.ts` (3) — alongside every Phase 1 suite
(`refreshInterceptor.test.ts`, `store.test.ts`, `billUrgency.test.ts`,
Phase 1's `money.test.ts` originals).

- [ ] **Step 2: Run full type-check and lint**

Run: `cd mobile && npx tsc --noEmit && npx expo lint`
Expected: both exit 0.

- [ ] **Step 3: Manual verification in Expo**

Start the app (`cd mobile && npx expo start`) and walk through, on a fresh
account with zero accounts:
- **Transaksi**: empty state shows "Tambahkan Akun Pertamamu"; create an
  account of each type once to confirm the type chips and `spendable`
  default behave (the last-created one is fine to keep). Confirm the
  fast-entry form appears once an account exists; log an income and an
  expense transaction; confirm they appear at the top of "Riwayat
  Transaksi"; log a second account and confirm Transfer becomes
  selectable; log an adjustment with a reason; confirm the reversal flow
  on one transaction (expand → type a reason → confirm → item updates,
  "Batalkan Transaksi" no longer shows on it); scroll to trigger
  `onEndReached` if there are more than ~10 transactions.
- **Anggaran**: confirm the empty state + wizard when no active budget
  exists; run through Basics → "Dapatkan Saran Alokasi" → confirm
  allocations populate → Allocate → adjust one category → confirm "Belum
  dialokasikan" updates live → Review → "Buat & Aktifkan Anggaran" →
  confirm the screen switches to the read-only active view with the
  correct period, allocations, and safe-to-spend daily/risk badge.
- **Laporan**: confirm the current month's summary/trend/category/
  budget-vs-actual sections render (budget-vs-actual only appears once an
  active budget with matching-category spend exists); navigate to the
  previous month via the `‹` arrow and confirm the data changes.
- **Lainnya**: confirm the profile form is pre-filled from `GET /v1/me`,
  edit the display name and save, confirm "Perubahan disimpan." appears
  and `GET /v1/me` reflects it on next app reload; tap "Unduh Data Saya"
  and confirm the native share sheet opens with JSON content; tap "Keluar"
  and confirm it returns to the Login screen; log back in, tap "Keluar
  dari semua perangkat", confirm the inline confirmation, confirm it also
  returns to Login; confirm "Notifikasi" and "Hapus Akun" rows are visibly
  inert with a "Segera hadir" tag and do nothing when tapped.

- [ ] **Step 4: Update `docs/PROGRESS.md`**

Add an entry noting Phase 2 of the `SakuPlan.dc.html` implementation is
complete: Transactions (fast-entry form, infinite-scroll list, reversal),
Budgets (active view, create-and-activate wizard with rule-based
recommendations), Reports (cash-flow trend/category/budget-vs-actual
charts via `react-native-gifted-charts`), and More (profile edit, logout,
logout-all, data export, inert placeholders for account deletion and
notifications) are all wired to the real backend; no product areas remain
on `ComingSoonScreen` placeholders except genuinely-unbuildable
sub-features (account deletion, notifications) called out explicitly as
such.

- [ ] **Step 5: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan" && git add docs/PROGRESS.md
git commit -m "docs: record Phase 2 dc-prototype implementation progress"
```

---

## Self-Review Notes

- **Orphaned-draft race condition (Task 18):** `useCreateAndActivateBudget`
  makes `POST /v1/budgets` then `POST /v1/budgets/{id}/activate` as two
  sequential calls under one mutation. If the first succeeds and the
  second fails (e.g. a concurrent request from another device created and
  activated a budget for the same period in between), the draft is
  created but never activated — and since there's no "list drafts"
  endpoint, it becomes invisible to the mobile UI while still blocking
  future budget creation via the 409 overlap check. This is an accepted,
  extremely low-probability residual risk for this MVP (single-user,
  single-device in practice); a future phase should either add a
  `list`/`delete` drafts endpoint server-side or make budget creation
  properly atomic.
- **`react-native-gifted-charts` prop usage is verified against the
  library's actual shipped `.d.ts` types (Task 21/23), but not against a
  live Metro/Expo Go render** — this planning pass confirmed
  `data`/`data2`/`color`/`color2`/`horizontal`/`frontColor`/`spacing`/etc.
  all exist on the real `lineDataItem`/`barDataItem` interfaces (by
  unpacking the published tarballs directly), which rules out "prop
  doesn't exist" mistakes, but visual layout/sizing (heights, spacing,
  label truncation on narrow screens) can only be confirmed by Task 23's
  manual Expo smoke test.
- **`expo-linear-gradient` dependency (Task 21) is a load-bearing
  discovery, not a guess:** confirmed by unpacking
  `react-native-gifted-charts@1.4.77` and tracing its static import graph
  (`index.js` → `BarChart` → `RenderStackBars` →
  `Components/common/LinearGradient`, whose top-level `require` executes
  on any import of the package, gradient-usage or not). Skipping this
  install would make the Reports screen crash immediately on load, not
  merely look wrong.
- **Transfer requires 2+ accounts (Task 15):** the fast-entry form hides
  the Transfer type entirely below that threshold rather than showing it
  disabled, since a disabled-but-visible option with no destination
  accounts to pick from would be a confusing dead end.
- **No date picker for backdated transactions beyond "yesterday" (Task
  15):** deliberately scoped down from a full calendar widget since no
  Expo-Go-safe date-picker dependency is installed and building one from
  scratch wasn't judged worth the complexity for this phase; flagged
  explicitly rather than silently narrowing scope.
- **`group_by=week` on the cash-flow report is never exposed (Task 22):**
  the API supports it, but a single month of daily points is what the
  trend chart is designed around this phase; adding a day/week toggle is
  a cheap follow-up once this ships.
- **Currency/timezone are permanently read-only in the Profile form (Task
  26):** this mirrors the app's existing IDR/Asia-Jakarta-only assumption
  (baked into Register's hardcoded registration payload) rather than
  introducing new multi-currency/timezone-migration logic this phase
  doesn't otherwise need.
- **`useLogoutAll`'s inline confirm (Task 26) is a from-scratch two-state
  toggle, not a native `Alert.alert` confirm dialog** — this was a
  deliberate choice to keep the interaction visually consistent with the
  rest of the screen (Tamagui-styled inline buttons) rather than dropping
  into a platform-native modal that would look inconsistent with the
  prototype's design language.
