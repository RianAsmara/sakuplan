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
