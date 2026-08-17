import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { saveRefreshToken } from './secureTokens'
import { useAuthStore } from './store'
import type { components } from '../api/client'

interface LoginInput {
  email: string
  password: string
}

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      try {
        const { data } = await api.post<components['schemas']['TokenPair']>('/v1/auth/login', input)
        return data
      } catch {
        throw new Error('invalid_credentials')
      }
    },
    onSuccess: async (data) => {
      await saveRefreshToken(data.refresh_token)
      useAuthStore.getState().setSession(data.access_token, data.user)
    },
  })
}
