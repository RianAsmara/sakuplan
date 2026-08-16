# Mobile HTTP client migration: openapi-fetch → axios — Design

## Context

The mobile app's HTTP layer (`src/api/client.ts` + `src/api/refreshInterceptor.ts`)
currently uses `openapi-fetch`, a thin typed wrapper over the native `fetch`
API driven by the generated OpenAPI `paths` types. First real-device testing
(2026-08-16) surfaced a bug: React Native's `fetch()` resolves with its own
`FetchResponse` class, which is not `instanceof` the environment's global
`Response` — so `openapi-fetch`'s internal `result instanceof Response` guard
in its middleware chain threw on every request, not just the 401/refresh
path. That was root-caused and patched in place (`onResponse` now returns
`undefined` instead of the unmodified response, and rebuilds a real
`Response` only when actually replacing one on the refresh-retry path).

Separately, the user wants the app to use `axios` going forward. This also
sidesteps the bug's root cause entirely: axios uses `XMLHttpRequest` under
the hood on React Native, not the Fetch API, so there's no
`FetchResponse`/global-`Response` class mismatch to work around.

This spec covers replacing `openapi-fetch` with `axios` across the mobile
app's entire HTTP layer: the client, the auth/refresh interceptor, and
every one of the 23 hook files that call it.

## Decisions made during brainstorming

- **Error contract**: switch from openapi-fetch's `{ data, error, response }`
  resolve-always contract to idiomatic axios try/catch (axios rejects on
  non-2xx by default). This means editing all 23 call sites, not just
  `client.ts`.
- **Typing**: keep response/body types via the generated
  `components['schemas']` types (still produced by the existing
  `generate:api` script — `openapi-typescript` generates `components`
  independently of `openapi-fetch`; only the `paths`-driven route/param
  inference goes away). Route strings and path/query params become
  runtime-only correctness (no compile-time check that an endpoint or its
  params match the spec) — accepted trade-off.
- **Scope**: this is a mechanical transport-layer swap. No behavior changes
  beyond what's forced by the contract change (e.g. the existing
  404-as-null special case in `useActiveBudget` must still work the same
  way). No new features (no cross-request refresh de-duping/queuing — the
  current fetch-based code doesn't do that either, so out of scope here).

## Architecture

`src/api/client.ts`:
- Replace `createClient<paths>({ baseUrl })` (openapi-fetch) with
  `axios.create({ baseURL: baseUrl })`.
- Keep exporting `baseUrl`-derived `api` as the single shared instance, and
  re-export `components`/`paths` types from `./generated/types` (paths type
  becomes unused by the client itself but may still be useful for
  reference; no need to stop generating it).
- `installAuthMiddleware(api, baseUrl)` becomes
  `installAuthInterceptors(api, baseUrl)`, attaching axios request/response
  interceptors instead of an openapi-fetch middleware object.

## Auth attachment + token refresh (`refreshInterceptor.ts`)

- **Request interceptor**: reads `useAuthStore.getState().accessToken` and
  sets `Authorization: Bearer <token>` on the outgoing `AxiosRequestConfig`
  headers, mirroring today's `onRequest`.
- **Response interceptor**: registered as the `onRejected` handler of
  `api.interceptors.response.use(onFulfilled, onRejected)`, since axios
  routes non-2xx through rejection, not the success path.
  - Trigger condition mirrors today's `shouldAttemptRefresh`: the rejected
    error is an `AxiosError` with `error.response?.status === 401` and the
    original request config does not already carry a `_retry: true` marker
    (replaces today's `X-Retry-After-Refresh` header check — a boolean flag
    on the config object is the idiomatic axios equivalent and doesn't
    require faking a header).
  - Refresh call (`POST /v1/auth/refresh`) is made with a **bare** axios
    call (`axios.post(...)`, not the intercepted `api` instance) to avoid
    recursively triggering this same interceptor.
  - On success: persist the new refresh token, update `useAuthStore`
    session, set `_retry: true` and the new `Authorization` header on
    `error.config`, and retry via `api(error.config)`, returning that
    promise.
  - On failure (refresh throws, or returns non-OK, or no refresh token
    exists): clear the refresh token and session, then re-reject with the
    original error (equivalent of today's "return the original response").
  - Any other error (non-401, already retried, or a network error with no
    `response` at all) is re-rejected unchanged.
- No more `requestClones` `WeakMap`/`.clone()` handling — axios configs are
  plain objects, not consumed streams, so retrying is just re-invoking with
  the same (mutated) config. This removes real complexity the current fetch
  implementation needs purely to work around one-shot request bodies.

## Call site migration pattern

Audited all 23 current call sites; every one falls into one of these
shapes. The implementation plan should treat each as a mechanical
translation, preserving exact existing behavior:

1. **Simple GET, no params** (`useAccounts`, `useBills`, `useGoals`,
   `useCurrentUser`, `useDashboard`, `useSafeToSpend`):
   ```ts
   const { data } = await api.get<AccountsResponse>('/v1/accounts')
   ```
   wrapped in try/catch, throwing the same `Error('failed_to_load_...')` on
   catch.

2. **GET with a path param** (`useAccountBalances`:
   `/v1/accounts/{id}/balance`): interpolate directly into the template
   string, e.g. `` `/v1/accounts/${id}/balance` ``.

3. **GET with query params** — required (`useCashFlowReport`,
   `useInfiniteTransactions`) or conditional
   (`useCategories`: `kind ? { kind } : {}`): pass via axios's
   `{ params }` config option (axios serializes query strings itself).

4. **GET with a special non-error status** (`useActiveBudget`): today
   checks `response.status === 404` and returns `null` *before* the
   generic error check. With axios this becomes a catch block that
   inspects `axios.isAxiosError(err) && err.response?.status === 404`
   and returns `null` in that case, rethrowing otherwise.

5. **POST/PUT with a body, no path param** (`useCreateAccount`, `useLogin`,
   `useRegister`, `useCreateBudgetRecommendation`,
   `useCreateAndActivateBudget`'s draft step, `useUpdateProfile` (PUT)):
   `api.post<T>('/v1/...', body)` / `api.put<T>(...)`.

6. **POST with no body** (`useLogoutAll`, `useExportData`):
   `api.post<T>('/v1/auth/logout-all')` (axios's `post(url, data?, config?)`
   accepts an omitted body).

7. **POST with an optional body** (`useLogout`: only sends
   `refresh_token` if one exists): unchanged conditional call structure,
   just swapped to the axios call shape.

8. **POST with a path param, no body**
   (`useCreateAndActivateBudget`'s activate step:
   `/v1/budgets/{id}/activate`): interpolated URL, `api.post<T>(url)`.

9. **POST with a path param + custom header + body**
   (`useContributeToGoal`, `useReverseTransaction`): interpolated URL,
   `{ headers: { 'Idempotency-Key': generateIdempotencyKey() } }` in the
   axios config.

10. **POST with a custom header + body, no path param**
    (`useCreateTransaction`): same idempotency-header pattern without URL
    interpolation.

**Error-status extraction cleanup**: four hooks currently work around
openapi-fetch's typing with a cast —
`(response as unknown as { status: number }).status ?? 500` — because the
error-branch `response` type wasn't cleanly `{ status: number }` in every
overload. `AxiosError.response?.status` is natively typed as
`number | undefined`, so this migration removes the cast in all four
places (`useCreateAccount`, `useCreateAndActivateBudget`,
`useCreateBudgetRecommendation`, `useExportData`), matching the clean
`response.status` access already used elsewhere (`useUpdateProfile`,
`useCreateTransaction`, `useReverseTransaction`, `useContributeToGoal`,
`useActiveBudget`).

`ApiError` (`src/api/errors.ts`) is transport-agnostic already (just wraps
a message + numeric status) and needs no changes.

## Dependencies

- Add `axios` to `mobile/package.json`.
- Remove `openapi-fetch` once no file imports it.
- `openapi-typescript` (the `generate:api` script) is unaffected — it only
  produces the `components`/`paths` type files this migration keeps using
  for `components`.

## Testing

- `src/api/refreshInterceptor.test.ts` gets rewritten against the new
  axios-based interceptor: replace the `Request`/`Response`-object-based
  tests for `shouldAttemptRefresh`/`buildRetryRequest` with equivalents
  operating on `AxiosError`-shaped objects and `AxiosRequestConfig`
  (e.g. a `shouldAttemptRefresh(status, alreadyRetried)` taking a plain
  status number instead of a `Response`, and a config-mutation helper
  replacing `buildRetryRequest`).
- No other hook files have existing tests that mock the network layer
  (confirmed by audit — the 13 existing `*.test.ts` files test pure logic:
  formatting, date math, risk levels, budget math, idempotency key
  uniqueness, the auth store, `ApiError`, etc.), so no other test files
  need changes.
- After migration: `npx tsc --noEmit`, `npx eslint .`, `npx jest` must all
  pass, and the login/token-refresh flow must be re-verified live on the
  physical device used for the original bug report (same demo credentials:
  `demo@sakuplan.app` / `DemoPassword123!`).

## Files touched

- `mobile/package.json` (add axios, remove openapi-fetch)
- `mobile/src/api/client.ts`
- `mobile/src/api/refreshInterceptor.ts`
- `mobile/src/api/refreshInterceptor.test.ts`
- All 23 hook/component files currently calling `api.GET/POST/PUT`:
  `src/accounts/{useAccountBalances,useAccounts,useCreateAccount}.ts`,
  `src/auth/{useCurrentUser,useHydrateSession,useLogin,useLogoutAll,useLogout,useRegister}.ts`,
  `src/bills/useBills.ts`,
  `src/budgets/{useActiveBudget,useCreateAndActivateBudget,useCreateBudgetRecommendation,useSafeToSpend}.ts`,
  `src/categories/useCategories.ts`,
  `src/dashboard/useDashboard.ts`,
  `src/goals/{useContributeToGoal,useGoals}.ts`,
  `src/profile/{useExportData,useUpdateProfile}.ts`,
  `src/reports/useCashFlowReport.ts`,
  `src/transactions/{useCreateTransaction,useInfiniteTransactions,useReverseTransaction}.ts`
