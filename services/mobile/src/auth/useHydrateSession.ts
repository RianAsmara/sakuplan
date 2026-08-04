import { useEffect } from 'react'
import { api } from '../api/client'
import { clearRefreshToken, getRefreshToken, saveRefreshToken } from './secureTokens'
import { useAuthStore } from './store'

export function useHydrateSession(): void {
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      const refreshToken = await getRefreshToken()
      if (!refreshToken) {
        useAuthStore.getState().setHydrating(false)
        return
      }
      const { data, error } = await api.POST('/v1/auth/refresh', {
        body: { refresh_token: refreshToken },
      })
      if (cancelled) return
      if (error || !data) {
        await clearRefreshToken()
        useAuthStore.getState().setHydrating(false)
        return
      }
      await saveRefreshToken(data.refresh_token)
      useAuthStore.getState().setSession(data.access_token, data.user)
      useAuthStore.getState().setHydrating(false)
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])
}
