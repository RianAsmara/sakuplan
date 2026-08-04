import type { Client, Middleware } from 'openapi-fetch'
import { useAuthStore } from '../auth/store'
import { clearRefreshToken, getRefreshToken, saveRefreshToken } from '../auth/secureTokens'
import type { paths } from './generated/types'

// Store cloned requests before they are consumed by fetch.
// Keyed by the original request object so we can retrieve it in onResponse.
const requestClones = new WeakMap<Request, Request>()

export function shouldAttemptRefresh(response: Response, alreadyRetried: boolean): boolean {
  return response.status === 401 && !alreadyRetried
}

async function refreshSession(baseUrl: string): Promise<string | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch(`${baseUrl}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) return null

  const body = (await res.json()) as {
    access_token: string
    refresh_token: string
    user: import('./generated/types').components['schemas']['User']
  }
  await saveRefreshToken(body.refresh_token)
  useAuthStore.getState().setSession(body.access_token, body.user)
  return body.access_token
}

export function buildRetryRequest(clonedRequest: Request, newAccessToken: string): Request {
  const retryRequest = new Request(clonedRequest, {
    headers: new Headers(clonedRequest.headers),
  })
  retryRequest.headers.set('Authorization', `Bearer ${newAccessToken}`)
  retryRequest.headers.set('X-Retry-After-Refresh', '1')
  return retryRequest
}

export function installAuthMiddleware(client: Client<paths>, baseUrl: string): void {
  const middleware: Middleware = {
    async onRequest({ request }) {
      // Clone the request before fetch consumes its body
      requestClones.set(request, request.clone())

      const token = useAuthStore.getState().accessToken
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`)
      }
      return request
    },
    async onResponse({ request, response }) {
      const alreadyRetried = request.headers.has('X-Retry-After-Refresh')
      if (!shouldAttemptRefresh(response, alreadyRetried)) {
        return response
      }

      let newAccessToken: string | null = null
      try {
        newAccessToken = await refreshSession(baseUrl)
      } catch {
        // Treat thrown errors (network, JSON parse, etc.) as refresh failure
        await clearRefreshToken()
        useAuthStore.getState().clearSession()
        return response
      }

      if (!newAccessToken) {
        await clearRefreshToken()
        useAuthStore.getState().clearSession()
        return response
      }

      // Retrieve the cloned (unconsumed) request
      const clonedRequest = requestClones.get(request)
      if (!clonedRequest) {
        // Fallback: if clone not found, clear session and return original response
        await clearRefreshToken()
        useAuthStore.getState().clearSession()
        return response
      }

      const retryRequest = buildRetryRequest(clonedRequest, newAccessToken)
      // Note: X-Retry-After-Refresh header is defense-in-depth for potential
      // future middleware reordering; raw fetch() call bypasses middleware chain,
      // so this header is not checked by onResponse on the retry path.
      return fetch(retryRequest)
    },
  }
  client.use(middleware)
}
