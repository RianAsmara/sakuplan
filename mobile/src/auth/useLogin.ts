import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { saveRefreshToken } from './secureTokens'
import { useAuthStore } from './store'

interface LoginInput {
  email: string
  password: string
}

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data, error } = await api.POST('/v1/auth/login', { body: input })
      if (error || !data) {
        throw new Error('invalid_credentials')
      }
      return data
    },
    onSuccess: async (data) => {
      await saveRefreshToken(data.refresh_token)
      useAuthStore.getState().setSession(data.access_token, data.user)
    },
  })
}
