import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { saveRefreshToken } from './secureTokens'
import { useAuthStore } from './store'
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from './consentVersions'
import type { components } from '../api/client'

interface RegisterInput {
  email: string
  password: string
  displayName: string
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      try {
        const { data } = await api.post<components['schemas']['TokenPair']>('/v1/auth/register', {
          email: input.email,
          password: input.password,
          display_name: input.displayName,
          accepted_terms_version: CURRENT_TERMS_VERSION,
          accepted_privacy_version: CURRENT_PRIVACY_VERSION,
        })
        return data
      } catch {
        throw new Error('registration_failed')
      }
    },
    onSuccess: async (data) => {
      await saveRefreshToken(data.refresh_token)
      useAuthStore.getState().setSession(data.access_token, data.user)
    },
  })
}
