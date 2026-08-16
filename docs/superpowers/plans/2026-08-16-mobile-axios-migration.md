# Mobile HTTP Client Migration: openapi-fetch → axios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `openapi-fetch` with `axios` as the mobile app's HTTP client, across the shared client/interceptor and all 24 hook files that call it, with no user-visible behavior change.

**Architecture:** `src/api/client.ts` creates a single `axios` instance instead of an `openapi-fetch` client. `src/api/refreshInterceptor.ts` attaches axios request/response interceptors (auth header + 401-refresh-and-retry) instead of an openapi-fetch middleware object — this is structurally simpler than the fetch-based version because axios request configs are plain objects, not one-shot consumed streams, so retrying is just re-invoking with the same config (no more request-cloning `WeakMap`). Every hook converts from `openapi-fetch`'s resolve-always `{ data, error, response }` contract to idiomatic axios try/catch, typed per-call via the generated `components`/`operations` types (still produced by the unaffected `openapi-typescript` `generate:api` script).

**Tech Stack:** React Native 0.86.2, Expo SDK 57, TypeScript (strict), `@tanstack/react-query` v5, `zustand` v5, `axios` (new), `openapi-typescript`-generated types.

**Spec:** `docs/superpowers/specs/2026-08-16-mobile-axios-migration-design.md`

## Global Constraints

- No user-visible behavior change beyond what axios's throw-on-non-2xx contract forces (e.g. `useLogout`/`useLogoutAll` must keep swallowing failures, `useActiveBudget` must keep treating 404 as "no active budget", `useHydrateSession` must keep distinguishing "server said the refresh token is invalid" from "network error, keep the token").
- Every converted call keeps response/body typing via the generated `components`/`operations` types from `src/api/generated/types.ts` — no `any`.
- Never log access tokens, refresh tokens, or full auth payloads (existing project-wide rule; applies directly to `refreshInterceptor.ts`).
- No changes to money/financial calculation logic — this migration only touches the HTTP transport layer.
- Code style: no semicolons, single quotes, 2-space indent (match existing files exactly — this is not enforced by a Prettier config in this repo, it's just the prevailing style every existing file uses).
- Run `npx eslint <file>` after touching a file, and `npx tsc --noEmit` at the end of every task, from the `mobile/` directory.

---

## Task 1: Shared HTTP infrastructure (axios client, interceptors, error helper)

**Files:**
- Modify: `mobile/package.json` (add `axios` dependency via `npm install`)
- Modify: `mobile/src/api/client.ts`
- Modify: `mobile/src/api/refreshInterceptor.ts`
- Modify: `mobile/src/api/refreshInterceptor.test.ts`
- Modify: `mobile/src/api/errors.ts`

**Interfaces:**
- Produces: `api` (default export of `src/api/client.ts`, an `AxiosInstance`) — every later task imports `import { api } from '../api/client'` and calls `api.get<T>(url, config)` / `api.post<T>(url, data, config)` / `api.put<T>(url, data, config)`.
- Produces: `export type { components, operations }` from `src/api/client.ts` — later tasks import these for response/body typing (`operations['listAccounts']['responses'][200]['content']['application/json']` for endpoints with inline/wrapper response shapes not backed by a named schema; `components['schemas']['X']` for named entities).
- Produces: `statusFromError(error: unknown, fallbackStatus = 500): number` from `src/api/errors.ts` — later tasks use this in `catch` blocks that need to build an `ApiError` with the right HTTP status, replacing the old `(response as unknown as { status: number }).status ?? 500` cast workaround three hooks currently need.
- Produces: `installAuthInterceptors(client: AxiosInstance, baseUrl: string): void`, `shouldAttemptRefresh(status: number | undefined, alreadyRetried: boolean): boolean`, `buildRetryConfig(config, newAccessToken: string)` from `src/api/refreshInterceptor.ts`.

- [ ] **Step 1: Install axios**

Run from `mobile/`:
```bash
npm install axios
```

- [ ] **Step 2: Rewrite `src/api/errors.ts`**

```ts
import { isAxiosError } from 'axios'

// Thrown by mutation hooks in place of a bare Error so components can
// branch on HTTP status (e.g. 409 idempotency/overlap conflicts) via
// `error instanceof ApiError && error.status === 409`.
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Extracts the HTTP status from a caught axios error, falling back to
// `fallbackStatus` for non-axios errors or responses with no status
// (network failures, timeouts).
export function statusFromError(error: unknown, fallbackStatus = 500): number {
  return isAxiosError(error) ? (error.response?.status ?? fallbackStatus) : fallbackStatus
}
```

- [ ] **Step 3: Rewrite `src/api/refreshInterceptor.ts`**

```ts
import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios'
import { useAuthStore } from '../auth/store'
import { clearRefreshToken, getRefreshToken, saveRefreshToken } from '../auth/secureTokens'
import type { components } from './generated/types'

type RetryableConfig = AxiosRequestConfig & { _retry?: boolean }

export function shouldAttemptRefresh(status: number | undefined, alreadyRetried: boolean): boolean {
  return status === 401 && !alreadyRetried
}

async function refreshSession(baseUrl: string): Promise<string | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null

  try {
    const { data } = await axios.post<components['schemas']['TokenPair']>(
      `${baseUrl}/v1/auth/refresh`,
      { refresh_token: refreshToken },
    )
    await saveRefreshToken(data.refresh_token)
    useAuthStore.getState().setSession(data.access_token, data.user)
    return data.access_token
  } catch {
    // Treat any failure (invalid/expired token, network error, malformed
    // response, etc.) as a failed refresh - the caller clears the session
    // either way.
    return null
  }
}

export function buildRetryConfig(config: RetryableConfig, newAccessToken: string): RetryableConfig {
  const headers = AxiosHeaders.from(config.headers)
  headers.set('Authorization', `Bearer ${newAccessToken}`)
  return { ...config, headers, _retry: true }
}

export function installAuthInterceptors(client: AxiosInstance, baseUrl: string): void {
  client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetryableConfig | undefined
      const alreadyRetried = config?._retry === true
      if (!config || !shouldAttemptRefresh(error.response?.status, alreadyRetried)) {
        return Promise.reject(error)
      }

      const newAccessToken = await refreshSession(baseUrl)
      if (!newAccessToken) {
        await clearRefreshToken()
        useAuthStore.getState().clearSession()
        return Promise.reject(error)
      }

      return client(buildRetryConfig(config, newAccessToken))
    },
  )
}
```

- [ ] **Step 4: Rewrite `src/api/client.ts`**

```ts
import axios from 'axios'
import { installAuthInterceptors } from './refreshInterceptor'

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'

export const api = axios.create({ baseURL: baseUrl })
installAuthInterceptors(api, baseUrl)

export type { components, operations } from './generated/types'
```

- [ ] **Step 5: Rewrite `src/api/refreshInterceptor.test.ts`**

The old test file exercised `Request`/`Response`-cloning behavior that no longer
exists (axios configs are plain objects, not consumed streams). The new tests
cover the same guarantees (refresh trigger condition, auth header injection,
retry marker, body preservation) against the new signatures.

```ts
import { AxiosHeaders } from 'axios'
import { shouldAttemptRefresh, buildRetryConfig } from './refreshInterceptor'

describe('shouldAttemptRefresh', () => {
  it('returns true for a 401 status that has not already been retried', () => {
    expect(shouldAttemptRefresh(401, false)).toBe(true)
  })

  it('returns false for a 401 status that has already been retried once', () => {
    expect(shouldAttemptRefresh(401, true)).toBe(false)
  })

  it('returns false for a non-401 status', () => {
    expect(shouldAttemptRefresh(500, false)).toBe(false)
  })

  it('returns false when there is no status (network error, no response)', () => {
    expect(shouldAttemptRefresh(undefined, false)).toBe(false)
  })
})

describe('buildRetryConfig', () => {
  it('sets the Authorization header with the new access token', () => {
    const config = { url: '/v1/me', method: 'get', headers: new AxiosHeaders() }

    const retryConfig = buildRetryConfig(config, 'new-access-token-xyz')

    expect(AxiosHeaders.from(retryConfig.headers).get('Authorization')).toBe(
      'Bearer new-access-token-xyz',
    )
  })

  it('marks the config as retried', () => {
    const config = { url: '/v1/budgets', method: 'get', headers: new AxiosHeaders() }

    const retryConfig = buildRetryConfig(config, 'new-token')

    expect(retryConfig._retry).toBe(true)
  })

  it('preserves the request body from the original config', () => {
    const payload = { transaction_id: 'txn_123', amount: 10000 }
    const config = {
      url: '/v1/transactions',
      method: 'post',
      headers: new AxiosHeaders(),
      data: payload,
    }

    const retryConfig = buildRetryConfig(config, 'refreshed-token')

    expect(retryConfig.data).toEqual(payload)
  })
})
```

- [ ] **Step 6: Run the new tests**

```bash
cd mobile && npx jest src/api/refreshInterceptor.test.ts
```
Expected: PASS, 7 tests (4 `shouldAttemptRefresh` + 3 `buildRetryConfig`).

- [ ] **Step 7: Lint the touched files**

```bash
cd mobile && npx eslint src/api/client.ts src/api/refreshInterceptor.ts src/api/refreshInterceptor.test.ts src/api/errors.ts
```
Expected: 0 errors.

- [ ] **Step 8: Check tsc progress**

```bash
cd mobile && npx tsc --noEmit
```
Expected: errors now appear in every hook file that still calls `api.GET`/`api.POST`/`api.PUT` (24 files — `Property 'GET' does not exist on type 'AxiosInstance'` and similar). This is expected until Tasks 2–8 convert them; do not attempt to fix those files here.

- [ ] **Step 9: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/package.json mobile/package-lock.json mobile/src/api/client.ts mobile/src/api/refreshInterceptor.ts mobile/src/api/refreshInterceptor.test.ts mobile/src/api/errors.ts
git commit -m "feat(mobile): switch HTTP client infra from openapi-fetch to axios"
```

---

## Task 2: Convert auth hooks

**Files:**
- Modify: `mobile/src/auth/useLogin.ts`
- Modify: `mobile/src/auth/useRegister.ts`
- Modify: `mobile/src/auth/useLogout.ts`
- Modify: `mobile/src/auth/useLogoutAll.ts`
- Modify: `mobile/src/auth/useCurrentUser.ts`
- Modify: `mobile/src/auth/useHydrateSession.ts`

**Interfaces:**
- Consumes: `api` (`AxiosInstance`), `components` from `src/api/client.ts` (Task 1).

- [ ] **Step 1: Rewrite `src/auth/useLogin.ts`**

```ts
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { saveRefreshToken } from './secureTokens'
import { useAuthStore } from './store'
import type { components } from '../api/client'

interface LoginInput {
  email: string
  password: string
}

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      try {
        const { data } = await api.post<components['schemas']['TokenPair']>('/v1/auth/login', input)
        return data
      } catch {
        throw new Error('invalid_credentials')
      }
    },
    onSuccess: async (data) => {
      await saveRefreshToken(data.refresh_token)
      useAuthStore.getState().setSession(data.access_token, data.user)
    },
  })
}
```

- [ ] **Step 2: Rewrite `src/auth/useRegister.ts`**

```ts
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { saveRefreshToken } from './secureTokens'
import { useAuthStore } from './store'
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from './consentVersions'
import type { components } from '../api/client'

interface RegisterInput {
  email: string
  password: string
  displayName: string
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      try {
        const { data } = await api.post<components['schemas']['TokenPair']>('/v1/auth/register', {
          email: input.email,
          password: input.password,
          display_name: input.displayName,
          accepted_terms_version: CURRENT_TERMS_VERSION,
          accepted_privacy_version: CURRENT_PRIVACY_VERSION,
        })
        return data
      } catch {
        throw new Error('registration_failed')
      }
    },
    onSuccess: async (data) => {
      await saveRefreshToken(data.refresh_token)
      useAuthStore.getState().setSession(data.access_token, data.user)
    },
  })
}
```

- [ ] **Step 3: Rewrite `src/auth/useLogout.ts`**

```ts
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { clearRefreshToken, getRefreshToken } from './secureTokens'
import { useAuthStore } from './store'

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const refreshToken = await getRefreshToken()
      if (refreshToken) {
        try {
          await api.post('/v1/auth/logout', { refresh_token: refreshToken })
        } catch {
          // Best-effort: the session is cleared in onSettled below regardless
          // of whether the server-side revoke succeeds.
        }
      }
    },
    onSettled: async () => {
      await clearRefreshToken()
      useAuthStore.getState().clearSession()
    },
  })
}
```

- [ ] **Step 4: Rewrite `src/auth/useLogoutAll.ts`**

```ts
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { clearRefreshToken } from './secureTokens'
import { useAuthStore } from './store'

export function useLogoutAll() {
  return useMutation({
    mutationFn: async () => {
      try {
        await api.post('/v1/auth/logout-all')
      } catch {
        // Best-effort: the session is cleared in onSettled below regardless
        // of whether the server-side revoke succeeds.
      }
    },
    onSettled: async () => {
      await clearRefreshToken()
      useAuthStore.getState().clearSession()
    },
  })
}
```

- [ ] **Step 5: Rewrite `src/auth/useCurrentUser.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { components } from '../api/client'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const { data } = await api.get<components['schemas']['User']>('/v1/me')
        return data
      } catch {
        throw new Error('failed_to_load_profile')
      }
    },
  })
}
```

- [ ] **Step 6: Rewrite `src/auth/useHydrateSession.ts`**

The original distinguishes "the server explicitly rejected the refresh token"
(clear it) from "the request itself failed" (network error, timeout — keep the
token, retry next launch). With axios this maps directly to whether the thrown
error has a `response` (server replied) or not (no response reached at all).

```ts
import { useEffect } from 'react'
import { isAxiosError } from 'axios'
import { api } from '../api/client'
import { clearRefreshToken, getRefreshToken, saveRefreshToken } from './secureTokens'
import { useAuthStore } from './store'
import type { components } from '../api/client'

export function useHydrateSession(): void {
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      try {
        const refreshToken = await getRefreshToken()
        if (!refreshToken) {
          useAuthStore.getState().setHydrating(false)
          return
        }
        const { data } = await api.post<components['schemas']['TokenPair']>('/v1/auth/refresh', {
          refresh_token: refreshToken,
        })
        if (cancelled) return
        await saveRefreshToken(data.refresh_token)
        useAuthStore.getState().setSession(data.access_token, data.user)
        useAuthStore.getState().setHydrating(false)
      } catch (error) {
        if (cancelled) return
        // A server response (e.g. 401 for an expired/invalid refresh token)
        // means the token is genuinely invalid - clear it. A thrown error
        // with no response (network failure, timeout, secure-storage error,
        // etc.) is transient; preserve the token so the next app launch can
        // retry.
        if (isAxiosError(error) && error.response) {
          await clearRefreshToken()
        }
        useAuthStore.getState().setHydrating(false)
      }
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])
}
```

- [ ] **Step 7: Lint the touched files**

```bash
cd mobile && npx eslint src/auth/useLogin.ts src/auth/useRegister.ts src/auth/useLogout.ts src/auth/useLogoutAll.ts src/auth/useCurrentUser.ts src/auth/useHydrateSession.ts
```
Expected: 0 errors.

- [ ] **Step 8: Check tsc progress**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference the 6 files touched in this task; remaining errors are confined to the 18 hook files Tasks 3–8 haven't converted yet.

- [ ] **Step 9: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/auth/useLogin.ts mobile/src/auth/useRegister.ts mobile/src/auth/useLogout.ts mobile/src/auth/useLogoutAll.ts mobile/src/auth/useCurrentUser.ts mobile/src/auth/useHydrateSession.ts
git commit -m "feat(mobile): convert auth hooks to axios"
```

---

## Task 3: Convert accounts hooks

**Files:**
- Modify: `mobile/src/accounts/useAccounts.ts`
- Modify: `mobile/src/accounts/useAccountBalances.ts`
- Modify: `mobile/src/accounts/useCreateAccount.ts`

**Interfaces:**
- Consumes: `api`, `components`, `operations` from `src/api/client.ts`; `ApiError`, `statusFromError` from `src/api/errors.ts` (Task 1).

- [ ] **Step 1: Rewrite `src/accounts/useAccounts.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { operations } from '../api/client'

type AccountsResponse = operations['listAccounts']['responses'][200]['content']['application/json']

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      try {
        const { data } = await api.get<AccountsResponse>('/v1/accounts')
        return data.data
      } catch {
        throw new Error('failed_to_load_accounts')
      }
    },
  })
}
```

- [ ] **Step 2: Rewrite `src/accounts/useAccountBalances.ts`**

```ts
import { useQueries } from '@tanstack/react-query'
import { api } from '../api/client'
import type { operations } from '../api/client'

type AccountBalance =
  operations['getAccountBalance']['responses'][200]['content']['application/json']

export function useAccountBalances(accountIds: string[]) {
  const results = useQueries({
    queries: accountIds.map((id) => ({
      queryKey: ['accounts', id, 'balance'],
      queryFn: async () => {
        try {
          const { data } = await api.get<AccountBalance>(`/v1/accounts/${id}/balance`)
          return data
        } catch {
          throw new Error('failed_to_load_account_balance')
        }
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

- [ ] **Step 3: Rewrite `src/accounts/useCreateAccount.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import type { components } from '../api/client'

type CreateAccountRequest = components['schemas']['CreateAccountRequest']
type Account = components['schemas']['Account']

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAccountRequest) => {
      try {
        const { data } = await api.post<Account>('/v1/accounts', input)
        return data
      } catch (error) {
        throw new ApiError('failed_to_create_account', statusFromError(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
```

- [ ] **Step 4: Lint the touched files**

```bash
cd mobile && npx eslint src/accounts/useAccounts.ts src/accounts/useAccountBalances.ts src/accounts/useCreateAccount.ts
```
Expected: 0 errors.

- [ ] **Step 5: Check tsc progress**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference the 3 files touched in this task.

- [ ] **Step 6: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/accounts/useAccounts.ts mobile/src/accounts/useAccountBalances.ts mobile/src/accounts/useCreateAccount.ts
git commit -m "feat(mobile): convert accounts hooks to axios"
```

---

## Task 4: Convert categories, dashboard, safe-to-spend hooks

**Files:**
- Modify: `mobile/src/categories/useCategories.ts`
- Modify: `mobile/src/dashboard/useDashboard.ts`
- Modify: `mobile/src/budgets/useSafeToSpend.ts`

**Interfaces:**
- Consumes: `api`, `components`, `operations` from `src/api/client.ts` (Task 1).

- [ ] **Step 1: Rewrite `src/categories/useCategories.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { components, operations } from '../api/client'

type CategoryKind = components['schemas']['CategoryKind']
type CategoriesResponse =
  operations['listCategories']['responses'][200]['content']['application/json']

export function useCategories(kind?: CategoryKind) {
  return useQuery({
    queryKey: ['categories', kind ?? 'all'],
    queryFn: async () => {
      try {
        const { data } = await api.get<CategoriesResponse>('/v1/categories', {
          params: kind ? { kind } : {},
        })
        return data.data
      } catch {
        throw new Error('failed_to_load_categories')
      }
    },
  })
}
```

- [ ] **Step 2: Rewrite `src/dashboard/useDashboard.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { components } from '../api/client'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      try {
        const { data } = await api.get<components['schemas']['Dashboard']>('/v1/dashboard')
        return data
      } catch {
        throw new Error('failed_to_load_dashboard')
      }
    },
  })
}
```

- [ ] **Step 3: Rewrite `src/budgets/useSafeToSpend.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { components } from '../api/client'

export function useSafeToSpend() {
  return useQuery({
    queryKey: ['planning', 'safe-to-spend'],
    queryFn: async () => {
      try {
        const { data } = await api.get<components['schemas']['SafeToSpend']>(
          '/v1/planning/safe-to-spend',
        )
        return data
      } catch {
        throw new Error('failed_to_load_safe_to_spend')
      }
    },
  })
}
```

- [ ] **Step 4: Lint the touched files**

```bash
cd mobile && npx eslint src/categories/useCategories.ts src/dashboard/useDashboard.ts src/budgets/useSafeToSpend.ts
```
Expected: 0 errors.

- [ ] **Step 5: Check tsc progress**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference the 3 files touched in this task.

- [ ] **Step 6: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/categories/useCategories.ts mobile/src/dashboard/useDashboard.ts mobile/src/budgets/useSafeToSpend.ts
git commit -m "feat(mobile): convert categories, dashboard, safe-to-spend hooks to axios"
```

---

## Task 5: Convert bills and goals hooks

**Files:**
- Modify: `mobile/src/bills/useBills.ts`
- Modify: `mobile/src/goals/useGoals.ts`
- Modify: `mobile/src/goals/useContributeToGoal.ts`

**Interfaces:**
- Consumes: `api`, `components`, `operations` from `src/api/client.ts`; `ApiError`, `statusFromError` from `src/api/errors.ts`; `generateIdempotencyKey` from `src/api/idempotencyKey.ts` (unaffected by this migration).

- [ ] **Step 1: Rewrite `src/bills/useBills.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { operations } from '../api/client'

type BillsResponse = operations['listBills']['responses'][200]['content']['application/json']

export function useBills() {
  return useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      try {
        const { data } = await api.get<BillsResponse>('/v1/bills')
        return data.data
      } catch {
        throw new Error('failed_to_load_bills')
      }
    },
  })
}
```

- [ ] **Step 2: Rewrite `src/goals/useGoals.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { operations } from '../api/client'

type GoalsResponse = operations['listGoals']['responses'][200]['content']['application/json']

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      try {
        const { data } = await api.get<GoalsResponse>('/v1/goals')
        return data.data
      } catch {
        throw new Error('failed_to_load_goals')
      }
    },
  })
}
```

- [ ] **Step 3: Rewrite `src/goals/useContributeToGoal.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import { generateIdempotencyKey } from '../api/idempotencyKey'
import type { components } from '../api/client'

type GoalContribution = components['schemas']['GoalContribution']

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
      try {
        const { data } = await api.post<GoalContribution>(
          `/v1/goals/${goalId}/contributions`,
          { account_id: accountId, amount },
          { headers: { 'Idempotency-Key': generateIdempotencyKey() } },
        )
        return data
      } catch (error) {
        throw new ApiError('failed_to_contribute_to_goal', statusFromError(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
```

- [ ] **Step 4: Lint the touched files**

```bash
cd mobile && npx eslint src/bills/useBills.ts src/goals/useGoals.ts src/goals/useContributeToGoal.ts
```
Expected: 0 errors.

- [ ] **Step 5: Check tsc progress**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference the 3 files touched in this task.

- [ ] **Step 6: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/bills/useBills.ts mobile/src/goals/useGoals.ts mobile/src/goals/useContributeToGoal.ts
git commit -m "feat(mobile): convert bills and goals hooks to axios"
```

---

## Task 6: Convert budgets hooks

**Files:**
- Modify: `mobile/src/budgets/useActiveBudget.ts`
- Modify: `mobile/src/budgets/useCreateAndActivateBudget.ts`
- Modify: `mobile/src/budgets/useCreateBudgetRecommendation.ts`

**Interfaces:**
- Consumes: `api`, `components` from `src/api/client.ts`; `ApiError`, `statusFromError` from `src/api/errors.ts`.

- [ ] **Step 1: Rewrite `src/budgets/useActiveBudget.ts`**

`statusFromError(error, 0)` is used here (fallback `0`, not the default `500`)
so a non-axios error can never accidentally match the `=== 404` check below.

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { statusFromError } from '../api/errors'
import type { components } from '../api/client'

export function useActiveBudget() {
  return useQuery({
    queryKey: ['budgets', 'active'],
    queryFn: async () => {
      try {
        const { data } = await api.get<components['schemas']['Budget']>('/v1/budgets/active')
        return data
      } catch (error) {
        if (statusFromError(error, 0) === 404) return null
        throw new Error('failed_to_load_active_budget')
      }
    },
  })
}
```

- [ ] **Step 2: Rewrite `src/budgets/useCreateAndActivateBudget.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import type { components } from '../api/client'

type CreateBudgetRequest = components['schemas']['CreateBudgetRequest']
type Budget = components['schemas']['Budget']

export function useCreateAndActivateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateBudgetRequest) => {
      let draft: Budget
      try {
        const { data } = await api.post<Budget>('/v1/budgets', input)
        draft = data
      } catch (error) {
        throw new ApiError('failed_to_create_budget_draft', statusFromError(error))
      }

      try {
        const { data } = await api.post<Budget>(`/v1/budgets/${draft.id}/activate`)
        return data
      } catch (error) {
        throw new ApiError('failed_to_activate_budget', statusFromError(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'active'] })
    },
  })
}
```

- [ ] **Step 3: Rewrite `src/budgets/useCreateBudgetRecommendation.ts`**

```ts
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import type { components } from '../api/client'

type RecommendationRequest = components['schemas']['RecommendationRequest']
type Recommendation = components['schemas']['Recommendation']

export function useCreateBudgetRecommendation() {
  return useMutation({
    mutationFn: async (input: RecommendationRequest) => {
      try {
        const { data } = await api.post<Recommendation>('/v1/planning/recommendations', input)
        return data
      } catch (error) {
        throw new ApiError('failed_to_create_recommendation', statusFromError(error))
      }
    },
  })
}
```

- [ ] **Step 4: Lint the touched files**

```bash
cd mobile && npx eslint src/budgets/useActiveBudget.ts src/budgets/useCreateAndActivateBudget.ts src/budgets/useCreateBudgetRecommendation.ts
```
Expected: 0 errors.

- [ ] **Step 5: Check tsc progress**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference the 3 files touched in this task.

- [ ] **Step 6: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/budgets/useActiveBudget.ts mobile/src/budgets/useCreateAndActivateBudget.ts mobile/src/budgets/useCreateBudgetRecommendation.ts
git commit -m "feat(mobile): convert budgets hooks to axios"
```

---

## Task 7: Convert profile and reports hooks

**Files:**
- Modify: `mobile/src/profile/useUpdateProfile.ts`
- Modify: `mobile/src/profile/useExportData.ts`
- Modify: `mobile/src/reports/useCashFlowReport.ts`

**Interfaces:**
- Consumes: `api`, `components` from `src/api/client.ts`; `ApiError`, `statusFromError` from `src/api/errors.ts`.

- [ ] **Step 1: Rewrite `src/profile/useUpdateProfile.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import type { components } from '../api/client'

type UpdateProfileRequest = components['schemas']['UpdateProfileRequest']
type User = components['schemas']['User']

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateProfileRequest) => {
      try {
        const { data } = await api.put<User>('/v1/me', input)
        return data
      } catch (error) {
        throw new ApiError('failed_to_update_profile', statusFromError(error))
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data)
    },
  })
}
```

- [ ] **Step 2: Rewrite `src/profile/useExportData.ts`**

```ts
import { useMutation } from '@tanstack/react-query'
import { Share } from 'react-native'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import type { components } from '../api/client'

export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      let data: components['schemas']['Export']
      try {
        const result = await api.post<components['schemas']['Export']>('/v1/exports')
        data = result.data
      } catch (error) {
        throw new ApiError('failed_to_export_data', statusFromError(error))
      }
      await Share.share({
        title: 'Data SakuPlan',
        message: JSON.stringify(data, null, 2),
      })
      return data
    },
  })
}
```

- [ ] **Step 3: Rewrite `src/reports/useCashFlowReport.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { components } from '../api/client'

export function useCashFlowReport({ start, end }: { start: string; end: string }) {
  return useQuery({
    queryKey: ['reports', 'cash-flow', start, end],
    queryFn: async () => {
      try {
        const { data } = await api.get<components['schemas']['CashFlowReport']>(
          '/v1/reports/cash-flow',
          { params: { start, end, group_by: 'day' } },
        )
        return data
      } catch {
        throw new Error('failed_to_load_cash_flow_report')
      }
    },
  })
}
```

- [ ] **Step 4: Lint the touched files**

```bash
cd mobile && npx eslint src/profile/useUpdateProfile.ts src/profile/useExportData.ts src/reports/useCashFlowReport.ts
```
Expected: 0 errors.

- [ ] **Step 5: Check tsc progress**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors reference the 3 files touched in this task.

- [ ] **Step 6: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/profile/useUpdateProfile.ts mobile/src/profile/useExportData.ts mobile/src/reports/useCashFlowReport.ts
git commit -m "feat(mobile): convert profile and reports hooks to axios"
```

---

## Task 8: Convert transactions hooks

**Files:**
- Modify: `mobile/src/transactions/useCreateTransaction.ts`
- Modify: `mobile/src/transactions/useInfiniteTransactions.ts`
- Modify: `mobile/src/transactions/useReverseTransaction.ts`

**Interfaces:**
- Consumes: `api`, `components`, `operations` from `src/api/client.ts`; `ApiError`, `statusFromError` from `src/api/errors.ts`; `generateIdempotencyKey` from `src/api/idempotencyKey.ts`.

- [ ] **Step 1: Rewrite `src/transactions/useCreateTransaction.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import { generateIdempotencyKey } from '../api/idempotencyKey'
import type { components } from '../api/client'

type CreateTransactionRequest = components['schemas']['CreateTransactionRequest']
type Transaction = components['schemas']['Transaction']

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTransactionRequest) => {
      try {
        const { data } = await api.post<Transaction>('/v1/transactions', input, {
          headers: { 'Idempotency-Key': generateIdempotencyKey() },
        })
        return data
      } catch (error) {
        throw new ApiError('failed_to_create_transaction', statusFromError(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
```

- [ ] **Step 2: Rewrite `src/transactions/useInfiniteTransactions.ts`**

```ts
import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { operations } from '../api/client'

type TransactionsResponse =
  operations['listTransactions']['responses'][200]['content']['application/json']

export function useInfiniteTransactions() {
  return useInfiniteQuery({
    queryKey: ['transactions'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      try {
        const { data } = await api.get<TransactionsResponse>('/v1/transactions', {
          params: { limit: 50, cursor: pageParam },
        })
        return data
      } catch {
        throw new Error('failed_to_load_transactions')
      }
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  })
}
```

- [ ] **Step 3: Rewrite `src/transactions/useReverseTransaction.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import { generateIdempotencyKey } from '../api/idempotencyKey'
import type { components } from '../api/client'

type Transaction = components['schemas']['Transaction']

export function useReverseTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      try {
        const { data } = await api.post<Transaction>(
          `/v1/transactions/${id}/reverse`,
          { reason },
          { headers: { 'Idempotency-Key': generateIdempotencyKey() } },
        )
        return data
      } catch (error) {
        throw new ApiError('failed_to_reverse_transaction', statusFromError(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
```

- [ ] **Step 4: Lint the touched files**

```bash
cd mobile && npx eslint src/transactions/useCreateTransaction.ts src/transactions/useInfiniteTransactions.ts src/transactions/useReverseTransaction.ts
```
Expected: 0 errors.

- [ ] **Step 5: Check tsc — this must now be fully clean project-wide**

```bash
cd mobile && npx tsc --noEmit
```
Expected: PASS, 0 errors. All 24 hook files and the shared infra are now converted, so this is the first point since Task 1 where the whole project type-checks cleanly.

- [ ] **Step 6: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/transactions/useCreateTransaction.ts mobile/src/transactions/useInfiniteTransactions.ts mobile/src/transactions/useReverseTransaction.ts
git commit -m "feat(mobile): convert transactions hooks to axios"
```

---

## Task 9: Remove openapi-fetch, final verification, docs

**Files:**
- Modify: `mobile/package.json` (remove `openapi-fetch` via `npm uninstall`)
- Modify: `docs/PROGRESS.md`

- [ ] **Step 1: Confirm nothing still imports openapi-fetch**

```bash
cd mobile && grep -rn "openapi-fetch" src app
```
Expected: no matches (client.ts and refreshInterceptor.ts were rewritten in Task 1; nothing else ever imported it, per the audit done during planning).

- [ ] **Step 2: Uninstall the dependency**

```bash
cd mobile && npm uninstall openapi-fetch
```

- [ ] **Step 3: Full verification suite**

```bash
cd mobile && npx tsc --noEmit
```
Expected: PASS, 0 errors.

```bash
cd mobile && npx eslint .
```
Expected: 0 errors (pre-existing warnings in `tamagui.config.ts`, if any, are unrelated and fine).

```bash
cd mobile && npx jest
```
Expected: PASS, same total test count as before this migration —
`refreshInterceptor.test.ts` still has 7 tests, just redistributed (3
`shouldAttemptRefresh` + 4 `buildRetryRequest` before → 4
`shouldAttemptRefresh` + 3 `buildRetryConfig` after) and testing the new
axios-based signatures instead of the old `Request`/`Response`-based ones.

- [ ] **Step 4: Update `docs/PROGRESS.md`**

Append this entry at the end of the file, matching the existing
`## YYYY-MM-DD — Title` / `### Requirement IDs implemented` / etc. format
used by every prior entry. Fill in the three `[paste ...]` spots with the
literal output from Step 3 above (never write "PASS" without having actually
run the command and seen it pass, per this project's hard rules):

```markdown
## 2026-08-16 — Mobile HTTP client migration: openapi-fetch → axios

### Requirement IDs implemented

None (infrastructure migration, user-directed — see
`docs/superpowers/specs/2026-08-16-mobile-axios-migration-design.md`).

### Motivation

Two drivers: (1) a real bug found during first physical-device testing —
React Native's `fetch()` resolves with its own `FetchResponse` class, which
is not `instanceof` the environment's global `Response`, so `openapi-fetch`'s
middleware guard (`result instanceof Response`) threw on every request; (2)
explicit user preference for `axios` going forward.

### Files changed

- `mobile/src/api/client.ts` — `axios.create({ baseURL })` instead of
  `openapi-fetch`'s `createClient`.
- `mobile/src/api/refreshInterceptor.ts` — axios request/response
  interceptors instead of an openapi-fetch middleware object; retry is now a
  plain config re-invocation instead of a `Request`-cloning `WeakMap` dance.
- `mobile/src/api/refreshInterceptor.test.ts` — rewritten against the new
  `shouldAttemptRefresh(status, alreadyRetried)` / `buildRetryConfig`
  signatures.
- `mobile/src/api/errors.ts` — added `statusFromError(error, fallbackStatus)`,
  replacing a `(response as unknown as { status: number }).status ?? 500`
  cast that three hooks previously needed.
- All 24 hook files calling the API client (accounts, auth, bills, budgets,
  categories, dashboard, goals, profile, reports, transactions) — converted
  from openapi-fetch's `{ data, error, response }` resolve-always contract to
  axios try/catch, typed via `components`/`operations` from the generated
  OpenAPI types.
- `mobile/package.json` — `axios` added, `openapi-fetch` removed.

### Database migrations

None.

### Commands run and results

1. `cd mobile && npx tsc --noEmit` → [paste exact output/exit code from Step 3]
2. `cd mobile && npx eslint .` → [paste exact output/exit code from Step 3]
3. `cd mobile && npx jest` → [paste exact output/exit code from Step 3]

### Deferred / not verified

- Manual on-device retest of the login/token-refresh flow under axios (same
  physical device and demo account used for the original bug report) — flag
  to the human partner per this project's established pattern of deferring
  final device confirmation (see the 2026-08-09 entry above).
```

- [ ] **Step 5: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/package.json mobile/package-lock.json docs/PROGRESS.md
git commit -m "chore(mobile): remove openapi-fetch, complete axios migration"
```

- [ ] **Step 6: Manual on-device retest reminder**

This step has no automated command — flag it to the user. Re-verify on the
physical device used for the original `FetchResponse`/`instanceof Response`
bug report: log in with `demo@sakuplan.app` / `DemoPassword123!`, and if
possible force a 401 (e.g. wait out the 15-minute access-token TTL, or
manually clear `useAuthStore`'s `accessToken` mid-session) to confirm the
refresh-and-retry path still works end-to-end under axios.
