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
