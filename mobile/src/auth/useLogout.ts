import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { clearRefreshToken, getRefreshToken } from './secureTokens'
import { useAuthStore } from './store'

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const refreshToken = await getRefreshToken()
      if (refreshToken) {
        await api.POST('/v1/auth/logout', { body: { refresh_token: refreshToken } })
      }
    },
    onSettled: async () => {
      await clearRefreshToken()
      useAuthStore.getState().clearSession()
    },
  })
}
