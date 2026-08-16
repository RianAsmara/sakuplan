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
