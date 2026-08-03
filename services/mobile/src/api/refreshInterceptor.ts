import type { Client, Middleware } from 'openapi-fetch'
import { useAuthStore } from '../auth/store'
import { clearRefreshToken, getRefreshToken, saveRefreshToken } from '../auth/secureTokens'
import type { paths } from './generated/types'

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

export function installAuthMiddleware(client: Client<paths>, baseUrl: string): void {
  const middleware: Middleware = {
    async onRequest({ request }) {
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
      const newAccessToken = await refreshSession(baseUrl)
      if (!newAccessToken) {
        await clearRefreshToken()
        useAuthStore.getState().clearSession()
        return response
      }
      const retryRequest = new Request(request, {
        headers: new Headers(request.headers),
      })
      retryRequest.headers.set('Authorization', `Bearer ${newAccessToken}`)
      retryRequest.headers.set('X-Retry-After-Refresh', '1')
      return fetch(retryRequest)
    },
  }
  client.use(middleware)
}
