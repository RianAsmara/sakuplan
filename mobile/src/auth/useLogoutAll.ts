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
