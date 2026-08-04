import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { saveRefreshToken } from './secureTokens'
import { useAuthStore } from './store'
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from './consentVersions'

interface RegisterInput {
  email: string
  password: string
  displayName: string
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data, error } = await api.POST('/v1/auth/register', {
        body: {
          email: input.email,
          password: input.password,
          display_name: input.displayName,
          accepted_terms_version: CURRENT_TERMS_VERSION,
          accepted_privacy_version: CURRENT_PRIVACY_VERSION,
        },
      })
      if (error || !data) {
        throw new Error('registration_failed')
      }
      return data
    },
    onSuccess: async (data) => {
      await saveRefreshToken(data.refresh_token)
      useAuthStore.getState().setSession(data.access_token, data.user)
    },
  })
}
